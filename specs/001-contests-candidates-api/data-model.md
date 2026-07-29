# Phase 1 Data Model: Contests & Candidates API Route

New response types for `GET /api/ballot`, additive alongside the existing
`ElectionsResponse`/`ContestDetail`/`CandidateDetail` types (see research.md for why these are
not reused). Source data for all fields is the Google Civic API `voterinfo` response, already
fetched via `CivicApiClient::fetch_raw`.

## BallotLevel

An enum, not a free-form string, so invalid values cannot be constructed or serialized.

| Value     | Serializes as |
|-----------|---------------|
| `Federal` | `"federal"`   |
| `State`   | `"state"`     |
| `Local`   | `"local"`     |

Derived from a contest's raw Civic API `level[]` array per the mapping in research.md. Always
present — this is the one contest field with no "missing" case (an unclassifiable contest still
maps to `Local`, per spec.md Assumptions).

## Channel (reused)

A candidate's social media presence. Both fields are always required strings, so there is no
field-omission concern for this type — the existing `models::Channel { channel_type, id }` is
reused as-is rather than introducing a near-identical `BallotChannel` type (Constitution
Principle III: no speculative new types). Maps directly from the existing `ApiChannel` raw type;
no new raw deserialization needed.

## BallotCandidate

A person running in a `BallotContest`.

| Field           | Type              | Presence                          | Notes |
|-----------------|-------------------|------------------------------------|-------|
| `name`          | string            | always present                     | FR-006 |
| `party`         | string            | omitted from JSON if absent        | |
| `candidate_url` | string            | omitted from JSON if absent        | campaign website |
| `photo_url`     | string            | omitted from JSON if absent        | |
| `phone`         | string            | omitted from JSON if absent        | |
| `email`         | string            | omitted from JSON if absent        | |
| `channels`      | list of `Channel` (existing type) | omitted from JSON if empty | never `[]` in output; either present with ≥1 entry or absent |

## BallotContest

A single race on the ballot.

| Field        | Type                        | Presence                   | Notes |
|--------------|------------------------------|------------------------------|-------|
| `office`     | string                       | omitted from JSON if absent  | matches existing `ContestDetail.office` optionality |
| `district`   | string                       | omitted from JSON if absent  | matches existing `ContestDetail.district` optionality |
| `level`      | `BallotLevel`                | always present               | FR-002, FR-003 |
| `candidates` | list of `BallotCandidate`    | always present (may be `[]`) | FR-004 |

## BallotResponse

The top-level response for `GET /api/ballot?address=`.

| Field      | Type                     | Presence                     | Notes |
|------------|--------------------------|-------------------------------|-------|
| `election` | `Election` (existing type) | always present               | reuses the existing `Election { id, name, election_day }` type |
| `contests` | list of `BallotContest`    | always present (may be `[]`) | ordered Federal → State → Local (FR-003); empty list satisfies FR-009 |

## Validation / Business Rules

- **Ordering (FR-003)**: `contests` is sorted by `level` (`Federal` < `State` < `Local`) using a
  stable sort, so relative order within a level matches the order contests arrived in from the
  Civic API (research.md).
- **Field omission (FR-006)**: every `Option<T>` field above uses
  `#[serde(skip_serializing_if = "Option::is_none")]`; `channels` uses
  `#[serde(skip_serializing_if = "Vec::is_empty", default)]`. No field of these types is ever
  serialized as `null`.
- **Address resolution errors (FR-007, FR-008)**: reuses `CivicApiClient::fetch_raw`'s existing
  error mapping — `AppError::ValidationError` for an unparseable address,
  `AppError::NotFound` for a recognized-but-electionless address. No new error variant needed.
- **Empty ballot (FR-009)**: a `voterinfo` response with zero `contests` maps to
  `BallotResponse { contests: vec![], .. }`, a 200 response — distinct from the `NotFound` case
  above, which occurs only when Google reports no election at all for the address.

## State / Lifecycle

None — this is a stateless, read-through-cache lookup (no created/updated/deleted entities).
Cache lifecycle: a new `ballot_cache: Cache<String, BallotResponse>` on `CivicApiClient`, same
15-minute TTL as the other three caches (Constitution Principle VII).
