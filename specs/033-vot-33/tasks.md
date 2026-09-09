# Tasks: VOT-33 PostCSS security baseline

**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup

- [x] T001 Read repository guidance and create `specs/033-vot-33/spec.md` and its requirements checklist.

## Phase 2: Foundation

- [x] T002 Verify official advisories and document current dependency evidence in `specs/033-vot-33/research.md`.
- [x] T003 Produce design and validation plan in `specs/033-vot-33/plan.md`, `data-model.md`, and `quickstart.md`.

## Phase 3: User Story 1 — Build with patched CSS tooling (P1)

**Goal**: Direct and transitive consumers install one patched version and frontend builds remain valid.
**Independent test**: Clean locked installation plus physical-copy and consumer-resolution checks, followed by existing quality/build gates.

- [x] T004 [US1] Raise direct minimum in `frontend/package.json` to `^8.5.18`, retain global override, and reconcile `frontend/yarn.lock` without unrelated upgrades.
- [x] T005 [US1] Verify frozen install leaves `frontend/yarn.lock` unchanged and inspect every installed PostCSS package plus Next/Tailwind resolution in `frontend/node_modules/`.
- [x] T006 [US1] Run frontend lint, type check, tests, and production build; inspect `frontend/.next/` CSS and standalone output.

## Phase 4: Review and evidence

- [x] T007 Map each requirement to actual evidence in `docs/agent-tracking/VOT-33.md`, review the diff, and run convergence against `specs/033-vot-33/`.

## Dependencies and execution order

T001 → T002 → T003 → T004 → T005 → T006 → T007. US1 is the sole complete delivery increment. No independent implementation files justify parallel mutations. After installation, lint and tests may run in parallel; type checking/build are sequential to avoid generated type conflicts.

## Implementation strategy

Preserve existing patched dependencies; modify only the missing declared minimum and obsolete selector. Do not add mirror tests for dependency metadata. Run the explicit validation guide and record failures honestly before handoff.
