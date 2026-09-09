# Feature Specification: VOT-35 ws dependency audit

**Feature Branch**: `codex/vot-35`
**Created**: 2026-09-09
**Status**: Ready for implementation
**Input**: VOT-35: verify the frontend WebSocket dependency resolves to ws 8.21.0 or newer, including the Supabase dependency graph, without unrelated upgrades.

## User Scenarios & Testing

### User Story 1 - Maintain a patched WebSocket dependency graph (Priority: P1)

As a maintainer, I need the frontend dependency metadata to avoid restoring a vulnerable `ws` release when the package is present, while keeping the current Supabase integration stable.

**Independent Test**: Inspect the manifest, committed Yarn lock, Supabase transitive graph, Dependabot history, and a frozen install result.

**Acceptance Scenarios**:

1. **Given** the frontend manifest and lockfile, **When** `ws` records are inspected, **Then** every resolved `ws` package is at least 8.21.0, or the audit identifies that the current graph contains no `ws` package.
2. **Given** the Supabase dependencies, **When** their locked dependency records are inspected, **Then** the current realtime package graph is recorded and no stale `ws` edge is overlooked.
3. **Given** the committed lockfile, **When** a frozen install is attempted, **Then** the lockfile remains unchanged and any environment limitation is recorded.

## Requirements

- **FR-001**: The audit MUST inspect `frontend/package.json`, `frontend/yarn.lock`, and the complete locked Supabase package records.
- **FR-002**: Every resolved `ws` record MUST be version 8.21.0 or newer; if none exists, the audit MUST document verified non-applicability.
- **FR-003**: The audit MUST inspect available Dependabot history/branches for the `ws` update and avoid unrelated upgrades.
- **FR-004**: A frozen frontend installation MUST be attempted and its lockfile digest outcome recorded.
- **FR-005**: Completion evidence MUST state whether a manifest or lockfile change was necessary and identify environment limitations honestly.

## Success Criteria

- **SC-001**: The active lock contains no `ws` resolution below 8.21.0; the current lock's absence of `ws` is explained by the locked Supabase graph.
- **SC-002**: The frozen-install attempt leaves `frontend/yarn.lock` byte-for-byte unchanged.
- **SC-003**: The audit produces focused Spec Kit and tracking artifacts with no application behavior changes or unrelated dependency churn.

## Assumptions

- `@supabase/supabase-js` is the relevant direct dependency and `@supabase/realtime-js` is the relevant transitive realtime package.
- A missing `ws` package in the active lock is a valid patched/non-applicable outcome when the locked realtime package has no `ws` dependency.
