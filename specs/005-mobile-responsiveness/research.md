# Phase 0 Research: Mobile Responsiveness Pass

All Technical Context items were resolved via direct codebase inspection; no
`NEEDS CLARIFICATION` markers remain.

## Decision: Work within Tailwind v4's default breakpoint system, no custom breakpoints

**Rationale**: There is no `tailwind.config.*` in `frontend/` — this project is on Tailwind CSS
v4 with CSS-first config (`@import "tailwindcss"` in `globals.css`, wired via
`@tailwindcss/postcss`), and no `@theme` block overrides breakpoints. Default breakpoints
(`sm=640px`, `md=768px`, `lg=1024px`, `xl=1280px`, `2xl=1536px`) apply unmodified. All three
target widths from the ticket (375px, 390px, 414px) fall below `sm`, so every `sm:`/`md:`-prefixed
utility already in the codebase (used across 9 of ~12 pages plus `Header.tsx`) is inert at these
widths — those pages currently render their *unprefixed base* classes at 375-414px. Fixes
therefore mean correcting the base (unprefixed) styling, not adding a new breakpoint tier.

**Alternatives considered**: Adding a custom `xs` breakpoint (e.g., 375px) via a `@theme` block —
rejected. The ticket's three widths aren't a new named tier to design for independently; they're
"phone-sized," and the existing `grid-cols-1 sm:grid-cols-N` pattern already collapses to
single-column below `sm`, which is the desired baseline. Introducing a new breakpoint would add a
config surface with no corresponding design requirement.

## Decision: Leaflet touch gestures — set explicit `MapContainer` props, verify on real devices

**Rationale**: `PollingMap.tsx` currently sets only `scrollWheelZoom={false}` on `<MapContainer>`;
`tap`, `dragging`, and `touchZoom` are left at react-leaflet/Leaflet defaults (`true`). Defaults
being "on" doesn't guarantee working pinch-zoom in practice — Leaflet's touch handling is
sensitive to the container's CSS `touch-action` and ancestor `overflow`/`overscroll-behavior`
properties, neither of which is currently set on the `h-80 overflow-hidden` map wrapper `<div>` in
`polling/page.tsx`. The fix is to make the touch props explicit (self-documenting, protects
against a future default change) and to verify actual gesture behavior on real iOS Safari and
Android Chrome, since this class of bug does not reproduce in desktop devtools touch emulation
reliably.

**Alternatives considered**: Switching map libraries (e.g., to `react-map-gl`/Mapbox) — rejected
as far out of scope for a 2-point ticket; the existing Leaflet setup is not the source of the
touch problem, its container/gesture configuration is.

## Decision: AddressForm keyboard-obscures-submit — rely on native scroll-into-view, verify on real devices

**Rationale**: `AddressForm.tsx` has no sticky/fixed footer and no custom scroll logic — the
submit button is the last element in normal document flow after four stacked/flex inputs. Modern
mobile browsers already scroll a focused input into view above the keyboard by default; the
open question is whether the *submit button* (not just the focused input) ends up below the fold
once the keyboard is up, especially on shorter viewports. iOS Safari resizes the **visual**
viewport (layout viewport stays full height, content appears to scroll under a shrunken visible
area) while Android Chrome resizes the **layout** viewport itself — these behave differently
enough that jsdom/devtools emulation cannot substitute for real-device testing here. Where a
defect is found, the fix is layout-level (e.g., ensuring the form container doesn't force the
button off-screen, adding scroll-margin, or reducing vertical spacing on narrow viewports) rather
than JS-driven `scrollIntoView` calls, to keep the fix declarative and consistent with Principle
VI (established, non-ad-hoc UX patterns).

**Alternatives considered**: Adding a `sticky bottom-0` submit button — rejected as a default fix;
it would be a bigger visual/behavioral change than the ticket calls for and risks covering content
on short viewports. Only adopt this if the audit shows the default flow genuinely fails.

## Decision: No new automated viewport/e2e test tooling added in this pass

**Rationale**: The frontend has Vitest + Testing Library (jsdom) only — no Playwright/Cypress.
jsdom does not perform real layout, so it cannot assert "no horizontal scroll at 375px" or "tap
target ≥44px" meaningfully. Introducing Playwright (or similar) purely to automate this 2-point
ticket's manual QA would be a disproportionate scope increase per Constitution Principle III
(match changes to task scope). Verification instead follows the manual procedure in
`quickstart.md` (browser devtools device emulation for all pages/widths, real iOS/Android devices
for the map and keyboard scenarios), consistent with the spec's own Assumptions section.

**Alternatives considered**: Adding Playwright with viewport-sized screenshot tests — noted as a
reasonable *future* improvement (flagged in `quickstart.md`) but explicitly out of scope here.

## Decision: Page inventory correction — include `ballot/[contestId]`, exclude redirect-only routes

**Rationale**: Direct inspection of `frontend/src/app/**/page.tsx` found `ballot/[contestId]`
(contest detail within the sample ballot flow), which the original ticket's implicit page list
missed. `all-elections/page.tsx` and `registration/page.tsx` are server-side redirects
(`redirect("/")` and `redirect("/voter-info")` respectively per `CLAUDE.md`) that render no
layout of their own, so auditing them separately would be a no-op. `spec.md` FR-007 and User
Story 1's Independent Test were updated to reflect this corrected inventory of 10 pages.

**Alternatives considered**: None — this is a factual correction, not a design choice.
