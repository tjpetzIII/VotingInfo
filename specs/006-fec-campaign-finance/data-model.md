# Data Model: Campaign Finance Data on Candidate Pages

No database schema changes — this feature is entirely in-memory (cached, never persisted), same
as all existing Google Civic API data (see CLAUDE.md's "Data persistence" section). The entities
below are Rust types added to `backend/src/models/mod.rs` and mirrored as TypeScript types in
`frontend/src/lib/api.ts`.

## Entities

### CampaignFinanceSummary

The funding picture for one federal candidate in one election cycle. Maps directly to spec
Key Entity "Campaign Finance Summary."

| Field | Type | Notes |
|---|---|---|
| `total_raised` | `f64` | FEC `receipts`, in dollars |
| `total_spent` | `f64` | FEC `disbursements`, in dollars |
| `cash_on_hand` | `f64` | FEC `cash_on_hand_end_period` |
| `as_of_date` | `String` | FEC `coverage_end_date`, ISO `YYYY-MM-DD`; satisfies FR-009 |
| `top_contributors` | `Vec<Contributor>` | Empty when unavailable (FR-006's "when available"); omitted from JSON if empty, matching the existing `#[serde(skip_serializing_if = "Vec::is_empty")]` convention used elsewhere in `models/mod.rs` |

All fields except `top_contributors` are required once a `CampaignFinanceSummary` exists at all —
per FR-004/FR-005, the *entire* summary is either present (confident match with totals data) or
absent (`None` on the parent candidate), never partially populated.

### Contributor

One entry in a candidate's top-contributors list.

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | Contributing employer/organization name (FEC `by_employer` aggregate — see research.md §1) |
| `total` | `f64` | Aggregate contributed amount from that employer, in dollars |

### CandidateMatch (internal only — not serialized to clients)

Represents the outcome of trying to link a Civic API candidate to an FEC candidate. Not a
client-facing type; used internally by the new FEC service to decide whether to attach a
`CampaignFinanceSummary` at all.

| Field | Type | Notes |
|---|---|---|
| `fec_candidate_id` | `Option<String>` | `None` when no confident match (FR-004/FR-005) |
| resolved via | name + state + office + cycle, exactly-one-result rule | see research.md §3 |

## Changes to existing entities

### `CandidateDetail` (`/api/elections` response) and `BallotCandidate` (`/api/ballot` response)

Both gain one new optional field, following the existing omit-when-absent convention already used
on every other optional field on `BallotCandidate`:

```rust
#[serde(skip_serializing_if = "Option::is_none")]
pub campaign_finance: Option<CampaignFinanceSummary>,
```

- `Some(...)` only for federal (President/Senate/House) candidates with a confident FEC match
  (FR-001).
- `None` for every state/local candidate (FR-002) and for federal candidates with no confident
  match (FR-004/FR-005) — the field is simply absent from the JSON response in both cases,
  identical wire behavior, so a client cannot distinguish "not federal" from "federal but
  unmatched," which is intentional (both cases render identically: no finance section).

`Candidate` (the lightweight type used by `/api/voter-info`'s `Contest`) is **not** changed — that
endpoint has never carried the extended candidate detail fields (no `party`-adjacent fields
either), and the source ticket scopes this to "candidate detail views," which in this codebase are
`/api/elections` and `/api/ballot` only.

## Relationships

```
ContestDetail / BallotContest (existing "is this federal?" classification)
  └── CandidateDetail / BallotCandidate (existing)
        └── campaign_finance: Option<CampaignFinanceSummary>   (new)
              └── top_contributors: Vec<Contributor>            (new)
```

No new relationships to other stored entities — `CampaignFinanceSummary` is computed fresh (or
from the FEC-keyed cache, research.md §4) on each `/api/elections` or `/api/ballot` request and
attached in-memory; it is never written to Supabase or any other store.
