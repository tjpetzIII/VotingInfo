---

description: "Task list for Mobile Responsiveness Pass (VOT-30)"

---

# Tasks: Mobile Responsiveness Pass

**Input**: Design documents from `/specs/005-mobile-responsiveness/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md,
data-model.md (N/A — no entities), quickstart.md

**Tests**: Not explicitly requested in spec.md; this is an audit-and-fix layout ticket verified
manually per `quickstart.md`. One test-update task is included (T022) to extend existing
`AddressForm.test.tsx` coverage where a DOM-level assertion is reasonably addable, per
Constitution Principle II's note in `plan.md`'s Constitution Check.

**Organization**: Tasks are grouped by user story (US1/US2/US3, matching spec.md's priorities)
to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web app (per plan.md): all paths below are under `frontend/src/`. The backend
(`backend/`) is untouched by this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies, tooling, or project structure are needed — plan.md confirmed
this feature reuses the existing frontend stack (Tailwind v4 default breakpoints, Leaflet,
Vitest) with zero new packages. Setup is a no-op; proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish a concrete, page-by-page defect list before any fix is written, so each
user story phase below fixes real, recorded issues rather than guessing.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Using Chrome/Firefox DevTools device toolbar at 375px, 390px, and 414px, load all 10
      pages listed in `plan.md`'s Project Structure (`/`, `/voter-info`, `/elections`,
      `/elections/[contestId]`, `/ballot`, `/ballot/[contestId]`, `/polling`, `/dates`,
      `/registration-dates`, `/login`) and record every horizontal-scroll, sub-44px tap-target,
      clipped/overlapping-text, and nav-overlap defect found, tagged by page and by FR ID
      (FR-001, FR-002, FR-005, FR-006), in `docs/mobile-audit-005.md`

**Checkpoint**: Foundation ready — `docs/mobile-audit-005.md` has a concrete defect list; user
story implementation can now begin.

---

## Phase 3: User Story 1 - Browse core pages on a phone (Priority: P1) 🎯 MVP

**Goal**: Every page in the app renders with no horizontal scroll, ≥44px tap targets, a usable
nav, and properly wrapping text at 375px/390px/414px (FR-001, FR-002, FR-005, FR-006, FR-007).

**Independent Test**: Per `quickstart.md` Part A — load each of the 10 pages at each of the 3
widths and confirm no horizontal scrollbar, all controls ≥44x44px, nav opens fully in-viewport,
and all text wraps without clipping.

### Implementation for User Story 1

- [X] T002 [P] [US1] Fix defects recorded against `/` in `docs/mobile-audit-005.md` in
      `frontend/src/app/page.tsx`
- [X] T003 [P] [US1] Fix defects recorded against `/voter-info` in `docs/mobile-audit-005.md` in
      `frontend/src/app/voter-info/page.tsx` (no defects found; verified clean)
- [X] T004 [P] [US1] Fix defects recorded against `/elections` in `docs/mobile-audit-005.md` in
      `frontend/src/app/elections/page.tsx`
- [X] T005 [P] [US1] Fix defects recorded against `/elections/[contestId]` in
      `docs/mobile-audit-005.md` in `frontend/src/app/elections/[contestId]/page.tsx` (no defects
      found; verified clean)
- [X] T006 [P] [US1] Fix defects recorded against `/ballot` in `docs/mobile-audit-005.md` in
      `frontend/src/app/ballot/page.tsx`
- [X] T007 [P] [US1] Fix defects recorded against `/ballot/[contestId]` in
      `docs/mobile-audit-005.md` in `frontend/src/app/ballot/[contestId]/page.tsx`
- [X] T008 [P] [US1] Fix defects recorded against `/polling` in `docs/mobile-audit-005.md` in
      `frontend/src/app/polling/page.tsx`, excluding the map itself (handled in US2) (no defects
      found in the page itself; verified clean)
- [X] T009 [P] [US1] Fix defects recorded against `/dates` in `docs/mobile-audit-005.md` in
      `frontend/src/app/dates/page.tsx` (no defects found; verified clean)
- [X] T010 [P] [US1] Fix defects recorded against `/registration-dates` in
      `docs/mobile-audit-005.md` in `frontend/src/app/registration-dates/page.tsx` (research.md
      notes this page has the app's only data table and zero existing `overflow-x` handling —
      check whether it needs a scrollable wrapper at 375px)
- [X] T011 [P] [US1] Fix defects recorded against `/login` in `docs/mobile-audit-005.md` in
      `frontend/src/app/login/page.tsx`
- [X] T012 [P] [US1] Fix tap-target size and spacing defects on the hamburger button and mobile
      dropdown links in `frontend/src/components/Header.tsx` (existing `md:hidden`/
      `hidden md:flex` pattern — refine, do not rebuild)
- [X] T013 [P] [US1] Fix text-wrap and tap-target defects in
      `frontend/src/components/CandidateCard.tsx` (shared by elections/ballot pages)
- [X] T014 [P] [US1] Fix layout defects in `frontend/src/components/AddressSummary.tsx` (shared
      "Using: {address} · Change" control on every address-driven page)
- [X] T015 [US1] Re-run `quickstart.md` Part A across all 10 pages at 375px/390px/414px and
      confirm zero remaining defects (SC-001, SC-002, SC-005) — depends on T002-T014. Verified via
      real Chromium browser automation (Playwright) at 375px viewport across all 10 pages plus the
      Header mobile dropdown and the registration-dates modal, scripted checks for
      `scrollWidth > clientWidth` and any interactive element under 44x44px — zero found after
      fixes. 390px/414px were not independently re-tested since no `sm:`(640px)+ breakpoint is
      crossed between 375-414px in this codebase (see research.md), so 375px is strictly the most
      constrained case and 390/414 only add room.

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable — all
pages are scroll-free with proper tap targets, nav, and text wrapping at mobile widths.

---

## Phase 4: User Story 2 - Interact with the polling-location map on a touch device (Priority: P2)

**Goal**: The Leaflet polling-location map supports pinch-to-zoom and single-finger pan on both
iOS Safari and Android Chrome without the surrounding page intercepting the gesture (FR-003).

**Independent Test**: Per `quickstart.md` Part B — on real iOS and Android touch devices, open
`/polling` with a valid address and confirm pinch-zoom and pan both work reliably.

### Implementation for User Story 2

- [X] T016 [US2] Set explicit `dragging` and `touchZoom` props on `<MapContainer>` in
      `frontend/src/components/PollingMap.tsx`, preserving the existing
      `scrollWheelZoom={false}`, per the research.md decision on Leaflet touch gestures. `tap` was
      dropped from the original plan: react-leaflet v5's `MapContainerProps` type does not expose
      it (`tsc --noEmit` failed on it — Leaflet's legacy Safari-only Tap handler isn't part of the
      typed prop surface in this version), so only `dragging`/`touchZoom` were set explicitly.
- [X] T017 [US2] Review and, if needed, adjust `touch-action`/`overflow` CSS on the map's
      wrapping `<div>` (currently `rounded-2xl overflow-hidden shadow-md h-80` in
      `frontend/src/app/polling/page.tsx`, and within `frontend/src/components/PollingMap.tsx`)
      so ancestor styles don't block Leaflet's touch handlers — depends on T016. Reviewed: the
      wrapper only sets `overflow-hidden` (clips visual corners, doesn't affect `touch-action`) and
      no ancestor sets a conflicting `touch-action`; `leaflet.css` (imported in `PollingMap.tsx`)
      already manages `touch-action` on `.leaflet-container` itself. No CSS change needed.
- [ ] T018 [US2] Run `quickstart.md` Part B on a real iOS Safari device and a real Android Chrome
      device: pinch-to-zoom and pan 10 times each, confirm the map responds every time with no
      page-scroll interference (SC-003) — depends on T016, T017. **Not executed**: requires
      physical iOS/Android hardware, which is unavailable in this environment. Code-level fix
      (T016/T017) is complete; SC-003 needs manual human verification before this story is
      considered fully done.

**Checkpoint**: User Stories 1 AND 2 both work independently — pages are mobile-usable and the
map responds correctly to touch gestures.

---

## Phase 5: User Story 3 - Fill out the address form with the keyboard open (Priority: P3)

**Goal**: The address form's submit button stays visible or reachable by scroll when the mobile
on-screen keyboard is open, on every page that embeds the form (FR-004).

**Independent Test**: Per `quickstart.md` Part C — on a mobile viewport/device, focus each
address form field in turn and confirm the submit button is never permanently hidden by the
keyboard.

### Implementation for User Story 3

- [X] T019 [US3] Change the State/Zip row in `frontend/src/components/AddressForm.tsx` (currently
      a non-wrapping `flex gap-3` per research.md) to wrap or stack on narrow viewports so the two
      inputs aren't squeezed at 375px (supports FR-001/FR-002). Changed to `flex flex-wrap gap-3`
      with `min-w-[7rem]` on each column; also bumped all four inputs and the submit button to
      `min-h-11` (found via live 375px browser testing — the original `py-2` inputs measured
      ~38px tall, under the 44px minimum from FR-002, not caught by the earlier static audit).
- [X] T020 [US3] Add `inputMode="numeric"` to the zip field in
      `frontend/src/components/AddressForm.tsx` so mobile browsers show a compact numeric
      keyboard, reducing how much of the viewport the keyboard covers (supports FR-004)
- [X] T021 [US3] Audit and adjust vertical spacing/layout in
      `frontend/src/components/AddressForm.tsx` so the submit button remains reachable via normal
      scroll when the on-screen keyboard is open, per FR-004 and the `quickstart.md` Part C
      findings — depends on T019. Reviewed: no sticky/fixed footer exists, the submit button is
      the last element in normal document flow, so the browser's default focused-input scroll
      behavior already keeps it reachable. No additional layout change identified from static
      review; final confirmation requires the real-device check in T023.
- [X] T022 [P] [US3] Extend `frontend/src/components/AddressForm.test.tsx` with a DOM-level
      assertion covering the State/Zip layout change from T019 (e.g., asserting the wrapper no
      longer forces a non-wrapping flex row) — depends on T019
- [ ] T023 [US3] Run `quickstart.md` Part C on a real iOS Safari device and a real Android Chrome
      device: focus each form field and confirm the submit button is always visible or reachable
      by scroll (SC-004) — depends on T019, T020, T021. **Not executed**: requires physical
      iOS/Android hardware, which is unavailable in this environment. Code-level work is complete;
      SC-004 needs manual human verification before this story is considered fully done.

**Checkpoint**: All three user stories are independently functional — pages are mobile-usable,
the map responds to touch, and the address form's submit button is never hidden by the keyboard.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation and quality gates across all three stories

- [X] T024 [P] Write `docs/mobile-qa-checklist.md` summarizing `quickstart.md`'s Parts A-C as a
      reusable regression checklist for future mobile QA passes, per Constitution Principle VIII
      (Centralized Documentation)
- [X] T025 Run `cd frontend && npm run lint`, `npx tsc --noEmit`, and `npm run test`
      (`quickstart.md` Part D) and fix any issues introduced by T002-T023 — depends on
      Phases 3-5 being complete. `npx tsc --noEmit`: clean. `npm run test`: 110/110 passing
      (33 files). `npm run lint` (`next lint`): fails with "Invalid project directory provided,
      no such directory: .../frontend/lint" — confirmed this is a **pre-existing** break
      unrelated to this feature (Next.js 16.2 removed the built-in `next lint` subcommand and no
      standalone `eslint.config.*`/`.eslintrc*` exists in the repo to run directly); no
      mobile-responsiveness change caused or can fix this. Documented in
      `docs/mobile-qa-checklist.md` as a follow-up.
- [ ] T026 Run the full `quickstart.md` "Done criteria" pass (Parts A-D, all 10 pages, 3 widths,
      both platforms) and confirm SC-001 through SC-005 are all satisfied end-to-end — depends on
      T025. Parts A and D complete (SC-001, SC-002, SC-005 verified via live browser automation
      and the automated test/type-check gates). Parts B and C (SC-003, SC-004) require the real
      iOS/Android device testing from T018/T023, which is **not executed** — unavailable hardware
      in this environment. This task cannot be marked fully done until a human completes B/C.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op — no dependencies, nothing to do
- **Foundational (Phase 2)**: No dependencies — BLOCKS all user stories (T001 must produce the
  defect list before any fix task starts)
- **User Stories (Phase 3-5)**: All depend on Foundational (T001) completion
  - US1, US2, US3 touch disjoint files (only T008 in US1 and T016/T017 in US2 both touch
    `polling/page.tsx`-adjacent code — see note below) and can proceed in parallel if staffed, or
    sequentially in priority order (P1 → P2 → P3)
  - **Note**: T008 (US1, polling page layout excluding the map) and T016/T017 (US2, map touch
    props) both touch files under `frontend/src/app/polling/` — if worked in parallel by
    different people, coordinate to avoid merge conflicts in `polling/page.tsx`
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- US1: T002-T014 (all [P], disjoint files) → T015 (verification, depends on all)
- US2: T016 → T017 (same/adjacent files, sequential) → T018 (verification)
- US3: T019 → T021 (sequential, same file) → T023 (verification); T020 can run any time after
  T019 starts (same file, but a small independent change); T022 depends on T019

### Parallel Opportunities

- All of T002-T014 (User Story 1's 13 page/component fixes) touch different files and can run in
  parallel
- T024 (Polish documentation) can run in parallel with T025/T026 since it doesn't touch app code
- Different user stories (US1, US2, US3) can be worked on in parallel by different people once
  T001 (Foundational) is done, subject to the `polling/page.tsx` coordination note above

---

## Parallel Example: User Story 1

```bash
# Launch all 13 page/component fixes for User Story 1 together (after T001 completes):
Task: "Fix defects recorded against / in frontend/src/app/page.tsx"
Task: "Fix defects recorded against /voter-info in frontend/src/app/voter-info/page.tsx"
Task: "Fix defects recorded against /elections in frontend/src/app/elections/page.tsx"
Task: "Fix defects recorded against /elections/[contestId] in frontend/src/app/elections/[contestId]/page.tsx"
Task: "Fix defects recorded against /ballot in frontend/src/app/ballot/page.tsx"
Task: "Fix defects recorded against /ballot/[contestId] in frontend/src/app/ballot/[contestId]/page.tsx"
Task: "Fix defects recorded against /polling (excl. map) in frontend/src/app/polling/page.tsx"
Task: "Fix defects recorded against /dates in frontend/src/app/dates/page.tsx"
Task: "Fix defects recorded against /registration-dates in frontend/src/app/registration-dates/page.tsx"
Task: "Fix defects recorded against /login in frontend/src/app/login/page.tsx"
Task: "Fix Header.tsx tap-target/spacing defects"
Task: "Fix CandidateCard.tsx text-wrap/tap-target defects"
Task: "Fix AddressSummary.tsx layout defects"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001 — the audit)
2. Complete Phase 3: User Story 1 (T002-T015)
3. **STOP and VALIDATE**: Run `quickstart.md` Part A independently — this alone satisfies 3 of
   the ticket's 4 acceptance criteria (no horizontal scroll, 44px tap targets, and most of
   "usable at 375px")
4. Demo/ship if the map and keyboard issues (US2/US3) can follow in a fast-follow

### Incremental Delivery

1. Foundational (T001) → defect list ready
2. Add User Story 1 (T002-T015) → validate independently → this is the MVP
3. Add User Story 2 (T016-T018) → validate independently (real-device map testing)
4. Add User Story 3 (T019-T023) → validate independently (real-device keyboard testing)
5. Polish (T024-T026) → final lint/type/test gate + full regression checklist

### Parallel Team Strategy

With multiple developers, after T001 (Foundational) is done:

- Developer A: User Story 1 (T002-T015) — 13 independent page/component fixes
- Developer B: User Story 2 (T016-T018) — Leaflet touch-gesture props + real-device testing
- Developer C: User Story 3 (T019-T023) — AddressForm layout + keyboard testing

Coordinate on `polling/page.tsx` between Developer A (T008) and Developer B (T016/T017) to avoid
merge conflicts.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No dedicated "write tests first" phase — this ticket's verification is manual per
  `quickstart.md` (see plan.md's Constitution Check re: jsdom's inability to verify real layout);
  T022 is the one exception where a DOM-level assertion is reasonably addable
- Commit after each task or logical group
- Stop at any checkpoint (end of Phase 3, 4, or 5) to validate that story independently
