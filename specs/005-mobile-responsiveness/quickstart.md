# Quickstart: Validating the Mobile Responsiveness Pass

This feature has no automated viewport/e2e coverage (see `research.md` — "No new automated
viewport/e2e test tooling added"). Validation is manual, following the procedure below, plus the
existing Vitest suite for any DOM-level assertions added alongside layout fixes.

## Prerequisites

- `cd frontend && npm install`
- `cd frontend && npm run dev` (serves at `http://localhost:3000`)
- A backend running at `localhost:8080` (`cd backend && cargo run`) if exercising address-driven
  pages end-to-end, or use a known-good test address
- Chrome or Firefox DevTools (device toolbar) for the emulated-viewport pass
- A real iOS device (Safari) and a real Android device (Chrome) on the same network as the dev
  machine, for the touch-gesture and keyboard scenarios (devtools emulation is not sufficient —
  see `research.md`)

## Part A — Emulated viewport pass (every page, 375px / 390px / 414px)

For each width in `{375, 390, 414}`, using DevTools' device toolbar (or an equivalent
responsive-mode tool) set the viewport to that width and load each of the 10 pages in
FR-007/plan.md's Project Structure:

`/`, `/voter-info`, `/elections`, `/elections/[contestId]` (any valid contest), `/ballot`,
`/ballot/[contestId]`, `/polling`, `/dates`, `/registration-dates`, `/login`

For each page/width combination, confirm (maps to FR-001, FR-002, FR-005, FR-006 / SC-001,
SC-002, SC-005):

1. No horizontal scrollbar appears and no content is clipped off the right edge.
2. Every button, link, form input, and nav item is reachable and — using DevTools' element
   inspector box model — measures at least 44x44px.
3. The header/nav (hamburger menu on `<md`) opens fully within the viewport with no items
   clipped or overlapping.
4. All text (candidate names, party labels, dates, descriptions) wraps rather than being
   truncated or forced into overflow.

Record any failing page/width/element combination as a defect to fix.

## Part B — Polling map touch gestures (real iOS + Android devices)

Maps to FR-003 / SC-003.

1. On the dev machine, note its LAN IP; on the phone, browse to `http://<LAN-IP>:3000/polling`.
2. Enter a valid address and wait for the map to render.
3. Pinch-to-zoom in and out on the map at least 10 times; confirm the map zooms each time and the
   surrounding page never scrolls or jumps as a side effect.
4. Pan the map with a single finger at least 10 times; confirm smooth panning with no gesture
   dropped to the page scroll instead.
5. Repeat steps 3-4 on both an iOS Safari device and an Android Chrome device.

## Part C — Address form keyboard vs. submit button (real iOS + Android devices)

Maps to FR-004 / SC-004.

1. On a phone (or the DevTools device toolbar with a **real** device fallback if unavailable —
   note this scenario specifically benefits from a real device per `research.md`), open any page
   with the address form (`/voter-info`, `/elections`, `/polling`, or `/dates`) at a ~375px-wide
   viewport.
2. Tap into each field (street, city, state, zip) in turn; when the on-screen keyboard appears,
   confirm the submit button is either already visible or reachable with a normal scroll within
   the visible viewport above the keyboard — never permanently hidden.
3. Repeat on both iOS Safari and Android Chrome, since the two platforms resize the
   visual/layout viewport differently (see `research.md`).

## Part D — Automated checks (existing tooling)

Run alongside any fix that touches component markup:

```bash
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
cd frontend && npm run test
```

All three MUST pass with no new warnings/failures before the pass is considered done
(Constitution Principle III).

## Done criteria

All of Parts A-C pass with zero recorded defects across all 10 pages, 3 widths, both platforms,
and both gesture/keyboard scenarios (SC-001 through SC-005), and Part D's commands all pass clean.
