# API contract

All affected JSON responses gain:

```json
{"metadata":{"provenance":"civic_api","freshness":"fresh","fallback_used":false}}
```

The field is additive. Existing route paths, status codes, error mapping, and response data remain stable.
