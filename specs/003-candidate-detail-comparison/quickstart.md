# Quickstart: Candidate Detail & Comparison

Validates the feature end-to-end against the scenarios in `spec.md`.

## Prerequisites

```bash
# Backend
cd backend && cp .env.example .env   # ensure GOOGLE_CIVIC_API_KEY is set
cargo run                             # localhost:8080

# Frontend (separate shell)
cd frontend && npm run dev            # localhost:3000
```

## Automated checks

```bash
cd backend && cargo test              # includes new BallotContest id-assignment test
cd backend && cargo clippy
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npm run test           # includes updated api.test.ts + new contest-lookup test
cd frontend && npm run build
```

## Manual validation scenarios

1. **P1 — Compare candidates for a contest**
   - Go to `http://localhost:3000/ballot`, submit a real US street address with upcoming
     contests.
   - Click into any contest with 2+ candidates.
   - Confirm: URL is `/ballot/<id>?address=...`; all candidates render with whatever of
     name/party/photo/bio link/phone/email/social channels each has (per §data-model,
     see `contracts/api-ballot.md`).
   - Resize the browser below `md` (Tailwind's `768px` breakpoint): candidates stack into one
     column. Resize above: candidates lay out in columns.
   - Click a candidate's Twitter/X, Facebook, or YouTube icon: confirm it opens that candidate's
     channel in a new tab.

2. **P2 — Back to ballot**
   - From the contest detail page, click "Back to ballot".
   - Confirm: lands on `/ballot?address=...` with the same address already filled in and the
     ballot re-fetched — no manual re-entry.

3. **P3 — Share**
   - From a contest detail page, click the share button.
   - Confirm a "Link copied" confirmation appears.
   - Paste the copied URL into a new private/incognito window.
   - Confirm the same contest and address load with zero manual re-entry.
   - (Fallback) Simulate a clipboard-write rejection (e.g. via browser devtools clipboard
     permission block) and confirm the URL is still surfaced for manual copying rather than
     failing silently.

4. **Edge cases**
   - Single-candidate contest: page renders one card, no comparison-grid awkwardness.
   - Contest with zero candidates (if reachable in test data): "no candidates available" message,
     no empty grid.
   - Manually edit the `contestId` in the URL to a value with no matching contest: not-found
     message + link back to `/ballot?address=...`.
   - Load `/ballot/0` with no `address` query param: same "no address" affordance as
     `elections/[contestId]`.
