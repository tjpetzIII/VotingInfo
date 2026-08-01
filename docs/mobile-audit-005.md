# Mobile Audit — VOT-30 / specs/005-mobile-responsiveness

Audit performed against 375px/390px/414px viewport widths (all below Tailwind's default `sm`
breakpoint of 640px, so only unprefixed base classes apply at these widths). Findings are keyed
by file:line, mapped to FR-001 (horizontal scroll), FR-002 (44px tap targets), FR-005 (nav),
FR-006 (text wrap). See `specs/005-mobile-responsiveness/tasks.md` for the fix tasks.

## `frontend/src/app/page.tsx` (home) — FR-002
- L85-93: modal close (X) button has no padding around a `w-5 h-5` SVG — tap target ≈20×20px.

## `frontend/src/app/voter-info/page.tsx`
- No defects found.

## `frontend/src/app/elections/page.tsx` — FR-001, FR-002
- L74-81: search `<form className="flex gap-3 ...">` has no `flex-wrap`/`min-w-0` on its text
  input — overflow risk at 343px available width.
- L110-117: share button `px-4 py-2` ≈36-40px tall — under 44px tap target.

## `frontend/src/app/elections/[contestId]/page.tsx`
- No defects found.

## `frontend/src/app/ballot/page.tsx` — FR-002
- L146-157: `BallotSection` toggle button has only `pb-2` vertical padding — ≈32-36px tall.

## `frontend/src/app/ballot/[contestId]/page.tsx` — FR-002
- L114-120: share button `px-3 py-1.5 text-sm` ≈30-32px tall.

## `frontend/src/app/polling/page.tsx` (non-map layout)
- No defects in the page file itself.

## `frontend/src/components/PollingLocationCard.tsx` — FR-002
- L39-46: "Get Directions →" link has no padding — tap target ≈20px tall despite being the
  card's primary CTA.

## `frontend/src/app/dates/page.tsx`
- No defects found.

## `frontend/src/app/registration-dates/page.tsx` — FR-001, FR-002
- L143/157: Important Dates table wrapper uses `overflow-hidden` (not `overflow-x-auto`); the
  date `<td>` has `whitespace-nowrap w-1/3`, so overflow is silently clipped rather than
  scrollable.
- L70-76: modal close (✕) button has no padding — tiny tap target.
- L281-286: error-modal "Close" button has no padding — tiny tap target.

## `frontend/src/app/login/page.tsx` — FR-002
- L74-83, L84-93: Sign In/Sign Up tab buttons `py-2` ≈36px tall.
- L140-150: submit button `py-2` ≈36px tall.

## `frontend/src/components/CandidateCard.tsx` — FR-002
- L108-117: social-channel chips `px-2.5 py-1 text-xs` ≈24px tall.
- L125-131: "Contact info" disclosure toggle has zero padding — ≈20px tall.

## `frontend/src/components/AddressSummary.tsx` — FR-002
- L41-47: "Cancel" button, no padding — ≈20px tall.
- L63-69: "Change" button, no padding — ≈20px tall. Rendered on nearly every address-driven
  page — high-impact fix.

## `frontend/src/components/Header.tsx` — FR-005 (refinement, not rebuild)
- Existing `md:hidden` hamburger + mobile dropdown already works structurally. Verify hamburger
  button (`p-2`, ≈36px with a `w-5 h-5` icon — borderline) and mobile dropdown links (`px-4 py-3`,
  already ≥44px) meet the 44px minimum; bump hamburger button padding if needed.

## `frontend/src/components/AddressForm.tsx` — FR-001, FR-004 (handled separately under US3)
- State/Zip row (`flex gap-3`, no `flex-wrap`) and keyboard/submit-button reachability are
  tracked as User Story 3 tasks (T019-T021), not duplicated here.

## Not audited (out of scope)
- `/all-elections`, `/registration` — redirect-only routes, no layout of their own.
- Map interaction inside `PollingMap.tsx` — User Story 2 (T016-T018).
