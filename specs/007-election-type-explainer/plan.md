# Implementation Plan: Election Type Explainer

**Branch**: `007-election-type-explainer` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-election-type-explainer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a collapsible, plain-language banner at the top of the sample ballot page (`/ballot`) that tells the voter what type of election they're looking at (primary, general, special, or runoff — falling back to a generic explanation when the type can't be confidently determined) and what that means for how they can vote. This is a frontend-only change: the election type is classified client-side from the `election.name` string already returned by the existing `GET /api/ballot` response — no backend or data model changes are needed.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19 — frontend only; no backend (Rust/Axum) changes required.

**Primary Dependencies**: `react-intl` (existing, for plain-language copy in en/es), `@tanstack/react-query` (existing — banner reads from the ballot query's already-fetched data, no new query). No new dependencies.

**Storage**: N/A — the election type category is derived at render time from data already returned by `GET /api/ballot`; nothing new is persisted or cached.

**Testing**: Vitest + `@testing-library/react` + `@testing-library/user-event` (existing frontend stack, `cd frontend && npm run test`). No backend tests needed since no backend code changes.

**Target Platform**: Web browser, existing responsive Next.js app (desktop + mobile).

**Project Type**: Web application (existing frontend/backend split) — this feature is scoped entirely to `frontend/`.

**Performance Goals**: No additional network round trips; classification is a pure, synchronous function over data the ballot page already has in memory. No measurable change to page load or interaction latency.

**Constraints**: Must not block, delay, or gate access to ballot contests (spec FR-008); must not require a new backend field or migration (spec Assumptions); collapse/expand state is per-visit only, no persistence layer needed.

**Scale/Scope**: One new pure classifier function, one new banner component (mirrors the existing `BallotSection` collapse pattern), i18n copy for 4 election-type explanations + 1 generic fallback in both `en` and `es`, and wiring into the existing `/ballot` page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Independent Services, Independent Toolchains** — PASS. Change is confined to `frontend/`; no backend files touched, no cross-service coupling introduced.
- **II. Testing Standards** — PASS (planned). New classifier function gets unit tests covering all four types plus the unknown/fallback case; new banner component gets a render/interaction test (per existing `ballot/page.test.tsx` conventions) covering collapse/expand and the per-election reset behavior. No network access or secrets involved.
- **III. Code Quality** — PASS (planned). Must pass `npm run lint` and `npx tsc --noEmit` with no new warnings; no speculative abstraction — one classifier function, one component, reusing existing patterns (`BallotSection`'s expand/collapse) rather than inventing a new one.
- **IV. Never Forward Raw Third-Party Responses** — N/A. No backend/API changes; the frontend already receives `election.name` as a project-owned, mapped field (never raw Google Civic API JSON).
- **V. Security & Configuration Discipline** — N/A. No CORS, secrets, or rate-limit changes.
- **VI. User Experience Consistency** — PASS (planned). Banner renders inside the existing `layout.tsx` shell, uses existing Tailwind tokens, uses `react-intl` for all copy (satisfying FR-009), and follows the same collapse affordance (`aria-expanded`, toggle button) already established by `BallotSection` on the same page.
- **VII. Performance Requirements** — PASS. No new external API call is introduced; the banner is a pure function of data the existing 5-minute-`staleTime` `useQuery(["ballot", address])` call already fetched. Nothing to cache, no fan-out.
- **VIII. Centralized Documentation** — PASS. This plan and its artifacts live under `specs/007-election-type-explainer/`, consistent with prior features (001–006); no ad hoc docs elsewhere.
- **IX. Frontend JSX Comment Convention** — Acknowledged for implementation: any JSX comments in the new banner component must not sit on the same line immediately after a closing tag.

No violations requiring justification — Complexity Tracking section is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/007-election-type-explainer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── election-type-classification.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── (untouched — no changes required for this feature)

frontend/
├── src/
│   ├── lib/
│   │   └── electionType.ts          # NEW: classifyElectionType(name) -> category + message-id mapping
│   ├── components/
│   │   └── ElectionTypeBanner.tsx   # NEW: collapsible banner component
│   ├── app/
│   │   └── ballot/
│   │       └── page.tsx             # MODIFIED: render <ElectionTypeBanner /> above the contests list
│   └── messages/
│       ├── en.ts                    # MODIFIED: add election-type banner copy
│       └── es.ts                    # MODIFIED: add matching Spanish copy
└── (test files alongside each new/modified source file, per existing convention:
     src/lib/electionType.test.ts, src/components/ElectionTypeBanner.test.tsx,
     src/app/ballot/page.test.tsx updated)
```

**Structure Decision**: Existing web-application layout (`backend/` + `frontend/`, no shared package infra — Constitution Principle I). This feature only adds/modifies files under `frontend/`; `backend/` is untouched because the ballot page already receives everything needed (`election.name`) from the existing `GET /api/ballot` response.

## Complexity Tracking

> Not applicable — Constitution Check has no violations to justify.
