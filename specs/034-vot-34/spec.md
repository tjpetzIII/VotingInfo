# Feature Specification: VOT-34 Sharp security baseline audit

**Feature Branch**: `codex/vot-34`
**Created**: 2026-09-09
**Status**: Ready for implementation
**Input**: VOT-34: verify the frontend sharp dependency is at least 0.35.0 and close the Dependabot finding without unnecessary upgrades.

## User Scenarios & Testing

### User Story 1 - Maintain a patched image dependency (Priority: P1)

As a maintainer, I need the frontend's complete sharp dependency graph to meet the security floor so clean installs and production builds do not restore a vulnerable image-processing release.

**Independent Test**: Inspect the manifest, lockfile, and installed dependency graph after a frozen install, then run the frontend quality and production build gates.

**Acceptance Scenarios**:

1. **Given** the frontend dependency metadata, **When** sharp requirements are inspected, **Then** every direct or override requirement accepts only versions at or above 0.35.0.
2. **Given** the committed Yarn lock, **When** sharp and its platform packages are inspected, **Then** all resolved sharp packages are version 0.35.0 or newer and the lock supports a frozen install.
3. **Given** the verified dependency graph, **When** lint, type checking, tests, and the production build run, **Then** each applicable frontend gate passes.

## Requirements

### Functional Requirements

- **FR-001**: The frontend dependency policy MUST require sharp at version 0.35.0 or newer.
- **FR-002**: The committed lock MUST resolve the sharp package and all selected platform binaries to versions at or above 0.35.0.
- **FR-003**: A frozen frontend installation MUST complete without changing the committed lockfile.
- **FR-004**: The existing frontend lint, type-check, test, and production-build commands MUST be run and their outcomes recorded.
- **FR-005**: Completion evidence MUST identify whether a manifest or lockfile change was necessary and record any environment limitations honestly.

## Success Criteria

- **SC-001**: Zero inspected sharp package resolutions are below 0.35.0.
- **SC-002**: A frozen install leaves `frontend/yarn.lock` byte-for-byte unchanged.
- **SC-003**: All applicable frontend quality gates complete successfully, or any failure is attributable to a documented environment or pre-existing issue.

## Edge Cases

- Next.js may request an older sharp range transitively; the project resolution must still produce the patched version.
- Optional platform packages may be present in the lock even when they are not installed on the host; each resolved lock entry must meet the floor.
- A failed package download or missing `node_modules` must be reported as incomplete verification rather than success.

## Assumptions

- The existing `resolutions.sharp` entry is the intended project-wide enforcement mechanism.
- This maintenance audit does not change application behavior, APIs, user flows, or backend code.
- No dependency upgrade is needed if the manifest and lock already satisfy the floor.
