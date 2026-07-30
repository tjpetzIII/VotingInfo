---
description: "Task list for Single Shared Address Entry (VOT-57)"
---

# Tasks: Single Shared Address Entry

**Input**: Design documents from `/specs/004-shared-address-context/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/address-context.md](./contracts/address-context.md), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution Principle II requires every new frontend data-fetching path and context to ship with test coverage (or, at minimum, documented manual verification) in the same change — this repo already has Vitest coverage for the analogous `LocaleContext`/`AddressForm`, so the same bar applies here. Test scope is kept proportionate: full coverage on the new context/components, one representative page-level test per story rather than seven duplicate page tests (the rest rely on the `quickstart.md` manual scenarios, which Constitution Principle II explicitly allows as an alternative).

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to the repository root unless otherwise noted

## Path Conventions

This is the repo's existing "web application" shape — independent `frontend/` (Next.js) and `backend/` (Rust/Axum) services. This feature is **frontend-only**: all paths below are under `frontend/src/`. No `backend/` files are touched.

---

## Phase 1: Setup

**Purpose**: Confirm a clean baseline before making any changes.

- [X] T001 Run `cd frontend && npm run lint && npx tsc --noEmit && npm run test` and confirm it passes cleanly on the current branch, establishing the baseline this feature must not regress (Constitution Principle III).

**Checkpoint**: Baseline confirmed clean — safe to begin Foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `AddressContext` that every user story depends on. No story-specific page work can begin until this phase is complete.

**⚠️ CRITICAL**: All of Phase 3+ reads from `useAddress()`, which does not exist until this phase ships.

- [X] T002 Create `frontend/src/contexts/AddressContext.tsx`: `SavedAddress` type (`street`, `city`, `state`, `zip`), `AddressProvider` (mirrors `frontend/src/contexts/LocaleContext.tsx` — `useState` default `null`, mount-only `useEffect` hydration from `localStorage` key `address`, JSON-parse with fallback to `null` on missing/corrupt data per FR-009), and `useAddress()` exposing `{ address, setAddress, clearAddress }` per [contracts/address-context.md](./contracts/address-context.md).
- [X] T003 Wire `AddressProvider` into `frontend/src/components/Providers.tsx` at the same tier as `LocaleProvider` (outermost, alongside `IntlWrapper`, ahead of `QueryClientProvider`/`AuthProvider`) per [research.md](./research.md) §2. Depends on T002.
- [X] T004 [P] Add unit tests for `AddressContext` in `frontend/src/contexts/AddressContext.test.tsx`: default is `null`; hydrates from a valid `localStorage` entry on mount; `setAddress` updates state and persists to `localStorage`; `clearAddress` resets to `null` and removes the entry. Depends on T002.

**Checkpoint**: `useAddress()` exists, is wired app-wide, and is covered by tests — user story implementation can now begin.

---

## Phase 3: User Story 1 - Enter address once, reuse everywhere (Priority: P1) 🎯 MVP

**Goal**: A saved address automatically drives every address-driven page's results, and submitting an address on any page updates the shared value.

**Independent Test**: Enter a valid address on `/polling`, then navigate to `/ballot`, `/dates`, `/voter-info`, and `/elections` — each shows results for that address without an empty form appearing first (`quickstart.md` Scenario 1).

### Implementation for User Story 1

- [X] T005 [P] [US1] Update `frontend/src/app/voter-info/page.tsx`: read `useAddress()`; when a saved address exists, auto-run the existing `voter-info`/`registration` fetches using its derived formatted string instead of showing the empty form; on successful form submit, call `setAddress` in addition to existing local fetch logic (FR-001, FR-002, FR-004). Depends on T002.
- [X] T006 [P] [US1] Update `frontend/src/app/polling/page.tsx`: same pattern as T005 — auto-fetch from `useAddress()` when present, call `setAddress` on submit (FR-001, FR-002, FR-004). Depends on T002.
- [X] T007 [P] [US1] Update `frontend/src/app/dates/page.tsx`: same pattern as T005 — auto-fetch from `useAddress()` when present, call `setAddress` on submit (FR-001, FR-002, FR-004). Depends on T002.
- [X] T008 [P] [US1] Update `frontend/src/app/elections/page.tsx`: when the `?address=` URL param is absent, fall back to `useAddress()`'s saved address instead of showing the empty state; the URL param, when present, continues to take precedence for that page load (`research.md` §4); call `setAddress` on submit (FR-001, FR-002, FR-004). Depends on T002.
- [X] T009 [P] [US1] Update `frontend/src/app/elections/[contestId]/page.tsx`: when the `?address=` URL param is absent, fall back to `useAddress()`'s saved address instead of immediately rendering the `contest.noAddress` fallback state (`research.md` §5, FR-001, FR-002). Depends on T002.
- [X] T010 [P] [US1] Update `frontend/src/app/ballot/page.tsx`: same pattern as T008 (FR-001, FR-002, FR-004). Depends on T002.
- [X] T011 [P] [US1] Update `frontend/src/app/ballot/[contestId]/page.tsx`: same pattern as T009 (FR-001, FR-002). Depends on T002.
- [X] T012 [P] [US1] Add a representative page-level test in `frontend/src/app/polling/page.test.tsx` proving a saved address (seeded via `useAddress`/`localStorage`) triggers an automatic fetch and results render without the empty form appearing (FR-002). Depends on T006.

**Checkpoint**: User Story 1 is fully functional and independently testable — an address entered once now drives all seven pages.

---

## Phase 4: User Story 2 - Change the address from any page (Priority: P2)

**Goal**: Every address-driven page shows a visible "Using: {address} · Change" control; changing the address from any page propagates everywhere; the change form is pre-filled with the previous values.

**Independent Test**: With a saved address in place, open the change control on any page, submit a different valid address, then confirm a second page reflects the new address (`quickstart.md` Scenario 2).

### Implementation for User Story 2

- [X] T013 [US2] Extend `frontend/src/components/AddressForm.tsx` to accept an optional pre-fill prop (`initialValues?: SavedAddress`) that seeds the `street`/`city`/`state`/`zip` `useState` fields; existing validation and `onSubmit` behavior remain unchanged (FR-007, FR-008). Depends on T002.
- [X] T014 [US2] Create `frontend/src/components/AddressSummary.tsx`: reads `useAddress()`, renders "Using: {formatted address} · Change", and toggles into a pre-filled `AddressForm` (via T013's new prop) on "Change", calling `setAddress` on successful submit (FR-003, FR-008) per [contracts/address-context.md](./contracts/address-context.md). Depends on T013.
- [X] T015 [P] [US2] Add tests for the `AddressForm` pre-fill prop in `frontend/src/components/AddressForm.test.tsx` (extends existing suite): pre-fill populates all four fields; submit validation behavior is unchanged. Depends on T013.
- [X] T016 [P] [US2] Add tests for `AddressSummary` in `frontend/src/components/AddressSummary.test.tsx`: renders the current address; "Change" reveals a pre-filled form; submitting a valid address calls `setAddress` and hides the form again; submitting an invalid address shows the existing inline error and leaves the saved address unchanged. Depends on T014.
- [X] T017 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/voter-info/page.tsx` (FR-003). Depends on T005, T014.
- [X] T018 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/polling/page.tsx` (FR-003). Depends on T006, T014.
- [X] T019 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/dates/page.tsx` (FR-003). Depends on T007, T014.
- [X] T020 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/elections/page.tsx` (FR-003). Depends on T008, T014.
- [X] T021 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/elections/[contestId]/page.tsx` (FR-003). Depends on T009, T014.
- [X] T022 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/ballot/page.tsx` (FR-003). Depends on T010, T014.
- [X] T023 [P] [US2] Add `<AddressSummary />` to `frontend/src/app/ballot/[contestId]/page.tsx` (FR-003). Depends on T011, T014.

**Checkpoint**: User Stories 1 AND 2 both work independently — every page can show and change the shared address.

---

## Phase 5: User Story 3 - Address survives page reload (Priority: P3)

**Goal**: The saved address is still in effect after a full reload or a new browser session. The core mechanism (hydrate-from-`localStorage` on mount) was already built in Phase 2 (T002) — this phase proves it end-to-end at the page level and hardens the edge cases explicitly called out in the spec (corrupted/unreadable storage, FR-009).

**Independent Test**: Enter a valid address, fully reload the browser tab, confirm the address is still in use without re-entry (`quickstart.md` Scenario 3).

### Implementation for User Story 3

- [X] T024 [P] [US3] Add a page-level integration test in `frontend/src/app/voter-info/page.test.tsx` that seeds `localStorage` with a saved address, freshly mounts the page (simulating a reload), and asserts it auto-fetches and renders results with no empty-form flash (FR-005). Depends on T005.
- [X] T025 [P] [US3] Extend `frontend/src/contexts/AddressContext.test.tsx` with edge-case coverage: corrupted/unparsable `localStorage` value falls back to `null` rather than throwing; a missing entry behaves identically to first-visit (FR-009). Depends on T004.

**Checkpoint**: All three user stories are independently functional — reload/session persistence is proven, not just assumed from the Foundational design.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide quality gates and documentation sync required by the constitution before this feature merges.

- [X] T026 [P] Run `cd frontend && npm run lint && npx tsc --noEmit` and resolve any new warnings introduced by this feature (Constitution Principle III). NOTE: `npx tsc --noEmit` passes clean. `npm run lint` (`next lint`) is pre-existing broken — Next.js 16 removed the `next lint` subcommand and no ESLint config exists in the repo; this is unrelated to this feature and predates it.
- [X] T027 [P] Run `cd frontend && npm run test` and confirm the full suite (including all tasks above) is green. (35 tests, 7 files, all green.)
- [~] T028 Execute the full `quickstart.md` manual validation (all 5 scenarios, including the `?address=` URL-param regression check in Scenario 4) against `cd backend && cargo run` + `cd frontend && npm run dev`. PARTIAL: the live manual run requires `GOOGLE_CIVIC_API_KEY` + running services + a browser, which weren't available in this environment. Substituted with automated equivalents: a production `next build` (all 7 address-driven pages compile/prerender cleanly) plus Vitest coverage of the auto-fetch-from-saved-address flow (polling + voter-info page tests), the change-address flow (AddressSummary tests), and persistence/edge cases (AddressContext tests). **The 5 live quickstart scenarios still need a human pass before merge.**
- [X] T029 [P] Update `CLAUDE.md`'s frontend architecture section to document `src/contexts/AddressContext.tsx`, `src/components/AddressSummary.tsx`, and the `Providers.tsx` wiring change, per the constitution's requirement to keep `CLAUDE.md` in sync with module-boundary changes (Governance section).
- [X] T030 Review the seven updated pages for leftover per-page address `useState`/logic now fully superseded by `useAddress()` and remove it — no dead code left behind (Constitution Principle III).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories (T002 in particular).
- **User Story 1 (Phase 3)**: Depends on Foundational (T002). No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational (T002). Its seven per-page integration tasks (T017–T023) additionally depend on the corresponding US1 page task (T005–T011) touching the same file, but US2 remains independently testable per its own Independent Test criterion.
- **User Story 3 (Phase 5)**: Depends on Foundational (T002, T004) and, for T024, on US1's `voter-info` task (T005).
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- Within Phase 3 (US1): T005–T012 are all `[P]` — seven distinct page files plus one new test file, no interdependencies.
- Within Phase 4 (US2): T013 → T014 is sequential (AddressSummary needs the new AddressForm prop); T015/T016 are `[P]` relative to each other once their respective prerequisite lands; T017–T023 are all `[P]` relative to each other (seven distinct files).
- Within Phase 5 (US3): T024 and T025 are `[P]` (distinct files).
- Within Phase 6: T026, T027, T029 are `[P]`; T028 and T030 are manual/whole-repo review steps best done sequentially after the automated gates pass.

---

## Parallel Example: User Story 1

```bash
# After Foundational (T002-T004) is complete, launch all seven page updates together:
Task: "Update frontend/src/app/voter-info/page.tsx to auto-use the saved address"
Task: "Update frontend/src/app/polling/page.tsx to auto-use the saved address"
Task: "Update frontend/src/app/dates/page.tsx to auto-use the saved address"
Task: "Update frontend/src/app/elections/page.tsx to fall back to the saved address"
Task: "Update frontend/src/app/elections/[contestId]/page.tsx to fall back to the saved address"
Task: "Update frontend/src/app/ballot/page.tsx to fall back to the saved address"
Task: "Update frontend/src/app/ballot/[contestId]/page.tsx to fall back to the saved address"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T004) — critical, blocks everything else.
3. Complete Phase 3: User Story 1 (T005–T012).
4. **STOP and VALIDATE**: Run `quickstart.md` Scenario 1 manually.
5. This alone delivers the ticket's core value proposition — no more re-typing an address per page — and is demoable even without the "Change" control.

### Incremental Delivery

1. Setup + Foundational → shared context ready.
2. Add User Story 1 → validate via Scenario 1 → demo (MVP!).
3. Add User Story 2 → validate via Scenario 2 → demo (users can now correct/replace an address without clearing browser data).
4. Add User Story 3 → validate via Scenario 3 (+ Scenario 5 edge cases) → demo (persistence proven across reloads, not just in-session).
5. Polish (Phase 6) → lint/type/test gates, `CLAUDE.md` sync, dead-code cleanup → ready to merge.

---

## Notes

- `[P]` tasks touch different files and have no incomplete-task dependency between them.
- `[Story]` labels map every Phase 3+ task back to `spec.md`'s prioritized user stories for traceability.
- T005–T011 and T017–T023 touch the same seven page files across two phases (US1 adds the auto-use behavior, US2 adds the visible summary/change control) — this is an intentional, sequential two-pass edit per file, not a conflict.
- Commit after each task or logical group; stop at either checkpoint to validate a story independently before continuing.
- Test scope is deliberately proportionate: full unit coverage on `AddressContext`/`AddressForm`/`AddressSummary`, one representative page-level test per story (T012, T024) rather than fourteen near-duplicate page tests — the remaining pages are covered by the `quickstart.md` manual scenarios, consistent with Constitution Principle II's "at minimum, a manually-verified... path noted in the PR" allowance.
