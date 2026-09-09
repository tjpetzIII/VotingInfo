# Feature Specification: VOT-28 API rate-limit and error hardening

**Feature Branch**: `codex/vot-28`
**Created**: 2026-09-09
**Status**: Approved for implementation
**Input**: Audit and harden API rate limiting and typed error responses while preserving existing behavior.

## User Scenarios & Testing

### User Story 1 - Protected API access (Priority: P1)
Voters can use the API while excessive requests from one client are throttled.

**Independent Test**: Exercise the production router with repeated requests from one IP and inspect the limit response.

**Acceptance Scenarios**:
1. Given a request to `/api/*`, when the client is within the configured allowance, then it is handled normally.
2. Given a client has exhausted its allowance, when it requests `/api/*`, then it receives HTTP 429 with the project's JSON error contract.
3. Given a request to `/health`, when any client calls it, then health remains available and is not rate limited.

### User Story 2 - Safe failures (Priority: P1)
Voters receive stable, actionable error codes without upstream response bodies, URLs, or internal details.

**Independent Test**: Convert representative typed errors and governor rejection errors to responses and assert status, JSON shape, and absence of sensitive details.

**Acceptance Scenarios**:
1. Given an upstream HTTP or transport failure, when it is returned to a client, then the response uses the existing typed code and a safe generic message.
2. Given invalid voter input, when validation fails, then the existing validation status and message remain available.

## Edge Cases

- Rate-limit rejection metadata may include retry headers; those headers remain available.
- An upstream error body may contain credentials or arbitrary text and must never be copied into a client response.
- Existing CORS allowlist, governor period and burst, cache TTLs, routes, and success response models remain unchanged.

## Requirements

### Functional Requirements

- **FR-001**: All `/api/*` routes MUST remain protected by per-IP throttling with a two-second period and burst of 30.
- **FR-002**: Rate-limit rejections MUST use the project's JSON error shape with `code` `RATE_LIMITED` and HTTP 429.
- **FR-003**: Health MUST remain available independently of API throttling.
- **FR-004**: External API, transport, scraper, and configuration failures MUST map to stable typed codes without exposing raw upstream bodies, URLs, headers, or implementation details.
- **FR-005**: Existing CORS origins, methods, headers, cache behavior, route paths, success responses, and validation semantics MUST be preserved.
- **FR-006**: Deterministic tests MUST cover rate-limit rejection formatting and safe error mapping without live services or secrets.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every throttled rejection returns HTTP 429 and valid JSON containing `error` and `code`.
- **SC-002**: No response generated for an external or middleware failure contains a supplied upstream body, URL, or secret-like query value.
- **SC-003**: Existing backend tests and production checks pass with no route, CORS, cache, or success-contract regressions.

## Assumptions

- The current governor limits and explicit localhost origin are intentional production contracts.
- Internal detailed error values remain available to server logs/debugging while client messages are sanitized.
