# Feature Specification: Election Type Explainer

**Feature Branch**: `007-election-type-explainer`

**Created**: 2026-08-05

**Status**: Draft

**Input**: User description: "VOT-20: Election type explainer — Add a small contextual tooltip or info banner on the ballot page explaining what type of election this is (primary, general, special, runoff) and what that means for voting rules. Acceptance criteria: shown at top of ballot page; plain-language copy (no jargon); dismissible/collapsible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand what kind of election this is (Priority: P1)

A voter viewing their sample ballot wants to quickly understand what type of election this is (primary, general, special, or runoff) and what that means for how they can vote, without having to look it up elsewhere.

**Why this priority**: This is the entire point of the feature. Without a plain-language explanation of the election type, voters may misunderstand who's eligible to vote or what the ballot represents (e.g., mistaking a primary for a general election).

**Independent Test**: Can be fully tested by loading the ballot page for an election of each type (primary, general, special, runoff) and confirming the banner at the top states the correct type and gives a plain-language explanation of what that type means for voting, delivering immediate context on its own.

**Acceptance Scenarios**:

1. **Given** a voter loads the ballot page for a general election, **When** the page renders, **Then** a banner appears at the top of the page identifying it as a general election and explaining, in plain language, that all registered voters can vote for any candidate on the ballot.
2. **Given** a voter loads the ballot page for a primary election, **When** the page renders, **Then** the banner identifies it as a primary election and explains, in plain language, what that means for who can vote and how candidates are chosen.
3. **Given** a voter loads the ballot page for a special election, **When** the page renders, **Then** the banner identifies it as a special election and explains, in plain language, that it's being held outside the normal election cycle (e.g., to fill a vacancy).
4. **Given** a voter loads the ballot page for a runoff election, **When** the page renders, **Then** the banner identifies it as a runoff election and explains, in plain language, that it's a follow-up vote between top finishers from an earlier election.
5. **Given** the election's type cannot be confidently determined from the available election information, **When** the ballot page renders, **Then** the banner shows a neutral, still-useful explanation of what a sample ballot represents instead of guessing incorrectly or leaving a blank message.
6. **Given** the banner's explanation text, **When** a voter reads it, **Then** it contains no unexplained jargon (e.g., terms like "closed primary" are either avoided or explained in plain terms within the same sentence).

---

### User Story 2 - Collapse the explainer once it's no longer needed (Priority: P2)

A voter who has already read the explanation, or who wants to focus on the ballot itself, wants to shrink the banner out of the way without losing the ability to bring it back or losing access to the ballot content below it.

**Why this priority**: This is a usability refinement on top of the core explanation — valuable so the banner doesn't become a permanent obstruction, but the feature still delivers its core value (User Story 1) without it.

**Independent Test**: Can be fully tested by loading the ballot page, collapsing the banner, and confirming it shrinks to a compact state while the rest of the page (contests, candidates) remains fully visible and usable, then confirming it can be expanded again.

**Acceptance Scenarios**:

1. **Given** the banner is shown in its expanded state, **When** the voter activates its collapse control, **Then** the banner shrinks to a compact state and the rest of the ballot page content remains fully visible and unaffected.
2. **Given** the banner is collapsed, **When** the voter activates it again, **Then** the banner expands and shows the full explanation again.
3. **Given** the voter has collapsed the banner, **When** they change their address and the page now shows a different election, **Then** the banner returns to its expanded state so the voter sees the explanation relevant to the new election.

---

### Edge Cases

- What happens when the ballot page hasn't finished loading election data yet? The banner does not render (or shows no election-specific claim) until the election is known, so it never displays a guess before data arrives.
- What happens when the election's name doesn't clearly match any of the four known types (e.g., an unusual or municipal-specific election name)? The banner falls back to a generic, still-accurate explanation of what a sample ballot is, rather than mislabeling the election.
- What happens when a voter changes their address mid-visit and the new address maps to a different election with a different type? The banner updates to describe the new election's type and resets to its expanded state.
- What happens on narrow/mobile screens? The banner remains fully readable and its collapse control remains reachable without pushing ballot content out of view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an informational banner at the top of the ballot page, above the list of contests, once an election has loaded for the voter's address.
- **FR-002**: Banner MUST state which of the four known election types (primary, general, special, runoff) applies to the currently displayed election.
- **FR-003**: Banner MUST include a short, plain-language explanation of what that election type means for the voter (e.g., who is eligible to vote, what the outcome determines), avoiding unexplained technical or legal jargon.
- **FR-004**: System MUST provide a distinct explanation for each of the four known election types.
- **FR-005**: When the election's type cannot be confidently determined from available election information, system MUST show a neutral, generic explanation of what a sample ballot represents rather than an incorrect type label or a blank banner.
- **FR-006**: Users MUST be able to collapse the banner to a compact state and expand it again during the same page visit.
- **FR-007**: Banner MUST reset to its expanded state whenever the displayed election changes (e.g., due to an address change).
- **FR-008**: Banner MUST NOT block, delay, or obscure a voter's access to the contests and candidates below it — it is supplementary context, not a gate the voter must dismiss to proceed.
- **FR-009**: Banner copy MUST be presented in the voter's currently selected display language, consistent with the rest of the ballot page.

### Key Entities

- **Election Type Explanation**: A plain-language description of what an election type means for voting, keyed to one of the four known categories (primary, general, special, runoff) plus a generic fallback used when the type is unknown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The election type explanation is visible without scrolling as soon as the ballot page finishes loading, for every election type.
- **SC-002**: In usability review, at least 90% of voters can correctly restate one voting-rule implication of the shown election type after reading the banner (e.g., "in a primary I can only vote in my party's contests").
- **SC-003**: Voters can collapse the banner in a single interaction, and expand it again in a single interaction.
- **SC-004**: The banner never states an election type that contradicts the election actually shown on the same page.

## Assumptions

- The system does not currently store an explicit "election type" field separate from the election's name; election type is inferred from the election information already available (e.g., its name), since the ticket does not describe a new data source for this.
- When the election type can't be confidently inferred, showing a generic but accurate explanation is preferable to guessing or omitting the banner entirely.
- Collapsing the banner is a per-visit UI state (it does not need to persist across page reloads or future visits) and resets to expanded when the underlying election changes, since the ticket's acceptance criteria describe dismiss/collapse behavior but not persistence.
- The four election types named in the ticket (primary, general, special, runoff) cover the vast majority of elections voters will see; any other or ambiguous type uses the generic fallback explanation rather than requiring a new category per election name variant.
