# Tasks: VOT-21 Notification foundation

## Phase 1: Setup
- [x] T001 Create spec and plan in `specs/021-vot-21/`

## Phase 2: User Story 1 (P1)
- [x] T002 [US1] Add typed provider abstraction, no-send default, subscriber store, validation, and unsubscribe tokens in `backend/src/services/notifications.rs`
- [x] T003 [US1] Export notification service from `backend/src/services/mod.rs`
- [x] T004 [US1] Add deterministic unit tests for validation, token revocation, no-send behavior, and test sink delivery
- [x] T005 [US1] Document configuration and persistence/provider boundary in `docs/notifications.md` and `docs/agent-tracking/VOT-21.md`
