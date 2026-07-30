# Research: Candidate Detail & Comparison

## 1. How to identify a single contest in a URL (`[contestId]`)

**Decision**: Add an `id: usize` field to the backend's `BallotContest` model, assigned via
`.enumerate()` immediately after the existing `contests.sort_by_key(|c| c.level)` call in
`map_ballot()` (`backend/src/services/civic_api.rs`). The id is therefore the contest's stable
position in the exact array order the client already receives from `GET /api/ballot?address=`.

**Rationale**: This repo already has an identical precedent — `ContestDetail.id` on the
`/api/elections` response is assigned the same way (`.enumerate().map(|(i, c)| ContestDetail { id: i, ... })`
in `map_elections()`), and `frontend/src/app/elections/[contestId]/page.tsx` already looks up a
contest by parsing `contestId` as an integer and matching it against that index. Reusing the same
pattern keeps the two `[contestId]` routes consistent and requires no new ID scheme, no database,
and no change to the Google Civic API request itself (Google does not provide a stable per-contest
identifier in `contests[]`).

**Alternatives considered**:
- *Hash of `office` + `district`*: rejected — fragile when `office`/`district` are `null` or
  duplicated across contests (e.g. multiple "City Council" seats), and adds complexity for no
  benefit over an index.
- *Slug derived from office name*: rejected — not guaranteed unique or URL-safe, and breaks when
  `office` is absent.
- *Persisting contests server-side with a real UUID*: rejected — massively out of scope; ballot
  data is intentionally never persisted (Google Civic responses are cache-only, per
  `CLAUDE.md` "Data persistence"), and this feature doesn't need cross-request durability beyond a
  single cached response's TTL.

## 2. Propagating the address to a shareable, "back"-able detail page

**Decision**: Follow the exact pattern already used by `elections/page.tsx` /
`elections/[contestId]/page.tsx`: the address lives in the `?address=` query string, is read via
`useSearchParams()` on mount, and the share button copies `window.location.href` with
`address` set via `URL.searchParams.set`. Extend this same query-param-read pattern to the
existing `frontend/src/app/ballot/page.tsx` (which today only holds address in local `useState`
and does not read `?address=` on load), so that:
- `app/ballot/[contestId]/page.tsx`'s "Back to ballot" link points to `/ballot?address=<addr>`
  and actually pre-fills/fetches on arrival (currently it would not, since `/ballot/page.tsx`
  ignores the query string).
- A share link to `/ballot/[contestId]?address=<addr>` is independently loadable.

**Rationale**: Reuses an established, already-shipped convention instead of inventing a second way
to carry state across pages (e.g. localStorage), keeping UX consistent per Constitution Principle
VI. The one small change to `/ballot/page.tsx` (read `initialAddress` from `useSearchParams`,
mirroring `elections/page.tsx` lines 10-14) is a minimal, low-risk addition, not a rewrite.

**Alternatives considered**:
- *`localStorage`/`sessionStorage` for the last-searched address*: rejected — doesn't survive
  being shared to a different browser/device, which directly breaks the FR-006 share requirement.
- *Global client state (React context) for address*: rejected — unnecessary abstraction for a
  value that already has a working URL-param convention elsewhere in the app.

## 3. Rendering candidate details and social icons

**Decision**: Reuse `frontend/src/components/CandidateCard.tsx` unmodified. It already renders
name, party badge, photo (with initials fallback), website link, `channels` (Twitter/X, Facebook,
YouTube, Google+) as linked pill-icons via `CHANNEL_CONFIG`, and collapsible phone/email contact
info — i.e. every field FR-002/FR-004/FR-010 require, already field-omitting-when-absent.

**Rationale**: `BallotCandidate` (used by the new page) has an identical shape to
`CandidateDetail` (used by `CandidateCard` today on `elections/[contestId]/page.tsx` and
`ballot/page.tsx`), so no adapter or duplicate component is needed. Building a second card
component would violate Constitution Principle III (no speculative duplication).

**Alternatives considered**: A new `CandidateCompareCard` — rejected, no functional gap exists to
justify it.

## 4. Side-by-side / stacked layout

**Decision**: Use the same Tailwind grid pattern already used for candidate layouts elsewhere:
`grid grid-cols-1 md:grid-cols-2` (or `md:grid-cols-3`+ when a contest has more candidates,
matching how `elections/[contestId]/page.tsx` already grids its candidates).

**Rationale**: Matches existing breakpoints and visual language app-wide (Constitution Principle
VI); no new responsive breakpoints need to be introduced.

## 5. Testing approach

**Decision**:
- Backend: one new `#[test]` in `backend/src/models/mod.rs` (or `civic_api.rs`, wherever the
  existing `BallotContest`/`BallotCandidate` serialization tests live) asserting `map_ballot`
  assigns sequential, stable `id`s matching final array order.
- Frontend: extend `frontend/src/lib/api.test.ts` to cover the new `id` field on `BallotContest`/
  `fetchBallot`. Add a focused Vitest test for the new page's "find contest by id" and
  not-found/empty-state branches (pure logic, easy to isolate), consistent with this repo's
  existing Vitest coverage (`api.test.ts`, `AddressForm.test.tsx`, `LocaleContext.test.tsx`).
  The share-button's `navigator.clipboard.writeText` call follows the same *manually-verified*
  precedent as `elections/page.tsx`'s existing (untested) share button — no clipboard mock exists
  anywhere in this repo yet, so this feature doesn't newly regress test coverage by leaving it
  manually verified and noted in the PR, per Constitution Principle II's stated minimum bar.

**Rationale**: Matches Constitution Principle II (new backend model/mapping logic MUST have a
covering test; new frontend data-fetching paths MUST have a test or noted manual verification) at
the least-effort point that still catches regressions in the one genuinely new piece of logic
(contest lookup by id).
