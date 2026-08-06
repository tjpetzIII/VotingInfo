# Feature Specification: Census Geocoder Migration for Polling Locations

**Feature Branch**: `008-census-geocoder-migration`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "The linear ticket VOT-59"

**Linear**: [VOT-59](https://linear.app/votinginfo/issue/VOT-59/evaluate-replacing-nominatim-with-census-bureau-geocoder-for-polling)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster polling-location results (Priority: P1)

A voter enters their address on the polling-locations page to see where they can vote. Today, if their address returns several polling locations, the app looks up map coordinates for each one strictly one-at-a-time with a forced pause between lookups, so the page takes noticeably longer to finish rendering pins the more locations there are. The voter should instead see all polling-location pins appear quickly, without that compounding delay.

**Why this priority**: This is the core problem the ticket exists to solve, and it's the most visible improvement — it makes an existing, already-shipped page measurably faster with no change in what's displayed.

**Independent Test**: Can be fully tested by requesting an address known to return multiple polling locations and measuring the time from request to all coordinates being available; delivers value on its own even before any fallback-path changes are considered.

**Acceptance Scenarios**:

1. **Given** an address that returns several polling locations, **When** the app looks up map coordinates for all of them, **Then** the lookups complete without the current mandatory one-second pause between each one.
2. **Given** the primary coordinate lookup is temporarily unavailable, **When** a voter requests polling-location coordinates, **Then** the app still returns coordinates via a fallback lookup rather than failing the request outright.

---

### User Story 2 - No loss of coverage for unusual addresses (Priority: P2)

A voter's polling location is described with a non-standard address — for example a building name, rural route, or PO-box-style entry rather than a clean street address. Today's lookup source handles many of these cases. After the app switches its primary coordinate lookup, that same voter should still see a map pin for their polling location rather than a blank spot where one used to appear.

**Why this priority**: Speed only matters if accuracy and coverage are preserved — this is the guardrail that makes User Story 1 safe to ship, so it's the second most important thing verified.

**Independent Test**: Can be fully tested by running a fixed batch of previously-successful and known-tricky addresses through the new lookup flow and confirming none of them lose their coordinates compared to today's behavior.

**Acceptance Scenarios**:

1. **Given** an address that today's lookup successfully places on the map, **When** it is looked up through the new primary-plus-fallback flow, **Then** it still resolves to a map position.
2. **Given** an address the new primary lookup source cannot match, **When** coordinates are requested, **Then** the app automatically retries via the fallback source before treating the address as unmatched.

---

### User Story 3 - Documented go/no-go evidence before switching (Priority: P3)

Before the app starts relying on a new primary coordinate-lookup source for real voters, someone needs to have checked — with real polling-location-style addresses, including the unusual ones — that the new source is at least as good as what's in place today. That check and its outcome should exist as a record, independent of whether the switch ultimately ships.

**Why this priority**: This is a process/evidence deliverable rather than something a voter directly experiences, but it's the explicit gate the ticket calls for ("spike first, swap only if viable"), so it must exist even though it ranks below the user-facing outcomes above.

**Independent Test**: Can be fully tested by confirming a findings summary exists that lists the sample addresses used, their match/accuracy results, and a clear go/no-go decision — this is verifiable without the switch itself having shipped.

**Acceptance Scenarios**:

1. **Given** a representative sample of polling-location-style addresses, including non-standard formats, **When** the spike is run against both the current and candidate lookup sources, **Then** a report comparing match rate and location accuracy between them is produced.
2. **Given** the spike report, **When** its results are reviewed, **Then** a recorded decision states whether the candidate source is enabled as primary or the app keeps its current source.

---

### Edge Cases

- What happens when an address can't be matched by either the primary or fallback lookup source? (Expected: no coordinates are returned for that polling location, matching today's behavior — the pin is simply omitted.)
- What happens when the primary source matches an address but at a location meaningfully different from where the fallback would have placed it?
- Once the forced pacing delay is relaxed for primary-source requests, could a page requesting many locations at once run into a different, undocumented limit on the primary source?
- What happens to coordinates already cached from before the switch? (Expected: they simply expire on their existing schedule rather than being force-invalidated.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST attempt to obtain coordinates for a polling-location address from the new primary lookup source before falling back to the current source.
- **FR-002**: System MUST automatically fall back to the current lookup source when the primary source cannot produce a match for a given address.
- **FR-003**: System MUST cache successful coordinate results for the same duration as today, regardless of which source produced them.
- **FR-004**: System MUST NOT apply the current mandatory pacing delay between requests to the new primary source.
- **FR-005**: System MUST continue to pace requests to the fallback source the same way it does today, since that source's usage limits still apply whenever it's used.
- **FR-006**: System MUST produce a documented comparison of match rate and location accuracy between the candidate and current lookup sources, using a representative sample of polling-location-style addresses that includes non-standard formats (e.g., building names, rural routes, PO-box-style entries), before the candidate source is enabled as primary.
- **FR-007**: System MUST only enable the candidate source as primary if that documented comparison shows no regression in match rate or location accuracy versus the current source.
- **FR-008**: System MUST return no coordinates for an address that neither the primary nor fallback source can match, matching current behavior.
- **FR-009**: System MUST NOT change what polling-location information (name, address, hours, etc.) is displayed to voters as a result of this change — only the speed and source of coordinate lookup changes.

### Key Entities

- **Polling-location coordinate lookup**: The map coordinate (latitude/longitude) associated with a single polling-location address, produced by either the primary or fallback lookup source and cached for reuse.
- **Spike findings report**: A record comparing the candidate and current lookup sources across a representative address sample, culminating in a go/no-go decision for enabling the candidate as primary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For an address returning 5 polling locations, total time to obtain coordinates for all of them drops by at least 60% compared to today's pace.
- **SC-002**: The match rate (percentage of sample addresses that receive coordinates) on the representative spike sample is equal to or better than the current source's baseline on that same sample.
- **SC-003**: Zero addresses in the representative spike sample regress from "successfully placed on the map today" to "no pin shown" after the switch.
- **SC-004**: The go/no-go decision from the spike is recorded and available before any primary-source switch reaches voters.

## Assumptions

- The app's scope remains US-only, matching the candidate lookup source's coverage area (already true today).
- A representative sample of real polling-location-style addresses — including the non-standard formats called out in the ticket — will be assembled for the spike; the exact sample size and address list are a planning-phase detail, not specified here.
- The existing caching duration and cache-key approach for coordinate lookups remain unchanged.
- "Viable," per FR-007, means no regression in match rate or location accuracy versus the current source on the spike sample — that is the bar for enabling the candidate source as primary.
- Only the polling-location coordinate lookup is affected by this change; no other feature in the app depends on today's lookup source.
- Any additional data the candidate source can return beyond coordinates (e.g., district or census-tract info) is out of scope for this feature.
