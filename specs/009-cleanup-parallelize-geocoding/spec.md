# Feature Specification: Backend/Frontend Cleanup — Parallelize Geocoding + De-duplicate Boilerplate

**Feature Branch**: `009-cleanup-parallelize-geocoding`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "the linear ticket vot-61" (VOT-61 — Backend/frontend cleanup: parallelize geocoding + de-duplicate mapping/fetch boilerplate)

## Overview

This is a **behavior-preserving structural cleanup**: simplify code and pick up performance wins without changing any observable behavior, response shape, or public API. It bundles six independent improvements, each landable as its own small PR. The primary beneficiary is the maintainer (a smaller, less duplicated codebase), with a secondary user-facing benefit: voters looking up an address with many polling locations get their results faster because geocoding stops running one location at a time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster polling-location lookup (Priority: P1)

A voter submits an address whose voter-info result contains several polling locations. Today each location's coordinates are resolved one after another, so the response is only as fast as the sum of every geocoding round-trip. After this change the coordinate lookups happen concurrently, so total wait time is governed by the slowest single lookup rather than their sum — while the returned data is byte-for-byte identical.

**Why this priority**: This is the single largest, most user-visible win in the ticket and the one behavior (latency) an end user can actually perceive. It stands alone as a valuable slice.

**Independent Test**: Request voter info for an address returning N polling locations; confirm the response body is identical to before, and that wall-clock time reflects concurrent (not summed) coordinate resolution.

**Acceptance Scenarios**:

1. **Given** an address that returns multiple polling locations resolvable by the primary (unpaced) geocoder, **When** voter info is requested, **Then** all coordinates are resolved concurrently and the response payload is identical to the pre-change payload.
2. **Given** one or more locations that fall back to the paced secondary geocoder, **When** voter info is requested, **Then** the mandatory ≥1-second pacing between those fallback calls is still honored (the guardrail is not broken by parallelization).
3. **Given** the existing automated test suites, **When** they are run after the change, **Then** they pass unchanged, plus a test asserts that concurrent primary-geocoder lookups do not incur serialized pacing delay.

---

### User Story 2 - Maintainer works with de-duplicated code (Priority: P2)

A maintainer extending finance enrichment, registration mapping, cache setup, or a frontend data fetcher encounters a single canonical implementation rather than two-to-seven near-identical copies. Changing shared behavior (e.g. the error-message format, the cache TTL) means editing one place, eliminating the risk that copies drift apart.

**Why this priority**: High maintainability value and it removes real drift risk, but it is invisible to end users, so it ranks below the latency win.

**Independent Test**: Inspect each targeted area and confirm the duplicated logic now flows through one shared helper/constructor; run both test suites and confirm identical behavior.

**Acceptance Scenarios**:

1. **Given** the two near-identical finance-attachment routines, **When** they are unified behind one shared helper parameterized by the federal-eligibility rule, **Then** finance enrichment on both the elections and ballot paths produces identical output to before.
2. **Given** the empty/all-absent registration result spelled out in three places, **When** a single canonical empty constructor is introduced, **Then** every registration response (including fallback and no-data paths) is unchanged.
3. **Given** the repeated cache-builder and per-endpoint fetch error-handling blocks, **When** each is replaced by one shared helper, **Then** cache TTL behavior and every endpoint's error/404 semantics are unchanged.

---

### User Story 3 - Lower per-candidate latency on federal races (Priority: P3)

A voter viewing a federal contest triggers campaign-finance enrichment. Two independent upstream lookups that currently run sequentially per candidate run concurrently instead, shaving latency, while the enriched data is unchanged.

**Why this priority**: A minor, lower-frequency latency improvement explicitly called out as lower priority than Story 1; still user-adjacent but small.

**Independent Test**: Request a federal contest and confirm the two independent finance lookups run concurrently while the dependent lookup still runs afterward, with identical enriched output.

**Acceptance Scenarios**:

1. **Given** a federal candidate needing finance enrichment, **When** the two independent upstream lookups are issued, **Then** they run concurrently and the dependent (committee-derived) lookup still runs only after its prerequisite completes.
2. **Given** the enriched contest response, **When** compared to the pre-change response, **Then** it is identical.

---

### Edge Cases

- **All locations use the paced fallback geocoder**: parallelization must not let fallback calls violate the ≥1-second spacing; they still queue behind the shared pacing guard.
- **A geocode lookup fails or returns no match for one location**: that single failure must be isolated to its own location (same behavior as today) and must not abort or corrupt the other concurrent lookups.
- **Zero or one polling location**: parallel and sequential paths must be equivalent; no regression for the trivial cases.
- **Finance enrichment where no candidate is federal / no confident match exists**: unified helper must reproduce today's fail-closed "no data" behavior.
- **Registration with no upstream data**: the canonical empty constructor must yield exactly the same all-absent result as the three hand-written copies.
- **Frontend fetch of an endpoint that returns 404**: the shared fetch helper must still surface the endpoint-specific not-found message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST resolve coordinates for a voter-info result's multiple polling locations concurrently rather than strictly one-at-a-time, following the same concurrency pattern already used by the federal finance batch resolver.
- **FR-002**: The system MUST preserve the mandatory ≥1-second pacing for the paced fallback geocoder under concurrent callers; parallelization applies only to the unpaced primary path.
- **FR-003**: The two independent upstream finance lookups for a federal candidate MUST run concurrently, with any dependent lookup still executed only after its prerequisite completes.
- **FR-004**: The two near-identical finance-attachment routines MUST be collapsed into one shared implementation parameterized by how federal-eligibility is decided, producing identical enrichment output for both the elections and ballot paths.
- **FR-005**: The all-absent registration result MUST be produced from a single canonical empty constructor rather than being spelled out separately in each place it is needed.
- **FR-006**: The repeated cache construction with the shared 15-minute time-to-live MUST be produced by a single shared helper so the TTL is defined in exactly one place.
- **FR-007**: The frontend data fetchers MUST route their success/error handling (including the per-endpoint not-found message) through one shared fetch helper, with the ballot channel-normalization post-processing retained in its own wrapper.
- **FR-008**: Every change MUST be behavior-preserving — no change to any endpoint's response shape, field values, ordering, error codes, error messages, cache TTLs, or rate-limiting bounds.
- **FR-009**: All existing automated tests MUST continue to pass without modification, except additions; a test MUST assert that concurrent primary-geocoder lookups do not serialize.
- **FR-010**: The changes MUST introduce no new linter or type-check warnings in either service.
- **FR-011**: The intentional per-state scraper plug-in pattern and the test-injection constructor family MUST be left unchanged (explicit non-goals).

### Key Entities *(include if feature involves data)*

- **Polling location coordinate**: the resolved latitude/longitude for one polling place; today resolved serially, to be resolved concurrently. No change to its shape or values.
- **Campaign-finance enrichment**: the optional upstream-sourced finance data attached to federal candidates on the elections and ballot paths. No change to its shape or values.
- **Empty registration result**: the canonical "no registration data available" response; today duplicated, to become one constructor. No change to its shape or values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For an address returning N polling locations resolvable by the primary geocoder, total coordinate-resolution wait time scales with the slowest single lookup rather than the sum of all N, with no change to the returned data.
- **SC-002**: 100% of existing backend and frontend automated tests pass after the change, with zero test modifications required (additions only).
- **SC-003**: Response bodies for the voter-info, elections, ballot, and registration endpoints are byte-for-byte identical before and after the change for the same inputs.
- **SC-004**: The duplicated code identified in the ticket is reduced to a single canonical copy in each of the six areas, measurably lowering total line count in the touched files.
- **SC-005**: Both services build and lint with zero new warnings.
- **SC-006**: Each of the six items can be reviewed and merged as an independent, self-contained change.

## Assumptions

- The primary geocoder remains unpaced (established by the prior VOT-59 migration), which is what makes parallelizing the primary path safe.
- The paced fallback geocoder's existing shared pacing guard already serializes correctly under concurrent callers, so no new pacing mechanism is needed.
- "Behavior-preserving" is judged against the current automated test suites plus response-equivalence for the same inputs; these refactors are expected to need no test changes beyond the one added concurrency assertion.
- The finance-attachment unification, registration constructor, cache helper, and frontend fetch helper are internal implementation details with no externally observable contract, so they can change freely as long as outputs match.
- Each of the six items is independent and may land in any order or as separate pull requests.
