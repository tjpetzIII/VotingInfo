# Contract: `GeocoderClient` public interface (stability guarantee)

This is the internal contract this feature MUST NOT break — the boundary between the geocoding
service and its one caller, `services/civic_api.rs`. Restated here as a contract because holding it
stable is what makes FR-003/FR-009 (no caller changes, no response-shape changes to voters) true.

## Interface (unchanged by this feature)

```rust
pub struct GeocoderClient { /* ... */ }

impl GeocoderClient {
    pub fn new() -> Self;
    pub fn new_with_base_url(base_url: &str) -> Self;
    pub async fn geocode(&self, address: &str) -> Option<(f64, f64)>;
}
```

- **Signature**: `geocode(&self, address: &str) -> Option<(f64, f64)>` — identical before and
  after this feature. Callers (`civic_api.rs` line ~290: `self.geocoder.geocode(&addr).await`)
  require zero code changes.
- **Semantics**: `Some((lat, lng))` on a match from either source; `None` if neither source
  matches. Caching (24h TTL, keyed by address string) is preserved at this layer regardless of
  which upstream source produced the result.
- **`new_with_base_url`**: since this constructor previously pointed only at a Nominatim-shaped
  mock, and now the client fans out to two upstream services, this constructor's contract changes
  to: point the *fallback* (Nominatim) base URL, with Census's base URL defaulting to the real
  Census host unless a test-only constructor variant is added for pointing both (see tasks.md for
  the concrete constructor design — a planning-phase decision, not specified further here).

## What is explicitly NOT part of this contract

- Which upstream source (Census vs. Nominatim) produced a given result — never exposed to the
  caller or cached separately (see data-model.md).
- Any Census-specific fields (`addressComponents`, `tigerLine`, district/tract info) — out of
  scope per spec Assumptions, and Principle IV forbids forwarding raw upstream fields regardless.
