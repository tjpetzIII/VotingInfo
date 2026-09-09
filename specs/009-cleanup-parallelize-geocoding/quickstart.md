# Quickstart / Validation Guide: VOT-61 Cleanup

Behavior-preserving refactor — validation is "everything still passes, plus the new concurrency assertion,
and responses are unchanged." Run per item as each lands (each is its own PR).

## Prerequisites

- Backend: Rust 1.92 toolchain. Tests need **no** `GOOGLE_CIVIC_API_KEY` (integration tests mock Google
  via `wiremock`).
- Frontend: Node + the `frontend/` workspace installed (`cd frontend && npm install`).

## Backend gate (Items 1–5)

```bash
cd backend
cargo test          # unit + wiremock integration — must pass with NO test edits (additions only)
cargo clippy        # must produce zero new warnings (FR-010)
cargo build         # compile check
```

Item-specific checks:

- **Item 1 (parallel geocoding)**: a new test asserts multiple Census-resolvable polling locations resolve
  without serialized pacing delay (mirror `geocode_census_hits_incur_no_pacing_delay`, `geocoder.rs:289`).
  `geocode_fallback_pacing_still_enforced` (`geocoder.rs:310`) must still pass — proves the Nominatim ≥1s
  guardrail survived (FR-002). Existing `get_voter_info` integration tests confirm identical output.
- **Item 2 (concurrent FEC)**: existing FEC integration tests pass unchanged — enriched `campaign_finance`
  values identical (SC-003).
- **Item 3 (finance merge)**: elections + ballot integration tests pass unchanged; federal candidates still
  enriched, state/local candidates still never looked up.
- **Item 4 (registration Default)**: registration integration tests (Civic-data, state-fallback, and
  no-data paths) return identical bodies.
- **Item 5 (cache helper)**: cache-hit tests still pass; 15-min TTL behavior unchanged.

## Frontend gate (Item 6 — verify-only)

```bash
cd frontend
npm run test        # Vitest — lib/api.ts error-path coverage (non-2xx error field + 404 message)
npm run lint
npx tsc --noEmit
```

Item 6 is already implemented (`apiFetch` in `src/lib/api.ts`, from VOT-53). Confirm the shared error path
is covered; add a test case only if missing. No production code change expected.

## Response-equivalence spot check (optional, manual)

With a real `GOOGLE_CIVIC_API_KEY` set, capture a baseline before the change and diff after:

```bash
cd backend && cargo run &            # localhost:8080
ADDR='1600%20Pennsylvania%20Ave%20NW,%20Washington,%20DC%2020500'
curl -s "localhost:8080/api/voter-info?address=$ADDR" > /tmp/before.json
# ...apply Item 1, rebuild, rerun...
curl -s "localhost:8080/api/voter-info?address=$ADDR" > /tmp/after.json
diff <(jq -S . /tmp/before.json) <(jq -S . /tmp/after.json)   # expect: no diff
```

## Definition of done (per item)

- [ ] Targeted duplication removed / behavior parallelized (see spec FR-001…FR-007).
- [ ] `cargo test` + `cargo clippy` (backend) or `npm run test` + `npm run lint` + `tsc` (frontend) clean.
- [ ] No response-body change for identical inputs (SC-003).
- [ ] Item landed as an independent, self-contained PR (SC-006).
