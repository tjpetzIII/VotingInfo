# Research

The existing `CivicApiClient` has one 15-minute `moka` cache per response type. Mapping functions are the stable boundary between raw Google JSON and project models. Registration already has a static state fallback, while election dates merge Civic and Supabase state scraper data. Metadata belongs on project responses and is populated at those boundaries.

Freshness is represented as an enum rather than a duration so clients cannot infer unsupported precision. Cache hits clone the cached value and change only the freshness marker. Fallback is a boolean plus provenance because a mixed election-date response can contain both primary and supplemental data.
