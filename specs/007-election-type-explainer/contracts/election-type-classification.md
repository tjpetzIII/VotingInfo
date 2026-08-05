# Contract: Election Type Classification

This is the one interface this feature defines: a pure client-side function that maps an election's existing `name` string to an `ElectionTypeCategory` (see [data-model.md](../data-model.md)). No network or backend contract changes.

## Function

```text
classifyElectionType(name: string): "primary" | "general" | "special" | "runoff" | "generic"
```

- **Input**: `election.name` from `BallotResponse.election` (`frontend/src/lib/api.ts:201`) — always a string, never null/undefined per the existing type.
- **Output**: One of the five `ElectionTypeCategory` values. Always returns a value — never throws, never returns `undefined` (FR-005: unknown input must fall back to `generic`, not a blank/missing result).

## Matching rules (case-insensitive substring match, checked in this order)

| Order | If name contains | Category  |
| ----- | ----------------- | --------- |
| 1     | `"runoff"`         | `runoff`  |
| 2     | `"special"`        | `special` |
| 3     | `"primary"`        | `primary` |
| 4     | `"general"`        | `general` |
| 5     | (none of the above) | `generic` |

Order matters: a name containing both "special" and "primary" (e.g. "2026 Special Primary Election") classifies as `special` — the more specific/important distinction for a voter to know — not `primary`. Checked before "primary"/"general" for the same reason "runoff" is checked first (a "Special Runoff Election" is a `runoff`).

## Examples

| `election.name`                          | Result    |
| ----------------------------------------- | --------- |
| `"2026 General Election"`                 | `general` |
| `"2026 Primary Election"`                 | `primary` |
| `"November 2026 Special Election"`        | `special` |
| `"2026 Runoff Election"`                  | `runoff`  |
| `"2026 Special Primary Election"`         | `special` |
| `"City Council Municipal Election"`       | `generic` |
| `""`                                       | `generic` |
| `"VIP Test Election"`                     | `generic` |

## Consumers

- `ElectionTypeBanner` component calls this once per render with `data.election.name` to pick which `titleId`/`explanationId` pair (see data-model.md's `ElectionTypeCopy`) to show.

## Out of scope

- No change to `GET /api/ballot`'s response shape — this contract is entirely internal to the frontend and consumes a field that already exists in that response today.
