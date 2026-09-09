# Tasks: VOT-72 Spanish localization completion

## Phase 1: Setup
- [x] T001 Create specification, plan, research, and checklist artifacts in `specs/072-vot-72/`

## Phase 2: Foundational
- [x] T002 Harden locale storage and synchronize document language in `frontend/src/contexts/LocaleContext.tsx`
- [x] T003 Add bilingual message keys in `frontend/src/messages/en.ts` and `frontend/src/messages/es.ts`

## Phase 3: User Story 1 - Consistent bilingual voter experience (Priority: P1)
- [x] T004 [US1] Localize polling card/map labels and accessible names in `frontend/src/components/PollingLocationCard.tsx` and `frontend/src/components/PollingMap.tsx`
- [x] T005 [US1] Format voter-info deadlines using selected locale in `frontend/src/app/voter-info/page.tsx`
- [x] T006 [US1] Format dates route output with selected locale in `frontend/src/app/dates/page.tsx`
- [x] T007 [US1] Add deterministic locale and bilingual rendering tests in `frontend/src/contexts/LocaleContext.test.tsx` and route tests
- [x] T008 [US1] Record route inventory, glossary source, and 375px/screen-reader review checklist in `docs/localization-review-vot-72.md`

## Phase 4: Polish
- [x] T009 Run frontend lint, typecheck, Vitest, and build when dependencies are available; document limitations in `docs/agent-tracking/VOT-72.md`
