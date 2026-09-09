# Feature Specification: Audit Rand and Logging Dependency Paths

**Feature Branch**: `037-vot-37`
**Created**: 2026-09-09
**Status**: Complete
**Input**: User description: Audit the reported rand and logging dependency paths, determine whether an update is needed, and preserve evidence for future reviews.

## User Scenarios & Testing

### User Story 1 - Verify dependency applicability (Priority: P1)

As a maintainer, I need to know which rand and logging packages are compiled by the native backend so that advisory reports can be acted on accurately.

**Why this priority**: Reachability determines whether a reported package affects the shipped service.

**Independent Test**: Run target-specific inverse `cargo tree` queries and inspect the lockfile package versions and dependency edges.

**Acceptance Scenarios**:

1. **Given** the current backend manifest and lockfile, **When** a maintainer reviews the audit, **Then** the report identifies every resolved rand package and its native consumer path.
2. **Given** the current logging setup, **When** a maintainer reviews request logging, **Then** the report identifies the configured filter, output layer, and logged fields.

### User Story 2 - Preserve an update decision (Priority: P2)

As a maintainer, I need a reproducible record of whether Cargo can safely reach patched versions so that future dependency updates have a clear starting point.

**Why this priority**: A documented no-change decision prevents unsafe or unnecessary lockfile churn.

**Independent Test**: Repeat the documented offline graph/build checks and compare versions with the recorded snapshot.

**Acceptance Scenarios**:

1. **Given** an unavailable registry, **When** `cargo update --dry-run` is attempted, **Then** the audit records the failure and does not claim an update occurred.
2. **Given** the native lockfile snapshot, **When** tests and checks run offline, **Then** they pass without changing application behavior.

## Edge Cases

- Cargo may list target-specific or dev-only packages that are absent from the native runtime graph.
- A future feature or target can make an currently inactive rand path reachable and requires a new audit.
- Request paths may contain sensitive query data; the existing middleware logs only the URI path.

## Requirements

### Functional Requirements

- **FR-001**: The project MUST record exact resolved versions for rand, rand_core, rand_chacha, log, tracing, and tracing-subscriber relevant to the backend.
- **FR-002**: The project MUST record target-aware inverse dependency evidence for rand packages, including the absence of rand 0.8 in the lockfile when applicable.
- **FR-003**: The project MUST document the backend logging filter, output layer, and fields emitted by request middleware.
- **FR-004**: The project MUST record whether a safe Cargo update was possible and distinguish a network failure from a successful update.
- **FR-005**: The audit MUST identify manifest, feature, target, and advisory changes that invalidate its conclusions.
- **FR-006**: The audit MUST avoid unrelated source or product behavior changes when the resolved packages are already patched or unreachable.

## Key Entities

- **Dependency snapshot**: Exact package versions and target-specific graph paths resolved by Cargo.
- **Logging configuration**: Runtime filter, formatter/output layer, and request fields emitted by the backend.
- **Audit record**: Dated commands, results, conclusion, and re-evaluation triggers.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A reviewer can identify the native rand path and all relevant resolved versions from one root documentation note in under five minutes.
- **SC-002**: Every documented command is reproducible from `backend/` using the shared target directory when the local Cargo cache is available.
- **SC-003**: Native `cargo check`, tests, clippy, and formatting checks provide recorded validation for the audit change.
- **SC-004**: No application source behavior changes are required solely to resolve this audit.

## Assumptions

- The shipped backend target is the native platform used by CI and Docker; WASI/wasm targets are outside this audit.
- Cargo.lock is authoritative for the reviewed checkout.
- Registry access may be unavailable in the audit environment, so offline evidence is acceptable when explicitly recorded.
