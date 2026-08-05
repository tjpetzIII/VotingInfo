---

description: "Task list for feature implementation"
---

# Tasks: Election Type Explainer

**Input**: Design documents from `/specs/007-election-type-explainer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/election-type-classification.md, quickstart.md

**Tests**: Included. This repo's existing convention pairs every component/lib file with a `.test.tsx`/`.test.ts` file (Constitution Principle II: every new frontend data-fetching/UI path needs a test or documented manual verification), so test tasks are included alongside each implementation task rather than treated as optional.

**Organization**: Tasks are grouped by user story (US1, US2) from `spec.md`, in priority order. This is a frontend-only feature — no backend tasks are needed (see plan.md's Constitution Check and research.md Decision 1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Paths are relative to the repository root; all touched files live under `frontend/`

## Path Conventions

This is the existing **Web app** layout (`backend/`, `frontend/` — Constitution Principle I). This feature only adds/modifies files under `frontend/src/`.

---

## Phase 1: Setup

**Purpose**: Confirm the existing toolchain is clean before adding new code (no new dependencies or config are needed for this feature — see plan.md Technical Context).

- [X] T001 Run `cd frontend && npx tsc --noEmit && npm run lint && npm run test` to confirm a clean baseline before starting (no files changed by this task)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The election-type classifier and its i18n copy are shared by both user stories — both must exist before either story's UI can render correct, translated content.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Implement `classifyElectionType(name: string): ElectionTypeCategory` and the `ElectionTypeCategory` type (`"primary" | "general" | "special" | "runoff" | "generic"`) in `frontend/src/lib/electionType.ts`, following the ordered keyword-matching rule in `specs/007-election-type-explainer/contracts/election-type-classification.md` (check `"runoff"`, then `"special"`, then `"primary"`, then `"general"`, case-insensitive substring match, default `"generic"`)
- [X] T003 [US foundational] Unit test `classifyElectionType` in `frontend/src/lib/electionType.test.ts` covering every example row in `contracts/election-type-classification.md` (each of the 4 known types, the compound "Special Primary" ordering case, an unrecognized name, and an empty string) — depends on T002
- [X] T004 [P] Add election-type banner message keys to `frontend/src/messages/en.ts`: one title + one plain-language explanation per category (`electionType.primary.title`/`.explanation`, `.general.*`, `.special.*`, `.runoff.*`, `.generic.*`), plus `electionType.toggle` (aria-label for the collapse/expand control, mirroring `ballot.toggleSection`'s pattern)
- [X] T005 [P] Add matching Spanish translations for every key added in T004 to `frontend/src/messages/es.ts`, keeping identical ICU placeholder names (required by the existing `frontend/src/messages/messages.test.ts` en/es parity check)

**Checkpoint**: `classifyElectionType` is implemented and unit-tested; banner copy exists in both locales and passes `messages.test.ts`. User story work can now begin.

---

## Phase 3: User Story 1 - Understand what kind of election this is (Priority: P1) 🎯 MVP

**Goal**: A voter loading the ballot page sees a banner, above the contests, stating the election's type and a plain-language explanation of what that means for voting — falling back to a generic explanation when the type can't be determined.

**Independent Test**: Load the ballot page with a mocked `BallotResponse` for each of the four known election-name patterns plus one unrecognized name, and confirm the banner shows the correct title/explanation (or the generic fallback) in each case, without needing any collapse interaction.

### Tests for User Story 1

- [X] T006 [P] [US1] Component test in `frontend/src/components/ElectionTypeBanner.test.tsx`: render `<ElectionTypeBanner election={...} />` with each of `"2026 General Election"`, `"2026 Primary Election"`, `"November 2026 Special Election"`, `"2026 Runoff Election"`, and `"City Council Municipal Election"` (generic case), asserting the correct title/explanation text (via `en` messages) appears for each

### Implementation for User Story 1

- [X] T007 [US1] Create `frontend/src/components/ElectionTypeBanner.tsx`: accepts an `election: { id: string; name: string }` prop, calls `classifyElectionType(election.name)` (T002), and renders the matching title + explanation from the messages added in T004/T005 via `useIntl()`/`FormattedMessage`, styled with the existing Tailwind tokens used elsewhere on the ballot page (always expanded for now — collapse behavior is added in US2)
- [X] T008 [US1] Render `<ElectionTypeBanner election={data.election} />` in `frontend/src/app/ballot/page.tsx`, placed above the grouped contests list, gated on `data?.election` being present (do not gate it on `hasNoContests`, since the election itself — and its type — is known even when a level has no contests; per FR-008, its presence must never block or delay rendering the contests below it)
- [X] T009 [US1] Update `frontend/src/app/ballot/page.test.tsx`: assert the banner's text renders for the existing `"General Election"` fixture, and add a second fixture/test case with an unrecognized election name asserting the generic fallback copy renders instead

**Checkpoint**: User Story 1 is fully functional and independently testable — voters see the correct plain-language election-type explanation for any address, with no collapse control yet.

---

## Phase 4: User Story 2 - Collapse the explainer once it's no longer needed (Priority: P2)

**Goal**: A voter can collapse the banner to a compact state and expand it again, and the banner returns to expanded whenever the displayed election changes.

**Independent Test**: With User Story 1's banner already rendering, click its collapse control and confirm the explanation hides while the contests below stay fully visible and usable; click again to confirm it re-expands; change the address to one resolving to a different election and confirm the banner is expanded again.

### Tests for User Story 2

- [X] T010 [P] [US2] Extend `frontend/src/components/ElectionTypeBanner.test.tsx` with cases covering: clicking the toggle control collapses the banner (explanation text no longer visible, `aria-expanded="false"`), clicking again expands it (`aria-expanded="true"`), and re-rendering the component with a different `election.id` resets it to expanded even if it was previously collapsed

### Implementation for User Story 2

- [X] T011 [US2] Add collapse/expand state to `frontend/src/components/ElectionTypeBanner.tsx`: a `useState<boolean>` defaulting to `true` (expanded), a toggle button with `aria-expanded` and the `electionType.toggle` label (T004/T005), mirroring the existing collapse pattern already used by `BallotSection` in `frontend/src/app/ballot/page.tsx` — when collapsed, hide the explanation but keep the title/toggle visible
- [X] T012 [US2] Reset the banner to expanded whenever the underlying election changes: implemented as an internal `useEffect` in `frontend/src/components/ElectionTypeBanner.tsx` that compares the current `election.id` against the previously seen id (via a `useRef`) and calls `setExpanded(true)` on change, per `data-model.md`'s `BannerUIState` transitions. (Chosen over a parent-supplied `key={election.id}` in `ballot/page.tsx` so the reset behavior is intrinsic to the component and unit-testable via `rerender`, not dependent on how a page happens to mount it.)
- [X] T013 [US2] Update `frontend/src/app/ballot/page.test.tsx` to confirm collapsing the banner leaves the Federal/State/Local contest sections fully visible and interactive (FR-008), and that submitting a different address whose response has a different `election.id` re-expands the banner

**Checkpoint**: User Stories 1 and 2 both work independently — the full feature (spec.md's two user stories) is complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across both stories, per quickstart.md.

- [X] T014 [P] Run `cd frontend && npx tsc --noEmit && npm run lint && npm run test` — full suite must pass with no new warnings, including the existing `messages.test.ts` en/es parity check (Constitution Principle III)
- [X] T015 [P] Manual check per `quickstart.md`'s "Manual end-to-end check" steps 6–7: switch locale (en/es) and confirm banner copy switches; resize to a narrow/mobile viewport and confirm the banner and its toggle remain fully visible and usable
- [X] T016 Review `frontend/src/components/ElectionTypeBanner.tsx` for Constitution Principle IX compliance: no `{/* ... */}` JSX comment placed on the same line immediately after a closing JSX tag

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS both user stories (both need `classifyElectionType` and the banner copy).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on User Story 1's `ElectionTypeBanner.tsx` existing (Phase 4 adds collapse behavior to the component Phase 3 creates) — implement after Phase 3.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### Within Each User Story

- Tests before/alongside the implementation task they cover (T006 before T007–T009; T010 before T011–T013).
- US1's component (T007) before it's wired into the page (T008) before the page test is updated (T009).
- US2's state/toggle (T011) before the reset-on-election-change wiring (T012) before the page test update (T013).

### Parallel Opportunities

- T002 (classifier) and T004/T005 (i18n copy) touch different files and can run in parallel; T003 depends on T002.
- T004 and T005 (en/es copy) can run in parallel with each other.
- T006 (US1 test) can be drafted in parallel with T002–T005, since it only needs the component's intended prop shape, not a finished implementation.
- T010 (US2 test) can be drafted in parallel with Phase 3 work, since it targets behavior Phase 4 will add.

---

## Parallel Example: Foundational Phase

```bash
# Launch in parallel — different files, no cross-dependency:
Task: "Implement classifyElectionType() and ElectionTypeCategory type in frontend/src/lib/electionType.ts"
Task: "Add election-type banner message keys to frontend/src/messages/en.ts"
Task: "Add matching Spanish translations to frontend/src/messages/es.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (classifier + copy — blocks everything else)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Load `/ballot` for each election-name pattern and confirm the banner shows correct copy (no collapse yet)
5. Ship — this alone satisfies the ticket's core acceptance criteria (shown at top of ballot page, plain-language copy)

### Incremental Delivery

1. Setup + Foundational → shared classifier/copy ready
2. Add User Story 1 → validate independently → this is the MVP
3. Add User Story 2 → validate independently → full ticket (including "dismissible/collapsible") complete
4. Phase 5 polish → final cross-story validation per quickstart.md

---

## Notes

- No backend tasks: the backend's `Election`/`BallotResponse` models are read as-is (research.md Decision 1); `backend/` is untouched.
- [P] tasks touch different files with no dependency on an incomplete task.
- Commit after each task or logical group.
- Stop at either checkpoint (end of Phase 3, end of Phase 4) to validate that story independently before continuing.
