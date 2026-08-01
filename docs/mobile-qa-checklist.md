# Mobile QA Checklist

A reusable regression checklist for verifying mobile layout across the frontend, distilled from
`specs/005-mobile-responsiveness/quickstart.md` (VOT-30). Run this whenever a page or shared
component (`Header`, `AddressForm`, `AddressSummary`, `CandidateCard`, `PollingMap`,
`PollingLocationCard`) changes.

## Part A — Emulated viewport pass (every page, 375px minimum)

Target widths: 375px, 390px, 414px (Tailwind's default `sm` breakpoint is 640px, so all three
fall below it — testing 375px alone covers the others unless a change specifically narrows
something between 375-414px).

For each page (`/`, `/voter-info`, `/elections`, `/elections/[contestId]`, `/ballot`,
`/ballot/[contestId]`, `/polling`, `/dates`, `/registration-dates`, `/login`):

1. No horizontal scrollbar; `document.documentElement.scrollWidth` equals `clientWidth`.
2. Every button/link/input measures at least 44x44px
   (`element.getBoundingClientRect()`).
3. The header/nav (hamburger menu below `md`) opens fully in-viewport, no clipped items.
4. All text wraps rather than being clipped or overflowing.

A quick DOM-level script to run in the browser console or via Playwright's `browser_evaluate`:

```js
() => {
  const overflowing = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  const smallTargets = [];
  document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      smallTargets.push({ tag: el.tagName, text: (el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
    }
  });
  return { overflowing, smallTargets };
}
```

## Part B — Polling map touch gestures (real iOS + Android devices)

On real hardware (devtools touch emulation is not sufficient — see
`specs/005-mobile-responsiveness/research.md`): open `/polling` with a valid address, pinch-zoom
and single-finger pan the map at least 10 times on each platform, confirm the map — not the
page — responds every time.

## Part C — Address form keyboard vs. submit button (real iOS + Android devices)

On real hardware: focus each address form field in turn on a ~375px-wide viewport, confirm the
submit button stays visible or reachable by normal scroll above the on-screen keyboard on both
iOS Safari and Android Chrome (the two platforms resize the viewport differently).

## Part D — Automated checks

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run test
```

(`npm run lint` is currently broken independent of this checklist — `next lint` errors with
"Invalid project directory provided" on this Next.js 16.2 install, since Next removed the
built-in `lint` subcommand and no standalone ESLint config exists yet. Pre-existing gap, not
introduced by any mobile-responsiveness change — worth a follow-up ticket.)
