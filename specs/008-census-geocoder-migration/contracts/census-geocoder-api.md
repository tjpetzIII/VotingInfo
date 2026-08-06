# Contract: Census Bureau Geocoder API (new upstream dependency)

This feature introduces a new outbound dependency on the Census Bureau's public geocoding API.
No inbound/public contract of this app changes (see `geocoder-client-interface.md`) — this
document is the contract `census_geocoder.rs` must implement against.

## Request

```
GET https://geocoding.geo.census.gov/geocoder/locations/onelineaddress
    ?address={url-encoded full address string}
    &benchmark=Public_AR_Current
    &format=json
```

- `address` — the same free-text address string `GeocoderClient::geocode` already receives
  today (e.g. `"123 Main St, Springfield, IL 62701"`). No parsing/splitting required.
- No authentication header or API key.
- Base URL MUST be overridable (mirrors `GeocoderClient::new_with_base_url`) so tests can point at
  a `wiremock` mock server instead of the live Census host.

## Success response (HTTP 200)

```json
{
  "result": {
    "input": { "...": "..." },
    "addressMatches": [
      {
        "matchedAddress": "123 MAIN ST, SPRINGFIELD, IL, 62701",
        "coordinates": { "x": -89.6501, "y": 39.7817 },
        "addressComponents": { "...": "..." },
        "tigerLine": { "...": "..." }
      }
    ]
  }
}
```

- `addressMatches` is a JSON array. Only the **first** element is used (same "take first match"
  behavior as the current `NominatimResult` handling).
- Coordinate mapping: `coordinates.y` → latitude, `coordinates.x` → longitude (note the
  lon/lat-as-x/y ordering — do not swap).
- `addressComponents` and `tigerLine` are not needed by this feature and MUST NOT be deserialized
  into anything forwarded to the frontend (Constitution Principle IV) — only `(lat, lng)` crosses
  the `census_geocoder.rs` boundary.

## No-match response (still HTTP 200)

```json
{ "result": { "input": { "...": "..." }, "addressMatches": [] } }
```

An empty `addressMatches` array means no match — this MUST be treated as `None`, not an error, and
MUST trigger the Nominatim fallback (FR-002).

## Error handling

- Any non-2xx HTTP status, a connection failure, or a JSON body that doesn't deserialize into the
  expected shape MUST be treated as "no match from this source" (`None`) and MUST trigger the
  Nominatim fallback — mirrors the existing `fetch()` behavior in `geocoder.rs` today (`.ok()?`
  short-circuiting to `None` on any failure), not a hard error surfaced to the caller.

## Non-functional

- No documented rate limit and no API key required (verified against the official API docs,
  see research.md §1) — no pacing is applied to this call (FR-004).
- Timeout: reuse the existing `10s` `reqwest::Client` timeout convention already used by
  `GeocoderClient`/`FecApiClient`.
