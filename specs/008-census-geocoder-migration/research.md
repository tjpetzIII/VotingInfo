# Phase 0 Research: Census Geocoder Migration for Polling Locations

All items from Technical Context were already resolvable from the existing codebase and ticket —
no `NEEDS CLARIFICATION` markers remain. This document instead records the integration-pattern and
API-contract research needed to implement the feature safely.

## 1. Census Bureau Geocoder API contract

**Decision**: Use the single-record, one-line-address endpoint:
`GET https://geocoding.geo.census.gov/geocoder/locations/onelineaddress`
with query params `address={full address string}&benchmark=Public_AR_Current&format=json`.

**Rationale**:
- `returntype=locations` (not `geographies`) is sufficient — this feature only needs
  coordinates, not district/tract lookup (explicitly out of scope per spec Assumptions), and
  skipping `geographies` avoids the extra required `vintage` parameter.
- `onelineaddress` search type accepts a single free-text address string, matching how
  `GeocoderClient::geocode` is called today (`address: &str`, e.g.
  `"123 Main St, Springfield, IL 62701"`) — no request-shape change needed at the call site.
- `benchmark=Public_AR_Current` is the standard "current address ranges" dataset used for
  general-purpose geocoding (as opposed to a historical vintage), appropriate for live
  polling-location lookups.
- No API key is required and the Census Bureau does not document a rate limit (consistent with
  the ticket's premise) — confirmed against the official API docs
  (geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html).

**Response shape** (JSON): top-level `result.addressMatches` is an array; each match has
`coordinates: { x: <longitude>, y: <latitude> }`, `matchedAddress`, `addressComponents`, and
`tigerLine`. A no-match address returns an **empty** `addressMatches` array (HTTP 200), not an
error — same "empty array = no match" shape the current `NominatimResult` handling already treats
as `None`, so the parsing logic pattern in `geocoder.rs::fetch` carries over directly (deserialize,
take first match, map `(y, x)` → `(lat, lng)`).

**Alternatives considered**:
- `address` (structured street/city/state/zip) search type — rejected because it would require
  splitting the already-assembled address string back into components, adding complexity with no
  benefit since `onelineaddress` accepts the same string format the app already builds.
- `geographies` return type — rejected as out of scope (spec Assumptions: district/tract data not
  needed today); revisit only if a future "your districts" feature is built.
- Batch endpoint (`/geocoder/locations/addressbatch`) — rejected; polling-location lookups happen
  per-request for a handful of addresses at a time, not in bulk CSV batches, and batch would add
  latency (upload + poll) worse than a handful of parallel single-record calls.

## 2. Client architecture: primary/fallback orchestration

**Decision**: Add a new `CensusGeocoderClient` (in `services/census_geocoder.rs`) with the same
shape as the existing `GeocoderClient`'s current Nominatim-calling internals — a `reqwest::Client`,
a configurable base URL (`new_with_base_url` for tests), and a `geocode(&self, address: &str) ->
Option<(f64, f64)>` method with no pacing of its own. `GeocoderClient` becomes the orchestrator: it
owns the single 24h `moka` cache (keyed by address, as today), tries `CensusGeocoderClient::geocode`
first, and only on `None` falls through to the existing paced Nominatim fetch path.

**Rationale**:
- Keeps `GeocoderClient::geocode`'s public signature and cache semantics byte-for-byte identical,
  so `civic_api.rs` (the only caller) needs zero changes (FR-003, FR-009).
- Mirrors the established pattern in this codebase of one small client-per-external-service
  (`CensusGeocoderClient` next to `GeocoderClient`, same relationship as `FecApiClient` sitting
  alongside `civic_api.rs`'s Google Civic calls) rather than merging two upstream integrations into
  one struct.
- Caching the *resolved* coordinate at the orchestrator level (not per-source) means a cache hit
  short-circuits both upstream calls on repeat lookups, same as today.

**Alternatives considered**:
- Replace Nominatim entirely instead of keeping it as fallback — rejected; ticket and spec (US2,
  FR-002) explicitly require a fallback to avoid a coverage regression on addresses Census can't
  match.
- Two independent caches (one per source) — rejected; unnecessary complexity, and it would let a
  Census miss + Nominatim hit for the same address get looked up twice on every call instead of
  once, wasting the pacing budget on the fallback path.

## 3. Pacing scope

**Decision**: Keep the existing `Mutex<Option<Instant>>` ≥1s pacing, but move it so it wraps only
the Nominatim fallback call, not the Census call.

**Rationale**: FR-004 requires no pacing on the (now primary) Census path; FR-005 requires pacing
to remain on Nominatim specifically because Nominatim's own usage policy (≥1 req/sec) is what the
pacing exists to satisfy — it was never a general app-level throttle. Since Nominatim is now only
called on a Census miss, the two use cases don't compete for the pacing lock at the same time in
the common (Census-hit) case, which is exactly the SC-001 latency win.

## 4. Spike methodology (User Story 3 / FR-006, FR-007)

**Decision**: Before enabling Census as primary, run a representative sample (~50 addresses) of
real polling-location-style addresses through both `CensusGeocoderClient` and the existing
Nominatim path, covering: clean street addresses (baseline), and non-standard formats explicitly
called out in the ticket — building-name-only entries, rural routes, and PO-box-style entries.
Record, per address: matched/not-matched for each source, and for addresses both sources match,
the distance between the two returned coordinates. Flag any pair diverging by more than ~1km for
manual review (a spike-internal triage threshold, not a product requirement). Write the results and
the resulting go/no-go decision to `docs/census-geocoder-spike.md` (Constitution Principle VIII —
centralized docs, not scattered in `specs/`).

**Rationale**: A fixed, documented sample and threshold makes "viable" (spec Assumptions: no
regression in match rate or accuracy) an operational, repeatable check rather than a judgment call
made once and forgotten — and gives future contributors a paper trail if Census's coverage is
revisited later.

**Alternatives considered**: Skipping a written report and just eyeballing a few addresses ad hoc —
rejected; the ticket explicitly frames this as a spike with a go/no-go gate (FR-007), and
Constitution Principle VIII expects durable documentation for decisions like this over tribal
knowledge.

## 5. Testing approach

**Decision**: Extend the existing `#[cfg(test)]` module pattern in `geocoder.rs` (and add one in
`census_geocoder.rs`) using `wiremock` to mock both base URLs independently, following the
`new_with_base_url` constructor pattern already used for Nominatim tests. New cases needed:
Census hit (no Nominatim call expected — assert via `wiremock`'s mount `.expect(0)`), Census miss →
Nominatim hit, both miss → `None`, Census error/timeout → Nominatim fallback used, and a pacing
test confirming a rapid pair of Census-hit lookups does not incur the ≥1s delay while a pair of
fallback (Nominatim) lookups still does.

**Rationale**: Matches Constitution Principle II (no live network/secrets in tests, deterministic —
no reliance on real wall-clock sleeps beyond the existing pattern already tested with wiremock) and
gives direct coverage of the primary/fallback branching this feature adds.
