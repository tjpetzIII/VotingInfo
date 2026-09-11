# Tasks: Database access policy

## Phase 1 — Setup
- [x] T001 Record the role contract and dependency research in specs/074-database-access/research.md and contracts/access.md.

## Phase 2 — Foundation
- [x] T002 Create disposable PostgreSQL runner with permissive role defaults and both migration inventories in backend/tests/test_database_permissions.py.

## Phase 3 — US1: Snapshot protection
Independent test: every state table denies both client roles and allows server CRUD.
- [x] T003 [US1] Add seeded runtime CRUD and RLS denial tests in backend/tests/database_permissions.sql; demonstrate failure before the policy.
- [x] T004 [US1] Add equivalent policy migrations in backend/migrations/013_database_access_policy.sql and supabase/migrations/*_database_access_policy.sql.

## Phase 4 — US2: Refresh protection
Independent test: clients cannot operate controls/sequence/RPC; server can acquire/release leases and create generated history IDs.
- [x] T005 [US2] Extend backend/tests/database_permissions.sql for controls, sequence, function ACLs, lease contention and server upserts.
- [x] T006 [US2] Restrict functions and sequences in both policy migrations, with invoker mode and fixed search paths.

## Phase 5 — US3: Reproducibility and live comparison
Independent test: both histories pass and live metadata is compared read-only.
- [x] T007 [US3] Add a database permission gate to .github/workflows/ci.yml and document access/rollout in docs/DATABASE_ACCESS.md.
- [x] T008 [US3] Inspect live Supabase configuration read-only and record actual drift in docs/DATABASE_ACCESS.md.

## Phase 6 — Delivery
- [x] T009 Run permission tests and affected service gates; record evidence in specs/074-database-access/tasks.md.
- [x] T010 Prepare the delivery and local-main verification checklist in specs/074-database-access/tasks.md.

## Dependencies and execution
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T009 → T010. T008 can run alongside local implementation when the deployed project is available. US1 is the first testable increment; full delivery requires all three stories. No task may substitute local verification for the live inspection requirement.

## Validation evidence (2026-09-11)
- Pre-policy regression failed with `RLS missing on ak_election_dates`.
- Permission matrix passed on PostgreSQL 15 for both histories; PostgreSQL 17 suite passed for both histories, including policy reapplication.
- `cargo test --locked`, `cargo clippy --locked -- -D warnings` passed.
- Frontend lint, `npx tsc --noEmit`, 153 tests across 42 files, and production build passed.
- Live read-only SQL/advisor and schema-exposure checks completed after project restart; deployed drift documented in docs/DATABASE_ACCESS.md. No live writes performed.
- Frontend local public credential inspected without displaying its value: JWT role anon, no service-role/secret key. No UI changes.

## External delivery checklist
The agent must push the VOT-75 PR, verify its GitHub CI, merge it, fast-forward local main, and rerun the permission suite there. Confirm local HEAD equals the merge commit on origin/main, verify the policy bodies match, and check no unrelated local work was committed. These external events are recorded in the PR/issue and final delivery report rather than asserted before they occur here.
