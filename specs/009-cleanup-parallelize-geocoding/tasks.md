---
description: "Task list for VOT-61 backend/frontend cleanup"
---

# Tasks: Backend/Frontend Cleanup — Parallelize Geocoding + De-duplicate Boilerplate

**Input**: Design documents from `/specs/009-cleanup-parallelize-geocoding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: This is a behavior-preserving refactor. The existing `wiremock`/Vitest suites are the regression
safety net and must pass unchanged. Only ONE new test is required (the concurrency assertion the ticket
calls out, T005); no broader TDD is requested.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in each description

## Path Conventions

Web app, two independent services: `backend/src/…`, `frontend/src/…`. All changes are behavior-preserving
(response bodies byte-for-byte identical for identical inputs — SC-003). Each user story is an independent
PR (SC-006).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the regression baseline and the one shared dependency change before touching code.

- [ ] T001 Confirm the green baseline before any change: run `cd backend && cargo test && cargo clippy` and `cd frontend && npm run test && npm run lint && npx tsc --noEmit`; record that all pass (this is the equivalence baseline for SC-002/SC-003).
- [ ] T002 Add the `futures` crate to `backend/Cargo.toml` `[dependencies]` (needed only by US1's `join_all`); run `cd backend && cargo build` to update `Cargo.lock`. Belongs to US1's PR — do not land separately (see US1 dependencies below).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. The six items share no blocking prerequisite — each user story is independently
implementable and testable. Proceed directly to the story phases in priority order.

*(No foundational tasks.)*

---

## Phase 3: User Story 1 — Faster polling-location lookup (Priority: P1) 🎯 MVP

**Goal**: Resolve a voter-info result's polling-location coordinates concurrently instead of one-at-a-time,
with identical output and the Nominatim ≥1s fallback pacing intact.

**Independent Test**: Request voter info for an address with multiple Census-resolvable polling locations;
response body identical to baseline, wall-clock reflects concurrent (not summed) resolution, and
fallback-path pacing still enforced.

**Maps to**: Ticket item #1. Depends on T002 (adds `futures`).

- [ ] T003 [US1] In `backend/src/services/civic_api.rs` `get_voter_info` (~lines 291-298), replace the sequential `for loc in &mut result.polling_locations` geocode loop with: (a) collect `(index, address_clone)` for locations whose `address` is `Some`; (b) build one `self.geocoder.geocode(&addr)` future per entry; (c) drive them with `futures::future::join_all`; (d) scatter each `(index, Option<(lat,lng)>)` back into `result.polling_locations[index].lat/lng`. Preserve original order and the exact `lat`/`lng` values (per research.md Item 1).
- [ ] T004 [US1] Verify the borrow structure compiles cleanly: the geocode futures borrow `&self.geocoder` immutably and the `&mut` scatter-back happens only after `join_all` resolves. Run `cd backend && cargo clippy` — zero new warnings (FR-010).
- [ ] T005 [US1] Add a test that actually demonstrates *parallelism* (not merely absence of pacing) to `backend/src/services/civic_api.rs`'s test module: mock the Census geocoder to return a matched result with a per-request delay (`wiremock` `ResponseTemplate::new(200).set_delay(Duration::from_millis(D))`), build a `VoterInfoResponse` with N polling locations (distinct addresses so the geocode cache doesn't collapse them), run the parallelized resolution, and assert total elapsed is close to a single `D` (e.g. `< 2*D`) rather than `N*D`. This distinguishes concurrent Census round-trips from a sequential-but-unpaced loop — the real proof of SC-001. Keep it deterministic (no reliance on wall-clock beyond the injected delay). Covers FR-001, FR-009, SC-001.

  > Note: `geocode_census_hits_incur_no_pacing_delay` (`geocoder.rs:289`) only proves *no Nominatim pacing* and would pass for a sequential loop too, so it is NOT sufficient on its own for the P1 acceptance criterion; T005 is the meaningful test.
- [ ] T006 [US1] Run the US1 gate: `cd backend && cargo test` — the existing `get_voter_info` integration tests must pass unchanged (identical output, SC-003) and `geocode_fallback_pacing_still_enforced` (`geocoder.rs:310`) must still pass (guardrail intact).

**Checkpoint**: US1 is a complete, shippable PR — the MVP and the only user-visible change.

---

## Phase 4: User Story 2 — Maintainer works with de-duplicated code (Priority: P2)

**Goal**: Collapse the duplicated finance-attachment methods, empty-registration literals, and cache
builder into single canonical implementations; identical behavior everywhere.

**Independent Test**: Inspect each area for a single canonical implementation; both test suites pass with
identical output.

**Maps to**: Ticket items #3, #4, #5, #6. These four are mutually independent and each can be its own PR.

### Item #4 — RegistrationResponse empty constructor

- [ ] T007 [P] [US2] In `backend/src/models/mod.rs`, add `#[derive(Default)]` to `RegistrationResponse` (it already derives `Debug, Clone, Serialize, Deserialize`; all fields are `Default`-able and `available` defaults to `false`).
- [ ] T008 [US2] In `backend/src/services/civic_api.rs`, replace the two hand-written all-`None` `RegistrationResponse` literals — `state_fallback_registration`'s `None` arm (~730-748) and `map_registration`'s `None` arm (~765-783) — with `RegistrationResponse { <only the differing fields>, ..Default::default() }`. Leave the `Some(body)` (`available: true`) arm as-is (it is not an "empty" copy). Confirm no value changes (FR-005, SC-003).

### Item #5 — 15-minute cache builder helper

- [ ] T009 [P] [US2] In `backend/src/services/civic_api.rs`, add `fn fifteen_min_cache<K, V>() -> moka::future::Cache<K, V>` (bounds `K: Send + Sync + Eq + std::hash::Hash + 'static`, `V: Send + Sync + Clone + 'static`) encapsulating `Cache::builder().time_to_live(Duration::from_secs(15 * 60)).build()`, then replace the five repeated builders in `CivicApiClient::build` (~248-266) with calls to it. Optionally define the TTL as one `const`. Cache key/value types and TTL unchanged.

### Item #3 — Collapse the two attach_finance methods

- [ ] T010 [US2] In `backend/src/services/civic_api.rs`, introduce a `FinanceContest` trait (per data-model.md) implemented for `ContestDetail` and `BallotContest`, exposing `office()`, candidate-name iteration, and `set_candidate_finance(di, finance)`.
- [ ] T011 [US2] In `backend/src/services/civic_api.rs`, add one generic `async fn attach_finance<C: FinanceContest>(&self, contests: &mut [C], is_federal: impl Fn(usize) -> bool, state: Option<&str>, cycle: u16)` that owns the build-jobs → `resolve_batch` → scatter-back logic, then delete `attach_finance_to_election_contests` and `attach_finance_to_ballot_contests`. Update the `get_elections` call site to pass `|ci| federal_flags[ci]` and the `get_ballot` call site to pass a predicate encoding `level == BallotLevel::Federal`. Preserve the FEC-call-site gating (no lookup for non-federal candidates) and carry over the existing gating doc-comments (FR-004).

### Item #6 — Frontend fetch helper (verify-only; ALREADY DONE via VOT-53)

- [ ] T012 [P] [US2] Verify `frontend/src/lib/api.ts` already routes all 7 fetchers through `apiFetch<T>` with the shared non-2xx `error`-field path and per-endpoint `notFoundMessage`, and that `fetchBallot`'s channel-normalization stays in its own wrapper — no production change needed. Confirm the Vitest suite covers the shared error path (non-2xx `error` field AND a 404 `notFoundMessage`); add a single test case in the existing `frontend/src/lib/*.test.ts` only if one is missing (FR-007).

### US2 gate

- [ ] T013 [US2] Run the US2 gate: `cd backend && cargo test && cargo clippy` and `cd frontend && npm run test && npm run lint && npx tsc --noEmit` — all pass with no test edits beyond T012's optional addition; responses unchanged (SC-002, SC-003, SC-004, SC-005).

**Checkpoint**: US2 items each land as independent PRs (Item #4, #5, #3, and the #6 verification).

---

## Phase 5: User Story 3 — Lower per-candidate latency on federal races (Priority: P3)

**Goal**: Run the two independent FEC lookups concurrently per federal candidate; identical enriched output.

**Independent Test**: Request a federal contest; the two independent upstream lookups run concurrently, the
committee-dependent lookup still runs afterward, enriched response identical to baseline.

**Maps to**: Ticket item #2.

- [ ] T014 [US3] In `backend/src/services/fec_api.rs` `resolve_campaign_finance` (~184-199), replace the two sequential awaits with `let (totals, committee_id) = tokio::join!(self.fetch_totals(&candidate_id, cycle), self.fetch_principal_committee_id(&candidate_id, cycle));`. Keep `let mut summary = totals?;` (preserves the current no-totals → `None` early return) and keep `fetch_top_contributors` after, gated on `committee_id` (it depends on the committee id). Output unchanged (FR-003, SC-003).
- [ ] T015 [US3] Run the US3 gate: `cd backend && cargo test && cargo clippy` — existing FEC integration tests pass unchanged; `campaign_finance` values identical.

**Checkpoint**: US3 is a small independent PR.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Run the full verification matrix from `quickstart.md` across the merged result: `cd backend && cargo test && cargo clippy && cargo build`, `cd frontend && npm run test && npm run lint && npx tsc --noEmit` — all green, zero new warnings (SC-005).
- [ ] T017 [P] Optional response-equivalence spot check per `quickstart.md`: with a real `GOOGLE_CIVIC_API_KEY`, diff `jq -S` of `/api/voter-info`, `/api/elections`, `/api/ballot`, `/api/registration` before vs after — expect no diff (SC-003).
- [ ] T018 Confirm the intentional non-goals were left untouched: `STATE_SCRAPERS` registry + per-state scraper wrappers and the `new_with_*` test-injection constructor family are unchanged (FR-011).

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T001 baseline first. T002 (`futures` dep) is required only by US1 and belongs in the US1 PR.
- **Foundational (Phase 2)**: none.
- **User stories**: fully independent of each other — implement in priority order US1 → US2 → US3, or in parallel across separate PRs. No story depends on another.
- **Within US1**: T002 → T003 → T004 → T005 → T006.
- **Within US2**: the four items (#4: T007→T008; #5: T009; #3: T010→T011; #6: T012) are mutually independent; T013 gates after whichever land together.
- **Within US3**: T014 → T015.
- **Polish (Phase 6)**: after all shipped stories merge.

## Parallel Opportunities

- **Across stories**: US1, US2, and US3 can be worked as three concurrent PRs (different files / independent logic).
- **Within US2 [P]**: T007 (models/mod.rs), T009 (cache helper), and T012 (frontend, different service) touch different files and can proceed in parallel; T008 depends on T007, T011 depends on T010.
- **Polish [P]**: T016 and T017 are independent checks.

## Implementation Strategy

- **MVP = User Story 1** (T001–T006): the one user-visible win (faster polling-location lookup). Ship first.
- **Then US2** for the maintainability payoff (four small independent PRs), **then US3** for the minor FEC latency win.
- Every item is behavior-preserving; the regression suites plus response-equivalence are the acceptance bar.
