# Feature Specification: Typed election deadlines

**Feature Branch**: `codex/vot-65`
**Created**: 2026-09-09

## User Story

As a voter, I need each deadline's method, action, cutoff, timezone, source wording, and election applicability so I can act correctly.

## Requirements

- **FR-001**: Represent deadlines with stable IDs, election/jurisdiction applicability, method, action, local date/time, IANA timezone, source wording, and provenance.
- **FR-002**: Preserve same-day deadlines for different methods and keep ambiguous records unassigned.
- **FR-003**: Never infer a cutoff or midnight from date-only legacy data.
- **FR-004**: Compute status from an injected clock in the jurisdiction timezone and expose conservative unknown-cutoff behavior.
- **FR-005**: Render applicable voter actions on `/dates`, with source wording and links.

## Success Criteria

- SC-001: Received and postmarked deadlines remain distinct and deterministic fixtures cover DST and timezone boundaries.
- SC-002: Existing clients continue to deserialize responses with absent optional fields.
- SC-003: Backend and frontend quality gates pass.
