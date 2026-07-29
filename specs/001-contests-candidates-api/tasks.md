# Tasks: Contests & Candidates API Route

**Input**: Design documents from `specs/001-contests-candidates-api/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/get-ballot.md, quickstart.md

**Tests**: Included — Constitution Principle II (Testing Standards) requires every new route to
ship with a covering test; no live Civic API access, `wiremock` only.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P3) to enable independent
verification of each story, per research.md's decision that this feature is one endpoint whose
stories are different quality attributes of the same response (ordering, candidate
completeness, field omission) rather than separable slices of functionality.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to the repo root

## Path Conventions

Web app structure per plan.md: this feature is backend-only, under `backend/src/` and
`backend/tests/integration.rs` (this project's tests live in one flat file per
`backend/tests/integration.rs`, not a `tests/` directory tree).

---

## Phase 1: Setup

**Purpose**: Add the new response types every later task depends on.

- [X] T001 Add `BallotLevel` enum (`Federal`/`State`/`Local`, serializing as
  `"federal"`/`"state"`/`"local"`), `BallotContest`, `BallotCandidate`, and `BallotResponse`
  structs to `backend/src/models/mod.rs` per data-model.md — reuse the existing `Channel` and
  `Election` types rather than duplicating them; apply
  `#[serde(skip_serializing_if = "Option::is_none")]` to every optional `BallotCandidate` field
  and `#[serde(skip_serializing_if = "Vec::is_empty", default)]` to `channels`, matching the
  existing `RegistrationResponse` pattern in the same file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared plumbing every user story needs — the level-classification function and the
raw data path that feeds it. **No user story work can begin until this phase is complete.**

- [X] T002 Add a `level: Vec<String>` field (`#[serde(default)]`) to the `ApiContest` raw
  deserialization struct in `backend/src/services/civic_api.rs`, capturing Google Civic API's
  `level[]` array on each contest
- [X] T003 Implement `fn classify_level(levels: &[String]) -> BallotLevel` in
  `backend/src/services/civic_api.rs` per the mapping table in research.md: `"country"` /
  `"international"` → `Federal`; `"administrativeArea1"` → `State`; `"administrativeArea2"`,
  `"regional"`, `"locality"`, `"subLocality1"`, `"subLocality2"`, `"special"`, or an empty array →
  `Local`; when multiple values are present, Federal takes precedence over State over Local
- [X] T004 Unit test `classify_level` in `backend/src/services/civic_api.rs` covering: each
  individual mapped value, an empty array (→ `Local`), and a mixed array containing both a
  Federal and a State indicator (→ `Federal`)
- [X] T005 Add a `ballot_cache: Cache<String, BallotResponse>` field to `CivicApiClient` and
  initialize it with the same 15-minute TTL as the other three caches, in
  `backend/src/services/civic_api.rs`'s `build()`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - See the full ballot, most important races first (Priority: P1) 🎯 MVP

**Goal**: `GET /api/ballot?address=` returns every contest for the address, correctly classified
and ordered Federal → State → Local.

**Independent Test**: Request the ballot for an address with contests at multiple levels and
confirm every federal contest precedes every state contest, which precedes every local contest.

### Tests for User Story 1

- [X] T006 [US1] Integration test `ballot_returns_contests_sorted_by_federal_state_local` in
  `backend/tests/integration.rs`: stub a `voterinfo` response (via `wiremock`) with three
  contests whose `level` arrays are `["locality"]`, `["administrativeArea1"]`, `["country"]` (in
  that scrambled order), request `GET /api/ballot?address=...`, and assert the response orders
  them Federal → State → Local
- [X] T007 [US1] Integration test `ballot_single_level_returns_only_that_level` in
  `backend/tests/integration.rs`: stub a `voterinfo` response containing only local-level
  contests and assert every returned contest has `"level": "local"`

### Implementation for User Story 1

- [X] T008 [US1] Implement `fn map_ballot(raw: ApiVoterInfoResponse) -> BallotResponse` in
  `backend/src/services/civic_api.rs`: map each `ApiContest` to a `BallotContest` (office,
  district, `classify_level(&contest.level)`), map each `ApiCandidate` to a `BallotCandidate`
  with every field from data-model.md, then stable-sort the resulting contests by level
  (Federal < State < Local)
- [X] T009 [US1] Implement `CivicApiClient::get_ballot(&self, address: &str) -> Result<BallotResponse, AppError>`
  in `backend/src/services/civic_api.rs`, mirroring `get_elections`: check `ballot_cache`, call
  `fetch_raw`, call `map_ballot`, insert into cache, return
- [X] T010 [US1] Add a `get_ballot` handler to `backend/src/routes/elections.rs`, reusing the
  existing `AddressQuery` extractor and `State<Arc<CivicApiClient>>`, following the same shape as
  `get_elections`
- [X] T011 [US1] Wire `GET /api/ballot` into the router in `backend/src/main.rs`, alongside the
  other address-based routes (`.route("/api/ballot", get(routes::elections::get_ballot))`).
  **Discovered during implementation**: `backend/src/lib.rs`'s `build_app_router` maintains a
  second, separate route table used by `backend/tests/integration.rs` (pre-existing duplication,
  not introduced by this feature) — the route was added there too, or every ballot test 404s.

**Checkpoint**: `GET /api/ballot` is live end-to-end and independently testable — User Story 1 is
functional.

---

## Phase 4: User Story 2 - Research every candidate in a race (Priority: P2)

**Goal**: Every candidate in a returned contest includes all available bio/contact details.

**Independent Test**: Request the ballot for a contest whose candidates have a full set of
details on file and confirm every one of those details appears for each candidate.

### Tests for User Story 2

- [X] T012 [US2] Integration test `ballot_candidate_includes_all_available_fields` in
  `backend/tests/integration.rs`: stub a candidate with `party`, `candidateUrl`, `photoUrl`,
  `phone`, `email`, and `channels` all populated, and assert every one of those values appears
  correctly in the `/api/ballot` response
- [X] T013 [US2] Integration test `ballot_contest_includes_all_candidates` in
  `backend/tests/integration.rs`: stub a contest with three candidates and assert all three
  appear in the response, not just the first

**Note**: No new implementation is expected here — `map_ballot` (T008) already maps every field
from the raw Civic API candidate. These tests exist to independently verify that guarantee per
Constitution Principle II. If either test fails, fix the gap in `map_ballot`
(`backend/src/services/civic_api.rs`).

**Checkpoint**: User Stories 1 and 2 both independently verified.

---

## Phase 5: User Story 3 - Never see a blank/placeholder value (Priority: P3)

**Goal**: A candidate/contest field with no data is absent from the response, never `null`.

**Independent Test**: Request the ballot for a contest with a candidate missing one or more
optional details and confirm those fields are absent from the JSON, not `null`.

### Tests for User Story 3

- [X] T014 [US3] Integration test `ballot_candidate_missing_fields_are_omitted_not_null` in
  `backend/tests/integration.rs`: stub a candidate with only `name` set, parse the raw JSON
  response body (`serde_json::Value`, not the typed struct), and assert `party`,
  `candidate_url`/`candidateUrl`, `photo_url`, `phone`, `email`, and `channels` keys are entirely
  absent from that candidate's object
- [X] T015 [US3] Unit test in `backend/src/models/mod.rs` confirming `BallotCandidate` /
  `BallotContest` serde behavior directly: serialize a candidate with all optional fields `None`
  and empty `channels`, assert the resulting `serde_json::Value` has no keys for those fields —
  mirrors the existing `polling_location_all_fields_optional` test already in that file

### Implementation for User Story 3

- [X] T016 [US3] If T014 or T015 surface any field missing its `skip_serializing_if` attribute
  from T001, fix it in `backend/src/models/mod.rs` (expected to be a no-op if T001 was done
  correctly; this task exists to close the loop). **Result**: no-op — T014/T015 passed on the
  first run, confirming T001's attributes were correct.

**Checkpoint**: All three user stories independently functional and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Add a `GET /api/ballot` row to the API Endpoints table in `CLAUDE.md` (Constitution
  Principle VIII — Centralized Documentation)
- [X] T018 Integration test `ballot_election_unknown_returns_404` in
  `backend/tests/integration.rs`: stub Google's "Election unknown" error response and assert
  `GET /api/ballot` returns 404 (reuses `fetch_raw`'s existing error mapping — FR-008)
- [X] T019 Integration test `ballot_unparseable_address_returns_422` in
  `backend/tests/integration.rs`: stub Google's `parseError` response and assert 422 (FR-007)
- [X] T020 Integration test `ballot_empty_contests_returns_success` in
  `backend/tests/integration.rs`: stub a `voterinfo` response with `"contests": []` and assert
  `GET /api/ballot` returns 200 with an empty `contests` list, not an error (FR-009)
- [X] T021 Run `cargo clippy` from `backend/` and fix any warnings introduced by this feature
  (Constitution Principle III). **Result**: `cargo clippy --all-targets` — zero warnings.
- [X] T022 Run the quickstart.md validation steps in full: `cargo test --lib`,
  `cargo test --test integration`, `cargo clippy`, the manual `curl` check, and the
  `/api/elections` regression check confirming that endpoint's response is unchanged.
  **Result**: `cargo test` — 41 lib unit tests + 32 integration tests, all passing;
  `elections_success` (the `/api/elections` regression check) unchanged and passing. Manual
  `curl` check not run (no `GOOGLE_CIVIC_API_KEY`/live server in this environment) — covered
  instead by the automated integration tests against a mocked Civic API.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (needs `BallotResponse`/`BallotLevel` to exist) —
  BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (T008's `map_ballot` is what it verifies) —
  not independent of US1's implementation, but independently *testable* once US1 exists
- **User Story 3 (Phase 5)**: Same relationship as US2 — depends on T001/T008 existing, independently testable
- **Polish (Phase 6)**: Depends on Phase 3 (route must exist); T017 has no code dependency

### Within Each Phase

- Tasks in `backend/src/services/civic_api.rs` (T002–T005, T008–T009) are sequential — same file
- Tasks in `backend/tests/integration.rs` (T006–T007, T012–T014, T018–T020) are sequential — same
  file
- T010 (`routes/elections.rs`), T011 (`main.rs`), and T017 (`CLAUDE.md`) each touch a file no
  other task touches, so each is independent of the others once its own phase's prior tasks are
  done

### Parallel Opportunities

Given the shared-file constraints above (a single `civic_api.rs` and a single flat
`integration.rs`), true `[P]` parallelism in this feature is limited to:

- T017 (`CLAUDE.md`) against any Rust-file task in Phase 6

Everything else is realistically sequential within its phase because this feature concentrates
its logic in two shared files by design (research.md — no new modules).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) and Phase 2 (T002–T005)
2. Complete Phase 3 (T006–T011) — `GET /api/ballot` now returns a correctly-ordered ballot with
   full candidate data (the mapping already includes every field; US2/US3 add verification, not
   new capability)
3. **STOP and VALIDATE**: run `cargo test --test integration` and the manual `curl` check from
   quickstart.md

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → verify ordering → this is already a usable MVP (full candidate data included)
3. User Story 2 → add tests proving candidate-detail completeness → no new code expected
4. User Story 3 → add tests proving field omission → fix any gap found
5. Polish → edge-case tests, docs, clippy, full quickstart validation

---

## Notes

- [P] tasks = different files, no dependencies — used sparingly here; see Parallel Opportunities
- [Story] label maps task to specific user story for traceability
- This feature's stories are quality attributes of one endpoint, not separable slices — see the
  Organization note above and research.md
- Verify tests fail before implementing where practical (T004, T006, T007 target functions/routes
  that don't exist yet, so they will fail to compile/run until their implementation task lands)
- Commit after each phase checkpoint
