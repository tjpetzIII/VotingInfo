# Phase 1 Data Model: Sample Ballot Page

All entities below already exist on the backend (`backend/src/models/mod.rs`) and are consumed
read-only by this feature. The only new artifacts are the matching TypeScript types the frontend
adds in `frontend/src/lib/api.ts` to consume the existing `/api/ballot` JSON contract.

## Ballot (`BallotResponse`)

The full set of contests a voter will see for a given election at their address.

| Field       | Type              | Notes                                            |
| ----------- | ----------------- | ------------------------------------------------- |
| `election`  | `Election`        | `{ id, name, election_day }` — existing type       |
| `contests`  | `BallotContest[]` | Pre-sorted Federal → State → Local by the backend  |

Maps to spec entity **Ballot**.

## Contest (`BallotContest`)

A single race, with an office name, an optional district, a level, and its candidates.

| Field        | Type                | Notes                                                                 |
| ------------ | ------------------- | ---------------------------------------------------------------------- |
| `office`     | `string \| null`    | Omitted from JSON (not `null`) when absent — `skip_serializing_if`     |
| `district`   | `string \| null`    | Omitted from JSON when absent                                          |
| `level`      | `"federal" \| "state" \| "local"` (lowercase — `#[serde(rename_all = "lowercase")]`) | Drives which collapsible section the contest renders in |
| `candidates` | `BallotCandidate[]` | Empty array → triggers the "No candidates found" state (FR-009)        |

Maps to spec entity **Contest**. Validation: FR-003 requires office+district in the header when
available; FR-012 requires a level section with zero contests to not render as an empty heading —
this is a frontend rendering rule (group first, then only render sections with `contests.length > 0`),
not a backend/data constraint.

## Candidate (`BallotCandidate`)

A person running in a contest.

| Field           | Type             | Notes                                                              |
| --------------- | ---------------- | -------------------------------------------------------------------- |
| `name`          | `string`         | Always present                                                       |
| `party`         | `string \| null` | Drives the color-coded badge (FR-006); omitted from JSON when absent |
| `candidate_url` | `string \| null` | Drives the website link (FR-008); omitted from JSON when absent      |
| `photo_url`     | `string \| null` | Drives the photo vs. fallback avatar (FR-007); omitted when absent   |
| `phone`         | `string \| null` | Not required by spec; already rendered by reused `CandidateCard`     |
| `email`         | `string \| null` | Not required by spec; already rendered by reused `CandidateCard`     |
| `channels`      | `Channel[]`      | Not required by spec; already rendered by reused `CandidateCard`     |

Maps to spec entity **Candidate**. Field set is identical to the existing frontend
`CandidateDetail` type (`frontend/src/lib/api.ts`), so `BallotCandidate` can either reuse
`CandidateDetail` directly or be declared as a type alias of it — see `contracts/` for the exact
frontend type declarations.

## State (frontend, not persisted)

No new persisted state. Page-local UI state only:

| State                 | Shape                                              | Notes                                                     |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `address`              | `string`                                            | Submitted address driving the `useQuery` fetch             |
| `expandedLevels`       | `Record<"federal" \| "state" \| "local", boolean>` | All `true` by default (FR-002); toggled per-section, independent (US3 AS3) |

Not persisted across visits or page reloads, per spec Assumptions ("does not need to persist a
voter's collapse/expand preference across visits").
