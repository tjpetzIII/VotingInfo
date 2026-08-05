# Phase 1 Data Model: Election Type Explainer

This feature introduces no persisted data and no backend model changes. The only "entities" are client-side, derived-at-render-time concepts.

## ElectionTypeCategory (derived value, not persisted)

A closed enum classifying the currently displayed election, derived from the existing `election.name` field on `BallotResponse` (`frontend/src/lib/api.ts:201`, backed by `backend/src/models/mod.rs:150`).

| Value     | Meaning                                                              |
| --------- | --------------------------------------------------------------------- |
| `primary`   | A party-nomination election (spec User Story 1, Acceptance Scenario 2) |
| `general`   | A general/regular election (Acceptance Scenario 1)                    |
| `special`   | An off-cycle election, e.g. to fill a vacancy (Acceptance Scenario 3)  |
| `runoff`    | A follow-up vote between top finishers (Acceptance Scenario 4)        |
| `generic`   | Fallback when the type can't be confidently determined (Acceptance Scenario 5 / FR-005) |

**Derivation rule**: see [contracts/election-type-classification.md](./contracts/election-type-classification.md) for the exact input → category mapping.

**Relationships**: One `ElectionTypeCategory` is derived per `Election` (`BallotResponse.election`); it is not stored, cached independently, or sent to/from the backend — it exists only as a value computed in the frontend at render time from data the page already has.

## ElectionTypeCopy (derived value, not persisted)

For a given `ElectionTypeCategory`, the pair of i18n message ids used by the banner:

| Field           | Type   | Description                                                        |
| --------------- | ------ | -------------------------------------------------------------------- |
| `titleId`         | string | `react-intl` message id for the short type label (e.g. "General Election") |
| `explanationId`   | string | `react-intl` message id for the plain-language voting-rules explanation |

Five pairs exist (one per `ElectionTypeCategory` value including `generic`), defined in `src/messages/en.ts` / `src/messages/es.ts` (FR-002, FR-003, FR-004, FR-009).

## BannerUIState (component-local, not persisted)

Ephemeral UI state owned by the new `ElectionTypeBanner` component (mirrors the existing `expandedLevels` pattern already local to `ballot/page.tsx`):

| Field       | Type    | Description                                                                 |
| ----------- | ------- | ------------------------------------------------------------------------------ |
| `expanded`    | boolean | Whether the banner shows its full explanation or a compact collapsed state (FR-006) |

**State transitions**:
- Initializes to `expanded = true` when an `Election` first becomes available.
- Toggles on user interaction with the collapse/expand control (FR-006).
- Resets to `expanded = true` whenever `election.id` changes (FR-007), since a new election's explanation is new information the voter hasn't seen yet.
- Not persisted to `localStorage` or any storage — resets to `expanded = true` on a fresh page load (per spec Assumptions).

## No backend changes

No new or modified Rust structs, database tables, or migrations. `backend/src/models/mod.rs`'s `Election`/`BallotResponse` types are read as-is.
