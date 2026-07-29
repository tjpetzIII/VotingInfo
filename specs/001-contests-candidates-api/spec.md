# Feature Specification: Contests & Candidates API Route

**Feature Branch**: `001-contests-candidates-api`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Look at the Linear ticket VOT-16 and create the spec that is needed to create the contests and candidates API route"

**Source**: [VOT-16 — Contests & candidates API route](https://linear.app/votinginfo/issue/VOT-16/contests-and-candidates-api-route) (Milestone 5 — Sample Ballot & Candidate Info)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the full ballot, most important races first (Priority: P1)

A voter who has already provided their address wants to see every contest they can vote on,
with the races that affect the most people — federal, then state, then local — presented first,
so they can orient themselves before drilling into any one race.

**Why this priority**: This is the core value of the feature. Without correct grouping and
ordering, the rest of the ballot data is just an unsorted list a voter has to make sense of
themselves.

**Independent Test**: Request the ballot for an address known to have contests at multiple
levels of government and confirm every federal contest appears before every state contest,
which appears before every local contest.

**Acceptance Scenarios**:

1. **Given** a valid address with federal, state, and local contests on the ballot, **When** the
   voter requests their ballot, **Then** the contests are returned grouped and ordered
   Federal → State → Local.
2. **Given** a valid address with contests at only one level of government, **When** the voter
   requests their ballot, **Then** all contests for that level are returned and no other levels
   appear.

---

### User Story 2 - Research every candidate in a race (Priority: P2)

A voter looking at a specific contest wants to see everything available about each candidate —
party, campaign website, photo, social media presence, phone, and email — so they can decide
who to vote for without leaving the app to search for basic candidate information elsewhere.

**Why this priority**: Once a voter can see the ballot (P1), the next most valuable thing is
being able to act on it — comparing candidates — which is the actual decision-making step.

**Independent Test**: Request the ballot for an address with a contest whose candidates have a
full set of bio/contact details on file, and confirm every one of those details is present in
the response for each candidate.

**Acceptance Scenarios**:

1. **Given** a contest with a candidate who has a party, website, photo, social channels, phone,
   and email on file, **When** the voter requests their ballot, **Then** all of those details
   appear for that candidate.
2. **Given** a contest with multiple candidates, **When** the voter requests their ballot,
   **Then** every candidate running in that contest is included, not just the first or a subset.

---

### User Story 3 - Never see a blank/placeholder value (Priority: P3)

A voter looking at a candidate who, for example, has no listed campaign website wants that
candidate's card to simply not show a website link, rather than showing an empty or "null"
value that looks broken.

**Why this priority**: This is a data-quality/presentation concern rather than core
functionality — it matters for trust and polish once P1 and P2 already work.

**Independent Test**: Request the ballot for a contest containing a candidate known to be
missing one or more optional details, and confirm those specific fields are absent from that
candidate's data rather than present with an empty/null value.

**Acceptance Scenarios**:

1. **Given** a candidate with no phone number on file, **When** the voter requests their
   ballot, **Then** that candidate's data has no phone field at all (not a null or empty phone
   field).
2. **Given** a candidate with no social media channels on file, **When** the voter requests
   their ballot, **Then** that candidate's data has no channels present rather than an empty
   placeholder.

### Edge Cases

- What happens when the address does not resolve to a recognizable election? The request MUST
  fail with a clear, actionable error rather than returning an empty or partial ballot.
- What happens when the address resolves to a real, current election that simply has no
  contests (e.g., an off-cycle special election with only a ballot measure the data source
  doesn't expose as a contest)? The request MUST succeed with an empty list of contests, not an
  error.
- What happens when a contest's level of government can't be determined from the source data
  (e.g., a non-partisan judicial retention question)? It MUST still be classified into one of
  Federal/State/Local (see Assumptions) so the ordering guarantee in User Story 1 always holds.
- How does the system handle a candidate with zero optional fields available at all (just a
  name)? Only the name is returned; every optional field is simply absent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a way to retrieve, for a given address, every contest the
  voter can vote on in the current election.
- **FR-002**: Each contest returned MUST include the office name, the district (when the source
  data has one), and a level classifying it as Federal, State, or Local.
- **FR-003**: Contests in a single response MUST be ordered Federal first, then State, then
  Local; relative order of contests within the same level MUST be preserved from the order the
  source data provides them in.
- **FR-004**: Each contest MUST include every candidate running for that office.
- **FR-005**: Each candidate MUST include, whenever the source data has it: name, party
  affiliation, campaign website, photo, social media channels, phone number, and email address.
- **FR-006**: Name is the only field guaranteed present for every candidate; any other field
  with no value for a given candidate MUST be omitted from that candidate's data entirely — it
  MUST NOT appear as a null or empty value.
- **FR-007**: An address that cannot be parsed or recognized MUST produce a validation error,
  consistent with how other address-based lookups in this system behave.
- **FR-008**: An address that resolves to no current election MUST produce a distinct "not
  found" outcome rather than a successful empty ballot.
- **FR-009**: An address that resolves to a current election with zero contests MUST produce a
  successful response containing an empty list of contests.
- **FR-010**: The underlying error and data-shape mapping MUST follow this project's existing
  rule that raw third-party response data is never forwarded to the caller as-is.

### Key Entities

- **Contest**: A single office or race on a voter's ballot. Attributes: office name, district
  (optional), level (Federal, State, or Local), and the list of candidates running for it.
- **Candidate**: A person running in a contest. Attributes: name (always present), party,
  campaign website, photo, phone, email, and any social media channels — each present only when
  known.
- **Channel**: A social media presence belonging to a candidate. Attributes: platform/type and
  the candidate's identifier/handle on that platform.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter with a valid address gets their entire ballot in a single request, with
  contests always appearing in Federal → State → Local order, 100% of the time.
- **SC-002**: For every candidate returned, all bio/contact details the source data has on file
  for that candidate are present in the response — no available field is silently dropped.
- **SC-003**: 0% of returned candidate or contest fields are ever an empty placeholder (null or
  blank); a field is either populated with real data or not present at all.
- **SC-004**: A repeat request for the same address within a 15-minute window returns at least
  as fast as the first request, matching this system's existing caching behavior for other
  address-based lookups.
- **SC-005**: An address that does not correspond to a recognizable election always produces a
  clear, actionable error rather than a malformed, partial, or misleadingly empty ballot.

## Assumptions

- This is a new, additive capability alongside this project's existing address-based lookups
  (e.g. the current elections/contests data already served); no existing endpoint's behavior or
  response shape changes as part of this feature.
- "Level" (Federal/State/Local) is derived by classifying each contest's source-data level
  indicator into one of the three buckets; a contest whose level can't be determined from source
  data is classified as Local, so it still sorts predictably (after other Local contests) rather
  than being dropped or left unclassified.
- Candidate social media channels are returned as a list per candidate (a candidate may have
  zero, one, or many); the list is omitted entirely rather than returned empty when a candidate
  has none, consistent with FR-006.
- This capability reuses this project's existing conventions for a given address: per-IP rate
  limiting, a 15-minute freshness window before re-fetching source data, and mapping every
  source-data error into this project's own error responses rather than forwarding raw errors.
