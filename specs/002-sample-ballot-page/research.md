# Phase 0 Research: Sample Ballot Page

No NEEDS CLARIFICATION markers remained in the Technical Context — every open question was
resolved by reading the existing backend contract and frontend components rather than by
introducing new technology. This document records those decisions for traceability.

## Decision: Data source is the existing `/api/ballot` endpoint

**Rationale**: `backend/src/routes/elections.rs::get_ballot` already returns `BallotResponse`
(`backend/src/models/mod.rs:126`) with contests carrying a `level: BallotLevel` field
(`Federal | State | Local`) and pre-sorted Federal → State → Local
(per `CLAUDE.md` API table: "contests sorted Federal → State → Local"). This is exactly the
grouping VOT-17 asks for — no new backend endpoint, model, or sort logic is needed.

**Alternatives considered**:
- Reuse `/api/elections` (`ElectionsResponse`/`ContestDetail`) and group client-side by inferring
  level from office name. Rejected: `ContestDetail` has no `level` field, so grouping would require
  fragile string-matching on office name instead of using the level Google Civic already classifies
  contests into server-side.
- Add a new backend endpoint. Rejected: `/api/ballot` was already built (per `CLAUDE.md`) to serve
  exactly this shape; adding a second endpoint would duplicate `CivicApiClient` logic and violate
  Constitution Principle III's "no unrelated refactors / no speculative abstractions."

## Decision: Reuse `CandidateCard` unmodified for candidate rendering

**Rationale**: `frontend/src/components/CandidateCard.tsx` already implements every candidate-card
acceptance criterion in the spec: name, color-coded party badge (`partyBadgeClass`), photo with an
initials-based fallback avatar (`imgError` state + `onError` handler), website link, plus social
channels and collapsible contact info as bonus fields. Its prop type `CandidateDetail` has the
identical field set to the backend's `BallotCandidate`
(`name`, `party`, `candidate_url`, `photo_url`, `phone`, `email`, `channels`), so no new candidate
card needs to be built or the existing one modified.

**Alternatives considered**:
- Build a new `BallotCandidateCard` component. Rejected: would duplicate the party-badge color
  mapping and fallback-avatar logic that already exists and is already exercised by the
  `/elections/[contestId]` page, violating Constitution Principle III (no speculative
  duplication).

## Decision: Reuse `AddressForm` for address entry, matching `voter-info` and `elections` pages

**Rationale**: Constitution Principle VI requires consistent UX patterns across pages. Both
`voter-info/page.tsx` and `elections/page.tsx` drive their data fetch from a submitted address via
the shared `AddressForm` component and a `useQuery` keyed on that address. The ballot page follows
the same shape: local `address` state, `AddressForm` (or the same inline form pattern used in
`elections/page.tsx`), `useQuery({ queryKey: ["ballot", address], queryFn: () => fetchBallot(address), enabled: !!address, retry: false })`.

**Alternatives considered**:
- A dedicated ballot-specific address input. Rejected: no functional difference from the existing
  form, and a one-off implementation would violate Principle VI's "established react-query
  conventions... rather than ad hoc fetch calls."

## Decision: Collapsible sections are plain local `useState` toggles per level

**Rationale**: `CandidateCard.tsx` already implements the same interaction (a `contactOpen`
boolean + `▼`/`▲` indicator) for its own collapsible contact-info block, with no external
accordion/disclosure library. Following that precedent keeps the pattern consistent and avoids
adding a new dependency (`frontend/package.json` has no accordion/disclosure library) for what is
three independent boolean toggles (Federal, State, Local), all defaulting to expanded per FR-002.

**Alternatives considered**:
- Add a headless UI / Radix accordion dependency. Rejected: unnecessary new dependency for three
  independently-toggled booleans; no existing usage in the codebase to justify introducing one.

## Decision: No new tests are required, consistent with existing frontend data-fetching pages

**Rationale**: Constitution Principle II requires a test or a manually-verified path note for
"every new frontend data-fetching path." No frontend test runner exists in this repo currently
(`frontend/package.json` has no `test` script; `elections/page.tsx` and `voter-info/page.tsx` ship
without automated frontend tests). The PR will note manually-verified loading/error/empty/success
paths, matching the existing convention.

**Alternatives considered**:
- Introduce a frontend test runner (e.g., Vitest + React Testing Library) as part of this feature.
  Rejected: out of scope for a single-page feature; would be a repo-wide tooling change unrelated
  to VOT-17, violating Principle III's scope-matching rule.
