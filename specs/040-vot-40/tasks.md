# Tasks: Native Dependency Audit Evidence

**Input**: Design documents from `/specs/040-vot-40/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Confirm the feature artifacts and existing backend manifest/lockfile are the audit scope in `specs/040-vot-40/`.

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T002 Establish the target-aware Cargo command set and shared `CARGO_TARGET_DIR` in `specs/040-vot-40/quickstart.md`.

## Phase 3: User Story 1 - Review native advisory applicability (Priority: P1) 🎯 MVP

**Goal**: Give maintainers reproducible evidence for both dependency chains and clear future re-evaluation triggers.

**Independent Test**: Run the documented Cargo checks and compare their output to the durable audit note.

- [x] T003 [US1] Run and capture exact Cargo graph evidence for `quinn`/`quinn-proto`, `anyhow`, and `wit-bindgen` from `backend/`.
- [x] T004 [US1] Trace the relevant lockfile edges and write the dated conclusions and invalidating feature/target changes in `docs/dependency-audits.md`.
- [x] T005 [US1] Validate the evidence note and backend with the quickstart commands; record results in the tracking note `docs/agent-tracking/VOT-40.md`.

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T006 [P] Confirm the final change is documentation/spec artifacts only and contains no product behavior or manifest changes.

## Dependencies & Execution Order

- Setup and Foundational tasks precede User Story 1.
- T003 precedes T004 because documentation must use observed output.
- T004 and T005 precede T006.

## Implementation Strategy

Complete the single maintainer audit story, validate it with local Cargo commands, then review the final diff for scope before committing.
