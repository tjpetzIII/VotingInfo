# Feature Specification: Native Dependency Audit Evidence

**Feature Branch**: `040-vot-40`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: Verify whether the quinn/quinn-proto and anyhow/wit-bindgen dependency chains are inactive for the native backend, document exact cargo tree evidence and future re-evaluation triggers, and avoid product behavior changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review native advisory applicability (Priority: P1)

As a maintainer reviewing dependency advisories, I need a durable, reproducible record of whether the reported dependency chains are compiled by the native backend so that lockfile-only findings are not mistaken for runtime exposure.

**Why this priority**: Correctly distinguishing resolved lockfile entries from compiled native dependencies prevents both missed remediation and wasted emergency work.

**Independent Test**: A reviewer can run the documented Cargo commands from the backend and compare their deterministic output with the recorded conclusion.

**Acceptance Scenarios**:

1. **Given** the current backend manifest and lockfile, **When** a reviewer inspects the documented inverse dependency evidence for `quinn`/`quinn-proto`, **Then** the record states whether a live native path exists and identifies the relevant `reqwest` feature configuration.
2. **Given** the current backend dependency graph, **When** a reviewer inspects the `anyhow`/`wit-bindgen` chain and target scope, **Then** the record explains why WASI-only edges do or do not compile for native targets.
3. **Given** a future change enables `reqwest` HTTP/3 or adds a `wasm32-wasip*` build, **When** the dependency audit is revisited, **Then** the record identifies both changes as triggers for re-evaluating the advisories.

### Edge Cases

- Cargo tree output may differ by target or feature selection; the record must name the command and target scope used rather than claim universal applicability from a single lockfile scan.
- A future dependency or feature change may make either chain reachable; the conclusion is valid only for the documented manifest and targets.
- Audit tooling may report advisories for resolved but inactive packages; raw scanner output alone is insufficient evidence of native runtime exposure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST record whether `quinn` and `quinn-proto` have a live dependency path in the native backend dependency graph, including the exact Cargo evidence used.
- **FR-002**: The project MUST record the target-specific reachability analysis for `anyhow`, `wit-bindgen`, and `wit-component`, including the relevant `getrandom` WASI edges.
- **FR-003**: The project MUST identify the manifest features and target changes that require re-evaluation of either advisory chain.
- **FR-004**: The audit record MUST distinguish lockfile resolution from native compilation and MUST avoid changing product behavior or claiming that an advisory is globally irrelevant.
- **FR-005**: The documented checks MUST be reproducible without network access or secrets when the dependency sources and Cargo cache are available.

### Key Entities

- **Dependency evidence record**: A dated maintainer-facing record containing commands, target/feature scope, observed graph result, conclusion, and re-evaluation triggers.
- **Dependency chain**: A set of resolved packages and feature/target edges whose reachability determines whether an advisory applies to the native backend.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can locate one documentation record containing the exact commands and conclusions for both dependency chains.
- **SC-002**: The documented Cargo checks complete deterministically on the current backend checkout with no network or secret requirement.
- **SC-003**: Every conclusion names its target/feature scope and lists the concrete changes that invalidate it.
- **SC-004**: The change contains no modifications to runtime behavior, APIs, database schema, or frontend behavior.

## Assumptions

- The current native backend targets are macOS and Linux; WASI targets are outside the shipped backend build unless explicitly added later.
- The repository lockfile and manifest are the source of truth for the audit snapshot.
- A concise durable note under `docs/` is sufficient; no new audit service or CI integration is required.
