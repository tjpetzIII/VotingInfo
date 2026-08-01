# Implementation Plan: Mobile Responsiveness Pass

**Branch**: `005-mobile-responsiveness` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-mobile-responsiveness/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Audit and fix mobile layout defects across every frontend page at 375px/390px/414px viewport
widths: eliminate horizontal scrolling, bring all interactive elements up to a 44x44px minimum
tap target, ensure the Leaflet polling-location map responds correctly to pinch-zoom/pan touch
gestures on iOS Safari and Android Chrome, and ensure the on-screen keyboard never permanently
hides the address form's submit button. This is a frontend-only, CSS/markup-level fix on top of
the existing Tailwind v4 + React 19 UI — no backend, data model, or public API changes are
involved.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2 (App Router), React 19

**Primary Dependencies**: Tailwind CSS v4 (`@tailwindcss/postcss`, CSS-first config — no
`tailwind.config.*` file exists; default breakpoints `sm=640px`/`md=768px`/`lg=1024px` apply
unmodified via `@import "tailwindcss"` in `globals.css`); `leaflet` v1 + `react-leaflet` v5 for
the polling map; `react-hook-form` + `zod` for `AddressForm`; `react-intl` for i18n

**Storage**: N/A — pure UI/layout change, no data model or persistence involved

**Testing**: Vitest v4 + `@testing-library/react`/`user-event` (existing component tests for
`AddressForm`, `Header`; jsdom environment). No Playwright/Cypress or other real-browser/e2e
tooling is installed, so jsdom cannot verify actual rendered layout at a given pixel width —
verification for this feature is manual (browser devtools device emulation + real iOS/Android
devices for the map), documented in `quickstart.md`

**Target Platform**: Mobile web browsers, primarily iOS Safari and Android Chrome, at viewport
widths 375px–414px (the repo has no native mobile app; this is the existing Next.js frontend
viewed on a phone)

**Project Type**: Web application (Next.js frontend + Rust/Axum backend) — this feature is
frontend-only; the backend module tree is untouched

**Performance Goals**: N/A beyond existing constraints — no new network calls, caches, or
API endpoints are introduced by this feature

**Constraints**: Must stay within Tailwind v4's default breakpoint system (no new
`tailwind.config.*` or `@theme` breakpoint overrides); must preserve the map's existing
`scrollWheelZoom={false}` desktop behavior while fixing touch gestures; must not regress the
existing `md:hidden`/`hidden md:flex` hamburger nav pattern already in `Header.tsx`

**Scale/Scope**: 10 route pages under `frontend/src/app/**/page.tsx` that render their own layout
(see FR-007), plus the shared components they compose (`Header`, `AddressForm`,
`AddressSummary`, `PollingMap`, `CandidateCard`, and per-page list/card components). No new
pages, routes, or components are added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Independent Services, Independent Toolchains** — PASS. This feature touches only
  `frontend/`; the backend is untouched and remains independently buildable/testable.
- **II. Testing Standards** — PASS with a noted gap. No third-party network calls or secrets are
  involved (N/A). Every layout fix should keep or add a Vitest/Testing Library assertion where
  one reasonably can be written (e.g., DOM-level checks for wrapping/class changes on
  `AddressForm`), but pixel-level viewport/touch-gesture behavior (horizontal scroll, 44px tap
  targets, Leaflet pinch-zoom, keyboard-obscuring-button) is not something the existing
  Vitest+jsdom stack can verify — those require the manual devtools/real-device verification
  documented in `quickstart.md`. This is a documented, reasonable limitation of the current
  toolchain, not a violation to fix as part of a 2-point ticket.
- **III. Code Quality** — PASS. All changes must pass `cargo clippy` is N/A (frontend-only);
  `npm run lint` and `npx tsc --noEmit` must pass with no new warnings. Fixes are scoped to
  layout/markup/class changes only — no speculative refactors.
- **IV. Never Forward Raw Third-Party Responses** — N/A, no API/response handling changes.
- **V. Security & Configuration Discipline** — N/A, no CORS/secrets/rate-limit changes.
- **VI. User Experience Consistency** — PASS, and this feature directly reinforces this
  principle: all pages continue to render within the shared `layout.tsx` header/footer shell and
  use existing Tailwind design tokens; no one-off styles or ad hoc breakpoints are introduced.
- **VII. Performance Requirements** — PASS. No new external API calls; existing
  Suspense/loading boundaries (e.g., `PollingMap`'s `dynamic(..., { ssr:false, loading: ... })`)
  are preserved as-is.
- **VIII. Centralized Documentation** — PASS. Any new documentation (e.g., a manual mobile-QA
  checklist) goes under `docs/`, not scattered in feature folders.
- **IX. Frontend JSX Comment Convention** — PASS, will be followed when editing JSX (no
  `{/* comment */}` immediately after a closing tag on the same line).

**Result**: No violations requiring justification. Gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/005-mobile-responsiveness/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command) — no entities, documented as N/A
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md   # Phase 0 (spec) quality checklist, from /speckit-specify
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory is generated for this feature: it introduces no new or changed public
interface (no new API endpoints, no new component props consumed outside the frontend, no CLI).
It is a layout/styling fix to existing pages and components.

### Source Code (repository root)

This feature uses the existing **Option 2: Web application** structure already in place in this
repo (frontend + backend). Only the `frontend/` side is touched:

```text
backend/                          # UNTOUCHED by this feature
└── ...

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # home — audit + fix
│   │   ├── voter-info/page.tsx                # audit + fix
│   │   ├── elections/page.tsx                 # audit + fix
│   │   ├── elections/[contestId]/page.tsx      # audit + fix
│   │   ├── ballot/page.tsx                     # audit + fix
│   │   ├── ballot/[contestId]/page.tsx          # audit + fix
│   │   ├── polling/page.tsx                     # audit + fix (hosts PollingMap)
│   │   ├── dates/page.tsx                       # audit + fix
│   │   ├── registration-dates/page.tsx           # audit + fix
│   │   ├── login/page.tsx                        # audit + fix
│   │   ├── all-elections/page.tsx                 # redirect only — no layout, not audited
│   │   └── registration/page.tsx                  # redirect only — no layout, not audited
│   └── components/
│       ├── Header.tsx                              # tap-target/spacing refinement of existing
│       │                                            # md:hidden hamburger nav
│       ├── AddressForm.tsx                          # state/zip row flex-wrap fix,
│       │                                            # keyboard-obscures-submit fix
│       ├── AddressSummary.tsx                        # audit + fix
│       ├── PollingMap.tsx                            # explicit Leaflet touch-gesture props
│       └── CandidateCard.tsx                         # audit + fix
└── tests/                                              # co-located *.test.tsx (Vitest)
```

**Structure Decision**: Reuse the existing `frontend/src/app` (pages) + `frontend/src/components`
(shared components) layout; no new top-level directories. Changes are class/markup-level edits
to the files above plus targeted prop changes on `PollingMap`'s `<MapContainer>`.

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification.*
