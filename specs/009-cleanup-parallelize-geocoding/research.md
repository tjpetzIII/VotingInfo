# Phase 0 Research: VOT-61 Cleanup

Design decisions per item. All are behavior-preserving; "behavior" is judged against the existing test
suites plus response-body equivalence for identical inputs.

## Item 1 — Parallelize polling-location geocoding (P1)

**Context**: `CivicApiClient::get_voter_info` (`civic_api.rs:291-298`) awaits `self.geocoder.geocode(addr)`
sequentially in a `for` loop over `result.polling_locations`.

**Constraint discovered**: The FEC path's `resolve_batch` uses `tokio::task::JoinSet` with `self.clone()`,
which works because `FecApiClient` derives `Clone` (`fec_api.rs:89`). **`GeocoderClient` does NOT derive
`Clone`** — it holds a `Mutex<Option<Instant>>` (the Nominatim pacing guard). `JoinSet::spawn` also
requires `'static + Send` tasks, i.e. owned data. So the FEC pattern cannot be copied verbatim.

**Decision**: Use **concurrent-but-borrowed** futures instead of spawned tasks:
1. Collect `(index, address)` for every polling location whose `address` is `Some`.
2. Build one `self.geocoder.geocode(&addr)` future per entry (each borrows `&self.geocoder`).
3. Drive them concurrently and collect `(index, Option<(lat,lng)>)`.
4. Scatter results back into `result.polling_locations[index].lat/lng` (preserving original order).

To drive a dynamic `Vec` of futures concurrently, add the **`futures` crate** and use
`futures::future::join_all` (tokio's `join!` is fixed-arity only). This is the smallest change and needs
no ownership/Arc churn.

**Rationale**:
- Borrowed futures all share the same `&self.geocoder`, so the internal `Mutex`-based Nominatim pacing
  still serializes fallback calls correctly (FR-002 guardrail intact) — concurrency only overlaps the
  unpaced Census path.
- Steps 1–4 avoid a borrow conflict: geocode futures borrow `&self.geocoder` immutably; the `&mut`
  scatter-back happens only after they resolve.
- Order is preserved because results are keyed by original index, not arrival order (SC-003).

**Alternatives considered**:
- *`Arc<GeocoderClient>` + `JoinSet`* (mirror FEC exactly): rejected as more churn — requires changing the
  `CivicApiClient.geocoder` field type and every `new_with_*` test constructor, for no behavioral gain.
- *Add no dependency, keep sequential*: rejected — fails the P1 goal (SC-001).

**Test**: Add a `civic_api.rs` (or `geocoder.rs`) test asserting that multiple Census-resolvable polling
locations resolve without incurring serialized pacing delay — mirror `geocode_census_hits_incur_no_pacing_delay`
(`geocoder.rs:289`). The existing `geocode_fallback_pacing_still_enforced` continues to guard the fallback.

## Item 2 — Concurrent FEC totals + committee fetch (P3)

**Context**: `FecApiClient::resolve_campaign_finance` (`fec_api.rs:184-199`) runs `fetch_totals` then
`fetch_principal_committee_id` sequentially; both need only `candidate_id`. `fetch_top_contributors`
depends on the committee id and must stay last.

**Decision**: Run the two independent calls with `tokio::join!` (both borrow `&self`, allowed):
```
let (totals, committee_id) = tokio::join!(
    self.fetch_totals(&candidate_id, cycle),
    self.fetch_principal_committee_id(&candidate_id, cycle),
);
let mut summary = totals?;                 // preserves the current `?` early-return-None on no totals
if let Some(committee_id) = committee_id {
    summary.top_contributors = self.fetch_top_contributors(&committee_id, cycle).await;
}
```

**Rationale**: Output is identical. The only difference is that `fetch_principal_committee_id` now also
runs in the (rare) case where `fetch_totals` returns `None`; its result is then discarded and the function
still returns `None`. This is an at-most-one-extra upstream call in a failure path, not a change to any
returned value — and it stays within the per-candidate cached path, so it isn't repeated. Acceptable and
behavior-preserving in output (SC-003).

**Alternatives considered**: Keep sequential — rejected, it's the whole point of the item. Guard the
committee fetch behind `totals.is_some()` before joining — rejected, that just re-serializes them.

## Item 3 — Collapse `attach_finance_to_election_contests` / `attach_finance_to_ballot_contests`

**Context**: `civic_api.rs:360-396` and `402-437` are ~75 near-identical lines differing only in (a) the
Federal gate (`federal_flags[ci]` vs `contest.level == BallotLevel::Federal`) and (b) contest/candidate
concrete types (`ContestDetail`/`CandidateDetail` vs `BallotContest`/`BallotCandidate`).

**Decision**: Introduce a small trait pair so one generic helper owns the build-jobs → `resolve_batch` →
scatter-back logic, with the Federal decision injected as a predicate (per the ticket):

- `trait FinanceContest { fn office(&self) -> Option<&str>; fn candidate_names(&self) -> impl Iterator<Item=&str>; fn set_candidate_finance(&mut self, di: usize, f: Option<CampaignFinanceSummary>); }`
  implemented for `ContestDetail` and `BallotContest`.
- One helper: `async fn attach_finance<C: FinanceContest>(&self, contests: &mut [C], is_federal: impl Fn(usize) -> bool, state: Option<&str>, cycle: u16)`.
- Elections path passes `|ci| federal_flags[ci]`; ballot path passes `|ci| contests[ci].level == BallotLevel::Federal` (captured before the `&mut` borrow, or re-expressed via the trait).

**Rationale**: Removes one full copy of the jobs/targets/`resolve_batch`/scatter logic while keeping the
FEC-call-site gating guarantee (no lookup attempted for non-federal candidates) — the predicate gates the
same way the two copies do today. Output identical (SC-003, FR-004).

**Alternatives considered**: A single function taking a bag of closures (name accessor, finance setter,
federal predicate) instead of a trait — viable but noisier at call sites; trait reads cleaner and matches
Rust idiom. Macro — rejected as over-engineered for two impls.

**Implementation note**: exact trait method shape (associated-type iterator vs `&[T]` accessor) is an
implementation detail; either is acceptable as long as the two public call sites and their output are
unchanged. Keep the existing doc-comments' gating explanation.

## Item 4 — `RegistrationResponse` empty constructor

**Context**: The all-absent `RegistrationResponse` (18 fields) is written out verbatim three times:
`state_fallback_registration` `None` arm (`civic_api.rs:730-748`) and `map_registration` `None` arm
(`765-783`), plus the base for the state-info variants.

**Decision**: Add `#[derive(Default)]` to `RegistrationResponse` in `models/mod.rs` (it already derives
`Debug, Clone, Serialize, Deserialize`; every field — `bool`, `Option<_>`, `Vec<_>` — is `Default`, and
`available` defaults to `false`, matching all three copies). Rebuild each site as:
```
RegistrationResponse { available: false, same_day_registration: ..., registration_url: ..., ..Default::default() }
```
overriding only the differing fields.

**Rationale**: Cuts ~40 lines, removes drift risk (FR-005). `Default::default()` for `available` is `false`,
which is exactly what all three empty copies use, so no value changes. Deriving `Default` is preferred over
a hand-written `empty()` — less code, idiomatic, and the ticket allows either.

**Guard**: Confirm no other construction site relied on the fields now defaulted; the `Some(body)`
(`available: true`) arm keeps spelling out its fields (it's not an "empty" copy).

## Item 5 — Extract the 15-minute cache builder

**Context**: `CivicApiClient::build` (`civic_api.rs:248-266`) repeats
`Cache::builder().time_to_live(Duration::from_secs(15*60)).build()` five times.

**Decision**: Add a small free helper in `civic_api.rs`:
```
fn fifteen_min_cache<K, V>() -> Cache<K, V>
where K: Send + Sync + Eq + std::hash::Hash + 'static, V: Send + Sync + Clone + 'static {
    Cache::builder().time_to_live(Duration::from_secs(15 * 60)).build()
}
```
and call it five times. Define the TTL as a single `const` if it reads cleaner.

**Rationale**: One definition of the TTL (FR-006). `moka::future::Cache` requires those bounds; all five
existing caches already satisfy them, so no call-site type changes. Behavior identical.

**Alternatives considered**: A `const CACHE_TTL: Duration` alone (still five builder calls) — partial; the
helper removes the builder repetition too, so prefer the helper (optionally using the const internally).

## Item 6 — Frontend shared fetch helper — ALREADY DONE

**Finding**: `frontend/src/lib/api.ts` **already** has `apiFetch<T>(path, { notFoundMessage? })`
(lines 14-27) and all seven fetchers (`fetchVoterInfo`, `fetchElections`, `fetchBallot`,
`fetchRegistration`, `fetchAllElections`, `fetchElectionDates`, `fetchStateElections`) already route
through it. The `fetchBallot` channel-normalization stays in its own wrapper, exactly as the ticket
prescribes. This was delivered by **VOT-53** (see git log: "VOT-53: Extract shared apiFetch helper").

**Decision**: No code change. This item reduces to verification: confirm the existing Vitest coverage for
`lib/api.ts` exercises the shared error path (non-2xx `error` field + 404 `notFoundMessage`); add a case
only if one is missing.

**Rationale**: Re-extracting would be churn with no benefit. Mark the item satisfied in tasks with a
verification task rather than an implementation task.

## Cross-cutting

- **Dependency addition**: only `futures` (for `join_all`, Item 1). Widely used, no feature-flag surface,
  no conflict with `tokio`. Everything else uses existing deps.
- **Ordering / independence**: Items 2–6 are independent and can land in any order. Item 1 is independent
  too; it's just highest value. Each is its own PR (SC-006).
- **Verification for every item**: `cargo test && cargo clippy` (backend), `npm run test && npm run lint &&
  npx tsc --noEmit` (frontend). See `quickstart.md`.
