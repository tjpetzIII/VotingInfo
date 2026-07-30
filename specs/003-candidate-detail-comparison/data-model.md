# Data Model: Candidate Detail & Comparison

No new persisted entities. This feature adds one field to an existing in-memory/cache-only
response type and introduces no database schema or migration.

## Modified Entity: `BallotContest` (backend `models/mod.rs`)

Represents one race within a sample ballot response.

| Field        | Type              | Change                                                              |
|--------------|-------------------|----------------------------------------------------------------------|
| `id`         | `usize`           | **NEW.** Position of this contest in the final (level-sorted) array returned by `GET /api/ballot?address=`. Always present (not `Option`), mirroring `ContestDetail.id` on `/api/elections`. |
| `office`     | `Option<String>`  | Unchanged. |
| `district`   | `Option<String>`  | Unchanged. |
| `level`      | `BallotLevel`     | Unchanged (`federal` \| `state` \| `local`). |
| `candidates` | `Vec<BallotCandidate>` | Unchanged. |

**Validation rules**: `id` values are unique and contiguous (0..n) within a single response;
stable for the lifetime of that response's cache entry (15-minute `moka` TTL on `/api/ballot`),
but not guaranteed stable across cache expiries if the upstream Google Civic API changes contest
ordering — this is an accepted limitation (see spec Edge Cases: "stale share link, contest id not
found" → not-found message).

**State transitions**: None — this is a read-only, derived, per-request value, not stored state.

## Unmodified Entity: `BallotCandidate`

No changes. Already carries every field the comparison view needs: `name`, `party`,
`candidate_url`, `photo_url`, `phone`, `email`, `channels: Vec<Channel>` (each with
`channel_type` + `id`), with empty/absent fields omitted from JSON via
`#[serde(skip_serializing_if = "Option::is_none")]` / `"Vec::is_empty"`.

## Frontend mirror types (`frontend/src/lib/api.ts`)

`BallotContest` gains `id: number` (required, matching the backend's always-present field), placed
alongside the existing `office`, `district`, `level`, `candidates` fields. No other frontend type
changes; `BallotCandidate`, `BallotResponse`, `BallotLevel`, `Channel` are reused unmodified.
