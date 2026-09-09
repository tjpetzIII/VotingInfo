# Implementation Plan: VOT-41 Axum 0.8 verification

**Branch**: `codex/vot-41` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

## Summary
Keep the already installed Axum 0.8.9 dependency, audit its official breaking changes against all routing, extractors, middleware and serving code, add route-registration regression coverage, and synchronize stale architecture guidance.

## Technical Context
- Language: Rust (project baseline 1.92), edition 2021.
- Dependencies: Axum 0.8 (locked 0.8.9), Tower 0.5, tower-http 0.7, tower_governor 0.8.
- Storage: Existing Supabase unchanged; new checks do not access it.
- Testing: cargo test, clippy with warnings denied, rustfmt; router oneshot checks in a new integration test file.
- Target: Linux web service, port 8080; local macOS validation.
- Performance: retain cache TTL 15 minutes, governor 2-second token refill and burst 30.
- Scope: dependency/API audit, state route registration coverage, accurate framework documentation. No application behavior refactor.

## Constitution Check
Pre-design and post-design: independent backend toolchain preserved; tests use no live upstreams or secrets; no response, security, CORS, cache or UI changes. Existing dependency upgrade conflicts with stale Axum 0.7 in the technology baseline: correct to 0.8 using a PATCH wording synchronization, amendment date and impact note. No principle changes. CLAUDE.md architecture reference will explicitly identify 0.8. Docs live under docs/, with prescribed Spec Kit artifacts under specs/. Baseline formatting defects are documented, not swept into this maintenance scope. New files must pass rustfmt and no new warnings may be introduced.

## Project Structure
- `backend/Cargo.toml`, `backend/Cargo.lock`: inspect existing resolved version, no artificial dependency churn.
- `backend/src/lib.rs`, `backend/src/main.rs`, `backend/src/routes/`, `backend/src/middleware.rs`: audit all Axum integration points; only change if compatibility requires it.
- `backend/tests/axum_compatibility.rs`: method-level probes for all generated state paths and unsupported state paths.
- `.specify/memory/constitution.md`, `CLAUDE.md`: accurate framework baseline.
- `docs/AXUM_08_MIGRATION.md`: migration audit and reproducible validation.
- `specs/041-vot-41/`: spec, plan, research, data-model, contracts, quickstart, tasks.

## Implementation Strategy
1. Audit migration hazards and record baseline checks before changes.
2. Add focused routing regression checks; existing integration tests cover Query, State, errors and health.
3. Correct documentation and run full backend tests, build and lint. Record existing baseline defects separately.
4. Apply converge by checking each acceptance scenario and requirement against code/test evidence.
