# Tasks: VOT-62

## Phase 1: Setup
- [x] T001 Specify full ticket and review official documentation in specs/062-vot-62/spec.md and research.md.
- [x] T002 Produce plan, data model and contracts in specs/062-vot-62/.

## Phase 2: Foundation
- [ ] T003 Write discovery/ID/cache regression tests in backend/tests/integration.rs before implementation.
- [x] T004 Add typed choices, selection errors, cached raw fetch and optional selection methods in backend/src/{models/mod.rs,errors.rs,services/civic_api.rs,routes/elections.rs,lib.rs}.

## Phase 3: US1 — Choose election
- [ ] T005 [US1] Add zero/one/multiple/same-day/keyboard frontend tests in frontend/src/contexts/ElectionContext.test.tsx.
- [x] T006 [US1] Implement discovery fetcher and shared chooser in frontend/src/{lib/api.ts,contexts/ElectionContext.tsx,components/ElectionChooser.tsx,messages/en.ts,messages/es.ts}.

## Phase 4: US2 — Consistent context
- [ ] T007 [US2] Test address/URL changes and out-of-order results in frontend/src/contexts/ElectionContext.test.tsx and affected page tests.
- [x] T008 [US2] Integrate provider and selected query keys across frontend/src/components/Providers.tsx and frontend/src/app/{ballot,ballot/[contestId],elections,polling,voter-info,dates,registration}/page.tsx.

## Phase 5: US3 — Matched dates
- [ ] T009 [US3] Write selected mismatch/no-fallback regressions in backend/tests/integration.rs and backend/src/services/election_dates.rs.
- [ ] T010 [US3] Implement conservative date/name matching in backend/src/services/election_dates.rs.

## Phase 6: Validation
- [ ] T011 Run all relevant frontend/backend gates and record evidence in docs/agent-tracking/VOT-62.md.
- [ ] T012 Inspect UI, capture screenshot and perform convergence against specs/062-vot-62/{spec,plan,tasks}.md; append any gaps.

## Dependencies / execution
T001→T002→T003→T004; T005→T006→T007→T008; T009→T010; all before T011→T012. Backend fixtures and frontend fixtures can be developed independently; changes in same file are sequential. Deliver US1 discovery first, then all shared consumers, then deadlines, without reducing final scope.

## Phase 7: Convergence
- [ ] T013 [US1] Add deterministic wiremock coverage for election choices, duplicate IDs, same-day ambiguity, explicit invalid/unavailable IDs, and address/election cache isolation per FR-008 (missing).
- [ ] T014 [US2] Replace imperative polling/dates/voter-info fetch state with react-query keys containing address and election ID and add out-of-order response regression tests per FR-005/SC-002 (partial).
- [ ] T015 [US3] Add selected-election name/date matching fixtures for scraped deadlines and verify no nearest-election fallback per FR-007 (partial).
- [ ] T016 [US2] Add URL electionId propagation to contest links and verify selection survives navigation/reload per FR-004 (partial).
