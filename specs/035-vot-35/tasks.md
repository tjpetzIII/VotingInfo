# Tasks: VOT-35 ws dependency audit

## Phase 1: Setup

- [X] T001 Read repository guidance and create VOT-35 Spec Kit artifacts.

## Phase 2: Dependency evidence

- [X] T002 Inspect the frontend manifest, Yarn lock, Supabase package records, git history, and Dependabot branches.
- [X] T003 Document the no-`ws` active graph decision and its rationale.

## Phase 3: Validation

- [X] T004 Attempt a frozen install and compare the lockfile digest.
- [X] T005 Record applicable gate results and environment limitations.

## Phase 4: Review

- [X] T006 Map requirements to evidence, confirm no unrelated dependency edits, and review the focused diff.
