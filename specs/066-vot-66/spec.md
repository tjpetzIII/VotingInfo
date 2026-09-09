# Feature Specification: Durable election-data refresh worker

**Feature Branch**: `codex/vot-66`
**Created**: 2026-09-09
**Status**: Approved for implementation
**Input**: Deployable scheduled/manual refresh with leases, bounded retries, last-good snapshots, safe status metadata, and authenticated writes.

## User Scenarios & Testing

### User Story 1 - Reliable scheduled refresh (Priority: P1)
Operators can refresh all supported state election data on a schedule or invoke the same job manually.
**Independent Test**: Run the worker against deterministic mock scrapers and persistence, asserting concurrency, retry, timeout, and lease behavior.

### User Story 2 - Safe voter data (Priority: P1)
Voters continue seeing the previous good snapshot when a refresh fails, with no partial destructive replacement.
**Independent Test**: Force a failed refresh after a good snapshot and verify reads remain on the good version and status exposes only safe metadata.

### User Story 3 - Protected operations (Priority: P1)
Only an authenticated operator can trigger a manual refresh or inspect operational status.
**Independent Test**: Exercise write endpoints with missing, invalid, and valid credentials.

## Edge Cases
- A second worker encountering an active lease skips work without overwriting it.
- Individual state failures do not prevent other states from refreshing.
- Retries are bounded and timeouts cannot leave a lease indefinitely active.
- Status never includes credentials, upstream response bodies, or raw URLs.

## Requirements

### Functional Requirements
- **FR-001**: The system MUST expose one worker implementation usable by both a scheduled process and an authenticated manual command/endpoint.
- **FR-002**: Refresh execution MUST acquire a durable lease with expiry and owner identity before work, and release or expire it afterward.
- **FR-003**: State refreshes MUST use bounded concurrency, per-attempt timeouts, and bounded retries with deterministic backoff.
- **FR-004**: A successful refresh MUST publish a complete versioned snapshot atomically; failed refreshes MUST preserve the last successful snapshot.
- **FR-005**: Operational status MUST expose sanitized state, timestamps, counts, and failure categories without secrets or upstream payloads.
- **FR-006**: Manual write operations MUST require a secret from server configuration and constant-time credential comparison.
- **FR-007**: Persistence schema MUST support leases, snapshot versions, and refresh status with migration-safe defaults.
- **FR-008**: Tests MUST be deterministic and require no live API or secret.

## Success Criteria
- **SC-001**: Concurrent workers never publish conflicting snapshots for the same lease.
- **SC-002**: One failed state leaves all previously published voter data readable.
- **SC-003**: A refresh attempt performs no more than the configured retry count per state and cannot exceed its timeout.
- **SC-004**: Unauthorized manual requests are rejected and authorized requests cannot expose secret material.

## Assumptions
- Supabase is the durable store already used by scraper routes.
- Existing state scraper registry remains the source of supported states.
- Scheduled deployment may invoke a dedicated backend binary or an external scheduler calling the protected endpoint.
