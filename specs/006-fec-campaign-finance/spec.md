# Feature Specification: Campaign Finance Data on Candidate Pages

**Feature Branch**: `006-fec-campaign-finance`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "from VOT-60 — Add campaign finance data to candidate detail pages via OpenFEC API. The OpenFEC API is free (DEMO_KEY, or a free api.data.gov key for 1,000 req/hr) and exposes federal candidate campaign finance data: total raised, total spent, cash on hand, and top contributors, keyed by FEC candidate ID or by name/state/office search. This would add real transparency value to contest/candidate detail pages for federal races (House/Senate/President). Scope: match Civic API candidates to FEC candidates (likely by name + state + office — flagged as the main open risk to validate first); surface total raised/spent/cash-on-hand on candidate detail views; only applies to federal races — omit the section entirely for state/local candidates."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a federal candidate's funding totals (Priority: P1)

A voter looking at a candidate running for President, U.S. Senate, or U.S. House wants to know how well-funded that candidate's campaign is — how much they've raised, how much they've spent, and how much cash they have on hand — to help gauge the campaign's viability and reach.

**Why this priority**: This is the core transparency value the feature exists to deliver, and it's the minimum slice that makes the feature useful on its own.

**Independent Test**: Open a contest detail page for a federal race and confirm each candidate with a verified funding record shows total raised, total spent, and cash on hand, sourced from public FEC filings.

**Acceptance Scenarios**:

1. **Given** a voter viewing a candidate running for a federal office, **When** the candidate has a confidently-matched FEC filing, **Then** the page shows that candidate's total raised, total spent, and cash on hand.
2. **Given** a voter viewing a candidate running for a federal office, **When** no FEC filing can be confidently matched to that candidate, **Then** the page shows no funding figures for that candidate (no blank/broken section, no partial or guessed numbers).

---

### User Story 2 - See who is funding a federal candidate (Priority: P2)

A voter wants to see who is funding a federal candidate's campaign — the top contributors — as an additional layer of transparency beyond the raw totals.

**Why this priority**: Adds depth to the transparency story from User Story 1 but is not required for the feature to deliver its core value; totals alone already answer "how funded is this campaign."

**Independent Test**: Open a federal candidate's detail view and confirm a list of top contributors appears alongside the funding totals, when available.

**Acceptance Scenarios**:

1. **Given** a voter viewing a federal candidate with a matched FEC filing, **When** contributor data is available, **Then** the page shows a short list of the candidate's top contributors.
2. **Given** a federal candidate with a matched FEC filing but no reported contributor data yet (e.g., a newly-filed campaign), **When** the voter views the page, **Then** the totals still display and the contributors list is simply absent.

---

### User Story 3 - Non-federal races look unaffected (Priority: P3)

A voter browsing a state legislature or local race (e.g., school board, city council) sees the candidate page exactly as it works today — no funding section, no error, no loading spinner that never resolves.

**Why this priority**: Guardrails the feature's boundaries; lower priority because it's a "does no harm" check rather than new value, but it protects the experience for the majority of races on the ballot (most contests are state/local, not federal).

**Independent Test**: Open a contest detail page for a state or local race and confirm there is no campaign-finance section anywhere on the page.

**Acceptance Scenarios**:

1. **Given** a voter viewing a candidate running for a state or local office, **When** the page loads, **Then** no campaign finance section, placeholder, or error appears for that candidate.

---

### Edge Cases

- What happens when the funding data source is temporarily unavailable or rate-limited? The rest of the candidate/contest page must still load normally, simply without funding figures.
- What happens when a federal candidate's name matches more than one plausible FEC filing (e.g., two similarly-named candidates, or a common name)? The funding section is omitted for that candidate (FR-005), the same as if no match had been found at all.
- What happens when a federal candidate has just entered the race and has no FEC filings yet? Totals are treated the same as "no confident match" — the section is omitted, not shown as zero.
- What happens when a candidate ran in a past cycle under one committee and the current cycle under another? Only the current election cycle's filing is shown.
- What happens for a federal candidate running as a write-in or minor-party candidate with minimal filings? Same as any other federal candidate — shown if a confident match with data exists, omitted otherwise.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display total raised, total spent, and cash on hand for candidates running for President, U.S. Senate, or U.S. House, wherever candidate details are already shown.
- **FR-002**: System MUST NOT display any campaign-finance section, placeholder, or error for candidates running for state or local office.
- **FR-003**: System MUST attempt to match each federal candidate to their public campaign-finance filing using available identifying details (name, state, and office sought).
- **FR-004**: When a federal candidate cannot be confidently matched to a filing, the system MUST omit the funding section for that candidate rather than showing incomplete, zero, or potentially incorrect figures.
- **FR-005**: When more than one filing plausibly matches a federal candidate (an ambiguous match), the system MUST treat this the same as no match (per FR-004) and omit the funding section entirely for that candidate, rather than showing data that risks being attributed to the wrong person.
- **FR-006**: System MUST display a short list of a federal candidate's top contributors when that data is available from the matched filing.
- **FR-007**: System MUST continue to render the rest of a candidate/contest page normally if the funding data source is unavailable, rate-limited, or times out — the page as a whole must not fail or block on funding data.
- **FR-008**: System MUST show funding figures for the current two-year federal election cycle only, not stale figures from a prior cycle for the same candidate.
- **FR-009**: System MUST indicate to the voter how current the displayed funding figures are (e.g., a reporting/as-of date), so figures are not mistaken for real-time totals.

### Key Entities

- **Campaign Finance Summary**: The funding picture for one federal candidate in the current election cycle — total raised, total spent, cash on hand, an as-of/reporting date, and (when available) a short list of top contributors.
- **Candidate Match**: The link between a candidate as shown in this app and their corresponding public campaign-finance filing, along with whether that link was confidently resolved (used to decide whether a Campaign Finance Summary is shown at all, per FR-004/FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter viewing any federal candidate's page can see that candidate's funding totals without navigating away or taking any extra action, when a confident match exists.
- **SC-002**: At least 90% of federal candidates shown in the app have a confidently-matched funding summary displayed (measured against candidates who have actually filed with the public campaign-finance system).
- **SC-003**: Zero instances of one candidate's funding data being shown attributed to a different candidate.
- **SC-004**: 100% of state and local candidate pages show no funding section, in a spot check across all three currently-scraped states plus a sample of Civic-API-sourced state/local races.
- **SC-005**: Adding funding data does not add more than one second of noticeable delay to loading a candidate or contest detail page.

## Assumptions

- Scope is limited to federal races (President, U.S. Senate, U.S. House); state and local candidates are explicitly out of scope, per the source ticket.
- The public campaign-finance data source used has a free tier sufficient for this app's expected traffic (no paid data license is required for launch).
- Top contributors defaults to a short list (5) of the candidate's largest identifiable contributors/contributing organizations; the exact count is a display detail, not a scope boundary.
- Matching a candidate to their filing by name + state + office is a reasonable starting approach; refining this matching logic is expected to need its own validation spike before full rollout, per the source ticket.
- "Current election cycle" means the two-year federal cycle the candidate's race belongs to, consistent with how the public campaign-finance system organizes filings.
