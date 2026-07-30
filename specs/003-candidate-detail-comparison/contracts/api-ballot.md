# Contract: `GET /api/ballot?address=` (modified response)

This feature does not add a new endpoint. It adds one field, `id`, to each object in the existing
`BallotResponse.contests[]` array. No request-shape change; no new query params.

## Request

Unchanged: `GET /api/ballot?address=<url-encoded address>`

## Response (`200 OK`)

```jsonc
{
  "election": { "id": "string", "name": "string", "election_day": "YYYY-MM-DD" },
  "contests": [
    {
      "id": 0,                      // NEW — stable position in this array, 0-based
      "office": "string | omitted",
      "district": "string | omitted",
      "level": "federal" | "state" | "local",
      "candidates": [
        {
          "name": "string",
          "party": "string | omitted",
          "candidate_url": "string | omitted",
          "photo_url": "string | omitted",
          "phone": "string | omitted",
          "email": "string | omitted",
          "channels": [
            { "channel_type": "Twitter" | "Facebook" | "YouTube" | "GooglePlus", "id": "string" }
          ]
        }
      ]
    }
  ]
}
```

Error responses (`404`, `422`, `502`, `429`) are unchanged — see existing `AppError` mapping.

## Frontend contract: `app/ballot/[contestId]/page.tsx`

- **Route param**: `contestId` — a string that must parse to a non-negative integer matching a
  `contests[].id` from the same address's `GET /api/ballot?address=` response.
- **Query param**: `address` — required for the page to fetch anything; absent/empty renders the
  same "no address, go back" affordance already used by `elections/[contestId]/page.tsx`.
- **Not-found behavior**: if `contestId` doesn't parse, or no contest with that `id` exists in the
  fetched response, render the not-found message + link back to `/ballot?address=<addr>` (FR-009).
- **Share URL shape**: `<origin>/ballot/<contestId>?address=<url-encoded address>` — round-trips
  through the same route + query param, so opening it re-runs the same fetch-and-lookup with no
  extra state required (FR-006).
- **Back-to-ballot URL shape**: `/ballot?address=<url-encoded address>` (FR-005) — requires
  `frontend/src/app/ballot/page.tsx` to read `address` from `useSearchParams()` on mount (see
  `research.md` §2), the one small change to an existing file this feature makes outside of the
  new route itself.
