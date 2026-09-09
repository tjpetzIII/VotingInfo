# Tasks: VOT-34 sharp security baseline audit

## Phase 1: Setup

- [ ] T001 Read repository guidance and create the VOT-34 Spec Kit artifacts under `specs/034-vot-34/`.

## Phase 2: Foundation

- [ ] T002 [P] Inspect `frontend/package.json`, `frontend/yarn.lock`, git history, and available Dependabot branches for sharp state.
- [ ] T003 [P] Document the dependency decision and evidence in `specs/034-vot-34/research.md` and `plan.md`.

## Phase 3: User Story 1 — Maintain a patched image dependency

**Goal**: Prove that direct, transitive, and platform sharp resolutions meet the floor.
**Independent test**: Frozen install, lock digest comparison, package graph inspection, and all frontend quality gates.

- [ ] T004 [US1] Run `yarn install --frozen-lockfile` in `frontend/` and compare `yarn.lock` digests.
- [ ] T005 [US1] Inspect all sharp entries in `frontend/yarn.lock` and installed `node_modules/` packages for versions at or above 0.35.0.
- [ ] T006 [US1] Run frontend lint, type check, tests, and production build and record results in `docs/agent-tracking/VOT-34.md`.

## Phase 4: Review and evidence

- [ ] T007 [P] Map requirements to evidence, confirm no unnecessary dependency edits, and review the focused diff in `docs/agent-tracking/VOT-34.md`.

## Dependencies and execution order

T001 → T002 → T003 → T004 → T005 → T006 → T007. T004 must precede installed-package inspection; T006 can run after installation.

## Implementation strategy

Deliver the audit as a no-change dependency verification when the existing 0.35.3 resolution passes. Preserve the lockfile unless a concrete below-floor resolution is found.
