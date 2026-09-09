# Phase 1 Data Model: VOT-61 Cleanup

**No persisted entities and no wire-format changes.** This feature adds no fields, changes no serialized
struct, and touches no migration or database table. The "model" here is the set of *internal* helper
shapes introduced by the refactor. None of these appear in any JSON response.

## Public response types — UNCHANGED

`VoterInfoResponse`, `ElectionsResponse`, `BallotResponse`, `RegistrationResponse`, and every nested type
keep their exact current fields, order, and serde attributes. Response bodies must be byte-for-byte
identical for identical inputs (SC-003). The only derive change is additive and invisible to serde:

- `RegistrationResponse` gains `#[derive(Default)]` (Item 4). `Default` is not serialized; the field set,
  names, and `#[serde(...)]` attributes are untouched. `available` defaults to `false`.

## New internal helpers (not serialized)

### Item 1 — geocoding concurrency (behavioral, no type)
No new type. The `for` loop becomes: collect `(usize, String)` address entries → `futures::future::join_all`
of `geocode(&addr)` futures → scatter `(usize, Option<(f64, f64)>)` back by index. `PollingLocation`'s
`lat`/`lng` fields and their values are unchanged.

### Item 2 — concurrent FEC calls (behavioral, no type)
No new type. `resolve_campaign_finance` replaces two sequential `.await`s with one `tokio::join!`. Return
type `Option<CampaignFinanceSummary>` unchanged; values unchanged.

### Item 3 — finance-attachment unification
Internal trait + generic helper (names indicative, final shape an implementation detail):

- `trait FinanceContest` — implemented for the existing `ContestDetail` and `BallotContest`:
  - `office(&self) -> Option<&str>`
  - a way to iterate candidate names (e.g. `candidate_names(&self) -> impl Iterator<Item = &str>`)
  - `set_candidate_finance(&mut self, di: usize, finance: Option<CampaignFinanceSummary>)`
- `async fn attach_finance<C: FinanceContest>(&self, contests: &mut [C], is_federal: impl Fn(usize) -> bool, state: Option<&str>, cycle: u16)`

`FinanceJob` / `resolve_batch` are reused as-is. The federal gate stays a caller-supplied predicate so the
elections path (`federal_flags[ci]`) and ballot path (`level == Federal`) keep their exact current gating.

### Item 4 — empty registration constructor
`RegistrationResponse::default()` (via derive) is the single source for the all-absent value. The three
hand-written all-`None` literals are replaced by `RegistrationResponse { <differing fields>, ..Default::default() }`.

### Item 5 — cache builder helper
`fn fifteen_min_cache<K, V>() -> moka::future::Cache<K, V>` with the standard moka bounds
(`K: Send + Sync + Eq + Hash + 'static`, `V: Send + Sync + Clone + 'static`). Encapsulates the shared
`time_to_live(15 * 60s)`. The five caches keep their exact key/value types and TTL.

### Item 6 — frontend
No new type. `apiFetch<T>` already exists; no change.

## Invariants preserved

- Polling-location order and `lat`/`lng` values (Item 1).
- FEC no-lookup-for-non-federal gating and per-candidate cache semantics (Items 2, 3).
- Registration field values across the fallback and no-data paths (Item 4).
- 15-minute TTL on all five caches (Item 5).
- Per-endpoint 404 messages and `error`-field error path (Item 6).
