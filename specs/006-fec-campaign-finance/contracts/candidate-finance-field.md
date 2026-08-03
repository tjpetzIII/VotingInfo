# Contract: `campaign_finance` field on existing candidate responses

This feature does not add a new HTTP endpoint. It extends the JSON contract of two existing,
already-documented endpoints (see CLAUDE.md's API Endpoints table):

- `GET /api/elections?address=` → `ElectionsResponse` → `contests[].candidates[]`
- `GET /api/ballot?address=` → `BallotResponse` → `contests[].candidates[]`

## Added field

Each candidate object gains an optional `campaign_finance` field:

```jsonc
{
  "name": "Jane Q. Candidate",
  "party": "Democratic",
  // ...existing fields unchanged...

  // NEW — present only for federal candidates with a confident FEC match:
  "campaign_finance": {
    "total_raised": 4200000.50,
    "total_spent": 3100000.00,
    "cash_on_hand": 1100000.50,
    "as_of_date": "2026-06-30",
    "top_contributors": [
      { "name": "Acme Corp", "total": 58200.00 },
      { "name": "Example University", "total": 41500.00 }
    ]
  }
}
```

## Presence rules (client-visible contract)

| Candidate situation | `campaign_finance` in response |
|---|---|
| Federal office, confident FEC match, totals available | present, all of `total_raised`/`total_spent`/`cash_on_hand`/`as_of_date` populated |
| Federal office, confident match, but no contributor data yet | present, `top_contributors` omitted (empty array never sent — key absent) |
| Federal office, no confident match (zero or ambiguous FEC results) | field absent entirely |
| State or local office | field absent entirely |
| FEC service unavailable/rate-limited/timed out | field absent entirely for the affected candidate(s); rest of response unaffected |

A client MUST treat "field absent" as the only "no data" signal — there is no explicit `null`,
error object, or placeholder value for this field. This matches the existing convention for every
other optional field on `BallotCandidate`/`CandidateDetail` (e.g. `party`, `photo_url`).

## Backward compatibility

Purely additive — existing consumers that ignore unknown JSON fields see no behavior change.
`frontend/src/lib/api.ts`'s `CandidateDetail`/`BallotCandidate` TypeScript types gain the same
optional field, consumed by `CandidateCard.tsx`.

## Error behavior

No new error codes. If the FEC API is unreachable for all candidates in a request, the response
status and body for `/api/elections`/`/api/ballot` are unchanged (200, normal shape) — only the
per-candidate `campaign_finance` fields are missing, per FR-007. This feature never introduces a
new `AppError` variant or changes the status code of these endpoints.
