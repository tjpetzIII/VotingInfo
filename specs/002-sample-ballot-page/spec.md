# Feature Specification: Sample Ballot Page

**Feature Branch**: `002-sample-ballot-page`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "VOT-17: Sample ballot page — Build a ballot page showing a grouped list of contests organized by level (Federal, State, Local). Each contest shows the office name, district, and a list of candidate cards. Acceptance criteria: collapsible sections per level; contest header shows office name and district; each candidate card shows name, party badge (color-coded), photo (with fallback avatar), website link; 'No candidates found' empty state."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View sample ballot grouped by level (Priority: P1)

A voter who has looked up their address wants to see every contest they'll vote on, organized so that Federal, State, and Local races are clearly separated and easy to scan.

**Why this priority**: This is the core value of the feature — without a grouped, readable list of contests, there is no sample ballot page. Every other capability builds on this structure.

**Independent Test**: Can be fully tested by loading the ballot page for an address with contests at multiple levels and confirming contests appear under the correct Federal/State/Local section, each showing office name and district, delivering a scannable overview of the ballot on its own.

**Acceptance Scenarios**:

1. **Given** a voter has an address with contests at the Federal, State, and Local levels, **When** they view the sample ballot page, **Then** contests are grouped into three sections labeled Federal, State, and Local, each containing only the contests for that level.
2. **Given** a contest with a known office and district, **When** it is displayed, **Then** the contest header shows the office name and the district.
3. **Given** a contest with no district information available, **When** it is displayed, **Then** the contest header shows the office name without a broken or blank district label.
4. **Given** a level (e.g., Local) has no contests for the voter's address, **When** the ballot page renders, **Then** that level's section is omitted or clearly indicates there are no contests, rather than showing an empty heading with no explanation.

---

### User Story 2 - View candidate details within a contest (Priority: P2)

A voter reviewing a contest wants to see who is running, which party each candidate represents, what they look like, and a way to learn more from each candidate's own website.

**Why this priority**: Candidate detail is the information voters act on once they've found the right contest; it's the second most essential layer after the grouped structure from User Story 1.

**Independent Test**: Can be fully tested by loading a contest with multiple candidates and confirming each candidate card independently shows name, party badge, photo or fallback avatar, and website link, delivering the research information a voter needs for that race.

**Acceptance Scenarios**:

1. **Given** a contest has one or more candidates, **When** the contest is displayed, **Then** each candidate appears as a card showing at minimum the candidate's name.
2. **Given** a candidate has a known party affiliation, **When** their card is displayed, **Then** a color-coded badge shows that party, with distinct colors for different parties.
3. **Given** a candidate has a photo available, **When** their card is displayed, **Then** the photo is shown.
4. **Given** a candidate has no photo available, **When** their card is displayed, **Then** a fallback avatar is shown in place of a broken image.
5. **Given** a candidate has a website URL available, **When** their card is displayed, **Then** a link to that website is shown and opens in a new tab.
6. **Given** a candidate has no website URL available, **When** their card is displayed, **Then** no website link is shown for that candidate.

---

### User Story 3 - Collapse and expand ballot sections (Priority: P3)

A voter facing a long ballot wants to collapse sections they've already reviewed (or aren't interested in) so they can focus on the races that matter to them.

**Why this priority**: This is a usability refinement on top of the grouped list — valuable for long ballots but not required for the page to deliver its core information.

**Independent Test**: Can be fully tested by loading a ballot with multiple level sections, collapsing one, and confirming its contests are hidden while other sections remain visible and unaffected, delivering reduced visual clutter without losing access to the collapsed content.

**Acceptance Scenarios**:

1. **Given** the ballot page has loaded with contests grouped by level, **When** a voter collapses the Federal section, **Then** its contests are hidden and the section header remains visible with a clear expand control.
2. **Given** a section is collapsed, **When** the voter clicks or activates its header again, **Then** the section expands and its contests reappear.
3. **Given** multiple sections exist, **When** one section is collapsed or expanded, **Then** the other sections' expanded/collapsed states are unaffected.
4. **Given** the ballot page loads, **When** no section has been interacted with yet, **Then** all level sections are expanded by default.

---

### Edge Cases

- What happens when a contest exists for a level but has zero candidates? The contest still appears under its level section, and a "No candidates found" message is shown in place of the candidate card list.
- What happens when the voter's address has no ballot data at all (e.g., no upcoming election, or an address the system can't match)? The page shows a message explaining that no sample ballot is available, rather than empty section headers or a blank page.
- How does the system handle a contest missing both office name and district? The contest is still shown with a fallback label (e.g., "Contest") so the section isn't silently missing an entry.
- How does the system handle a candidate photo URL that fails to load (broken link, not merely absent)? The fallback avatar is shown, matching the "no photo available" behavior.
- How does the system handle multiple candidates sharing the same party? Each gets the same color-coded badge for that party, so voters can visually group same-party candidates within a contest.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display ballot contests grouped into three sections by level: Federal, State, and Local.
- **FR-002**: Each level section MUST be independently collapsible and expandable, defaulting to expanded when the page loads.
- **FR-003**: Each contest header MUST display the office name and, when available, the district.
- **FR-004**: Each contest MUST display the list of candidate cards running for that office.
- **FR-005**: Each candidate card MUST display the candidate's name.
- **FR-006**: Each candidate card MUST display a color-coded badge indicating the candidate's political party when that information is available.
- **FR-007**: Each candidate card MUST display the candidate's photo when available, and a fallback avatar when no photo is available or the photo fails to load.
- **FR-008**: Each candidate card MUST display a link to the candidate's website when a website URL is available, and MUST omit the link when it is not.
- **FR-009**: When a contest has no candidates, the system MUST display a "No candidates found" message in place of the candidate card list for that contest.
- **FR-010**: The system MUST retrieve ballot data for the voter's provided address, consistent with how address lookup works elsewhere in the product.
- **FR-011**: When no ballot data is available for the provided address, the system MUST show a clear message rather than an empty or broken page.
- **FR-012**: A level section with no contests for the voter's address MUST NOT display as an empty, unexplained heading.

### Key Entities

- **Ballot**: The full set of contests a voter will see for a given election at their address; organized by level.
- **Contest**: A single race or ballot question, with an office name, an optional district, a level (Federal, State, or Local), and a list of candidates.
- **Candidate**: A person running in a contest, with a name, an optional party affiliation, an optional photo, and an optional website link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter can identify which section (Federal, State, or Local) any given contest belongs to within 2 seconds of the page loading, without reading contest details.
- **SC-002**: 100% of candidate cards render a name and either a photo or a fallback avatar — no card is ever shown blank or broken.
- **SC-003**: A voter can find a candidate's website link, when one exists, without needing to leave the ballot page or search elsewhere.
- **SC-004**: On a ballot with contests at all three levels, a voter can collapse any one section and still see the contests in the remaining two sections without any loss of information.
- **SC-005**: Contests with no declared candidates are never mistaken for a loading or error state — 100% show the explicit "No candidates found" message.

## Assumptions

- The ballot page uses the same address-lookup pattern already established on the voter-info page (an address form that drives what ballot data is fetched and displayed), rather than introducing a new lookup mechanism.
- "Party badge (color-coded)" means a small set of recognizable colors mapped to major parties (e.g., Democratic, Republican, Independent/other), with a consistent neutral color for unknown or minor-party affiliations — exact color values are a design decision, not a product requirement.
- Contests without a district (e.g., statewide or at-large offices) are valid and simply omit the district portion of the header rather than being treated as an error.
- "No candidates found" applies per contest, not to the whole ballot — a ballot can have some contests with candidates and others without.
- Sections default to expanded on first load; the system does not need to persist a voter's collapse/expand preference across visits.
