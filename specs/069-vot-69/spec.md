# Feature Specification: Private voting data by default

**Feature Branch**: `codex/vot-69`
**Created**: 2026-09-09
**Status**: Approved for implementation
**Input**: Keep address and voting state session-only by default, provide explicit persistence and clear-data controls, and make shared links address-free unless explicitly opted in.

## User Scenarios & Testing

### User Story 1 - Private lookup (Priority: P1)
An anonymous voter can look up information without the address being persisted beyond the session.
**Independent Test**: Submit an address and inspect storage, reload behavior, and query state.

### User Story 2 - Clear data (Priority: P1)
A voter can immediately clear address, election, plan, cache, and in-flight results.
**Independent Test**: Start a lookup, activate clear, then resolve the old request and verify no stale data returns.

### User Story 3 - Safe sharing (Priority: P2)
A voter can share an address-free preview by default and explicitly opt into including the address.
**Independent Test**: Generate both link modes and inspect URL parameters and accessible labels in English and Spanish.

## Requirements

- **FR-001**: Address persistence MUST default to session-only; durable persistence MUST require explicit opt-in.
- **FR-002**: Existing durable address data MUST migrate only after an explicit user choice and remain removable.
- **FR-003**: Clear voting data MUST clear address, election selection, plan state, browser caches, query caches, and invalidate in-flight responses.
- **FR-004**: Shared links MUST omit address by default and provide an explicit include-address preview before adding it.
- **FR-005**: Controls MUST be keyboard accessible, screen-reader labeled, and translated in English and Spanish.
- **FR-006**: Locale, authentication, and anonymous lookup behavior MUST remain available.

## Success Criteria

- **SC-001**: A default lookup leaves no address in localStorage.
- **SC-002**: After clearing, a previously started request cannot repopulate visible voting data.
- **SC-003**: Default shared URLs contain no address; opted-in URLs contain one only after confirmation.

## Assumptions
- Session storage is acceptable for a single browser session.
- React Query is the authoritative client query cache.
