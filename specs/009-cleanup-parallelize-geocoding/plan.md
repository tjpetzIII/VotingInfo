# Implementation Plan: Backend/Frontend Cleanup — Parallelize Geocoding + De-duplicate Boilerplate

**Branch**: `VOT-61` (working branch) · feature dir `specs/009-cleanup-parallelize-geocoding` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-cleanup-parallelize-geocoding/spec.md`

## Summary

Six independent, behavior-preserving cleanups sourced from VOT-61. One performance slice (parallelize
polling-location geocoding in `CivicApiClient::get_voter_info`) is the only user-visible change; the rest
remove duplication (finance-attachment methods, empty-registration literals, 15-min cache builder) and a
minor concurrency win (concurrent FEC totals + committee fetch). The frontend `fetchJson` item (#6) is
**already implemented** by the earlier VOT-53 `apiFetch<T>` helper, so it reduces to a verification step.
Nothing changes any endpoint's response shape, values, ordering, error codes/messages, cache TTLs, or
rate-limit bounds. Each item lands as its own small PR.

## Technical Context

**Language/Version**: Rust 1.92 (backend), TypeScript / Next.js 16 + React 19 (frontend)

**Primary Dependencies**: Axum 0.7, `tokio` (features = full), `moka::future::Cache`, `reqwest`; frontend `fetch` + react-query

**Storage**: N/A for this feature — in-memory `moka` caches only; no persistence touched

**Testing**: `cargo test` (unit + `wiremock` integration), `cargo clippy`; frontend `npm run test` (Vitest), `npm run lint`, `npx tsc --noEmit`

**Target Platform**: Linux server (distroless Docker), browser frontend

**Project Type**: Web application — two independent services (`backend/`, `frontend/`)

**Performance Goals**: Polling-location coordinate resolution scales with the slowest single lookup, not the sum of N (SC-001); no N+1 upstream fan-out introduced

**Constraints**: Behavior-preserving — response bodies byte-for-byte identical for identical inputs (SC-003); Nominatim fallback ≥1s pacing preserved under concurrency (FR-002); zero new lint/type warnings (FR-010)

**Scale/Scope**: 6 items across `backend/src/services/{civic_api,geocoder,fec_api}.rs`, `backend/src/models/mod.rs`, and (verify-only) `frontend/src/lib/api.ts`. Small diffs; no new public surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Independent Services, Independent Toolchains | ✅ | Backend and frontend items are fully separable; no cross-service coupling introduced. |
| II. Testing Standards | ✅ | Existing `wiremock`/Vitest suites cover behavior; add one test asserting concurrent Census lookups don't serialize (mirrors `geocode_census_hits_incur_no_pacing_delay`). No live-API/secret dependency. |
| III. Code Quality | ✅ | This *is* a code-quality task: removes dead duplication, no new warnings, scope-limited (no speculative abstraction beyond the six named items). |
| IV. Never Forward Raw Third-Party Responses | ✅ | No change to mapping boundary; raw `Api*` types stay private. |
| V. Security & Configuration Discipline | ✅ | No CORS/secrets/rate-limit changes. |
| VI. User Experience Consistency | ✅ | No UI change; frontend item is verification-only, error semantics already centralized in `apiFetch`. |
| VII. Performance Requirements | ✅ | Improves latency (parallel geocoding, concurrent FEC calls) without loosening caches or rate limits; no new upstream fan-out per distinct resource. |
| VIII. Centralized Documentation | ✅ | Design docs live under `specs/009-.../`; any narrative doc goes in `docs/`. |
| IX. Frontend JSX Comment Convention | ✅ | No JSX touched. |

**Gate result: PASS** — no violations, Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/009-cleanup-parallelize-geocoding/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions per item
├── data-model.md        # Phase 1 — internal helper/trait shapes (no persisted entities)
├── quickstart.md        # Phase 1 — validation/run guide
├── contracts/
│   └── README.md        # Phase 1 — "no external contract changes" statement
├── checklists/
│   └── requirements.md   # from /speckit-specify
└── tasks.md             # from /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
backend/src/
├── models/mod.rs                 # Item 4: RegistrationResponse::empty()/Default
└── services/
    ├── civic_api.rs              # Item 1 (get_voter_info loop), Item 3 (attach_finance_* merge),
    │                             #   Item 4 (registration None arms), Item 5 (fifteen_min_cache)
    ├── geocoder.rs               # Item 1 guardrail: pacing unchanged; may gain concurrency test
    └── fec_api.rs                # Item 2: concurrent totals + committee fetch

frontend/src/lib/
└── api.ts                        # Item 6: ALREADY DONE (apiFetch) — verify + test only
```

**Structure Decision**: Existing two-service web-app layout; no new modules or directories. All backend
changes are internal to four existing files; the frontend change is verification of already-landed code.

## Complexity Tracking

> No Constitution violations — section intentionally empty.
