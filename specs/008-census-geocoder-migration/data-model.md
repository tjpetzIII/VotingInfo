# Phase 1 Data Model: Census Geocoder Migration for Polling Locations

This feature has no persisted storage and no new database schema — it's a backend service-layer
change. The "entities" from the spec are in-memory/logical shapes only.

## Geocoded Coordinate (in-memory, cached)

Represents the resolved map position for one polling-location address. This is the existing shape
`GeocoderClient::geocode` already returns and caches — unchanged by this feature.

| Field | Type | Notes |
|---|---|---|
| `lat` | `f64` | Latitude of the matched address |
| `lng` | `f64` | Longitude of the matched address |

- **Identity**: keyed by the exact address string passed to `geocode()` (matches today's cache key).
- **Lifecycle**: produced by either the Census or Nominatim source, cached for 24h (`moka`,
  unchanged TTL), then re-fetched on expiry. Not persisted beyond the process's cache.
- **Absence**: represented as `Option::None` when neither source can match the address (FR-008) —
  no change from current behavior.
- **Source is not part of the cached value** — per research.md §2, the cache stores only the
  resolved `(lat, lng)`, not which upstream source produced it, since callers (`civic_api.rs`) have
  never needed to know the source and FR-009 requires no visible change to callers.

## Spike Findings Report (document, not application data)

A one-time-per-decision artifact, not a runtime entity — produced by running the spike described in
research.md §4 and written to `docs/census-geocoder-spike.md`.

| Field | Notes |
|---|---|
| Sample address list | ~50 polling-location-style addresses, including non-standard formats |
| Per-address result | Census match/no-match, Nominatim match/no-match, coordinate divergence (if both matched) |
| Aggregate match rate | Census vs. Nominatim, on the same sample |
| Flagged divergences | Any pair >~1km apart, with manual-review notes |
| Go/no-go decision | Whether Census is enabled as primary (FR-007) |

No relationships, validation rules, or state transitions beyond the above — this document is
append-only history of one decision, not a mutable record the application reads at runtime.
