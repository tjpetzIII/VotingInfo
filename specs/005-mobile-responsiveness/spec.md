# Feature Specification: Mobile Responsiveness Pass

**Feature Branch**: `005-mobile-responsiveness`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "VOT-30 — Mobile responsiveness pass. Audit all pages on mobile viewports (375px, 390px, 414px). Fix layout issues, ensure tap targets are at least 44px, and test the map on touch devices. Acceptance criteria: All pages usable at 375px width; Map pinch-to-zoom works on iOS and Android; No horizontal scroll on any page; Address form keyboard doesn't obscure submit button on mobile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse core pages on a phone (Priority: P1)

A voter on a phone (375px–414px wide) opens the app to find their polling place, contests, or election dates. Every page they land on is fully readable and usable without scrolling sideways or fighting cramped controls.

**Why this priority**: This is the majority use case — most voters checking election info on the go are on a phone — and it covers the largest surface area (every address-driven and static page in the app).

**Independent Test**: Load each page (home, voter-info, elections, elections/[contestId], ballot, ballot/[contestId], polling, dates, registration-dates, login) in a mobile viewport emulator at 375px, 390px, and 414px and confirm no horizontal scrollbar appears and all content/controls are visible and reachable. (`/all-elections` and `/registration` are server-side redirects to `/` and `/voter-info` respectively and render no layout of their own, so they are not audited separately.)

**Acceptance Scenarios**:

1. **Given** a voter on a 375px-wide phone, **When** they open any page in the app, **Then** the page renders with no horizontal scrolling and all text/content is visible without being clipped or overlapping.
2. **Given** a voter on a 390px or 414px-wide phone, **When** they tap any button, link, nav item, or form control, **Then** the tap target is at least 44x44px and registers the tap without hitting an adjacent element.

---

### User Story 2 - Interact with the polling-location map on a touch device (Priority: P2)

A voter looks up their polling place on the `/polling` page using an iPhone or Android phone and needs to pinch-to-zoom and pan the map to see the exact location relative to nearby streets.

**Why this priority**: The map is the one genuinely interactive, gesture-driven component in the app; it's called out explicitly in the ticket because touch map interaction is a common source of mobile-specific bugs (e.g., page scroll capturing the gesture instead of the map).

**Independent Test**: On an iOS Safari and an Android Chrome device (or equivalent touch-capable emulator/simulator), open `/polling` with a valid address, then pinch-to-zoom and single-finger pan the map and confirm the map — not the page — responds to the gesture.

**Acceptance Scenarios**:

1. **Given** a voter on an iOS touch device viewing the polling map, **When** they pinch-to-zoom on the map, **Then** the map zooms in/out and the surrounding page does not scroll or jump.
2. **Given** a voter on an Android touch device viewing the polling map, **When** they pan the map with one finger, **Then** the map pans smoothly and the gesture is not intercepted by the page.

---

### User Story 3 - Fill out the address form with the keyboard open (Priority: P3)

A voter on a phone taps into the address form's zip code field. The on-screen keyboard pops up, and they need to reach the submit button without it being hidden behind the keyboard.

**Why this priority**: This is a narrower, single-component fix compared to Stories 1 and 2, but it directly blocks task completion (a voter who can't find "Submit" can't get their results) so it's still called out explicitly in the ticket's acceptance criteria.

**Independent Test**: On a mobile viewport/device, focus each field of the address form in turn and confirm the submit button is visible or reachable by scrolling without the keyboard permanently covering it.

**Acceptance Scenarios**:

1. **Given** a voter on a 375px-wide phone with the on-screen keyboard open on a form field, **When** they finish entering their address, **Then** the submit button is visible on-screen or becomes reachable by a normal scroll within the visible viewport above the keyboard.

---

### Edge Cases

- What happens on the smallest supported width (375px) for pages with data-dense content, such as the ballot page's grouped contest lists or a contest detail page with a long candidate bio?
- How does the layout behave when a candidate name, party, or address string is unusually long and would otherwise force horizontal overflow?
- What happens on the polling map when geolocation returns a result but the device has no network connectivity to load map tiles — does the touch-gesture layer still fail gracefully without breaking page scroll?
- How does the address form behave on very short viewports (e.g., a phone in landscape) where the keyboard covers a larger fraction of the screen?
- Do multi-step/expandable UI elements (e.g., dropdowns, the locale switcher, the nav menu) still open within the visible viewport at 375px without being clipped off-screen?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every page in the app MUST render with no horizontal scrolling at viewport widths of 375px, 390px, and 414px.
- **FR-002**: Every interactive element (buttons, links, nav items, form inputs, dropdowns) MUST have a minimum tap target size of 44x44px at mobile viewport widths.
- **FR-003**: The polling-location map MUST support pinch-to-zoom and single-finger pan gestures on both iOS Safari and Android Chrome without the surrounding page intercepting or being disrupted by the gesture.
- **FR-004**: The address form MUST keep its submit button visible or reachable by normal scrolling when the on-screen keyboard is open on a mobile device, on every page that embeds the form (voter-info, elections, polling, dates).
- **FR-005**: The site header/navigation MUST remain fully usable (all links reachable, no clipped or overlapping items) at 375px–414px widths.
- **FR-006**: Text content (candidate names, bios, party labels, election descriptions, dates) MUST wrap and reflow at mobile widths rather than being truncated, clipped, or forced into horizontal overflow.
- **FR-007**: All existing pages that render their own layout (home, voter-info, elections, elections/[contestId], ballot, ballot/[contestId], polling, dates, registration-dates, login) MUST be audited against FR-001 through FR-006 and any layout defects found MUST be fixed as part of this pass. (`/all-elections` and `/registration` are pure server-side redirects with no layout of their own and are excluded.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of app pages render with zero horizontal scroll at each of the 375px, 390px, and 414px viewport widths.
- **SC-002**: 100% of interactive controls audited across the app measure at least 44x44px at mobile viewport widths.
- **SC-003**: A voter can pinch-to-zoom and pan the polling-location map on both an iOS and an Android touch device with the gesture recognized correctly every time, across 10 consecutive attempts on each platform.
- **SC-004**: A voter using the address form on a 375px-wide device can locate and tap the submit button within 2 seconds of the on-screen keyboard appearing, without needing to dismiss the keyboard first.
- **SC-005**: A full manual audit of every page at 375px, 390px, and 414px finds zero layout-breaking defects (content overlap, clipped text, off-screen controls) remaining once this pass is complete.

## Assumptions

- Mobile viewport testing is performed via browser devtools device emulation at the three specified widths (375px, 390px, 414px), plus manual or simulator-based touch testing on iOS Safari and Android Chrome specifically for the map interaction (Story 2), since those are the two platforms named in the ticket.
- "Usable" means: no horizontal page scroll, no clipped/overlapping content, and every interactive element is visible and tappable without accidentally triggering a neighboring element.
- This pass fixes remaining mobile layout defects on top of the app's existing Tailwind CSS responsive styling; it is not a ground-up visual redesign of any page.
- Landscape phone orientation and tablet-sized viewports are out of scope for this pass unless a landscape-specific defect directly blocks one of the four acceptance criteria (e.g., the keyboard-obscures-submit-button case in Story 3, which is inherently worse in landscape).
- Desktop and tablet breakpoints are assumed to already work correctly today and are out of scope for this pass, which targets phone-sized viewports (375px–414px) only.
