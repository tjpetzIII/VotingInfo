# Contract: Nominatim API (existing dependency, demoted to fallback)

This is the existing outbound contract `geocoder.rs` already implements today — unchanged in
request/response shape by this feature. Documented here only to make explicit what changes
(**when** it's called and **how it's paced**) versus what doesn't (the request/response format
itself).

## Request

```
GET https://nominatim.openstreetmap.org/search
    ?q={address string}
    &format=json
    &limit=1
Header: User-Agent: voter-info-app/1.0
```

Unchanged from current `services/geocoder.rs::fetch`.

## Response

Unchanged — a JSON array; empty array or any non-2xx/parse failure means no match → `None`.

## What changes in this feature

- **When it's called**: only after `CensusGeocoderClient::geocode` returns `None` for the address
  (FR-002) — previously this was the only/primary path.
- **Pacing**: the existing ≥1s `Mutex<Option<Instant>>`-based serialization stays in place and MUST
  continue to apply to every Nominatim call, since it exists to satisfy Nominatim's own usage
  policy, not as a general app-level throttle (FR-005). It MUST NOT apply to the Census call
  (FR-004).
- **What doesn't change**: request format, response parsing, `User-Agent` header, timeout, and the
  "empty result / non-2xx → `None`" failure handling.
