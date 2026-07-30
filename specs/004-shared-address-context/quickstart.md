# Quickstart: Validating Single Shared Address Entry

Manual/E2E validation guide for this feature once implemented. See [data-model.md](./data-model.md) for the `SavedAddress` shape and [contracts/address-context.md](./contracts/address-context.md) for the `useAddress()` contract.

## Prerequisites

```bash
cd backend && cargo run        # localhost:8080 — required so pages can actually fetch results
cd frontend && npm run dev     # localhost:3000
```

No `GOOGLE_CIVIC_API_KEY`-specific setup is required beyond what's already documented in `CLAUDE.md`/`backend/.env` — this feature makes no backend changes.

## Scenario 1 — Enter once, reuse everywhere (User Story 1, P1)

1. Open `localhost:3000/polling`. Confirm the empty `AddressForm` is shown (no saved address yet).
2. Submit a valid address (e.g. `1600 Amphitheatre Parkway, Mountain View, CA 94043`).
3. Confirm polling results render.
4. Navigate to `/ballot`, `/dates`, `/voter-info`, `/elections` in turn.
5. **Expected**: each page shows results for the same address automatically, without an empty form appearing first.

## Scenario 2 — Change address from any page (User Story 2, P2)

1. With a saved address already in place (from Scenario 1), open `/dates`.
2. Locate the "Using: {address} · Change" control; activate "Change".
3. **Expected**: `AddressForm` reopens with street/city/state/zip pre-filled to match the saved address.
4. Submit a different valid address.
5. Navigate to `/polling`.
6. **Expected**: `/polling` now shows results for the new address, not the original one.
7. Repeat step 2–3, but this time submit an intentionally invalid value (e.g. empty street).
8. **Expected**: the existing inline validation error appears (unchanged from current per-page behavior), and the previously saved address remains in effect (check another page still shows the old results).

## Scenario 3 — Survives reload (User Story 3, P3)

1. With a saved address in place, fully reload the browser tab (hard refresh) on `/voter-info`.
2. **Expected**: `/voter-info` shows results for the saved address without re-prompting.
3. Close the tab entirely and reopen `localhost:3000/elections` (no `?address=` in the URL).
4. **Expected**: results still reflect the saved address.

## Scenario 4 — Regression check: existing `?address=` URL param still works

1. Navigate directly to `/elections?address=${encodeURIComponent("some other address")}"` (a different address than the saved one).
2. **Expected**: the URL-param address takes precedence for this page load (existing shareable-link behavior is unchanged — see `research.md` §4).
3. Navigate away and back to `/elections` with no query param.
4. **Expected**: falls back to the shared saved address again.

## Scenario 5 — Edge cases

- **No saved address (first-ever visit)**: clear `localStorage` (`localStorage.removeItem("address")` in devtools), reload any address-driven page. Expect the plain empty form, same as today.
- **Corrupted storage**: in devtools, run `localStorage.setItem("address", "not json")`, reload. Expect the app to treat this as "no saved address" (empty form), not an error/crash.
- **Storage disabled**: test in a private/incognito window with storage blocked (or via devtools' storage-quota override). Expect the app to still function for the current session (address usable across in-app navigation via the context's in-memory state) even though nothing persists across reload.

## Automated coverage (implementation phase)

Per Constitution Principle II, the implementation should add Vitest coverage (mirroring existing `LocaleContext`/`AddressForm` tests) for:
- `AddressContext`: default `null`, hydration from a valid `localStorage` entry, hydration fallback on corrupt/missing entry, `setAddress` persists and updates, `clearAddress` resets and removes the entry.
- `AddressForm`: pre-fill prop populates the four fields; submitting still runs existing validation unchanged.
- At least one page-level test confirming a saved address triggers an automatic fetch (`enabled: !!address` gating) without requiring form re-entry.
