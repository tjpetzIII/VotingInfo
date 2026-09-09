# VOT-64: Explain data provenance and freshness

## Problem

Voter information can be assembled from the Google Civic API, cached responses, and state-level fallback data. Clients currently cannot tell which source produced a response or whether fallback data was used.

## Requirements

- Every civic and election-date response includes a typed, additive `metadata` object.
- Metadata identifies provenance (`civic_api`, `state_registration_fallback`, `state_scraper`, or `mixed`), freshness (`fresh` or `cached`), and whether fallback data contributed to the response.
- Cache hits retain the source and fallback details while reporting `cached` freshness.
- Registration responses report static state fallback provenance when Civic has no election data.
- Election-date aggregation reports mixed provenance when scraped state data contributes dates.
- Existing fields, route paths, CORS, rate limiting, and 15-minute cache behavior remain unchanged.
- English and Spanish clients have typed metadata and may present a concise source note when metadata is available.
- Tests use deterministic mocked data and do not call live services.

## Acceptance scenarios

1. A normal Civic response serializes `metadata.provenance = civic_api`, `freshness = fresh`, and `fallback_used = false`.
2. A repeated request served by the existing cache serializes the same provenance and `freshness = cached`.
3. A registration request with no Civic election data reports `state_registration_fallback` and `fallback_used = true`.
4. Election dates supplemented by state records report `mixed` provenance and fallback usage.
5. Existing consumers continue to parse all existing response fields.
