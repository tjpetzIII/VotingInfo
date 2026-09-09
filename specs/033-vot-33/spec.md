# Feature Specification: VOT-33 PostCSS security baseline

**Feature Branch**: `codex/vot-33`
**Created**: 2026-09-09
**Status**: Ready for planning
**Input**: VOT-33: Require a patched PostCSS version directly and transitively in the frontend build.

## User Scenarios & Testing

### User Story 1 - Build with patched CSS tooling (Priority: P1)

As a maintainer, I need every installed copy of the CSS processor to meet the security baseline so a fresh build does not restore known vulnerable versions.

**Why this priority**: Protects build environments processing CSS and source maps.
**Independent Test**: Install the locked frontend dependencies and inspect every PostCSS copy and the direct minimum requirement.

**Acceptance Scenarios**:

1. **Given** a clean dependency installation, **When** dependencies are restored, **Then** direct and transitive PostCSS copies resolve to one version at or above 8.5.18.
2. **Given** a maintainer refreshes dependencies, **When** the direct dependency is resolved, **Then** its declared minimum excludes versions below 8.5.18.
3. **Given** the patched dependency graph, **When** the frontend quality checks and production build run, **Then** they pass and the production CSS is generated.

### Edge Cases

- A transitive dependency requests an older exact version; the project override must still provide the patched copy.
- A stale lock selector may mention an old requested version; assess its resolved version, not the selector text alone.
- Failed package downloads must be reported as missing verification, not successful installation.

## Requirements

### Functional Requirements

- **FR-001**: The direct PostCSS requirement MUST declare a minimum of 8.5.18 or later within the existing compatible major release.
- **FR-002**: All installed PostCSS copies, including Next.js and Tailwind consumers, MUST resolve to the same patched version at or above 8.5.18.
- **FR-003**: The committed dependency lock MUST support reproducible installation without rewriting the lock.
- **FR-004**: Frontend lint, type checking, automated tests, and production build MUST pass with the patched dependency graph.
- **FR-005**: Completion evidence MUST cite the official advisory patch versions and describe any verification limitations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero installed PostCSS copies fall below the verified security baseline.
- **SC-002**: A fresh locked installation produces no changes to the committed lock.
- **SC-003**: All four frontend validation gates pass, with production stylesheet output present.

## Assumptions

- This is a dependency maintenance ticket; no user flow, API, database, or backend behavior changes are required.
- Existing overrides may already satisfy transitive requirements; retain proven existing fixes.
- Official advisories establish patch floors; no claim is made that every application use of CSS is safe.
