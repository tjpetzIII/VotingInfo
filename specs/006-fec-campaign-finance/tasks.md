---

description: "Task list for Campaign Finance Data on Candidate Pages (VOT-60)"
---

# Tasks: Campaign Finance Data on Candidate Pages

**Input**: Design documents from `/specs/006-fec-campaign-finance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/candidate-finance-field.md, quickstart.md (all present)

**Tests**: Included and REQUIRED, not optional — Constitution Principle II mandates that "every new
backend route, model, or error-mapping branch MUST ship with a covering unit or integration test
in the same change," and this feature adds new model fields and a new error-tolerant branch (FR-007).

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

## Path Conventions

Existing web app split: `backend/src/`, `backend/tests/`, `frontend/src/`. No new top-level
directories are introduced (per plan.md's "Structure Decision").

---

## Phase 1: Setup

**Purpose**: Wire up the new service module so later phases have somewhere to add code.

- [X] T001 Add `pub mod fec_api;` to `backend/src/services/mod.rs` and create
      `backend/src/services/fec_api.rs` with an empty module (doc comment only) — no logic yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared model types, the FEC client skeleton, matching logic, classification reuse,
and test harness that every user story below depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `CampaignFinanceSummary` and `Contributor` structs to
      `backend/src/models/mod.rs` (fields per data-model.md: `total_raised`, `total_spent`,
      `cash_on_hand`, `as_of_date`, `top_contributors: Vec<Contributor>` with
      `#[serde(skip_serializing_if = "Vec::is_empty", default)]`; `Contributor` has `name`/`total`).
      Add `campaign_finance: Option<CampaignFinanceSummary>` with
      `#[serde(skip_serializing_if = "Option::is_none")]` to both `CandidateDetail` and
      `BallotCandidate`.
- [X] T003 Implement the `FecApiClient` struct in `backend/src/services/fec_api.rs`: `reqwest::Client`,
      `api_key` (reads `FEC_API_KEY` env var, falls back to the literal `"DEMO_KEY"` — no `Config`
      error, per research.md §2), `base_url`, and a candidate-keyed `moka::future::Cache` with a
      24-hour TTL (research.md §4, cache key = normalized name + state + office + cycle). Add
      `new()` and a `new_with_base_url()` test constructor mirroring `CivicApiClient`'s pattern.
      (depends on T001)
- [X] T004 Implement the candidate-matching function in `backend/src/services/fec_api.rs`: given
      name/state/office/cycle, call `GET /v1/candidates/search/` (private `ApiFec*`-style
      deserialize structs, never exposed outside the module per Constitution Principle IV), apply
      the exactly-one-plausible-result rule from research.md §3 (normalize name — case-fold, strip
      punctuation/suffixes like "Jr."/"III" — and require all significant name tokens to match),
      and return `Option<String>` (the FEC `candidate_id`) — `None` on zero or 2+ plausible results.
      (depends on T003)
- [X] T005 Add unit tests in `backend/src/services/fec_api.rs` (`#[cfg(test)] mod tests`) for the
      matching function from T004: zero results → `None`; exactly one plausible result → `Some`;
      two-plus plausible results (ambiguous) → `None`; name normalization correctly matches names
      differing only by punctuation/suffix/case. (depends on T004)
- [X] T006 [P] Reuse `classify_level` (currently private to `map_ballot` in
      `backend/src/services/civic_api.rs`) so `/api/elections`'s `map_elections`/`get_elections`
      path also classifies each `ContestDetail`'s candidates as Federal/State/Local — do not write a
      second classification heuristic (Constitution Principle III). This is the gate every later
      phase's FEC enrichment step checks before attempting any FEC lookup.
- [X] T007 Extend the integration test harness in `backend/tests/integration.rs`: add a third
      `MockServer` for the FEC API and thread its base URL into the app under test (mirrors the
      existing civic+geocoder `new_with_urls` pattern) so wiremock-based FEC scenarios can be
      written in the phases below. (depends on T003)

**Checkpoint**: `FecApiClient` exists, can match a candidate and model finance data, and tests can
mock it — but nothing in the request path calls it yet.

---

## Phase 3: User Story 1 - See a federal candidate's funding totals (Priority: P1) 🎯 MVP

**Goal**: Federal candidates with a confident FEC match show total raised, total spent, cash on
hand, and an as-of date on `/api/elections` and `/api/ballot`; candidates with no confident match,
or when the FEC service is unavailable, show nothing (fail closed, per FR-004/FR-007).

**Independent Test**: Mock a federal candidate's FEC search+totals response, request
`/api/elections`/`/api/ballot` for an address whose ballot includes that candidate, and confirm
`campaign_finance.total_raised/total_spent/cash_on_hand/as_of_date` appear; confirm the field is
absent when no confident match exists or the FEC mock errors.

### Tests for User Story 1

- [X] T008 [US1] Integration test in `backend/tests/integration.rs`: confident FEC match →
      `/api/elections` candidate JSON includes `campaign_finance.total_raised`/`total_spent`/
      `cash_on_hand`/`as_of_date` with the mocked values.
- [X] T009 [US1] Integration test in `backend/tests/integration.rs`: same confident-match scenario,
      asserted against `/api/ballot` instead.
- [X] T010 [US1] Integration test in `backend/tests/integration.rs`: FEC search returns zero results
      for a federal candidate → `campaign_finance` absent from that candidate's JSON, rest of the
      response unaffected (FR-004).
- [X] T011 [US1] Integration test in `backend/tests/integration.rs`: FEC search/totals mock returns
      an error or times out → `campaign_finance` absent for that candidate, response still `200`
      with everything else intact (FR-007).

### Implementation for User Story 1

- [X] T012 [US1] Implement the totals-fetch function in `backend/src/services/fec_api.rs`: given a
      matched `candidate_id` + cycle, call `GET /v1/candidate/{candidate_id}/totals/`, map
      `receipts`/`disbursements`/`cash_on_hand_end_period`/`coverage_end_date` into a
      `CampaignFinanceSummary` with `top_contributors: vec![]` (User Story 2 populates this later),
      using the cache from T003. (depends on T003, T004)
- [X] T013 [US1] Wire FEC enrichment into `CivicApiClient::get_elections` in
      `backend/src/services/civic_api.rs`: after `map_elections`, for each candidate in a
      Federal-classified contest (T006), concurrently resolve match (T004) + totals (T012) and
      attach `Some(CampaignFinanceSummary)`; leave `None` for everyone else. (depends on T006, T012)
- [X] T014 [US1] Wire the same FEC enrichment into `CivicApiClient::get_ballot` in
      `backend/src/services/civic_api.rs`, reusing the enrichment helper introduced in T013 rather
      than duplicating the concurrent-resolve logic. (depends on T013)
- [X] T015 [P] [US1] Add `CampaignFinanceSummary`/`Contributor` TypeScript interfaces and the
      optional `campaign_finance` field on `CandidateDetail` and `BallotCandidate` in
      `frontend/src/lib/api.ts`, per contracts/candidate-finance-field.md.
- [X] T016 [US1] Render total raised/spent/cash-on-hand and the as-of date in
      `frontend/src/components/CandidateCard.tsx` when `candidate.campaign_finance` is present; no
      new section when absent. (depends on T015)
- [X] T017 [US1] Add tests in `frontend/src/components/CandidateCard.test.tsx`: renders funding
      totals + as-of date when `campaign_finance` is present; renders nothing extra when absent.
      (depends on T016)

**Checkpoint**: User Story 1 is complete and independently testable/demoable — this is the MVP.

---

## Phase 4: User Story 2 - See who is funding a federal candidate (Priority: P2)

**Goal**: Federal candidates with a confident match also show a short list of top contributors,
when that data is available; totals still display on their own when it isn't (FR-006).

**Independent Test**: Mock committees + `by_employer` contributor data for an already-matched
candidate and confirm `top_contributors` appears; mock no contributor data and confirm totals still
render with the contributors list simply absent.

### Tests for User Story 2

- [X] T018 [US2] Integration test in `backend/tests/integration.rs`: matched candidate with mocked
      `by_employer` data → `campaign_finance.top_contributors` present with the expected
      name/total entries, checked on both `/api/elections` and `/api/ballot`.
- [X] T019 [US2] Integration test in `backend/tests/integration.rs`: matched candidate with no
      contributor data → `campaign_finance` present (totals populated) but the `top_contributors`
      key is absent from the JSON entirely (not an empty array).

### Implementation for User Story 2

- [X] T020 [US2] Implement committee lookup in `backend/src/services/fec_api.rs`: given
      `candidate_id` + cycle, call `GET /v1/candidate/{candidate_id}/committees/` and select the
      principal campaign committee's `committee_id`.
- [X] T021 [US2] Implement the top-contributors fetch in `backend/src/services/fec_api.rs`: given a
      `committee_id` + cycle, call
      `GET /v1/schedules/schedule_a/by_employer/?committee_id=...&cycle=...&sort=-total&per_page=5`
      and map the results into `Vec<Contributor>`. (depends on T020)
- [X] T022 [US2] Populate `top_contributors` on the `CampaignFinanceSummary` built in T012, inside
      the same enrichment step from T013/T014, only for candidates that already resolved a
      confident match. (depends on T021, T013)
- [X] T023 [US2] Render the top-contributors list in `frontend/src/components/CandidateCard.tsx`
      when `campaign_finance.top_contributors` is present and non-empty. (depends on T016)
- [X] T024 [US2] Add tests in `frontend/src/components/CandidateCard.test.tsx`: renders top
      contributors when present; renders totals only (no contributors section) when absent.
      (depends on T023)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Non-federal races look unaffected (Priority: P3)

**Goal**: State/local candidates provably never get a `campaign_finance` field and never trigger a
single FEC network call — not just "the field happens to come back empty."

**Independent Test**: Request `/api/ballot` (and `/api/elections`) for an address with a mixed
federal + state + local ballot; confirm state/local candidates have no `campaign_finance` field
*and* the FEC mock endpoints recorded zero requests attributable to them.

### Tests for User Story 3

- [X] T025 [US3] Integration test in `backend/tests/integration.rs`: mixed-level ballot (federal +
      state + local candidates) on `/api/ballot` → only the federal candidate gets
      `campaign_finance`; assert via wiremock (e.g. `.expect(0)` / request log inspection) that no
      FEC endpoint was ever called for the state/local candidates. (depends on T014)
- [X] T026 [US3] Same guardrail assertion for `/api/elections`. (depends on T013)

### Implementation for User Story 3

- [X] T027 [US3] Audit the enrichment loop in `CivicApiClient::get_elections`/`get_ballot`
      (`backend/src/services/civic_api.rs`) to confirm the Federal-classification check from T006
      gates the FEC call site itself — no match/fetch attempt for non-federal candidates at all,
      not merely a result discarded afterward. Tighten if T025/T026 reveal a gap. (depends on T013,
      T014)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Update `CLAUDE.md`: document `FEC_API_KEY` in the Environment section (optional,
      falls back to `DEMO_KEY`), add `services/fec_api.rs` to the backend module-layout list, and
      note the new `campaign_finance` field in the API Endpoints table's `/api/elections`/
      `/api/ballot` descriptions.
- [X] T029 [P] Run `cd backend && cargo clippy` and `cd backend && cargo fmt --check`; resolve any
      new warnings (Constitution Principle III).
- [X] T030 [P] Run `cd frontend && npm run lint && npx tsc --noEmit`; resolve any new
      warnings/errors (Constitution Principle III).
- [X] T031 Run the full `quickstart.md` validation (automated steps, then the manual smoke test)
      and confirm SC-001 through SC-005 all hold.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; additionally depends on US1's T012/T013
  existing (it extends the same `CampaignFinanceSummary` and enrichment step) — not independently
  implementable before US1, but independently *testable/demoable* once both are in place, per its
  own Independent Test above.
- **User Story 3 (Phase 5)**: Depends on Foundational (T006) and on US1's enrichment call site
  (T013/T014) existing to audit/tighten — same "depends to build, independently testable" relationship as US2.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests are written and expected to fail before their corresponding implementation task, per the
  template convention and Constitution Principle II.
- Backend model/service work precedes the `civic_api.rs` wiring, which precedes frontend rendering.

### Parallel Opportunities

- T002 (models) and T006 (classify_level reuse) can run in parallel with each other and with
  T003-T005 (different files, no shared dependency).
- T015 (frontend types) can start in parallel with any backend task in Phase 2/3, since the JSON
  contract is already fixed by `contracts/candidate-finance-field.md` — the frontend doesn't need
  the backend implementation to exist first, only the documented shape.
- Within Phase 6, T028/T029/T030 are independent files and can run in parallel.

---

## Parallel Example: Foundational Phase

```bash
# These touch different files and have no dependency on each other:
Task: "Add CampaignFinanceSummary and Contributor structs to backend/src/models/mod.rs"
Task: "Reuse classify_level for /api/elections in backend/src/services/civic_api.rs"
```

## Parallel Example: User Story 1

```bash
# Frontend types can be added while backend enrichment is still being wired up,
# since the JSON contract is already fixed:
Task: "Add CampaignFinanceSummary/Contributor TS types + campaign_finance field in frontend/src/lib/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything else).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run the automated tests in quickstart.md's step 1-2 for US1 scenarios,
   then the manual smoke test steps 1-4 for a federal race address.
5. Deploy/demo if ready — this alone delivers the ticket's core transparency value.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate independently → deploy/demo (MVP).
3. Add User Story 2 → validate independently → deploy/demo.
4. Add User Story 3 → validate independently → deploy/demo (guardrail hardening, low risk).
5. Polish.

---

## Notes

- [P] tasks = different files, no unmet dependencies.
- [Story] label maps each task to its user story for traceability back to spec.md.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.
- Avoid: a second classification heuristic (reuse `classify_level`), a second FEC HTTP client
  instance (reuse the one `FecApiClient` and its cache), and partial `CampaignFinanceSummary`
  objects reaching a client (per FR-004/FR-005, it's all-or-nothing except `top_contributors`).
