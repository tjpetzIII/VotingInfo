# Tasks: Candidate Detail & Comparison

**Input**: Design documents from `/specs/003-candidate-detail-comparison/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-ballot.md, quickstart.md

**Tests**: Included per this feature's `plan.md`/`research.md` testing decisions (Constitution
Principle II): the new backend `id`-assignment logic and the new frontend contest-lookup helper
each get a covering automated test; the share button's `navigator.clipboard.writeText` call is
manually verified only, matching the existing untested precedent in `elections/page.tsx`'s share
button (no clipboard mock exists anywhere in this repo).

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repository root

## Path Conventions

Web app structure (per plan.md): mostly `frontend/src/`, plus one small additive backend change in
`backend/src/` (`BallotContest.id`). No new endpoints, no database/migration changes.

---

## Phase 1: Setup

**Purpose**: Confirm the current (pre-change) `/api/ballot` contract baseline before modifying it

- [X] T001 Verify `GET /api/ballot?address=` locally: run `cd backend && cargo run`, then
      `curl "http://localhost:8080/api/ballot?address=<url-encoded test address>"` and confirm
      today's response has **no** `id` field on any `contests[]` entry (baseline before this
      feature adds one) and that contests already arrive pre-sorted Federal → State → Local. No
      code changes in this task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Give every contest a stable, URL-referenceable `id` and give the frontend a tested way
to look one up — every user story's page depends on this existing first.

**⚠️ CRITICAL**: All tasks below MUST be complete before any User Story phase begins

- [X] T002 [P] In `backend/src/models/mod.rs`, add `pub id: usize,` to the `BallotContest` struct
      (no `#[serde(skip_serializing_if = ...)]` — always present, matching `ContestDetail.id` on
      the `/api/elections` response) per `data-model.md`.
- [X] T003 In `backend/src/services/civic_api.rs`, update `map_ballot` (~lines 703-748): set a
      placeholder `id: 0` in the initial `.map()` that builds `BallotContest` (~line 710), then
      immediately after the existing `contests.sort_by_key(|c| c.level);` (~line 738), rebind
      `contests` through `.into_iter().enumerate().map(|(i, mut c)| { c.id = i; c }).collect()` so
      each contest's final `id` reflects its position in the level-sorted array actually returned
      to the client (per `research.md` Decision 1). Depends on T002.
- [X] T004 In `backend/src/services/civic_api.rs`'s `#[cfg(test)] mod tests` block, add unit test
      `map_ballot_assigns_sequential_contest_ids_in_final_sorted_order`: construct an
      `ApiVoterInfoResponse` fixture (see the struct shapes at ~lines 40-168: `ApiElection`,
      `ApiContest`, `ApiDistrict`, `ApiCandidate`) with 3 `ApiContest` entries in deliberately
      unsorted input order — one classifying to Local (e.g. `office: Some("City Council")`, no
      `level`/scope), one to Federal (e.g. `office: Some("President of the United States")`), one
      to State (e.g. `office: Some("Governor")`, `district.scope: Some("statewide")`) — call
      `map_ballot(fixture)`, and assert the returned `contests` are ordered Federal, State, Local
      with `.id` fields `0, 1, 2` respectively (final position, not input position). Depends on
      T003.
- [X] T005 [P] In `frontend/src/lib/api.ts`, add `id: number;` to the `BallotContest` interface
      (~lines 173-178), matching the backend's always-present field, per `data-model.md`.
- [X] T006 In `frontend/src/lib/api.ts`, add an exported helper
      `export function findContestById(contests: BallotContest[], contestId: string): BallotContest | undefined`
      that parses `contestId` with `parseInt(contestId, 10)` (returns `undefined` when the parse
      fails, e.g. `NaN`) and returns `contests.find((c) => c.id === parsedId)`. Depends on T005.
- [X] T007 [P] In `frontend/src/lib/api.test.ts`, add a `describe("findContestById")` block
      covering: finds the matching contest by id; returns `undefined` for a non-existent id;
      returns `undefined` for a non-numeric `contestId` string; returns `undefined` for an empty
      `contests` array. Depends on T006.
- [X] T008 [P] Add new message keys to both `frontend/src/messages/en.ts` and
      `frontend/src/messages/es.ts`, following the existing `ballot.*`/`contest.*` naming and value
      style already in those files: `ballot.backToBallot` ("← Back to ballot"),
      `ballot.contestNotFound` ("This contest could not be found."), `ballot.noAddress` ("No
      address provided."), `ballot.searchBallot` ("Search for your ballot"), `ballot.share`
      ("Share"), `ballot.linkCopied` ("Link copied!"), `ballot.shareCopyFailed` ("Couldn't copy the
      link automatically — copy it manually:"). Reuse the existing `ballot.noCandidatesFound` and
      `ballot.contestFallbackLabel` keys for the new page instead of duplicating them.

**Checkpoint**: Every contest has a stable `id`, `findContestById` is implemented and tested, and
all new copy exists — user story implementation can now begin.

---

## Phase 3: User Story 1 - Compare candidates for a contest (Priority: P1) 🎯 MVP

**Goal**: A voter can select a contest from their sample ballot and see every candidate in that
contest rendered together — side by side on desktop, stacked on mobile — with all available detail
(photo, party, bio link, social channels, contact info).

**Independent Test**: From the sample ballot page, select a contest and confirm all of its
candidates render together with full available details in a single comparable view.

### Implementation for User Story 1

- [X] T009 [US1] Create `frontend/src/app/ballot/[contestId]/page.tsx`: a `"use client"` page
      wrapped in `Suspense` (mirroring `frontend/src/app/elections/[contestId]/page.tsx`), reading
      `contestId` via `useParams<{ contestId: string }>()` and `address` via
      `useSearchParams().get("address") ?? ""`, and fetching with
      `useQuery({ queryKey: ["ballot", address], queryFn: () => fetchBallot(address), enabled: !!address, staleTime: 5 * 60 * 1000, retry: false })`.
      Include a `LoadingSkeleton` matching the loading-skeleton pattern in
      `elections/[contestId]/page.tsx`, and an error panel for the query's `error` state using the
      same styling convention.
- [X] T010 [US1] In `frontend/src/app/ballot/[contestId]/page.tsx`, render the `ballot.noAddress`
      message plus a `ballot.searchBallot` link to `/ballot` when `address` is empty (mirrors the
      `contest.noAddress` branch in `elections/[contestId]/page.tsx`).
- [X] T011 [US1] In `frontend/src/app/ballot/[contestId]/page.tsx`, once data has loaded, use
      `findContestById(data.contests, contestId)` (T006) to locate the contest; when it returns
      `undefined`, render the `ballot.contestNotFound` message with a link back to
      `` `/ballot?address=${encodeURIComponent(address)}` `` labeled `ballot.backToBallot`
      (FR-009).
- [X] T012 [US1] In `frontend/src/app/ballot/[contestId]/page.tsx`, when the contest is found,
      render its title (`[contest.office, contest.district].filter(Boolean).join(" — ")`, falling
      back to `ballot.contestFallbackLabel`) and its candidates in a
      `grid grid-cols-1 md:grid-cols-2` (or wider, e.g. `md:grid-cols-3` when there are 3+
      candidates) grid, one `CandidateCard` per candidate (`frontend/src/components/CandidateCard.tsx`,
      reused unmodified — `BallotCandidate` already matches its `CandidateDetail` prop shape),
      satisfying the side-by-side-desktop/stacked-mobile requirement (FR-002, FR-003, FR-004,
      FR-010). Render the existing `ballot.noCandidatesFound` message instead of the grid when
      `contest.candidates.length === 0` (FR-008).
- [X] T013 [US1] In `frontend/src/app/ballot/page.tsx`, make each contest's header (rendered inside
      `ContestBlock`) a `Link` to
      `` `/ballot/${contest.id}?address=${encodeURIComponent(address)}` `` so contests become
      clickable entry points into the new comparison page (uses `BallotContest.id` from T002/T003,
      T005).

**Checkpoint**: User Story 1 is independently functional — from `/ballot`, a voter can click into
any contest and see a full candidate comparison at `/ballot/[id]?address=...`; "Back to ballot"
breadcrumb (US2) and the share button (US3) are not yet present.

---

## Phase 4: User Story 2 - Return to the full ballot (Priority: P2)

**Goal**: From a contest's candidate comparison page, a voter can get back to their full sample
ballot in one click, without re-entering their address.

**Independent Test**: From the candidate detail page, click the "Back to ballot" link and confirm
it returns to the sample ballot for the same address.

### Implementation for User Story 2

- [X] T014 [US2] In `frontend/src/app/ballot/[contestId]/page.tsx`, add a "Back to ballot"
      breadcrumb link (label `ballot.backToBallot`) near the top of the found-contest render path
      (T012), href `` `/ballot?address=${encodeURIComponent(address)}` `` — mirrors the
      `contest.allContests` breadcrumb pattern in `elections/[contestId]/page.tsx` (FR-005).
- [X] T015 [US2] In `frontend/src/app/ballot/page.tsx`, read the initial address from the URL and
      seed the fetch-triggering `address` state with it:
      `const [address, setAddress] = useState(() => searchParams.get("address") ?? "")`, so that
      navigating to `/ballot?address=X` (via the T014/T013 links, or a raw shared URL) fetches
      immediately instead of landing on an empty, unsubmitted form. **Implementation note**:
      unlike `elections/page.tsx` (a single free-text input), `AddressForm` is a structured
      street/city/state/zip form with no initial-value prop and no reliable way to reverse-parse a
      combined address string back into those four fields — so only the fetch-triggering state is
      seeded (which is what actually satisfies "no re-entry required"); the form fields themselves
      stay blank until the voter chooses to search again. `AddressForm.tsx` is not modified.

**Checkpoint**: User Stories 1 AND 2 together let a voter reach a contest's comparison view and
return to a pre-filled ballot in one click each way; only the share button (US3) remains.

---

## Phase 5: User Story 3 - Share a contest's candidate comparison (Priority: P3)

**Goal**: A voter can copy a link to the exact contest + address they're viewing, so someone else
opening it sees the identical comparison with no re-entry required.

**Independent Test**: Click the share button and confirm a URL is copied that, when opened, loads
the same contest's candidate comparison with the address already filled in.

### Implementation for User Story 3

- [X] T016 [US3] In `frontend/src/app/ballot/[contestId]/page.tsx`, add a share button plus a
      `copied` boolean state and `handleShare` function (mirrors `handleShare` in
      `frontend/src/app/elections/page.tsx`): build `new URL(window.location.href)`, ensure its
      `address` search param is set to the current `address`, call
      `navigator.clipboard.writeText(url.toString())`, and on success set `copied` to show the
      `ballot.linkCopied` confirmation label for ~2 seconds (FR-006, FR-007).
- [X] T017 [US3] In the same `handleShare` (T016), add a `.catch()` fallback for a rejected/failed
      clipboard write: instead of failing silently, reveal the share URL as visible/selectable
      text (e.g. a small readonly text input or plain text node) alongside the `ballot.shareCopyFailed`
      message, so the voter can copy it manually (FR-007, spec Edge Cases — clipboard copy fails).

**Checkpoint**: All three user stories are independently functional — the full VOT-18 acceptance
criteria are met.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and quality gates spanning all three stories

- [X] T018 [P] Run `cd backend && cargo test` and `cd backend && cargo clippy` — both clean, no new
      warnings (Constitution Principle III).
- [X] T019 [P] Run `cd frontend && npx tsc --noEmit`, `cd frontend && npm run lint`, and
      `cd frontend && npm run test` — all clean, no new warnings, `findContestById` tests (T007)
      passing. `tsc --noEmit` clean; `npm run test` clean (16/16, incl. 4 new `findContestById`
      tests); `npm run lint` fails with the same pre-existing "Invalid project directory provided"
      error documented in `specs/002-sample-ballot-page/tasks.md` T015 (Next.js 16.2.12 removed the
      `next lint` subcommand and this repo has no standalone ESLint config) — unrelated to this
      feature, not fixed here per Constitution Principle III.
- [X] T020 Run `cd frontend && npm run build` — succeeds; `/ballot/[contestId]` appears in the
      route table as a dynamic route alongside the existing pages.
- [X] T021 Walk through every scenario in `specs/003-candidate-detail-comparison/quickstart.md`
      (manual validation section) against the running dev servers: side-by-side/stacked layout at
      both breakpoints, social icon links, back-to-ballot round trip with address preserved, share
      link opened in a fresh/incognito window, single-candidate contest, zero-candidate contest,
      stale/invalid `contestId`, and simulated clipboard-write failure. Record any discrepancies
      found and fix before considering the feature complete.
      **Verified via Playwright against the running dev servers, using real live ballot data**
      (Washington's 2026-08-04 primary, 400 Broad St, Seattle, WA 98109):
      - Contest headers on `/ballot` link to `/ballot/{id}?address=...` with correct sequential ids
        (0-10) matching the real 11-contest response.
      - A 4-candidate contest renders in a 3-column grid on desktop (1280px, confirmed via
        bounding-rect check: 3 cards row 1, 4th wraps row 2) and stacks to 1 column at 375px
        (confirmed all 4 cards share the same left offset).
      - A 1-candidate contest (id 2) renders a single card cleanly, no awkward layout.
      - The real zero-candidate contest ("CITY OF SEATTLE", id 9) renders "No candidates found"
        (FR-008).
      - "Back to ballot" returns to `/ballot?address=...` and the ballot re-fetches and renders
        immediately — no re-entry (FR-005, SC-003).
      - Invalid `contestId` (`/ballot/999?address=...`) renders "This contest could not be found."
        with a working back-to-ballot link (FR-009).
      - Missing `address` (`/ballot/0`) renders "No address provided." with a link to `/ballot`
        (matches the `elections/[contestId]` no-address precedent).
      - Share button: real `navigator.clipboard.writeText()` never resolved or rejected in this
        automated browser session (blocked on what appears to be an unanswerable OS-level
        clipboard permission prompt — confirmed separately that a raw
        `navigator.clipboard.readText()` call also hangs indefinitely in this environment, so this
        is an environment limitation, not app behavior). Verified both code paths directly by
        stubbing `navigator.clipboard.writeText` to resolve/reject: the success path shows "Link
        copied!" (confirmed via immediate DOM check, since the 2-second window is too short to
        survive two separate tool round-trips); the failure path shows "Couldn't copy the link
        automatically — copy it manually:" plus a readonly input containing the correct
        `/ballot/{id}?address=...` URL (FR-006, FR-007, spec Edge Cases).
      - Spanish locale spot-check: "← Volver a la boleta" / "Compartir" render correctly on the
        detail page.
      **No discrepancies found** — no code changes were needed as a result of this pass (unlike
      the 002 feature's quickstart pass, which caught a real casing bug).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Adds to the same file US1
  created (`[contestId]/page.tsx`) and edits `ballot/page.tsx` again, so implement after US1, but
  is independently testable on its own terms (a voter can already reach the detail page via US1
  before this story's breadcrumb/pre-fill exists).
- **User Story 3 (Phase 5)**: Depends on Foundational completion. Adds to the same
  `[contestId]/page.tsx` file, so implement after US1 (and, for a coherent UI, after US2), but
  tests independently as "click share, confirm the copied link works."
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories — is the MVP.
- **User Story 2 (P2)**: Structurally extends the page US1 created and the page US1 already
  touched (`ballot/page.tsx`), so it must land after US1's page exists, but does not require any
  US1 behavior to change — purely additive (a breadcrumb + a read of `?address=` that US1 didn't
  need).
- **User Story 3 (P3)**: Structurally extends the same page US1 created; independent of US2's
  changes (a share button doesn't need the breadcrumb or the pre-fill to function), so it could be
  built in parallel with US2 if staffed separately — both just add UI to the same file.

### Within Each User Story

- Within US1: T009 (page skeleton) → T010 (no-address state) → T011 (not-found state) → T012
  (found-contest render) are sequential (same new file). T013 (link-in from `ballot/page.tsx`) is a
  different file and can be done in parallel with T009-T012 once T002/T003/T005 (ids) exist.
- Within US2: T014 (breadcrumb, `[contestId]/page.tsx`) and T015 (`ballot/page.tsx` address
  pre-fill) touch different files and can run in parallel.
- Within US3: T016 → T017 are sequential (same handler, same file).

### Parallel Opportunities

- T002 (backend model) and T005 (frontend type) touch different languages/files and can run in
  parallel; T003/T004 (backend) and T006/T007 (frontend) are each sequential within their own
  track but the two tracks can proceed in parallel with each other.
- T008 (message keys) touches different files than everything else in Phase 2 and can run in
  parallel with all of it.
- T013 (US1's link-in from `ballot/page.tsx`) can run in parallel with T009-T012 (the new page
  itself), since they're different files, once the Foundational `id` plumbing exists.
- T014 and T015 (US2) can run in parallel with each other.

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "Add `id: usize` to BallotContest in backend/src/models/mod.rs"
Task: "Add `id: number` to BallotContest interface in frontend/src/lib/api.ts"
Task: "Add ballot.backToBallot/contestNotFound/noAddress/searchBallot/share/linkCopied/shareCopyFailed message keys to frontend/src/messages/en.ts and es.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify current `/api/ballot` contract).
2. Complete Phase 2: Foundational (contest `id`s + `findContestById` + copy).
3. Complete Phase 3: User Story 1 (comparison page + clickable contest headers).
4. **STOP and VALIDATE**: confirm side-by-side/stacked layout, social icons, and empty/not-found/
   no-address states work for a real address before adding return-navigation or sharing.
5. Demo if ready — this alone delivers the ticket's core comparison view.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate independently → MVP.
3. Add User Story 2 → validate independently → return-navigation preserves address.
4. Add User Story 3 → validate independently → full VOT-18 acceptance criteria met.
5. Polish phase → lint/type/test/build clean, quickstart walkthrough verified.

---

## Notes

- This feature touches: `backend/src/models/mod.rs` and `backend/src/services/civic_api.rs`
  (additive, one new field + its assignment + a test), `frontend/src/lib/api.ts` and
  `api.test.ts` (additive), `frontend/src/messages/{en,es}.ts` (additive), a new
  `frontend/src/app/ballot/[contestId]/page.tsx`, and a small edit to the existing
  `frontend/src/app/ballot/page.tsx`. `CandidateCard.tsx` and `AddressForm.tsx` are reused
  unmodified — do not edit them as part of this feature.
- No database, migration, or new endpoint is introduced — `/api/ballot`'s existing shape is
  extended, not replaced.
- Commit after each task or logical group per repository convention.
- Stop at any Checkpoint above to validate that story independently before continuing.
