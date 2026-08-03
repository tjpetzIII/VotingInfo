# Implementation Plan: Campaign Finance Data on Candidate Pages

**Branch**: `006-fec-campaign-finance` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-fec-campaign-finance/spec.md`

## Summary

Add federal (President/Senate/House) campaign-finance figures — total raised, total spent, cash
on hand, and top contributors — to the candidates already returned by `GET /api/elections` and
`GET /api/ballot`, sourced from the free OpenFEC API. A new `services/fec_api.rs` client (mirroring
`civic_api.rs`'s reqwest + moka cache pattern) matches each federal candidate to an FEC filing by
name + state + office; ambiguous or missing matches fail closed to "no data shown" rather than
guessing (per the spec's resolved clarification). State/local candidates are untouched. No new
routes, no persistence, no new required configuration (`FEC_API_KEY` is optional, defaults to the
public `DEMO_KEY`).

## Technical Context

**Language/Version**: Rust 1.92 (backend changes only; frontend is TypeScript/React 19 for
rendering the new field, no new frontend logic beyond that)

**Primary Dependencies**: `reqwest` + `moka` + `serde` (all already backend dependencies, reused
for the new FEC client); `wiremock` (already a dev-dependency) for test mocking; no new crates
needed.

**Storage**: N/A — in-memory cache only (`moka`), never persisted, consistent with how all Google
Civic API data is already handled (see CLAUDE.md's "Data persistence" section).

**Testing**: `cargo test` (unit tests for matching/classification logic; `wiremock`-mocked
integration tests for the enriched `/api/elections` and `/api/ballot` responses); `npm run test`
(Vitest) for the `CandidateCard` rendering changes.

**Target Platform**: Same as today — Linux server via Docker (`gcr.io/distroless/cc-debian12`),
no platform changes.

**Project Type**: Web application (existing frontend/backend split) — no structural change, this
feature only touches files inside the existing two service trees.

**Performance Goals**: No more than ~1 second of added perceptible delay on `/api/elections` /
`/api/ballot` responses (SC-005); a candidate-keyed 24h cache (research.md §4) means only the
first request for a given federal candidate pays the full FEC round-trip cost.

**Constraints**: Must stay within OpenFEC's free-tier rate limit (~40 req/hr on `DEMO_KEY`, up to
1,000 req/hr with a free `api.data.gov` key) — addressed by candidate-keyed caching (not
address-keyed) and bounded concurrent fan-out per contest (research.md §4, §6). Must fail closed
(omit data) rather than risk misattributing funding data to the wrong candidate (FR-004, FR-005).

**Scale/Scope**: Federal races only (President, U.S. Senate, U.S. House); a federal contest
typically has 2-6 candidates, bounding per-request fan-out. Same overall traffic scale as the rest
of this small, low-traffic civic-info app.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Independent Services, Independent Toolchains | PASS — all new code lives inside `backend/`; no shared-package coupling introduced. |
| II. Testing Standards | PASS (by design) — the new `fec_api.rs` MUST be tested via `wiremock`, exactly like `civic_api.rs`; no test may hit the real OpenFEC API or require `FEC_API_KEY` to pass. |
| III. Code Quality | PASS (by design) — reuses the existing `classify_level` federal/state/local heuristic (research.md §5) instead of duplicating it; no speculative abstractions beyond the one new service module the feature requires. |
| IV. Never Forward Raw Third-Party Responses | PASS (by design) — raw FEC JSON (`ApiFec*`-style private structs, mirroring the existing `Api*` convention in `civic_api.rs`) is mapped into `CampaignFinanceSummary`/`Contributor` before reaching any client. |
| V. Security & Configuration Discipline | PASS — `FEC_API_KEY` is optional and falls back to the public `DEMO_KEY` literal (same optional-config pattern as `SupabaseClient::new()`); no new required secret; CORS/rate-limiting untouched (no new routes). |
| VI. User Experience Consistency | PASS (by design) — renders inside the existing `CandidateCard` using existing Tailwind tokens and the existing react-query-backed data path (no new loading state — finance data arrives bundled in the same `/api/elections`/`/api/ballot` response). |
| VII. Performance Requirements | PASS (by design) — introduces a dedicated cache for the new external calls (24h TTL, candidate-keyed — research.md §4), satisfying "new endpoints that call an external API MUST introduce a cache." Per-contest fan-out is bounded by ballot size, not unbounded N+1. |
| VIII. Centralized Documentation | PASS — `docs/candidate-apis.md` already documents the OpenFEC research; no new scattered docs planned. |
| IX. Frontend JSX Comment Convention | PASS (by design) — any new JSX comments in `CandidateCard.tsx` will not be placed on the same line immediately after a closing tag. |

No violations identified. Complexity Tracking table below is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-fec-campaign-finance/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── candidate-finance-field.md   # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/mod.rs              # extend: CampaignFinanceSummary, Contributor;
│   │                               # add `campaign_finance` field to CandidateDetail & BallotCandidate
│   ├── services/
│   │   ├── civic_api.rs           # extend: expose/reuse classify_level for map_elections too;
│   │   │                           # call the new FEC enrichment step after map_elections/map_ballot
│   │   └── fec_api.rs              # NEW: FecApiClient (reqwest + moka, mirrors civic_api.rs pattern)
│   └── routes/elections.rs        # unchanged — no new routes, no handler signature changes
└── tests/
    └── integration/                # extend with wiremock-mocked FEC scenarios (quickstart.md)

frontend/
├── src/
│   ├── lib/api.ts                  # extend CandidateDetail/BallotCandidate types with
│   │                               # optional campaign_finance field
│   └── components/
│       ├── CandidateCard.tsx       # render funding totals + top contributors when present
│       └── CandidateCard.test.tsx  # extend coverage per quickstart.md
```

**Structure Decision**: No structural change — this is Option 2 (Web application, existing
`backend/` + `frontend/` split already in place). The feature is additive within existing module
boundaries: one new backend service module (`fec_api.rs`), extensions to existing models and one
existing service file, and rendering-only changes to one existing frontend component.

## Complexity Tracking

*Not applicable — no Constitution Check violations to justify.*
