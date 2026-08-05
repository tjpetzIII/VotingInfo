# Quickstart: Validating the Election Type Explainer

Frontend-only feature — no backend setup beyond what's already required to run the app locally.

## Prerequisites

- `backend/.env` has a valid `GOOGLE_CIVIC_API_KEY` (see repo `CLAUDE.md`), or rely on the existing mocked test suite below if you don't want to hit the live Civic API.
- `cd frontend && npm install` (already done in a checked-out repo).

## Automated validation

```bash
cd frontend
npx tsc --noEmit                          # type check
npm run lint                              # no new warnings (Constitution Principle III)
npm run test -- electionType              # new classifier unit tests
npm run test -- ElectionTypeBanner        # new banner component tests
npm run test -- ballot/page               # updated ballot page integration test
npm run test                              # full suite, incl. messages.test.ts en/es parity check
```

Expected: all pass, including `src/messages/messages.test.ts`'s automatic check that every new message key added to `en.ts` has a matching `es.ts` key with the same ICU placeholders (see [research.md](./research.md) Decision 4).

## Manual end-to-end check

1. `docker compose up --build` (or run `cd backend && cargo run` and `cd frontend && npm run dev` in separate terminals).
2. Visit `http://localhost:3000/ballot`.
3. Enter an address known to return a ballot (see `docs/` or prior test fixtures for a working example address).
4. Confirm, per [spec.md](./spec.md) User Story 1:
   - A banner is visible at the top of the page, above the Federal/State/Local sections, as soon as the ballot loads.
   - Its text names the election type and gives a plain-language explanation with no unexplained jargon.
   - If the address's election name doesn't match any known type, the banner shows the generic fallback copy instead of blank or incorrect text (see [contracts/election-type-classification.md](./contracts/election-type-classification.md) for which names map where).
5. Confirm User Story 2:
   - Clicking the banner's collapse control shrinks it to a compact state; the contests below remain visible and interactive.
   - Clicking again re-expands it.
   - Submit a different address (via `AddressSummary`'s "Change" control) that resolves to a different election — the banner returns to its expanded state.
6. Switch locale (header language toggle) between English and Spanish and confirm the banner's copy switches with it.
7. Resize to a narrow/mobile viewport and confirm the banner and its collapse control remain fully visible and usable (Edge Cases in spec.md).

## Done

Feature is validated when both automated checks and the manual walkthrough above pass with no regressions to the existing `/ballot` page tests.
