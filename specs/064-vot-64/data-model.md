# Data model

`DataProvenance` is a closed serialized enum: `civic_api`, `state_registration_fallback`, `state_scraper`, or `mixed`.

`Freshness` is a closed serialized enum: `fresh` or `cached`.

`ResponseMetadata` contains `provenance`, `freshness`, and `fallback_used`. It is embedded as `metadata` in each public response. `metadata` is additive and required on newly produced responses; clients treat it as optional for compatibility with older deployments.
