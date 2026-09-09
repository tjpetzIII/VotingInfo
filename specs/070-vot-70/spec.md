# Feature Specification: Personal voting plan

**Feature Branch**: `codex/vot-70`
**Created**: 2026-09-09
**Status**: Approved for implementation

## User Scenarios & Testing
### User Story 1 - Build a plan (Priority: P1)
A voter records a voting method, date, site, and self-reported checklist locally.
### User Story 2 - Review safely (Priority: P1)
The voter sees stale/changed-data flags and can reset the plan; no candidate or party data is stored.
### User Story 3 - Print/share (Priority: P2)
A voter prints or previews a privacy-aware plan with optional persistence.

## Requirements
- **FR-001**: Plan state MUST be typed, versioned, local, and session-only by default.
- **FR-002**: Persistence MUST be explicit opt-in and plans MUST reset when election/date/site data changes.
- **FR-003**: The plan MUST support method, date, site, and self-reported checklist fields.
- **FR-004**: No party or candidate data may be persisted.
- **FR-005**: UI MUST be bilingual, keyboard accessible, and printable.

## Success Criteria
- **SC-001**: A plan survives navigation without durable storage by default.
- **SC-002**: Changed election inputs visibly flag and reset dependent choices.
- **SC-003**: Printed output contains only selected plan fields and checklist.

## Assumptions
- Existing address/election contexts remain authoritative for lookup data.
