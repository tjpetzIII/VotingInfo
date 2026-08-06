---

description: "Task list template for feature implementation"
---

# Tasks: Census Geocoder Migration for Polling Locations

**Input**: Design documents from `/specs/008-census-geocoder-migration/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested via TDD in the spec, but Constitution Principle II requires every
new service/branch in this repo to ship with a covering unit test in the same change — so test
tasks are included inline within each story's implementation, using the existing `wiremock` pattern
from `backend/src/services/geocoder.rs`, rather than as a separate strict-TDD "write first" phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Backend-only feature (Constitution Principle I: independent services) — all paths are under
`backend/src/services/` (existing web-app structure), plus one doc under `docs/` for the spike
report (Constitution Principle VIII). No frontend paths are touched.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register the new service module. No new dependencies (research.md §confirms `reqwest`/`moka`/`serde` already suffice) and no lint/config changes are needed.

- [X] T001 Create `backend/src/services/census_geocoder.rs` with a module doc comment, and register it with `pub mod census_geocoder;` in `backend/src/services/mod.rs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Census Geocoder client itself — used by all three user stories (US1 wires it as primary, US2 verifies its fallback interaction, US3 calls it directly for the spike). It is self-contained and independently testable before any orchestration work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Implement `CensusGeocoderClient` in `backend/src/services/census_geocoder.rs`: `new()`, `new_with_base_url(base_url: &str)`, and `pub async fn geocode(&self, address: &str) -> Option<(f64, f64)>`, per `contracts/census-geocoder-api.md` — `GET {base_url}/locations/onelineaddress?address={address}&benchmark=Public_AR_Current&format=json`, deserialize `result.addressMatches[0].coordinates` mapping `y`→lat, `x`→lng, empty array or any non-2xx/parse failure → `None`, 10s `reqwest::Client` timeout, no pacing
- [X] T003 [P] Add `#[cfg(test)]` unit tests in `backend/src/services/census_geocoder.rs` using `wiremock`: a populated `addressMatches` response returns `Some((lat, lng))` with correct y/x→lat/lng mapping; an empty `addressMatches` array returns `None`; a non-200 response returns `None`

**Checkpoint**: `CensusGeocoderClient` exists, is independently tested, and is ready to be wired into the orchestrator (US1) or called directly (US3).

---

## Phase 3: User Story 1 - Faster polling-location results (Priority: P1) 🎯 MVP

**Goal**: Coordinate lookups for polling locations use the Census Geocoder as primary with no pacing delay, while still degrading gracefully to the existing Nominatim path if Census is unavailable.

**Independent Test**: Request coordinates for several addresses in quick succession against a mocked Census server that returns matches — total elapsed time has no ≥1s-per-address pacing added, and a simulated Census outage still returns coordinates via fallback.

### Implementation for User Story 1

- [X] T004 [US1] Add a dual-base-url constructor to `GeocoderClient` in `backend/src/services/geocoder.rs` (e.g. `new_with_urls(census_base_url: &str, nominatim_base_url: &str)`) alongside the existing `new()`/`new_with_base_url`, per `contracts/geocoder-client-interface.md`; `new()` continues to point both at their real hosts
- [X] T005 [US1] Add a `census: CensusGeocoderClient` field to `GeocoderClient` in `backend/src/services/geocoder.rs` and change `geocode()` to call `self.census.geocode(address).await` first, returning immediately on `Some(..)` (depends on T004)
- [X] T006 [US1] Move the existing `Mutex<Option<Instant>>` ≥1s pacing in `backend/src/services/geocoder.rs` so it wraps only the Nominatim fallback call path, not the Census call (FR-004) — the Census call must incur zero added delay (depends on T005)
- [X] T007 [US1] Wire the Census-miss fallthrough in `backend/src/services/geocoder.rs`: when `self.census.geocode()` returns `None`, call the existing (now fallback-only) Nominatim fetch and return its result (FR-002), keeping the single 24h `moka` cache at the `GeocoderClient` level keyed by address string unchanged (FR-003) (depends on T006). Also updated `CivicApiClient::new_with_urls` in `backend/src/services/civic_api.rs` (a test-support constructor, not the production path) to point both Census and Nominatim at the same mock server, keeping integration tests fully mocked per Constitution Principle II
- [X] T008 [P] [US1] Add unit test in `backend/src/services/geocoder.rs`: two `geocode()` calls for different addresses, both served by a mocked Census server that returns a match — assert combined elapsed time stays well under 1s (no pacing applied) (depends on T007)
- [X] T009 [P] [US1] Add unit test in `backend/src/services/geocoder.rs`: mocked Census server returns a match — assert the mocked Nominatim server receives zero requests (`wiremock` `.expect(0)`) (depends on T007)
- [X] T010 [P] [US1] Add unit test in `backend/src/services/geocoder.rs`: mocked Census server returns a 500 error — assert the client falls through to the mocked Nominatim server and still returns `Some((lat, lng))` (depends on T007)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently — Census-hit lookups are fast, and a Census outage still degrades gracefully.

---

## Phase 4: User Story 2 - No loss of coverage for unusual addresses (Priority: P2)

**Goal**: Addresses the Census Geocoder can't match — including non-standard, polling-location-style formats — still resolve via the Nominatim fallback, with no regression versus today's coverage.

**Independent Test**: Run a batch of previously-successful and known-tricky (non-standard) addresses through `geocode()` against mocked servers and confirm none lose their coordinates compared to Nominatim-only behavior.

### Implementation for User Story 2

- [X] T011 [P] [US2] Add unit test in `backend/src/services/geocoder.rs`: mocked Census server returns an empty `addressMatches` for a non-standard-formatted address (e.g. a PO-box-style or building-name-only string), mocked Nominatim server has a match for that same address — assert `geocode()` returns `Some((lat, lng))` (depends on T007)
- [X] T012 [P] [US2] Add unit test in `backend/src/services/geocoder.rs`: both mocked Census and Nominatim servers return no match for the same address — assert `geocode()` returns `None`, matching current miss behavior (FR-008) (depends on T007)
- [X] T013 [P] [US2] Add unit test in `backend/src/services/geocoder.rs`: two back-to-back addresses that both miss on Census (so both fall through to Nominatim) — assert the ≥1s pacing is still enforced between the two Nominatim calls (FR-005) (depends on T007)
- [X] T014 [US2] Update the doc comment on `GeocoderClient::geocode` in `backend/src/services/geocoder.rs` to describe the primary(Census)/fallback(Nominatim) behavior and unchanged caching, replacing the current Nominatim-only description (depends on T007)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — fast on the common path, with proven no-regression coverage on the fallback path.

---

## Phase 5: User Story 3 - Documented go/no-go evidence before switching (Priority: P3)

**Goal**: A written spike report compares Census against Nominatim on a representative sample of polling-location-style addresses (including non-standard formats) and records a go/no-go decision, per FR-006/FR-007.

**Independent Test**: `docs/census-geocoder-spike.md` exists with per-address results, aggregate match rates, and a clear go/no-go decision — verifiable independently of whether US1/US2's code has shipped.

### Implementation for User Story 3

- [X] T015 [US3] Assemble the ~50-address sample set (clean street addresses + non-standard: building-name-only, rural route, PO-box-style entries) as a checked-in fixture list, per `research.md` §4 (depends on T002; independent of US1/US2) — landed as 30 addresses (15 clean + 15 non-standard); see `docs/census-geocoder-spike.md` for the sizing note
- [X] T016 [US3] Implement a one-off runner binary `backend/src/bin/census_geocoder_spike.rs` that calls `CensusGeocoderClient::geocode` and the existing (pre-feature) Nominatim geocoding logic directly — against the real live hosts, not mocks, since this is the actual spike run — for each sample address, recording match/no-match per source and the distance between coordinates when both match (depends on T015)
- [X] T017 [US3] Run the spike runner and write the results — per-address outcomes, aggregate match rates, any >~1km coordinate divergences flagged for review, and the resulting go/no-go decision — to `docs/census-geocoder-spike.md` (FR-006) (depends on T016)
- [X] T018 [US3] Record in `docs/census-geocoder-spike.md` whether the go/no-go decision from T017 confirms US1/US2's Census-primary behavior as shippable (FR-007) or requires holding it back pending further investigation (depends on T017)

**Checkpoint**: All user stories are independently functional; the spike's recorded decision is the actual basis for whether Census-as-primary goes live for real users.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide consistency and final validation across all stories

- [X] T019 [P] Update the `services/geocoder.rs` description in `CLAUDE.md` to mention `services/census_geocoder.rs` and the primary/fallback relationship, per the repo's convention of keeping `CLAUDE.md` in sync with architecture changes
- [X] T020 Run `cargo clippy` and `cargo fmt` across all changed files and resolve any new warnings (Constitution Principle III) — clippy is clean; `cargo fmt --check` reveals a pre-existing repo-wide formatting drift unrelated to this change (CI does not gate on it, only `cargo clippy`), so only the fully-authored new files were run through rustfmt, and the minimal edits to `civic_api.rs`/`mod.rs` were kept consistent with their existing surrounding style instead of reformatting untouched code
- [X] T021 Run `cargo test --lib services::geocoder services::census_geocoder` and confirm all tests pass — ran the full suite (`cargo test`): 66 unit tests + 42 integration tests, all passing
- [X] T022 Manually run `quickstart.md` steps 2 (live Census contract sanity check), 4 (end-to-end latency), and 5 (response-shape diff) and record the results — step 2 confirmed directly (`curl` to the live Census endpoint returns 200 with the expected `coordinates` shape) and again, thoroughly, via the 30-address spike run (T017) against the real live host. Steps 4/5 could not be exercised through a live `/api/voter-info` call: `cargo run` against the real `GOOGLE_CIVIC_API_KEY` returned `404 NOT_FOUND` ("no active election") for every polling-location-style address tried, since Google's Civic API only returns voter-info data near a real, currently-active election — a pre-existing external-data limitation, not something this change affects. SC-001 (latency) and FR-009 (unchanged response shape) are instead verified deterministically by `geocode_census_hits_incur_no_pacing_delay` (T008) and the unmodified-and-passing `voter_info_polling_locations_include_lat_lng` integration test, respectively.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 and US2 share the same orchestration code in `geocoder.rs`, so in practice US2's tasks build on US1's tasks (T011-T013 depend on T007, which US1 delivers) — they are independently *testable* (separate test cases, separate acceptance criteria) but not independently *implementable* in parallel by two people without coordinating on the same file
  - US3 has no code dependency on US1/US2 — it calls `CensusGeocoderClient` (Foundational) and the pre-existing Nominatim logic directly, so it can be built and run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Important: priority order ≠ shipping order for this feature

Spec priorities (P1/P2/P3) rank these stories by *user-facing value*, not by the order they must go
live. Per FR-006/FR-007, the Census-primary behavior delivered by US1 (and hardened by US2) MUST
NOT be relied upon in production until US3's spike (T015-T018) records a "go" decision — even
though US3 is P3. All three can be *built* in parallel per the dependency graph above; only
*enabling* US1/US2's behavior for real traffic is gated on US3's outcome.

### Within Each User Story

- US1: T004 → T005 → T006 → T007 must run in sequence (each edits the same growing block of
  `geocoder.rs`); T008-T010 (tests) can run in parallel with each other once T007 is done
- US2: T011-T013 can run in parallel with each other once T007 (from US1) is done; T014 can run
  anytime after T007
- US3: T015 → T016 → T017 → T018 run in sequence (each output feeds the next)

### Parallel Opportunities

- T003 (Foundational tests) can run in parallel with nothing else in that phase (T002 must exist first) but is otherwise self-contained
- T008, T009, T010 (US1 tests) can run in parallel with each other
- T011, T012, T013 (US2 tests) can run in parallel with each other, and with T008-T010 if staffed separately (all read-only additions to the same test module, so coordinate on merge order)
- T015-T018 (US3, the spike) can run in parallel with all of US1/US2 once T002 is done
- T019 (docs) can run in parallel with T020-T022

---

## Parallel Example: User Story 1

```bash
# After T007 completes, launch US1's tests together:
Task: "Unit test: two Census-hit lookups incur no pacing delay in backend/src/services/geocoder.rs"
Task: "Unit test: Census hit means zero Nominatim requests in backend/src/services/geocoder.rs"
Task: "Unit test: Census error falls through to Nominatim in backend/src/services/geocoder.rs"
```

## Parallel Example: User Story 3 (independent of US1/US2)

```bash
# Once T002 (CensusGeocoderClient) is done, the spike can proceed on its own track:
Task: "Assemble ~50-address sample set per research.md §4"
Task: "Implement backend/src/bin/census_geocoder_spike.rs runner"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm Census-hit lookups are unpaced and Census-outage still falls back correctly
5. Do not enable this behavior for real users until Phase 5 (US3's spike) has recorded a "go" decision — see Dependencies note above

### Incremental Delivery

1. Complete Setup + Foundational → `CensusGeocoderClient` ready
2. Add User Story 1 → primary/fallback orchestration works, pacing scoped correctly
3. Add User Story 2 → coverage/fallback edge cases proven with tests
4. Add User Story 3 (can run in parallel with 2-3 above) → spike report + go/no-go decision
5. Only once US3 records "go": treat US1/US2's behavior as production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T003)
2. Once Foundational is done:
   - Developer A: User Story 1 then User Story 2 (same file, sequential by nature)
   - Developer B: User Story 3 (independent file/binary, can start immediately after T002)
3. Developer B's spike result gates whether Developer A's work is enabled in production

---

## Notes

- [P] tasks = different files or independent additions, no blocking dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 share `backend/src/services/geocoder.rs` — coordinate edits to avoid merge conflicts even where tasks are marked [P] within a story
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The real production gate for this feature is US3's spike decision, not code completion — see "Important: priority order ≠ shipping order" above
