# Feature Specification: Ballot measure explainer

**Feature Branch**: `codex/vot-19`
**Created**: 2026-09-09
**Status**: Approved for implementation

## User Scenarios & Testing

### User Story 1 - Understand a measure (Priority: P1)
Voters can expand a ballot measure to see a plain-language explanation, its official wording, and a neutral reminder to consult official sources.
**Independent Test**: Render a measure contest and verify accessible expansion, neutral copy, and official link behavior.

### User Story 2 - Safe missing data (Priority: P1)
When no official measure explanation is available, voters see a clear unavailable state without invented claims.

## Requirements
- **FR-001**: Measure contests MUST be identified from structured ballot data without guessing from candidate contests.
- **FR-002**: Explanations MUST use only supplied official text or explicitly labeled neutral guidance.
- **FR-003**: The explainer MUST be bilingual, keyboard accessible, and privacy-preserving.
- **FR-004**: Missing or unsupported measure data MUST render an honest unavailable state.

## Success Criteria
- **SC-001**: Measure panels are discoverable by keyboard and screen reader.
- **SC-002**: No unsupported position, outcome, or factual claim is displayed.
- **SC-003**: Existing ballot and candidate rendering remains unchanged.

## Assumptions
- Existing ballot API models may carry optional measure text/link fields or absence indicates unavailable.
