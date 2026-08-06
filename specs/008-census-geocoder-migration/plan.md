# Implementation Plan: Census Geocoder Migration for Polling Locations

**Branch**: `008-census-geocoder-migration` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-census-geocoder-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`GeocoderClient` (`backend/src/services/geocoder.rs`) currently geocodes every polling-location
address via Nominatim, serialized ≥1s apart per Nominatim's usage policy — real latency on
`/polling` when an address returns several locations. This feature makes the free, keyless,
US-only Census Bureau Geocoder the primary lookup source (unpaced), keeps Nominatim as a fallback
for addresses Census can't match (still paced, since Nominatim's usage policy still applies to it),
and preserves the existing public `geocode(&self, address: &str) -> Option<(f64, f64)>` contract
and 24h cache so no caller (`civic_api.rs`) or downstream API response shape changes. The swap to
Census-as-primary is gated on a documented spike comparing match rate/accuracy against Nominatim on
a representative sample of polling-location-style addresses, including non-standard formats.

## Technical Context

**Language/Version**: Rust 1.92 (existing backend toolchain; no new language/runtime)

**Primary Dependencies**: `reqwest` (HTTP client), `moka` (in-memory TTL cache), `serde`
(deserialization), `tokio::sync::Mutex` (pacing) — all already used by `services/geocoder.rs` and
`services/fec_api.rs`; no new crate is required for the Census Geocoder client, which is a plain
JSON REST API.

**Storage**: N/A — coordinates remain cached in-memory only (`moka`, 24h TTL, per Principle VII),
never persisted to Supabase. No schema/migration changes.

**Testing**: `cargo test`, with `wiremock` mocking both the Census Geocoder and Nominatim base URLs
(mirrors the existing `new_with_base_url` test pattern in `geocoder.rs`), per Constitution
Principle II — no live network calls in automated tests.

**Target Platform**: Linux server (existing backend Docker/distroless deployment) — no new
deployment target.

**Project Type**: Web service (backend-only change; this repo's frontend/backend structure per
Constitution Principle I). No frontend code changes — the JSON shape `civic_api.rs` attaches to
polling locations is unchanged (FR-009).

**Performance Goals**: Reduce time-to-coordinates for a multi-location address by removing the
mandatory 1s-per-request pacing from the (now primary) Census path (SC-001: ≥60% reduction for a
5-location address). Fallback-only requests keep today's pacing since Nominatim's policy still
applies to them.

**Constraints**: Exactly one upstream call per address on the happy path (Census hit), at most two
on the fallback path (Census miss → Nominatim) — no new N+1 fan-out, per Principle VII. No new
secrets/config (Census Geocoder needs no API key) — Principle V untouched. Public `GeocoderClient`
interface and cache semantics must stay stable so `civic_api.rs` requires no changes beyond
construction.

**Scale/Scope**: Single backend service module (`services/geocoder.rs`, plus a new
`services/census_geocoder.rs`), scoped to the existing polling-location coordinate lookup path
only — no other feature depends on `GeocoderClient` (confirmed via grep, see spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Independent Services, Independent Toolchains | PASS | Backend-only change; no cross-service coupling introduced. |
| II. Testing Standards | PASS (design intent) | New Census path and fallback path both get `wiremock`-backed unit tests, no live network/secrets; matches the existing `geocoder.rs` test style. |
| III. Code Quality | PASS | Change scoped to the geocoding service layer only; no unrelated refactors. `cargo clippy` must stay clean. |
| IV. Never Forward Raw Third-Party Responses | PASS | `GeocoderClient::geocode` continues to return a plain `Option<(f64, f64)>`, not raw Census/Nominatim JSON — same as today. |
| V. Security & Configuration Discipline | PASS | No new secrets (Census Geocoder is keyless); CORS/rate-limiting untouched. |
| VI. User Experience Consistency | PASS (indirect) | No frontend changes; `/polling` benefits from lower backend latency within its existing loading-state UX. |
| VII. Performance Requirements | PASS (with explicit design constraint) | Must not exceed 1 call/address on a Census hit, 2 on a miss; 24h cache retained; per-IP rate-limit bounds unchanged; pacing relaxed only for the primary (Census) path, per FR-004/FR-005. |
| VIII. Centralized Documentation | PASS | Spike findings report lives under `docs/` (see research.md), not scattered in the feature folder. |
| IX. Frontend JSX Comment Convention | N/A | No frontend code touched. |

No violations — Complexity Tracking is not needed.

**Post-Phase-1 re-check**: Design artifacts (research.md, data-model.md, contracts/,
quickstart.md) confirm the plan holds each gate above — in particular, `contracts/geocoder-client-
interface.md` locks in that `civic_api.rs` needs no changes (Principle IV), and
`contracts/census-geocoder-api.md`/`nominatim-fallback-api.md` keep the 1-or-2-calls-per-address
bound from Principle VII. No new violations surfaced during design; still PASS across the board.

## Project Structure

### Documentation (this feature)

```text
specs/008-census-geocoder-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/
│   │   ├── geocoder.rs           # MODIFIED: becomes the primary+fallback orchestrator
│   │   │                         #   (owns the 24h moka cache; delegates to census_geocoder
│   │   │                         #   and its own existing paced Nominatim fetch)
│   │   ├── census_geocoder.rs    # NEW: Census Bureau Geocoder client (see contracts/)
│   │   └── civic_api.rs          # UNCHANGED call site (`self.geocoder.geocode(&addr)`)
│   └── lib.rs                    # UNCHANGED (GeocoderClient construction stays inside civic_api.rs)
└── tests/                        # existing integration tests unaffected (no route/response
                                   #   shape changes — polling-location JSON is identical)

docs/
└── census-geocoder-spike.md      # NEW: spike findings report (User Story 3 / FR-006, FR-007)
```

**Structure Decision**: Reuses the existing Option 2 (web application) layout already in place —
this is a backend-only change confined to `backend/src/services/`. No new top-level directories,
no frontend changes. The public `GeocoderClient` type and its `geocode()` signature stay in
`geocoder.rs` so `civic_api.rs` (the sole call site) requires no changes; a new `CensusGeocoderClient`
module is added alongside it, following the same pattern as `FecApiClient` living next to
`civic_api.rs`. The spike report is written to `docs/` per Constitution Principle VIII rather than
into the feature's `specs/` folder, since it documents a decision about production code, not the
planning process itself.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
