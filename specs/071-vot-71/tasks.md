# Tasks: VOT-71 Calendar export

## Phase 1: Setup
- [x] T001 Create Spec Kit spec and plan in `specs/071-vot-71/`

## Phase 2: User Story 1 (P1)
- [x] T002 [US1] Implement pure RFC5545 escaping, folding, stable UID, and all-day serialization in `frontend/src/lib/ics.ts`
- [x] T003 [US1] Add selected/all export controls and snapshot disclaimer to `frontend/src/app/dates/page.tsx`
- [x] T004 [US1] Add bilingual calendar export copy in `frontend/src/messages/en.ts` and `frontend/src/messages/es.ts`
- [x] T005 [US1] Add deterministic serializer tests and update evidence in `frontend/src/lib/ics.test.ts` and `docs/agent-tracking/VOT-71.md`
