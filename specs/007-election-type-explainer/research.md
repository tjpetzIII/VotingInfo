# Phase 0 Research: Election Type Explainer

No open `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature is small and self-contained, so research here focuses on confirming the approach rather than resolving unknowns.

## Decision 1: Where does "election type" come from?

- **Decision**: Classify the election type client-side, in the frontend, by matching keywords against the existing `election.name` string already returned by `GET /api/ballot` (e.g. `Election { id, name, election_day }`, `frontend/src/lib/api.ts:89`, mirrored by `backend/src/models/mod.rs:4`). No backend field, migration, or API change.
- **Rationale**: The backend's `Election` model has no explicit type field today, and Google's Civic API itself doesn't expose a structured election-type enum — only a human-readable name (e.g. "2026 General Election"). Adding a new backend field/classification service would require guessing at the same keyword heuristic anyway (since Google doesn't provide it structurally), just on the other side of the network boundary, for a 1-point UX ticket. Keeping it client-side keeps the change frontend-only (Constitution Principle I) and avoids a backend release for a copy/UX feature.
- **Alternatives considered**:
  - *Add an `election_type` field to the backend `Election`/`BallotResponse` models, computed server-side.* Rejected: same heuristic, more surface area (new field, new tests in `cargo test`, must stay in sync with frontend copy), no behavioral benefit since the underlying signal (the name string) is unchanged.
  - *Call an external elections-metadata API to get a structured type.* Rejected: no such source is already integrated (unlike `services/fec_api.rs`'s campaign-finance data), and the ticket's scope (1 point, UX-only) doesn't justify a new external dependency, cache, or rate-limit surface (Constitution Principle VII).

## Decision 2: How to classify from free-text election names

- **Decision**: A small ordered set of case-insensitive keyword checks against `election.name`:
  - contains "runoff" → `runoff`
  - contains "primary" → `primary`
  - contains "special" → `special`
  - contains "general" → `general`
  - none match → `generic` fallback
- **Rationale**: Google Civic API election names in practice follow patterns like "2026 General Election", "2026 Primary Election", "November 2026 Special Election", "2026 Runoff Election" — the same convention already visible in this repo's own test fixtures (`frontend/src/app/ballot/page.test.tsx` uses `"General Election"`). Checking "runoff" and "special" before "primary"/"general" avoids misclassifying a compound name like "2026 Special Primary Election" as merely a general primary when "special" is the more specific/important distinction to surface first.
- **Alternatives considered**:
  - *Regex with anchored positions or word-boundary parsing of the full name.* Rejected as unnecessary complexity for four keywords; a simple ordered `includes()` chain is easier to read, test, and extend than a regex grammar, with no loss of correctness for the known naming pattern.
  - *Exact/enum match against a fixed list of known election names.* Rejected: election names change every cycle (they embed the year), so this would need constant updates and would fail closed (always falling to generic) for every new cycle unless maintained.

## Decision 3: Collapse/expand state management

- **Decision**: Local component state (`useState<boolean>`) in the new `ElectionTypeBanner` component, defaulting to expanded, reset to expanded whenever the election's `id` changes (via a `useEffect`/key keyed on `election.id`, mirroring how `expandedLevels` already works as page-local state in `ballot/page.tsx`).
- **Rationale**: Spec Assumptions explicitly state collapse state does not need to persist across reloads or visits — matching the existing `BallotSection` collapse pattern on the same page, which is also local `useState`, not persisted. Keeping it consistent avoids introducing a second state-management convention on one page.
- **Alternatives considered**:
  - *Persist dismissal in `localStorage`* (like `AddressContext`/`LocaleContext`). Rejected: spec explicitly treats this as a per-visit UI affordance, not a durable preference; persisting would mean a voter who dismissed the banner for a primary election would never see the (different, important) explanation for a later general election unless the reset-on-election-change logic was layered on top anyway — simpler to just not persist.

## Decision 4: Copy delivery / i18n

- **Decision**: Add new message keys to the existing flat `src/messages/en.ts` / `es.ts` maps (one title + one explanation per category: `primary`, `general`, `special`, `runoff`, `generic`; plus toggle/aria-label strings), consumed via `useIntl()`/`FormattedMessage`, exactly like every other page's copy.
- **Rationale**: This is the established, only i18n mechanism in the app (Architecture: `src/messages/{en,es}.ts`); `messages.test.ts` already enforces en/es key parity and placeholder-name parity automatically, so new keys get that safety net for free.
- **Alternatives considered**: None seriously considered — a project-specific bespoke copy source would fragment the existing i18n system for no benefit.

## Outcome

All unknowns resolved; no `NEEDS CLARIFICATION` markers remain. Proceeding to Phase 1 design.
