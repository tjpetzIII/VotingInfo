# Implementation Plan: Candidate Detail & Comparison

**Branch**: `003-candidate-detail-comparison` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-candidate-detail-comparison/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build `frontend/src/app/ballot/[contestId]/page.tsx`: a side-by-side (stacked on mobile) candidate
comparison view for one contest from the sample ballot, reusing the existing `CandidateCard`
component for full candidate details (bio link, photo, contact info, social channels), with a
"Back to ballot" breadcrumb and an address-preserving share link. Requires one small backend
addition — a stable `id: usize` on `BallotContest` (index-based, assigned the same way as the
existing `ContestDetail.id` on `/api/elections`) — since `BallotContest` currently has no
identifier a URL can reference. Also requires a small addition to the existing
`frontend/src/app/ballot/page.tsx` to read `?address=` from the URL on load (it currently only
holds address in local state), so "back to ballot" and shared links actually pre-fill the address
rather than landing on an empty form.

## Technical Context

**Language/Version**: TypeScript 5 (frontend, primary) + Rust 1.92 (backend, one small additive field)

**Primary Dependencies**: Next.js 16 (App Router), React 19, `@tanstack/react-query` 5, `react-intl` 8, Tailwind CSS 4; backend: Axum 0.7, serde (no new crates)

**Storage**: N/A — reads through the existing `moka`-cached `/api/ballot` endpoint (15-min TTL); the new `id` field is derived per-request, never persisted

**Testing**: `cargo test` (new unit test for `BallotContest.id` assignment/stability in `map_ballot`); Vitest (`npm run test`) — this repo now has a Vitest suite (`src/lib/api.test.ts`, `AddressForm.test.tsx`, `LocaleContext.test.tsx`); extend `api.test.ts` for the new `id` field and add a focused test for the new page's contest-lookup-by-id logic. The share button's `navigator.clipboard.writeText` call is manually verified, matching the existing (untested) precedent in `elections/page.tsx`'s share button — no clipboard mock exists anywhere in this repo yet

**Target Platform**: Web (Next.js SSR/CSR hybrid, client component)

**Project Type**: Web application (existing `frontend/` + `backend/` split; this feature is frontend-first with one small backend addition)

**Performance Goals**: Reuses the existing 15-minute `moka` cache on `/api/ballot` — the new page issues exactly one `fetchBallot(address)` call per address (react-query `queryKey: ["ballot", address]`), matching the parent ballot page's existing single-call convention; no new caching or N+1 fan-out

**Constraints**: Must render within the shared `layout.tsx` header/footer shell; must use existing Tailwind tokens, react-query conventions, and the app's existing `?address=` query-param + clipboard-share pattern (`elections/page.tsx`) rather than inventing a new state-propagation mechanism (Constitution Principle VI)

**Scale/Scope**: One new backend field (`BallotContest.id`), one new frontend route
(`app/ballot/[contestId]/page.tsx`), one small edit to `app/ballot/page.tsx` (read `?address=` on
mount + link each contest to its detail page), one new type field in `src/lib/api.ts`
(`BallotContest.id: number`). `CandidateCard` is reused unmodified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Independent Services, Independent Toolchains**: PASS. The backend change (`id` field) is
  additive and self-contained in `models/mod.rs` + `map_ballot()`; frontend and backend remain
  independently buildable/testable.
- **II. Testing Standards**: PASS (with plan). The new `BallotContest.id` assignment gets a new
  backend unit test (per "every new backend route, model, or error-mapping branch MUST ship with a
  covering test"). The new frontend data path (`fetchBallot` type change + contest lookup) gets a
  Vitest test; the share button's clipboard call is manually verified, consistent with this
  constitution's stated minimum bar and with the existing untested `elections/page.tsx` share
  button precedent.
- **III. Code Quality**: PASS. Reuses `CandidateCard` and the existing grid/breadcrumb/share
  patterns as-is rather than duplicating them; new code must pass `cargo clippy` and
  `npm run lint` + `npx tsc --noEmit` before merge.
- **IV. Never Forward Raw Third-Party Responses**: PASS (no change). `id` is a server-derived
  index, not raw upstream data; `/api/ballot` continues to return only mapped `BallotResponse` JSON.
- **V. Security & Configuration Discipline**: PASS (no change). No new env vars, no CORS/rate-limit
  changes, no secrets involved.
- **VI. User Experience Consistency**: PASS. New page lives under the shared `layout.tsx` shell,
  reuses react-query conventions, and reuses the exact `?address=` + clipboard-share UX pattern
  already established by `elections/page.tsx` / `elections/[contestId]/page.tsx`, so behavior is
  consistent rather than a one-off.
- **VII. Performance Requirements**: PASS. `/api/ballot` remains `moka`-cached; the new page makes
  exactly one `fetchBallot` call per address, no N+1 fan-out, no rate-limit changes.
- **IX. Frontend JSX Comment Convention**: Applies during implementation — no `{/* ... */}`
  comment may follow a closing JSX tag on the same line.

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-candidate-detail-comparison/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-ballot.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/
    ├── models/mod.rs             # MODIFY: add `id: usize` to BallotContest
    └── services/civic_api.rs     # MODIFY: map_ballot() assigns `id` via .enumerate() after the
                                    #         existing contests.sort_by_key(|c| c.level) call
                                    #         ADD: unit test asserting id is sequential/stable

frontend/
└── src/
    ├── lib/
    │   └── api.ts                 # MODIFY: add `id: number` to BallotContest interface
    │   └── api.test.ts            # MODIFY: cover the new `id` field
    ├── components/
    │   └── CandidateCard.tsx      # REUSE unmodified
    └── app/
        └── ballot/
            ├── page.tsx           # MODIFY: read `address` from useSearchParams() on mount
                                    #         (mirrors elections/page.tsx); link each contest
                                    #         header to /ballot/{id}?address=...
            └── [contestId]/
                └── page.tsx        # NEW — fetches fetchBallot(address), finds contests[].id ===
                                     #        contestId, renders CandidateCard per candidate in a
                                     #        grid grid-cols-1 md:grid-cols-2(+) layout, "Back to
                                     #        ballot" breadcrumb, share button (copy URL with
                                     #        address), not-found/no-address/empty states
```

**Structure Decision**: This is the existing `frontend/` + `backend/` two-service structure
(Constitution Principle I). The feature is primarily additive on the frontend — one new route
(`app/ballot/[contestId]/page.tsx`) and one small edit to an existing page
(`app/ballot/page.tsx`) — plus one small, additive backend change (`BallotContest.id`) needed only
because the ballot response currently has no stable per-contest identifier to put in a URL.
`CandidateCard` and `AddressForm` are reused unmodified; no database, migration, or new endpoint is
introduced.

## Complexity Tracking

*No violations — section not applicable.*
