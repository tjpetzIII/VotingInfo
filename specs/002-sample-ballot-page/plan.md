# Implementation Plan: Sample Ballot Page

**Branch**: `002-sample-ballot-page` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-sample-ballot-page/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build `frontend/src/app/ballot/page.tsx`: an address-driven page that fetches the existing
`GET /api/ballot?address=` endpoint and renders its contests grouped into collapsible Federal /
State / Local sections. Each contest shows office + district as a header; each candidate renders
via the existing `CandidateCard` component (name, color-coded party badge, photo with initials
fallback, website link, social channels, collapsible contact info). Contests with zero candidates
show a "No candidates found" message instead of a candidate grid. No backend changes are required
— `BallotResponse` already returns contests pre-sorted Federal → State → Local with a `level` field
per contest and candidate shapes identical to the existing `CandidateDetail` type.

## Technical Context

**Language/Version**: TypeScript 5 (frontend only — no backend changes needed)

**Primary Dependencies**: Next.js 16 (App Router), React 19, `@tanstack/react-query` 5, `react-intl` 8, Tailwind CSS 4

**Storage**: N/A (reads through the existing `moka`-cached `/api/ballot` backend endpoint)

**Testing**: Manually-verified loading/error/empty/success paths noted in the PR, per Constitution Principle II (no existing frontend test runner in this repo — `elections/page.tsx` and `voter-info/page.tsx` follow the same manual-verification convention)

**Target Platform**: Web (Next.js SSR/CSR hybrid, client component)

**Project Type**: Web application (existing `frontend/` + `backend/` split; this feature is frontend-only)

**Performance Goals**: Reuses the existing 15-minute `moka` cache on `/api/ballot` — no new caching or performance work needed; page must not trigger more than one `/api/ballot` call per address submission (react-query `queryKey: ["ballot", address]`, `retry: false`, matching `elections/page.tsx`)

**Constraints**: Must render within the shared `layout.tsx` header/footer shell; must use existing Tailwind tokens and react-query conventions rather than ad hoc styling or fetch calls (Constitution Principle VI)

**Scale/Scope**: One new page (`app/ballot/page.tsx`), one new page-local component (`BallotSection` for the collapsible level grouping), one new `fetchBallot` API wrapper + types in `src/lib/api.ts`. `CandidateCard` is reused unmodified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Independent Services, Independent Toolchains**: PASS. No backend changes; frontend-only addition using the existing `/api/ballot` contract.
- **II. Testing Standards**: PASS (with note). No new backend route/model/error-mapping branch is added, so no new backend test is required. The new `fetchBallot` frontend function follows the same untested-but-manually-verified convention as `fetchElections`/`fetchVoterInfo`; the PR description will note the manually-verified loading/error/empty/success paths.
- **III. Code Quality**: PASS. Plan reuses `CandidateCard` as-is rather than duplicating candidate-rendering logic; new code must pass `npm run lint` + `npx tsc --noEmit` before merge.
- **IV. Never Forward Raw Third-Party Responses**: PASS (no change). `/api/ballot` already returns mapped `BallotResponse` JSON, never raw Google Civic payloads.
- **V. Security & Configuration Discipline**: PASS (no change). No new env vars, no CORS/rate-limit changes.
- **VI. User Experience Consistency**: PASS. Page lives under the shared `layout.tsx` shell, uses react-query with the established retry/backoff via `Providers.tsx`, and follows the loading/error/empty patterns already used on `elections/page.tsx` and `voter-info/page.tsx`.
- **VII. Performance Requirements**: PASS. `/api/ballot` is already `moka`-cached (15-min TTL); the new page issues exactly one fetch per address submission via a single `useQuery` call, no N+1 fan-out.
- **IX. Frontend JSX Comment Convention**: Applies during implementation — no `{/* ... */}` comment may follow a closing JSX tag on the same line.

No violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-sample-ballot-page/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/                          # UNCHANGED — /api/ballot already exists and returns
│                                  # BallotResponse { election, contests: [{ office, district,
│                                  # level, candidates }] } sorted Federal → State → Local
└── src/
    ├── models/mod.rs             # BallotResponse, BallotContest, BallotLevel, BallotCandidate (existing, no edits)
    └── routes/elections.rs       # GET /api/ballot handler (existing, no edits)

frontend/
└── src/
    ├── lib/
    │   └── api.ts                # ADD: BallotLevel, BallotCandidate, BallotContest, BallotResponse
    │                              #      types + fetchBallot(address) wrapper
    ├── components/
    │   ├── CandidateCard.tsx     # REUSE unmodified — matches BallotCandidate shape exactly
    │   └── AddressForm.tsx       # REUSE unmodified — same address-submit pattern as voter-info page
    └── app/
        └── ballot/
            └── page.tsx           # NEW — address form + grouped, collapsible Federal/State/Local
                                    #       sections of contests, each rendering CandidateCard per
                                    #       candidate or a "No candidates found" empty state
```

**Structure Decision**: This is the existing `frontend/` + `backend/` two-service structure
(Constitution Principle I). The feature is entirely additive on the frontend: one new route
(`app/ballot/page.tsx`), one new set of types + fetch wrapper in `src/lib/api.ts`, and reuse of two
existing components (`CandidateCard`, `AddressForm`). No backend, database, or contract changes —
`/api/ballot` already satisfies every data need in the spec.

## Complexity Tracking

*No violations — section not applicable.*
