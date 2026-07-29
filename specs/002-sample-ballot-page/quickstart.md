# Quickstart: Sample Ballot Page

## Prerequisites

- `backend/.env` has a valid `GOOGLE_CIVIC_API_KEY` (required to hit the live Google Civic API for
  manual verification; not required for `cargo test`, which mocks it via `wiremock`).
- Both services installed: `cd frontend && npm install`; backend deps resolve via `cargo build`.

## Run both services

```bash
# terminal 1
cd backend && cargo run        # http://localhost:8080

# terminal 2
cd frontend && npm run dev     # http://localhost:3000
```

## Validate the existing contract this feature depends on

Confirm `/api/ballot` already returns level-grouped, sorted contests before touching the frontend:

```bash
curl "http://localhost:8080/api/ballot?address=1600%20Pennsylvania%20Ave%20NW%2C%20Washington%2C%20DC%2020500"
```

Expected: `200 OK` with `contests` sorted Federal → State → Local, each contest carrying a `level`
field. If Google Civic has no election configured for the test address, expect `404` with
`{ "error": "...", "code": "NotFound" }`.

## Validate the new page end-to-end

1. Navigate to `http://localhost:3000/ballot`.
2. Submit a real US street address known to have an active/upcoming election (reuse an address
   that already works on `/voter-info` or `/elections` in this environment).
3. **Grouping (US1)**: confirm contests appear under Federal / State / Local headers, each
   contest header showing office (+ district when present); a level with zero contests does not
   render as an empty heading (FR-012).
4. **Candidate cards (US2)**: for a contest with candidates, confirm each card shows name, a
   color-coded party badge (when party is known), a photo or initials fallback avatar, and a
   website link (when `candidate_url` is present) that opens in a new tab.
5. **Empty state (FR-009)**: find or construct a contest with zero candidates and confirm it shows
   "No candidates found" instead of an empty candidate grid.
6. **Collapsible sections (US3)**: collapse the Federal section; confirm its contests hide, the
   header stays visible with an expand control, and State/Local sections are unaffected. Re-expand
   and confirm contests reappear.
7. **No-data case (FR-011)**: submit an address with no matching ballot data (or trigger the 404
   path) and confirm a clear "no sample ballot available" message renders instead of a blank or
   broken page.
8. **Regression check**: confirm `/voter-info` and `/elections` still work unchanged (no shared
   component was modified in a breaking way — `CandidateCard` and `AddressForm` are reused as-is).

## Before opening a PR

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npm run build
```

No backend changes are made by this feature, so `cargo test` / `cargo clippy` are not expected to
be affected, but re-run them if anything in `backend/` was touched unexpectedly.
