# Implementation Plan: Contests & Candidates API Route

**Branch**: `001-contests-candidates-api` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-contests-candidates-api/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a new `GET /api/ballot?address=` backend endpoint that returns every contest a voter can
vote on for a given address, sorted Federal → State → Local, with full candidate bio/contact
details, omitting (not null-ing) any field the Civic API doesn't have. Implemented as new,
additive types and a new cached client method alongside the existing `/api/elections` code path,
so existing endpoints are unaffected (see research.md for why nothing is reused/modified
directly).

## Technical Context

**Language/Version**: Rust 1.92 (backend only — no frontend changes in this feature; see spec.md
Assumptions)

**Primary Dependencies**: Axum 0.7, reqwest 0.12, serde/serde_json, moka 0.12 (cache),
tower_governor 0.4 (rate limiting) — all already present in `backend/Cargo.toml`; no new
dependencies required

**Storage**: N/A — no persistent storage; data is fetched live from the Google Civic API and
held only in an in-memory `moka` cache (15-minute TTL, matching the other three caches)

**Testing**: `cargo test` — unit tests for the `level` → Federal/State/Local mapping/sort
function, `wiremock`-backed integration tests for the route end-to-end; `cargo clippy`

**Target Platform**: Linux server — same distroless Docker image / docker-compose backend
service as the rest of the backend

**Project Type**: web-service — one new route within the existing Axum backend service

**Performance Goals**: Repeat lookups for the same address served from cache within the existing
15-minute window (SC-004); exactly one upstream Civic API call per request, no N+1 fan-out

**Constraints**: MUST NOT change the response shape or behavior of `/api/elections`,
`/api/voter-info`, `/api/registration`, or `/api/elections/dates`; optional fields MUST be
omitted rather than serialized as `null`; existing per-IP rate-limit bounds
(`tower_governor`, 2s period / 30 burst) unchanged

**Scale/Scope**: One new route handler (`routes/elections.rs`), one new `CivicApiClient` method
+ cache (`services/civic_api.rs`), three new response types (`BallotResponse`, `BallotContest`,
`BallotCandidate`) plus a `BallotLevel` enum — reusing the existing `Election` and `Channel`
types rather than duplicating them (see research.md / data-model.md)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Independent Services, Independent Toolchains | PASS | Backend-only change; no cross-service coupling introduced. |
| II. Testing Standards | PASS (planned) | New route ships with a `wiremock`-backed integration test and a unit test for the level-mapping function; no live API/secrets in tests. |
| III. Code Quality | PASS (planned) | Reuses existing patterns (`AddressQuery`, cache-per-endpoint, `skip_serializing_if`); no new file, no speculative abstraction — `Channel`/`Election` reused rather than duplicated (research.md). |
| IV. Never Forward Raw Third-Party Responses | PASS | New `map_ballot` function maps raw `ApiContest`/`ApiCandidate` into `BallotResponse`; raw Civic API JSON never reaches the client. |
| V. Security & Configuration Discipline | PASS | Route sits under the existing `/api/*` nest, inheriting CORS allowlist and per-IP rate limiting; no new secrets/config. |
| VI. User Experience Consistency | N/A (this feature) | Backend-only; no frontend page consumes this route yet. Any future frontend work consuming `/api/ballot` must follow this principle at that time. |
| VII. Performance Requirements | PASS | New dedicated cache with the standard 15-min TTL; single upstream call per request; rate-limit bounds untouched. |
| VIII. Centralized Documentation | PASS | All feature docs live under `specs/001-contests-candidates-api/`; `CLAUDE.md`'s API Endpoints table gets a new row as an implementation task. |
| IX. Frontend JSX Comment Convention | N/A (this feature) | No JSX touched. |

No violations. Complexity Tracking table below is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-contests-candidates-api/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── get-ballot.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This repo is the existing "Web application" shape (frontend + backend, per `CLAUDE.md`), and
this feature touches backend only:

```text
backend/
├── src/
│   ├── models/mod.rs          # add BallotLevel, BallotContest, BallotCandidate, BallotResponse
│   ├── services/civic_api.rs  # add ballot_cache, get_ballot(), map_ballot()
│   ├── routes/elections.rs    # add get_ballot handler (reuses existing AddressQuery)
│   └── main.rs                # wire GET /api/ballot into the router
└── tests/
    └── integration/           # add wiremock-backed /api/ballot test(s)

CLAUDE.md                      # add /api/ballot row to the API Endpoints table
```

No frontend changes in this feature (see spec.md Assumptions and Constitution Check note on
Principle VI above).

**Structure Decision**: Extend the existing single-file-per-concern layout in
`backend/src/routes/elections.rs` and `backend/src/services/civic_api.rs` rather than creating
new modules — this is the smallest change consistent with how every other address-based
endpoint in this codebase is already organized (see research.md).

**Constitution Check (post-design)**: Re-evaluated after Phase 1. The decision to reuse the
existing `Channel` and `Election` types (data-model.md) rather than duplicating them strengthens
Principle III compliance beyond the pre-design check; no new violations were introduced by the
data model or contract. Table above still holds.

## Complexity Tracking

Not applicable — no Constitution Check violations.
