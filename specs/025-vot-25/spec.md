# Feature Specification: Privacy-aware address deep links

**Feature Branch**: `codex/vot-25`
**Created**: 2026-09-09
**Status**: Approved for implementation

## User Scenarios & Testing
### User Story 1 - Reopen a lookup (Priority: P1)
A voter can open an address deep link and repeat the anonymous lookup without durable persistence.
### User Story 2 - Share safely (Priority: P1)
A voter receives an address-free link by default and explicitly opts into an address-bearing link.

## Requirements
- **FR-001**: Address query values MUST be encoded with URL APIs and decoded only as lookup input.
- **FR-002**: Opening or generating a deep link MUST NOT implicitly persist the address durably.
- **FR-003**: Shared links MUST omit address by default; inclusion MUST require explicit consent.
- **FR-004**: Deep links MUST preserve election/contest identity without leaking unrelated query data.
- **FR-005**: Clipboard failure MUST provide an accessible manual-copy fallback in English and Spanish.

## Success Criteria
- **SC-001**: Round-tripping an address containing punctuation and apartment text preserves its value.
- **SC-002**: Default share URLs contain no `address` parameter and opt-in URLs contain exactly one encoded value.
- **SC-003**: Deep-link opening leaves localStorage unchanged.

## Assumptions
- Session-only address behavior and explicit include-address controls from VOT-69 are authoritative.
