# Contracts: VOT-61 Cleanup

**No external contract changes.** This feature is behavior-preserving. Every HTTP endpoint keeps its
existing request and response contract exactly:

| Endpoint | Contract change |
|----------|-----------------|
| `GET /api/voter-info` | None — same body; polling-location coordinates identical, only resolved concurrently |
| `GET /api/elections` | None — same body; federal `campaign_finance` enrichment identical |
| `GET /api/ballot` | None — same body; enrichment identical |
| `GET /api/registration` | None — same body; empty/fallback values identical |
| `GET /api/elections/dates`, `/api/all-elections`, `/api/{state}-elections`, `POST /api/scrape/{state}` | Untouched |

**The contract for this feature is response equivalence:** for any given input, the response body (fields,
values, ordering, error codes, error messages) is byte-for-byte identical before and after the change
(SC-003). The existing `wiremock` integration tests in `backend/tests/` and the Vitest tests for
`frontend/src/lib/api.ts` are the executable contract; they must pass unchanged (additions only).

Because the pre-existing contracts already live in earlier specs (e.g. `specs/001-contests-candidates-api`,
`specs/002-sample-ballot-page`, `specs/006-fec-campaign-finance`) and the OpenAPI-style behavior is
unchanged, no new contract files are generated here.
