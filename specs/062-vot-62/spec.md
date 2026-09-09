# Feature Specification: Address-specific election selection

**Feature Branch**: `codex/vot-62` · **Created**: 2026-09-09 · **Status**: Specified
**Input**: VOT-62, including all acceptance criteria in docs/agent-tracking/VOT-62.md.

## User Scenarios & Testing

### US1 — Choose the intended election (P1)
A voter sees names and dates of elections applicable to their address and chooses using pointer or keyboard.
Acceptance: zero choices has an actionable empty state; one works automatically; several are shown; same-day ambiguity requires explicit selection before results. Nationwide listings never establish address eligibility.

### US2 — Keep election context consistent (P1)
A voter moves between ballot, contest detail, polling, voter-info and dates without losing their choice.
Acceptance: URL electionId overrides the session choice, choice persists through navigation/reload, address changes reset selection and revalidate; invalid or unavailable IDs show stable errors without replacing the user's selection; switching during pending requests cannot display prior results.

### US3 — Trust selected deadlines (P1)
A voter sees only verifiably matched deadlines for their chosen election.
Acceptance: no nearest-election replacement on error or mismatch; same-date but different-name scraped elections do not contaminate results; unlinked general dates are omitted when an election is explicitly selected.

## Requirements
- FR-001: Optional election_id on every address-based API; unchanged single-election default behavior.
- FR-002: Typed address discovery choices from election and otherElections only; deduplicate IDs and report selection_required for same-day ambiguity.
- FR-003: Accessible labelled election name/date chooser, English and Spanish loading/empty/error/selection states.
- FR-004: Shared session context and electionId URL support across all listed pages; reset/revalidate on address change.
- FR-005: Address and election ID in affected backend caches and frontend query keys; old responses cannot overwrite new choice.
- FR-006: Strict ID validation and stable project error codes; reject upstream election mismatch/unavailable IDs without fallback.
- FR-007: Explicit selected dates require verified election date and name match; no nearest fallback or unlinked important dates.
- FR-008: Deterministic backend forwarding/cache/ambiguity/error fixtures and frontend zero/one/multiple/address/URL/keyboard/out-of-order tests.

## Success Criteria
- SC-001: Every listed page requests and displays the selected election in automated checks.
- SC-002: Two elections at one address remain isolated in caches; stale responses do not appear after switching.
- SC-003: Frontend lint/type/test/build and backend fmt/test/clippy pass, with UI review evidence.

## Assumptions / Edge Cases
An explicit upstream ID matching the response is authoritative even if discovery lacks that election (Google documents explicit queries for non-live elections). Ambiguity is any duplicate day among discovery choices; require selection conservatively. Exact normalized scraped name plus date is conservative evidence; missing matches produce fewer dates, never speculative dates. Session election storage contains an ID and address binding only; existing address privacy behavior is outside this ticket.
