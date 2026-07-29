# Contract: `GET /api/ballot`

Follows this project's existing endpoint conventions (see `CLAUDE.md` → API Endpoints table):
JSON in/out, `address` query param, standard `AppError` JSON shape on failure, per-IP rate
limiting under `/api/*`.

## Request

```
GET /api/ballot?address={address}
```

| Param     | Required | Notes                                                                 |
|-----------|----------|------------------------------------------------------------------------|
| `address` | yes      | Full street address: `"{street}, {city}, {state} {zip}"` (matches every other address-based endpoint in this project) |

## Responses

### 200 OK — `BallotResponse` (see data-model.md)

```json
{
  "election": { "id": "9001", "name": "General Election", "election_day": "2026-11-03" },
  "contests": [
    {
      "office": "President of the United States",
      "level": "federal",
      "candidates": [
        {
          "name": "Jane Smith",
          "party": "Example Party",
          "candidate_url": "https://example.com",
          "photo_url": "https://example.com/photo.jpg",
          "phone": "555-555-5555",
          "email": "jane@example.com",
          "channels": [{ "channel_type": "Twitter", "id": "janesmith" }]
        },
        {
          "name": "John Doe"
        }
      ]
    },
    {
      "office": "Governor",
      "district": "Example State",
      "level": "state",
      "candidates": [{ "name": "Pat Lee", "party": "Other Party" }]
    },
    {
      "office": "City Council District 4",
      "level": "local",
      "candidates": []
    }
  ]
}
```

Notes illustrated above (per FR-006 / data-model.md):
- `"John Doe"` has no `party`, `candidate_url`, `photo_url`, `phone`, `email`, or `channels` keys
  at all — not `null` values.
- The `"Governor"` contest has no `channels` array on its candidate because that candidate has
  none.
- Contests are ordered federal → state → local regardless of the order Google Civic API returned
  them in.
- An election with zero contests returns `"contests": []` with 200 OK (FR-009), not an error.

### 422 Unprocessable Entity — unparseable address

```json
{ "error": "Could not parse your address. Please check your input and try again.", "code": "VALIDATION_ERROR" }
```

### 404 Not Found — address has no current election

```json
{ "error": "Not found", "code": "NOT_FOUND" }
```
(exact message matches this project's existing `AppError::NotFound` → `IntoResponse` mapping)

### 502 Bad Gateway — upstream Civic API failure

```json
{ "error": "<mapped message>", "code": "EXTERNAL_API_ERROR" }
```

### 429 Too Many Requests

Standard `tower_governor` rate-limit response, identical to every other `/api/*` route.

## Compatibility

Additive only. `/api/elections`, `/api/voter-info`, `/api/registration`, and
`/api/elections/dates` are unchanged (see research.md — new types, not modified existing types).
