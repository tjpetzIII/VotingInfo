# Tasks: VOT-41 Axum migration verification

## Phase 1: Setup
- [X] T001 Audit backend/Cargo.toml, backend/Cargo.lock and official migration notes in specs/041-vot-41/research.md.
- [X] T002 Record baseline test and formatting outcomes in docs/agent-tracking/VOT-41.md (shared tracking note).

## Phase 2: Foundations
- [X] T003 Audit route definitions, extractors, handlers, middleware and serving in backend/src/lib.rs, backend/src/main.rs, backend/src/routes/ and backend/src/middleware.rs against migration requirements.

## Phase 3: User Story 1 - Existing behavior (P1)
Goal: existing routes, handlers and production entrypoint remain compatible.
Independent test: full backend suite and production build.
- [X] T004 [US1] Run the complete backend/tests/integration.rs and unit suite with cargo test --locked; investigate introduced failures.
- [X] T005 [US1] Synchronize Axum version guidance in .specify/memory/constitution.md and CLAUDE.md; record the migration assessment in docs/AXUM_08_MIGRATION.md.

## Phase 4: User Story 2 - State route registration (P2)
Goal: prove all generated state paths preserve route/method matching.
Independent test: isolated router oneshot tests with no handler calls or upstream dependencies.
- [X] T006 [US2] Add backend/tests/axum_compatibility.rs covering wrong-method and unsupported-state paths; verify Allow headers for every registry entry.
- [X] T007 [US2] Run focused backend/tests/axum_compatibility.rs and confirm existing application wiring needs no compatibility changes.

## Phase 5: Polish and review
- [X] T008 Run cargo build --locked, cargo clippy --locked -- -D warnings and cargo fmt --check; verify new test formatting independently and record exact checks in docs/AXUM_08_MIGRATION.md.
- [X] T009 Run speckit-converge and requirement-to-evidence audit; update specs/041-vot-41/tasks.md and shared docs/agent-tracking/VOT-41.md with review handoff.

## Dependencies and parallel opportunities
T001-T003 precede implementation. US1 and US2 have distinct files and can be checked independently; one assigned agent executes both sequentially. T008 follows T004-T007, and T009 follows validation. MVP is preserved existing behavior (US1); completion includes both stories.
