# Tasks: VOT-66 Durable election-data refresh worker

## Phase 1: Artifacts and schema
- [X] T001 Create spec, plan, and task artifacts.
- [X] T002 Add migration for leases, snapshot versions, and sanitized status.

## Phase 2: Worker
- [X] T003 Implement refresh service with bounded concurrency, timeout, retries, and lease lifecycle.
- [X] T004 Implement last-good snapshot publication and failure preservation.
- [X] T005 Add worker binary and configuration validation.

## Phase 3: Protected operations
- [X] T006 Add authenticated manual refresh route.
- [X] T007 Add deterministic tests for bounded worker configuration and auth comparison.

## Phase 4: Handoff
- [X] T008 Update deployment documentation and tracking note.
- [X] T009 Run validation and commit.
