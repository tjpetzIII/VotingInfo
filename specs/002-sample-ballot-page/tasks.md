# Tasks: Sample Ballot Page

**Input**: Design documents from `/specs/002-sample-ballot-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ballot-api.md, quickstart.md

**Tests**: Not included. Per Constitution Principle II and this feature's `research.md` "No new tests
are required" decision, this repo has no frontend test runner; new frontend data-fetching paths are
manually verified and noted in the PR instead (see quickstart.md and the Polish phase below).

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and
testing of each story. This feature is frontend-only — no backend changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repository root

## Path Conventions

Web app structure (per plan.md): `frontend/src/` only. No `backend/` changes — `/api/ballot`
already exists and is consumed read-only.

---

## Phase 1: Setup

**Purpose**: Confirm the existing contract this feature depends on before writing frontend code

- [X] T001 Verify `GET /api/ballot?address=` locally: run `cd backend && cargo run`, then
      `curl "http://localhost:8080/api/ballot?address=<url-encoded test address>"` and confirm the
      response matches the shape documented in
      `specs/002-sample-ballot-page/contracts/ballot-api.md` (contests carrying a `level` field,
      pre-sorted Federal → State → Local). No code changes in this task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared frontend infrastructure that every user story depends on

**⚠️ CRITICAL**: Both tasks below MUST be complete before any User Story phase begins

- [X] T002 [P] Add `BallotLevel`, `BallotCandidate`, `BallotContest`, `BallotResponse` types and
      the `fetchBallot(address: string): Promise<BallotResponse>` wrapper to
      `frontend/src/lib/api.ts`, following the exact type shapes and error-handling pattern
      (404 → "No sample ballot found for this address.", other non-2xx → thrown `Error` from
      `json.error`) specified in `specs/002-sample-ballot-page/contracts/ballot-api.md`. Reuse the
      existing `Channel` and `Election` types already exported from this file — do not redeclare
      them.
- [X] T003 [P] Add base message keys `ballot.title`, `ballot.subtitle`, `ballot.placeholder`,
      `ballot.search`, `ballot.submitting`, `ballot.loadError` to both
      `frontend/src/messages/en.ts` and `frontend/src/messages/es.ts`, following the existing
      `elections.*` / `voterInfo.*` key-naming and value style already in those files.
      (Consolidated with T005/T009/T012 — all `ballot.*` keys for every story were added together
      in one pass since they touch the same two files.)

**Checkpoint**: `fetchBallot` is callable and base copy exists — user story implementation can now begin.

---

## Phase 3: User Story 1 - View sample ballot grouped by level (Priority: P1) 🎯 MVP

**Goal**: A voter submits an address and sees the ballot's contests grouped into Federal / State /
Local sections, each contest showing its office name and district.

**Independent Test**: Load `/ballot`, submit an address with contests at multiple levels, and
confirm contests appear under the correct level section with correct office/district headers, a
level with zero contests doesn't render as an empty heading, and an address with no ballot data
shows a clear message — all without any candidate-card or collapse behavior in place yet.

### Implementation for User Story 1

- [X] T004 [US1] Create `frontend/src/app/ballot/page.tsx`: a `"use client"` page wrapped in
      `Suspense` (mirroring `frontend/src/app/elections/page.tsx`), with local `address` state, an
      address submit form (reuse the `AddressForm` component from
      `frontend/src/components/AddressForm.tsx`, as used in
      `frontend/src/app/voter-info/page.tsx`), and
      `useQuery({ queryKey: ["ballot", address], queryFn: () => fetchBallot(address), enabled: !!address, staleTime: 5 * 60 * 1000, retry: false })`
      from `frontend/src/lib/api.ts` (T002). Include a `LoadingSkeleton` component and an error
      panel for `error` state, matching the styling conventions in `elections/page.tsx`.
- [X] T005 [US1] Message keys `ballot.sectionFederal`, `ballot.sectionState`,
      `ballot.sectionLocal`, `ballot.noBallotData`, `ballot.contestFallbackLabel` — done as part of
      the consolidated T003 pass.
- [X] T006 [US1] In `frontend/src/app/ballot/page.tsx`, implement level-grouping: group
      `data.contests` (type `BallotContest[]`) by their `level` field into Federal/State/Local
      buckets, and render one section per level using the `ballot.section*` keys from T005 —
      **only** for levels that have at least one contest (FR-001, FR-012; spec Edge Cases: "a
      level with zero contests ... omitted or clearly indicates there are no contests").
- [X] T007 [US1] In `frontend/src/app/ballot/page.tsx`, implement the contest header: render
      `office` and `district` (joined the way `ContestCard` in `elections/page.tsx` does,
      `[office, district].filter(Boolean).join(" — ")`) when either is present, falling back to
      `ballot.contestFallbackLabel` when both are absent (FR-003, spec Edge Cases).
- [X] T008 [US1] In `frontend/src/app/ballot/page.tsx`, implement the "no ballot data" state: when
      the query resolves with zero total contests, or the query's error indicates a 404 (per
      `fetchBallot`'s "No sample ballot found for this address." message), render
      `ballot.noBallotData` instead of empty section headers or a blank page (FR-011).
      Implemented as: a zero-contests 200 response renders `ballot.noBallotData`; the 404 case
      surfaces through the same error panel already used by `elections/page.tsx` and
      `voter-info/page.tsx` (`(error as Error).message`, which is `fetchBallot`'s clear
      "No sample ballot found for this address." text) rather than a second special-cased branch —
      this matches the existing app-wide error-display convention and still satisfies FR-011 (a
      clear message, never a blank/broken page).

**Checkpoint**: User Story 1 is independently functional and testable — grouped sections with
contest headers render correctly; candidate details (US2) and collapse controls (US3) are not yet
present.

---

## Phase 4: User Story 2 - View candidate details within a contest (Priority: P2)

**Goal**: Each contest displays its candidates as cards (name, party badge, photo/fallback avatar,
website link), or a "No candidates found" message when there are none.

**Independent Test**: Load a contest with multiple candidates and confirm each renders as a card
with name, color-coded party badge (when known), photo or initials fallback, and website link
(when present); load a contest with zero candidates and confirm the empty-state message appears
instead of an empty grid.

### Implementation for User Story 2

- [X] T009 [P] [US2] Message key `ballot.noCandidatesFound` — done as part of the consolidated
      T003 pass.
- [X] T010 [US2] In `frontend/src/app/ballot/page.tsx`, within each contest rendered by T006/T007,
      render `contest.candidates.map((candidate, i) => <CandidateCard key={i} candidate={candidate} />)`
      using the existing `frontend/src/components/CandidateCard.tsx` component unmodified — its
      `CandidateDetail` prop type is structurally identical to `BallotCandidate` (T002), so no
      adapter is needed (FR-004, FR-005, FR-006, FR-007, FR-008; per
      `specs/002-sample-ballot-page/research.md` "Reuse `CandidateCard` unmodified").
- [X] T011 [US2] In `frontend/src/app/ballot/page.tsx`, render the `ballot.noCandidatesFound`
      message (T009) in place of the candidate grid whenever `contest.candidates.length === 0`
      (FR-009).

**Checkpoint**: User Stories 1 AND 2 together deliver the full informational content of the ticket
(grouped contests with complete candidate details); only collapse/expand (US3) remains.

---

## Phase 5: User Story 3 - Collapse and expand ballot sections (Priority: P3)

**Goal**: Each level section can be independently collapsed and expanded, defaulting to expanded.

**Independent Test**: Load a ballot with contests at all three levels, collapse the Federal
section, confirm its contests hide while State/Local remain visible and unaffected, then expand it
again and confirm its contests reappear.

### Implementation for User Story 3

- [X] T012 [P] [US3] Message key `ballot.toggleSection` — done as part of the consolidated T003
      pass.
- [X] T013 [US3] In `frontend/src/app/ballot/page.tsx`, add
      `expandedLevels` state — `useState<Record<"federal" | "state" | "local", boolean>>({ federal: true, state: true, local: true })`
      (level values are lowercase at runtime — backend uses `#[serde(rename_all = "lowercase")]`;
      caught and fixed during manual verification, see T017 notes)
      per `specs/002-sample-ballot-page/data-model.md` State section (FR-002, defaults to
      expanded).
- [X] T014 [US3] In `frontend/src/app/ballot/page.tsx`, make each level section header (rendered
      in T006) a clickable toggle that flips only that level's entry in `expandedLevels` (leaving
      the other two untouched — spec US3 AS3), with a `▲`/`▼` indicator matching the pattern
      already used for the collapsible contact-info block in
      `frontend/src/components/CandidateCard.tsx`, and conditionally render that section's
      contests (from T006/T007/T010/T011) only when its `expandedLevels` entry is `true`.

**Checkpoint**: All three user stories are independently functional — the full VOT-17 acceptance
criteria are met.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and quality gates spanning all three stories

- [X] T015 Ran `npx tsc --noEmit` — clean, no errors. `npm run lint` (`next lint`) fails with
      "Invalid project directory provided" — this is pre-existing and unrelated to this feature:
      Next.js 16.2.12 removed the `next lint` subcommand entirely (confirmed via `next --help`,
      which lists no `lint` command), and the repo has no standalone ESLint config to fall back
      to. Not fixed here per Constitution Principle III (no unrelated scope/tooling changes in a
      feature PR) — flagged for a separate followup.
- [X] T016 `npm run build` succeeds; `/ballot` appears in the route table as a static route
      alongside the existing pages.
- [X] T017 Fully verified via Playwright against the running dev servers, including against real
      live ballot data (Washington's 2026-08-04 primary was active during this session):
      - Page renders within the shared header/footer shell with correct title/subtitle/form.
      - An address with no matching election (e.g. Mountain View, CA) renders the clear
        "No sample ballot found for this address." message (FR-011) via the standard error-panel
        convention, same as `elections`/`voter-info`.
      - A real Seattle, WA address returned a full ballot: Federal/State/Local sections all
        rendered with correct headers, office+district contest titles, color-coded party badges
        (e.g. a red Republican badge), initials-fallback avatars (no `photo_url` in this real
        response), and — critically — a real contest ("CITY OF SEATTLE") with zero candidates
        correctly rendered "No candidates found" (FR-009).
      - Collapsing the Federal section hid its contests while State and Local stayed expanded and
        unaffected (US3 AS1/AS3), confirmed via accessibility snapshot.
      **Bug found and fixed during this pass**: the backend serializes `BallotLevel` as lowercase
      (`#[serde(rename_all = "lowercase")]` → `"federal"/"state"/"local"`), not the PascalCase
      assumed in the original plan/data-model/contracts docs (which followed the Rust enum variant
      names instead of checking the actual wire format). `groupByLevel`'s `Record` was keyed by
      the wrong casing, so `grouped[contest.level]` was `undefined` for every real contest and
      `.push` threw, crashing the page for any address with real data — only caught because this
      verification pass happened to run during an active election window. Fixed in
      `frontend/src/lib/api.ts` (`BallotLevel` type) and `frontend/src/app/ballot/page.tsx`
      (`LEVELS`, `LEVEL_LABEL_ID`, `groupByLevel`, `expandedLevels`); docs corrected in
      `data-model.md` and `contracts/ballot-api.md`. Re-verified clean after the fix (see above).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Renders *inside* the contests
  US1 produces (T006/T007), so in practice implement after US1, but the story itself adds no new
  page-level plumbing — it is a pure rendering addition within the existing contest loop.
- **User Story 3 (Phase 5)**: Depends on Foundational completion. Wraps the sections US1 renders
  with show/hide state; implement after US1 for the same reason as US2.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories — is the MVP.
- **User Story 2 (P2)**: Structurally nested inside US1's contest rendering (T006/T007), so it
  must land after US1's page skeleton exists, but does not require US1's grouping logic to be
  "done" — only that a contest-rendering loop exists to attach `CandidateCard` calls to.
- **User Story 3 (P3)**: Structurally wraps US1's section rendering (T006), so it must land after
  US1's section loop exists.

### Within Each User Story

- Within US1: T004 (page skeleton) → T005 (message keys) → T006 (grouping) → T007 (headers) →
  T008 (empty state). Each step edits the same new file, so these are sequential, not parallel.
- Within US2: T009 (message key, different file) can run in parallel with US1 tasks; T010 → T011
  are sequential (same file, same contest-rendering block).
- Within US3: T012 (message key, different file) can run in parallel with US1/US2 tasks; T013 →
  T014 are sequential (same file, same section-rendering block).

### Parallel Opportunities

- T002 and T003 (Phase 2) touch different files and can run in parallel.
- T009 (US2 message key) and T012 (US3 message key) touch a different file than
  `frontend/src/app/ballot/page.tsx` and can be done at any point after Phase 2, in parallel with
  each other and with US1's page-editing tasks — though the *rendering* tasks that consume them
  (T010/T011, T013/T014) still need US1's page structure to exist first.

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "Add BallotLevel/BallotCandidate/BallotContest/BallotResponse types + fetchBallot to frontend/src/lib/api.ts"
Task: "Add ballot.title/subtitle/placeholder/search/submitting/loadError message keys to frontend/src/messages/en.ts and es.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify `/api/ballot` contract).
2. Complete Phase 2: Foundational (`fetchBallot` + base copy).
3. Complete Phase 3: User Story 1 (grouped sections with contest headers).
4. **STOP and VALIDATE**: confirm grouping, headers, empty-level omission, and no-data messaging
   work for a real address before adding candidate detail or collapse behavior.
5. Demo if ready — this alone delivers a scannable, correctly-grouped sample ballot.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate independently → MVP.
3. Add User Story 2 → validate independently → full candidate detail now visible.
4. Add User Story 3 → validate independently → full VOT-17 acceptance criteria met.
5. Polish phase → lint/type/build clean, quickstart walkthrough verified.

---

## Notes

- This feature touches exactly three source files plus the two message catalogs:
  `frontend/src/app/ballot/page.tsx` (new), `frontend/src/lib/api.ts` (additive),
  `frontend/src/messages/en.ts` / `es.ts` (additive). `CandidateCard.tsx` and `AddressForm.tsx` are
  reused unmodified — do not edit them as part of this feature.
- No backend task exists in this list because `/api/ballot` already implements the full contract
  this feature needs (see `research.md` Decision 1).
- Commit after each task or logical group per repository convention.
- Stop at any Checkpoint above to validate that story independently before continuing.
