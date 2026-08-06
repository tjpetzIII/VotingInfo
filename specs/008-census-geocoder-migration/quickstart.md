# Quickstart: Validating the Census Geocoder Migration

Prerequisites: repo cloned, Rust 1.92 toolchain, `backend/.env` with `GOOGLE_CIVIC_API_KEY` set
(only needed to run the full server; not needed for the unit tests below).

## 1. Run the new/updated unit tests

```bash
cd backend
cargo test --lib services::geocoder
cargo test --lib services::census_geocoder
```

Expected: all pass, including the cases from research.md §5 (Census hit skips Nominatim entirely,
Census miss falls through to Nominatim, both-miss returns `None`, Census error triggers fallback,
and pacing applies only to the Nominatim path). No network access or secrets required — everything
is mocked via `wiremock`, per Constitution Principle II.

## 2. Sanity-check the live Census Geocoder contract manually

```bash
curl -s "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=123+Main+St%2C+Springfield%2C+IL+62701&benchmark=Public_AR_Current&format=json" | jq .result.addressMatches[0].coordinates
```

Expected: a `{ "x": <lng>, "y": <lat> }` object — confirms the contract in
`contracts/census-geocoder-api.md` still matches the live API before relying on it.

## 3. Run the spike (User Story 3 / FR-006, FR-007)

Not a single command — this is the manual/scripted comparison described in research.md §4:

1. Assemble the ~50-address sample (clean street addresses + non-standard formats: building-name,
   rural-route, PO-box-style).
2. For each address, call both `CensusGeocoderClient::geocode` and the existing Nominatim path
   (e.g. via a throwaway `#[tokio::test]` or a small bin target that prints CSV) and record
   match/no-match and coordinate divergence.
3. Write the results and the go/no-go decision to `docs/census-geocoder-spike.md`.

Expected outcome to proceed with the primary-source swap: match rate ≥ Nominatim's on the same
sample, with no addresses regressing from matched to unmatched (SC-002, SC-003).

## 4. Verify the end-to-end latency win

```bash
cd backend && cargo run
```

In another terminal:

```bash
time curl -s "http://localhost:8080/api/voter-info?address=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("1600 Pennsylvania Ave NW, Washington, DC 20500"))')" > /dev/null
```

Pick an address known to return several polling locations. Expected: with Census as primary
(post-swap), total time is not dominated by `N × 1s` Nominatim pacing the way it is today —
consistent with SC-001 (≥60% reduction for a 5-location address). Compare against the same request
on `main` (pre-migration) for a before/after baseline.

## 5. Confirm no visible response-shape change

```bash
diff <(curl -s "http://localhost:8080/api/voter-info?address=..." | jq -S .) <(git stash && cargo run & sleep 1 && curl -s "http://localhost:8080/api/voter-info?address=..." | jq -S .)
```

(Or more simply: manually compare the `pollingLocations[].coordinates` shape before/after — it
should be byte-for-byte identical in structure, only potentially different numeric values if the
matched source differs.) This confirms FR-009 — voters see no change in *what* is displayed, only
how fast it appears.
