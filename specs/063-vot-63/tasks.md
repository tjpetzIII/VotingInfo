# Tasks: VOT-63 Voting location categories

## Phase 1: Setup
- [x] T001 [P] Create feature specification and research artifacts in `specs/063-vot-63/`
- [x] T002 [P] Create implementation plan and validation quickstart in `specs/063-vot-63/`

## Phase 2: Foundational
- [x] T003 Extend project-owned location and response models in `backend/src/models/mod.rs`
- [x] T004 Extend Civic DTOs and map all location categories in `backend/src/services/civic_api.rs`

## Phase 3: User Story 1 - Distinguish voting services (Priority: P1)
- [x] T005 [US1] Preserve supplied coordinates and geocode only missing coordinates in `backend/src/services/civic_api.rs`
- [x] T006 [US1] Add typed category metadata to `frontend/src/lib/api.ts`
- [x] T007 [US1] Add accessible category filters, mail-only guidance, and official finder empty states in `frontend/src/app/polling/page.tsx`
- [x] T008 [US1] Render category, dates, notes, and services in `frontend/src/components/PollingLocationCard.tsx`
- [x] T009 [US1] Render supplied-coordinate markers and retain text parity in `frontend/src/components/PollingMap.tsx`

## Phase 4: Polish
- [x] T010 Run backend and frontend quality gates and review scope
- [x] T011 Record evidence and limitations in `docs/agent-tracking/VOT-63.md`

## Dependencies
T001-T004 precede US1; T004 precedes T005; T006-T009 can proceed after model mapping; T010-T011 are final.
