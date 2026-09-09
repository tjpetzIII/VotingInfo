# Tasks: VOT-28 API rate-limit and error hardening

## Phase 1: Design artifacts

- [X] T001 Create spec, plan, and task artifacts and confirm constitution constraints.
- [X] T002 Record baseline and implementation evidence in `docs/agent-tracking/VOT-28.md`.

## Phase 2: Safe typed errors

- [X] T003 Add sanitized client response mapping for upstream, transport, scraper, and configuration errors.
- [X] T004 Add unit tests proving sensitive upstream text and URLs are absent from responses.

## Phase 3: Rate-limit contract

- [X] T005 Configure governor rejection handling to emit the typed JSON rate-limit contract while retaining headers and bounds.
- [X] T006 Add deterministic middleware/router coverage for 429 response shape and health availability.

## Phase 4: Validation

- [X] T007 Run formatting, check, tests, and clippy; resolve regressions.
- [X] T008 Update tracking note and commit all intended VOT-28 changes.
