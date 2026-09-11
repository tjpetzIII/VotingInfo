# Implementation Plan: Database access policy
**Branch**: `codex/vot-75` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

## Summary
Add equivalent additive access-policy migrations to both existing histories. Deny all direct client table access, enable RLS without client policies, and explicitly grant service_role CRUD plus required sequence/function access. Use invoker functions with fixed search paths. Test the full permission matrix in disposable PostgreSQL databases seeded with Supabase-like permissive grants.

## Technical Context
**Language/Version**: PostgreSQL 15+ SQL, Bash, Python 3 test orchestration.
**Primary Dependencies**: Docker PostgreSQL image and psql; existing Rust/Axum and Next.js consumers unchanged.
**Storage**: Supabase PostgreSQL public schema.
**Testing**: Actual SET ROLE SQL operations in isolated containers; CI database job plus existing service gates.
**Target Platform**: Local Docker and Linux CI; managed Supabase.
**Project Type**: Two independent web services.
**Performance Goals**: No changes to API latency, cache TTL, or rate limits; bounded migration over 24 project tables.
**Constraints**: No live writes, no secrets in tests, no application-data schema changes.
**Scale/Scope**: Backend history: 22 state tables, 2 control tables, 1 sequence, 2 functions. Supabase history: 6 state tables and 1 function.

## Constitution Check
Pre-design and post-design: PASS. Independent service toolchains remain unchanged. Database tests are deterministic and use disposable synthetic data without secrets. No new route/model/error branches. No UI changes (EN/ES and keyboard checks not applicable). No change to CORS, cache, rate limits or upstream response mapping. Operational documentation lives under docs; SDD artifacts use the required specs location. Existing CI service gates must pass before merge.

## Project Structure
- `backend/migrations/013_database_access_policy.sql`: additive policy after refresh controls.
- `supabase/migrations/*_database_access_policy.sql`: equivalent policy, safely skipping objects absent in this older tree.
- `backend/tests/database_permissions.sql`: runtime allow/deny assertions and RLS defense-in-depth checks.
- `backend/tests/test_database_permissions.py`: isolated database runner, migration inventory and parity validation, permissive-default bootstrap.
- `.github/workflows/ci.yml`: database validation job.
- `docs/DATABASE_ACCESS.md`: role contract, operation/rollout guidance and read-only deployed comparison.

## Implementation decisions
Explicitly enumerate project-owned tables, skip only historically absent objects, and reject unprotected tables via inventory tests. Revoke PUBLIC/anon/authenticated/service_role object grants before granting service_role CRUD. Enable RLS with no client policies; service_role retains Supabase's BYPASSRLS attribute. Do not modify cluster roles or unrelated schemas in migrations. Harden future defaults for the migration owner in public, explaining ownership limitations. Keep function invoker mode and constrain search_path to public/pg_temp (public schema must remain non-writable by client roles).

## Dependencies and delivery
VOT-79 owns migration consolidation; retain both histories with identical policy bodies and test each independently. VOT-66 owns atomic publication and operator HTTP-route work; this change secures current database controls without claiming atomic replacement. Live project was restored by its owner and inspected read-only; deployed drift is recorded in docs/DATABASE_ACCESS.md. No production migration application is included.
