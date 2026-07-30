# Implementation Plan: Single Shared Address Entry

**Branch**: `004-shared-address-context` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-shared-address-context/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Introduce a shared `AddressContext`/`AddressProvider` (mirroring the existing `LocaleContext` pattern) that holds the single most-recently-entered address, persisted to `localStorage` and hydrated client-side after mount. Wire the seven address-driven pages (`voter-info`, `elections`, `elections/[contestId]`, `ballot`, `ballot/[contestId]`, `polling`, `dates`) to auto-fetch using the saved address when one exists, and expose a shared "Using: {address} · Change" control that reopens `AddressForm` pre-filled with the saved values. `AddressForm` gains an optional pre-fill prop; existing per-field validation is untouched. This is a frontend-only change — no backend/API contract changes.

## Technical Context

**Language/Version**: TypeScript (Next.js 16 App Router, React 19)

**Primary Dependencies**: React Context API (existing pattern, see `LocaleContext`), `@tanstack/react-query` (existing data-fetching layer), `react-intl` (existing i18n layer) — no new dependencies

**Storage**: Browser `localStorage`, key `address`, storing structured fields (`street`, `city`, `state`, `zip`) rather than a pre-joined string, so the address-entry form can be re-opened pre-filled (see Research §3 for why this differs from the ticket's originally proposed single-string storage)

**Testing**: Vitest + Testing Library (frontend unit tests, existing convention per `CLAUDE.md` — `cd frontend && npm run test`); mirrors existing `LocaleContext`/`AddressForm` test coverage

**Target Platform**: Web browser (client-side), Next.js App Router pages under `frontend/src/app`

**Project Type**: Web application — this repo is frontend (Next.js) + backend (Rust/Axum) as independent services; this feature touches **frontend only**

**Performance Goals**: No new network calls beyond what each page already performs; reading/writing the saved address MUST NOT block first paint or cause a hydration mismatch (same SSR-safe `useEffect`-hydration approach as `LocaleContext`)

**Constraints**: No backend changes (Principle I); existing per-page inline validation/error UX must remain unchanged (Principle VI, FR-007); must not regress the existing `?address=` URL-param behavior already present on `elections` and `ballot` (pre-existing, unrelated to this ticket, tracked separately under VOT-25) — URL param, when present, continues to take precedence over the saved address for that page load

**Scale/Scope**: 1 new context module, 1 provider wiring change, 1 shared UI addition (address summary/change control), edits to `AddressForm` and 7 page components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. Independent Services, Independent Toolchains | Applies | PASS — change is entirely within `frontend/`; no backend files touched, no cross-service coupling introduced. |
| II. Testing Standards | Applies | PASS (enforced at implementation) — new `AddressContext` and updated pages require Vitest coverage (or documented manual verification per existing convention), no reliance on real network/timers. |
| III. Code Quality | Applies | PASS (enforced at implementation) — must pass `npm run lint` / `npx tsc --noEmit` with no new warnings; no speculative abstractions beyond what's needed for 7 pages to share one context. |
| IV. Never Forward Raw Third-Party Responses | N/A | No new backend/API interaction is introduced by this feature. |
| V. Security & Configuration Discipline | N/A | No CORS, secrets, or rate-limiting changes; `localStorage` holds only a user-entered address, no credentials. |
| VI. User Experience Consistency | Applies | PASS by design — reuses existing `AddressForm` validation/error components, existing Tailwind tokens, and existing react-query `queryKey` conventions; explicitly required by FR-007. |
| VII. Performance Requirements | Applies | PASS — no new external API calls added, no additional fan-out; page fetch behavior (moka caching, rate limits) is unchanged since only the *source* of the address string changes, not the fetch pattern. |
| VIII. Centralized Documentation | N/A | No new standalone documentation files planned outside this spec-kit feature folder. |
| IX. Frontend JSX Comment Convention | Applies | PASS (enforced at implementation) — any JSX comments added during implementation must not sit on the same line immediately after a closing tag. |

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-shared-address-context/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── address-context.md
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── contexts/
│   │   ├── LocaleContext.tsx        # existing pattern this feature mirrors
│   │   └── AddressContext.tsx        # NEW — AddressProvider / useAddress()
│   ├── components/
│   │   ├── Providers.tsx             # EDIT — wire AddressProvider in alongside Locale/Intl/QueryClient/Auth
│   │   ├── AddressForm.tsx           # EDIT — accept optional pre-fill values
│   │   └── AddressSummary.tsx        # NEW — shared "Using: {address} · Change" control
│   └── app/
│       ├── voter-info/page.tsx              # EDIT — use shared address
│       ├── elections/page.tsx               # EDIT — use shared address (URL param still takes precedence when present)
│       ├── elections/[contestId]/page.tsx   # EDIT — fall back to shared address when no URL param
│       ├── ballot/page.tsx                  # EDIT — use shared address (URL param still takes precedence when present)
│       ├── ballot/[contestId]/page.tsx      # EDIT — fall back to shared address when no URL param
│       ├── polling/page.tsx                 # EDIT — use shared address
│       └── dates/page.tsx                   # EDIT — use shared address
└── src/contexts/__tests__/ (or colocated *.test.tsx)  # NEW/EDIT — AddressContext + AddressForm pre-fill tests

backend/            # UNCHANGED — no backend files touched by this feature
```

**Structure Decision**: This repo is the "web application" shape (independent `frontend/` + `backend/` services, no shared workspace). This feature is entirely additive/edits within `frontend/src/{contexts,components,app}`; `backend/` is untouched, consistent with Principle I and the spec's "frontend-only" assumption.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
