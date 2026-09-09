# Feature Specification: VOT-41 Backend framework migration verification

**Feature Branch**: `codex/vot-41`
**Created**: 2026-09-09
**Status**: Approved for implementation
**Input**: Complete VOT-41, upgrading the backend framework without changing voter-facing behavior.

## User Scenarios & Testing

### User Story 1 - Existing voting information remains available (Priority: P1)
Voters can continue requesting election, ballot, registration and date information after routine backend maintenance.

**Why this priority**: Dependency maintenance must preserve the application's core journeys.
**Independent Test**: Run the complete existing backend test suite with local upstream substitutes and no secrets.
**Acceptance Scenarios**:
1. **Given** valid supported requests, **When** the upgraded service handles them, **Then** existing response shapes and statuses remain unchanged.
2. **Given** invalid or missing input, **When** a voter requests information, **Then** existing validation and error mapping remain intact.
3. **Given** a running service, **When** health is requested, **Then** the service returns its existing successful health response.

### User Story 2 - State routes remain correctly registered (Priority: P2)
Operators can depend on each supported state's read and refresh routes being registered after maintenance.

**Why this priority**: Generated paths can evade migration reviews that inspect only handwritten routes.
**Independent Test**: Probe every registered state route using unsupported HTTP methods to verify route and method matching without contacting upstream services.
**Acceptance Scenarios**:
1. **Given** a supported state, **When** a request uses the wrong method for its registered path, **Then** the service rejects the method and identifies the permitted method.
2. **Given** an unsupported state, **When** its read or refresh path is requested, **Then** the service reports no matching route.

### Edge Cases
- Generated routes are literal per-state paths, not variable captures.
- Missing query parameters must still be rejected before upstream requests.
- Unsupported methods must not trigger scraping or database writes.

## Requirements

### Functional Requirements
- **FR-001**: Backend maintenance MUST preserve all existing public request paths, methods, response models and error behavior.
- **FR-002**: Every supported state's read and refresh route MUST remain registered; unsupported states MUST remain unmatched.
- **FR-003**: The service MUST retain explicit allowed origins, per-IP API throttling, health availability and existing cache limits.
- **FR-004**: Maintainers MUST have accurate framework-version and migration guidance consistent with the supported dependency.
- **FR-005**: Validation MUST cover the complete backend test suite and production compilation without requiring live upstream services or secrets.

## Success Criteria

### Measurable Outcomes
- **SC-001**: All existing backend acceptance checks pass after maintenance with no response-contract regression.
- **SC-002**: Every registered state passes read/refresh method routing checks and unsupported-state paths return not found.
- **SC-003**: Maintenance introduces zero new compiler, lint or formatting defects; pre-existing defects are documented distinctly.

## Assumptions
- The issue's dependency baseline may be stale; an already completed version upgrade is retained and verified rather than repeated.
- This is maintenance, with no new endpoint, data model, UI, live scraping, database migration or deployment.
- Existing unrelated test timing or formatting issues are recorded for the coordinating agent instead of broadening this ticket.
