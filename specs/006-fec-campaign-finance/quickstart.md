# Quickstart: Validating Campaign Finance Data

## Prerequisites

- Backend running locally: `cd backend && cargo run` (see CLAUDE.md for `.env` setup —
  `GOOGLE_CIVIC_API_KEY` required as usual; `FEC_API_KEY` is optional, falls back to `DEMO_KEY`
  per research.md §2)
- Frontend running locally: `cd frontend && npm run dev`
- An address whose federal ballot includes a well-known, well-funded candidate (e.g. a
  Presidential or Senate race address, so a confident FEC match is likely) — useful for manually
  eyeballing User Story 1/2 during development.

## Automated validation (primary — required before this feature is "done")

Per Constitution Principle II, no test may depend on network access to the real FEC API.

1. `cd backend && cargo test` — unit tests for the name/state/office matching heuristic
   (research.md §3: exactly-one-result rule, ambiguous → `None`, zero results → `None`) and for
   the federal/state/local classification reuse (research.md §5).
2. `cd backend && cargo test --test integration` — wiremock-mocked FEC endpoints
   (`candidates/search`, `candidate/{id}/totals`, `schedule_a/by_employer`) verifying:
   - **US1**: a confident match yields `campaign_finance` present on `/api/elections` and
     `/api/ballot` candidate JSON, with correct `total_raised`/`total_spent`/`cash_on_hand`/
     `as_of_date`.
   - **US1 edge**: zero FEC search results → field absent, rest of response unaffected (FR-004).
   - **US1 edge**: FEC endpoint returns an error/times out (wiremock fault injection) → field
     absent, response still 200 with everything else intact (FR-007).
   - **FR-005**: FEC search returns two+ plausible candidates → field absent.
   - **US2**: `top_contributors` populated when the `by_employer` mock has data; omitted (not an
     empty array) when it doesn't.
   - **US3**: a state/local candidate in the same mocked response never gets a `campaign_finance`
     field, and no FEC mock endpoint is called for it at all (proves the federal-only gate, not
     just that the field happens to be empty).
3. `cd frontend && npm run test` — `CandidateCard.test.tsx` covers: renders funding totals when
   `campaign_finance` is present; renders nothing extra when absent; renders totals without a
   contributors list when `top_contributors` is missing/empty (US2 edge case).

## Manual smoke test (secondary — confirms real-world FEC data shapes match expectations)

1. Start both services with a real `GOOGLE_CIVIC_API_KEY` (`FEC_API_KEY` unset is fine — `DEMO_KEY`
   works for a handful of manual checks).
2. Visit `/elections?address=<a federal-race address>` in the browser.
3. Open a federal candidate's detail view → confirm total raised/spent/cash-on-hand render, with
   an "as of" date, per SC-001.
4. Confirm a state/local race on the same ballot shows no funding section at all (SC-004).
5. Time the page load before/after this change on the same address to sanity-check SC-005 (<1s
   added delay) — the network tab's timing for the `/api/elections` or `/api/ballot` request is
   sufficient; no formal load-testing tooling is required for this check.

## Out of scope for this quickstart

Validating the exactly-one-result matching heuristic against the full universe of real FEC
candidate name collisions is not practical as a quickstart step — that risk is addressed by the
unit tests in step 2 above plus the fail-closed-on-ambiguity design itself (research.md §3), not by
manual spot-checking.
