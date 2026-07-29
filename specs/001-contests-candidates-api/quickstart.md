# Quickstart: Validating `GET /api/ballot`

## Prerequisites

- `backend/.env` with a valid `GOOGLE_CIVIC_API_KEY` (only needed for the manual/live check
  below — automated tests do not need it, per Constitution Principle II).
- Backend running: `cd backend && cargo run` (localhost:8080).

## Automated validation

```bash
cd backend && cargo test --lib      # unit: level-mapping + sort function
cd backend && cargo test --test integration   # integration: wiremock-backed /api/ballot scenarios
cd backend && cargo clippy           # Constitution Principle III gate
```

Expected: all tests pass, including (per data-model.md / contracts/get-ballot.md):
- A contest with Google `level: ["country"]` sorts before one with `["administrativeArea1"]`,
  which sorts before one with `["locality"]` or no `level` at all.
- A candidate missing optional fields serializes with those keys absent, not `null`.
- A `voterinfo` response with an empty `contests` array yields `200 OK` with `"contests": []`.
- An address Google reports as having no election yields `404`; an unparseable address yields
  `422` — both via the existing `AppError` mapping, unchanged by this feature.

## Manual/live validation

```bash
curl "localhost:8080/api/ballot?address=1600%20Pennsylvania%20Ave%20NW,%20Washington,%20DC%2020500"
```

Expected: a `200` response shaped like `contracts/get-ballot.md`'s example — contests ordered
Federal → State → Local, and no candidate field present with a `null` value (pipe through
`jq` and grep for `null` to confirm none appear).

## Regression check

```bash
curl "localhost:8080/api/elections?address=..."
```

Expected: unchanged from before this feature — confirms the new route is additive
(research.md decision to introduce new types rather than modify `ElectionsResponse`).
