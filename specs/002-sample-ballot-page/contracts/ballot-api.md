# Contract: `GET /api/ballot?address=`

**Status**: Existing, unchanged. This feature is a consumer only — no backend edits.

Defined in `backend/src/routes/elections.rs::get_ballot`, backed by
`CivicApiClient::get_ballot` and cached (15-min TTL, `moka`) by address string.

## Request

```
GET /api/ballot?address={url-encoded full street address}
```

Address format: `"${street}, ${city}, ${state} ${zip}"` (per `CLAUDE.md` — Google Civic API
requires a full street address; city/state/zip alone returns a 400 parseError).

## Response: 200 OK

```json
{
  "election": { "id": "string", "name": "string", "election_day": "YYYY-MM-DD" },
  "contests": [
    {
      "office": "string | omitted",
      "district": "string | omitted",
      "level": "federal | state | local (lowercase)",
      "candidates": [
        {
          "name": "string",
          "party": "string | omitted",
          "candidate_url": "string | omitted",
          "photo_url": "string | omitted",
          "phone": "string | omitted",
          "email": "string | omitted",
          "channels": [{ "channel_type": "string", "id": "string" }]
        }
      ]
    }
  ]
}
```

`contests` is pre-sorted Federal → State → Local by the backend. `candidates` may be an empty
array (renders as the "No candidates found" state per FR-009).

## Error responses

Same `AppError` mapping as every other `/api/*` route (per `CLAUDE.md`):

| Status | Body                                       | When                                             |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| 404    | `{ "error": "...", "code": "NOT_FOUND" }`    | No active election for this address (or Google Civic reports "Election unknown") |
| 422    | `{ "error": "...", "code": "VALIDATION_ERROR" }` | Address fails to parse (`parseError` reason) |
| 502    | `{ "error": "...", "code": "EXTERNAL_API_ERROR" }` | Other non-2xx from Google Civic API        |
| 429    | `{ "error": "...", "code": "RATE_LIMITED" }` | Per-IP rate limit exceeded (`tower_governor`)     |

The frontend maps 404 to a "no sample ballot available for this address" message (FR-011); other
errors are surfaced via the standard error-panel pattern already used on `elections/page.tsx` and
`voter-info/page.tsx`.

## New frontend consumer types (`frontend/src/lib/api.ts`)

Additive only — no existing exports change.

```ts
// Backend uses #[serde(rename_all = "lowercase")] on the BallotLevel enum.
export type BallotLevel = "federal" | "state" | "local";

export interface BallotCandidate {
  name: string;
  party: string | null;
  candidate_url: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  channels: Channel[]; // reuses existing Channel type
}

export interface BallotContest {
  office: string | null;
  district: string | null;
  level: BallotLevel;
  candidates: BallotCandidate[];
}

export interface BallotResponse {
  election: Election; // reuses existing Election type
  contests: BallotContest[];
}

export async function fetchBallot(address: string): Promise<BallotResponse> {
  // same fetch/error-handling shape as fetchElections/fetchVoterInfo:
  // 404 -> "No sample ballot found for this address."
  // other !ok -> throw Error(json.error ?? `Error ${res.status}`)
}
```

`BallotCandidate`'s field set is identical to the existing `CandidateDetail` type, so
`CandidateCard` (which takes a `CandidateDetail` prop) accepts a `BallotCandidate` value directly
with no adapter needed.
