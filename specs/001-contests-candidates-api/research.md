# Phase 0 Research: Contests & Candidates API Route

## Decision: Where the endpoint lives in the codebase

**Decision**: Add `get_ballot` to `backend/src/routes/elections.rs` (not a new file), reusing the
existing `AddressQuery` extractor, and add `GET /api/ballot` to the router in `main.rs` alongside
the other address-based routes.

**Rationale**: Every existing address-based Civic API endpoint (`/api/voter-info`,
`/api/elections`, `/api/registration`, `/api/elections/dates`) already lives in this one file and
shares the same `AddressQuery` struct and `State<Arc<CivicApiClient>>` / `State<AppState>`
extraction pattern. A new file would split a single cohesive concern (address → Civic API →
response) across two places for no benefit. This matches Constitution Principle III (no
speculative structure beyond what the task requires).

**Alternatives considered**: A new `routes/ballot.rs` — rejected as an unjustified new module for
one handler that fits the existing file's pattern exactly.

## Decision: Reuse vs. duplicate the existing `/api/elections` contest-mapping code

**Decision**: Add a new `CivicApiClient::get_ballot` method and a new `map_ballot` function in
`services/civic_api.rs`, backed by its own `moka` cache (`ballot_cache`), following the same
shape as `get_elections`/`map_elections`. Do not modify `get_elections`/`map_elections` or their
existing `ElectionsResponse`/`ContestDetail`/`CandidateDetail` types.

**Rationale**: `ElectionsResponse`/`ContestDetail`/`CandidateDetail` are an existing, presumably
already-consumed public contract (Principle I: independent services — the frontend may already
depend on `/api/elections`'s exact shape, including that optional fields currently serialize as
`null` rather than being omitted). FR-006 requires the *new* route to omit empty fields, which is
a breaking shape change if applied to the existing types. Introducing new response types
(`BallotResponse`, `BallotContest`, `BallotCandidate`) for the new route avoids an undocumented
breaking change to `/api/elections` while still reusing the same raw `ApiContest`/`ApiCandidate`
deserialization types already defined in `civic_api.rs` (`fetch_raw` / `ApiVoterInfoResponse`).

**Alternatives considered**: Changing `ContestDetail`/`CandidateDetail` to omit empty fields and
reusing them for both routes — rejected because it silently changes `/api/elections`'s existing
response shape, which is out of scope for this feature (Assumption in spec.md: "no existing
endpoint's behavior or response shape changes as part of this feature").

## Decision: Mapping Google Civic API `level` to Federal/State/Local

**Decision**: Google's Civic API `Contest` resource includes a `level` array (values drawn from
the OCD division hierarchy: `international`, `country`, `administrativeArea1`,
`administrativeArea2`, `regional`, `locality`, `subLocality1`, `subLocality2`, `special`). Map:

| Google `level` value(s)                              | Mapped level |
|--------------------------------------------------------|--------------|
| `country`, `international`                              | Federal      |
| `administrativeArea1`                                   | State        |
| `administrativeArea2`, `regional`, `locality`, `subLocality1`, `subLocality2`, `special` | Local |
| *(missing/empty array)*                                 | Local (per spec.md Assumptions) |

When a contest's `level` array has multiple entries, check for a Federal match first, then a
State match, else Local — a contest is classified by its broadest applicable level.

**Rationale**: `administrativeArea1` corresponds to U.S. states in Google's OCD hierarchy, so it
is the only accurate signal for "State"; `administrativeArea2` (counties) and everything more
granular are correctly "Local" rather than "State". This directly resolves the spec's Assumption
about classifying contests with an indeterminate level.

**Alternatives considered**: Treating `administrativeArea2` as State — rejected; county-level
races are local government, not state government, and conflating them would misorder the ballot
for User Story 1.

## Decision: Field omission strategy

**Decision**: Use `#[serde(skip_serializing_if = "Option::is_none")]` on every optional
`BallotCandidate` field and `#[serde(skip_serializing_if = "Vec::is_empty", default)]` on
`channels`, mirroring the pattern already established on `RegistrationResponse` in
`backend/src/models/mod.rs`.

**Rationale**: This is an existing, established pattern in this codebase for exactly this
requirement (FR-006) — no new technique needs to be introduced or evaluated.

**Alternatives considered**: A custom `Serialize` impl — rejected as unnecessary; the existing
derive-attribute pattern already satisfies the requirement.

## Decision: Testing approach

**Decision**: Unit tests for the `level` → Federal/State/Local mapping function (pure function,
no I/O) plus an integration test using `wiremock` that stubs a Civic API `voterinfo` response
containing contests at all three levels (including one with no `level` array) and asserts both
the sort order and that omitted fields are absent from the serialized JSON (not `null`).

**Rationale**: Matches Constitution Principle II (Testing Standards) — no live API/secrets, and
every new route/mapping branch ships with a covering test.

**Alternatives considered**: None — this directly follows existing project convention
(`get_elections`/`get_registration` already have wiremock-backed integration tests).

## Outcome

All unknowns from the Technical Context are resolved. No `NEEDS CLARIFICATION` markers remain.
