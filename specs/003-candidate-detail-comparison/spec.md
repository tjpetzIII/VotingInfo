# Feature Specification: Candidate Detail & Comparison

**Feature Branch**: `003-candidate-detail-comparison`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Look at the linear ticket VOT-18" — Linear VOT-18 "Candidate detail & comparison": Build a side-by-side candidate comparison view for a specific ballot contest, showing all available candidate info (bio links, social media icons, contact info). Acceptance criteria: side-by-side layout on desktop / stacked on mobile; social media icons (Twitter/X, Facebook, YouTube) link to candidate channels; "Back to ballot" breadcrumb navigation; a share button that copies a URL with the address pre-filled.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare candidates for a contest (Priority: P1)

A voter has looked up their sample ballot for their address and wants to see full details on every candidate in one specific race, side by side, so they can decide who to vote for.

**Why this priority**: This is the core value of the feature — without it there is no candidate detail/comparison view at all.

**Independent Test**: From the sample ballot page, select a contest and confirm all of its candidates render together with full available details (photo, party, bio link, social channels, contact info) in a single comparable view.

**Acceptance Scenarios**:

1. **Given** a voter is viewing their sample ballot for an address, **When** they select a specific contest, **Then** they see a dedicated page listing every candidate in that contest with all available details (bio link, photo, party, phone, email, social channels).
2. **Given** the candidate detail page is viewed on a desktop-width screen, **When** the page renders, **Then** candidates are displayed side by side in columns for easy comparison.
3. **Given** the candidate detail page is viewed on a mobile-width screen, **When** the page renders, **Then** candidates are stacked vertically in a single column.
4. **Given** a candidate has one or more social media channels, **When** the page renders that candidate's card, **Then** an icon/link is shown per channel (Twitter/X, Facebook, YouTube) that opens the candidate's channel.

---

### User Story 2 - Return to the full ballot (Priority: P2)

A voter viewing one contest's candidate comparison wants to get back to the full sample ballot without losing their place or re-entering their address.

**Why this priority**: Necessary for usable navigation, but the page still delivers value as a standalone comparison view even before this is added.

**Independent Test**: From the candidate detail page, click the "Back to ballot" link and confirm it returns to the sample ballot for the same address.

**Acceptance Scenarios**:

1. **Given** a voter is on a contest's candidate detail page, **When** they view the page, **Then** a "Back to ballot" breadcrumb is visible near the top.
2. **Given** a voter clicks "Back to ballot", **When** the navigation completes, **Then** they land on the sample ballot page pre-filled with the same address they came from.

---

### User Story 3 - Share a contest's candidate comparison (Priority: P3)

A voter wants to send this specific contest's candidate comparison to a friend or family member at the same address so they can review the same candidates.

**Why this priority**: Adds reach/virality but is not required for an individual voter to get value from the comparison view itself.

**Independent Test**: Click the share button and confirm a URL is copied that, when opened, loads the same contest's candidate comparison with the address already filled in.

**Acceptance Scenarios**:

1. **Given** a voter is on a contest's candidate detail page reached via an address lookup, **When** they click the share button, **Then** a URL for that exact contest and address is copied to their clipboard.
2. **Given** someone opens a copied share URL, **When** the page loads, **Then** it shows the same contest's candidate comparison with the address already applied (no re-entry required).
3. **Given** the share action completes, **When** the copy succeeds, **Then** the voter sees a brief confirmation (e.g. "Link copied").

---

### Edge Cases

- What happens when a contest has only one candidate? The page still renders (single column/card), just without a meaningful "side by side" comparison.
- What happens when a contest has no candidates at all? The page shows a clear "no candidates available" message instead of an empty grid.
- What happens when a candidate is missing some fields (no photo, no bio link, no social channels, no contact info)? Only the fields that are present are shown; missing fields are omitted rather than shown as empty/placeholder.
- What happens when the contest referenced by the URL no longer exists for the given address (e.g. stale share link, contest id not found)? The voter sees a "contest not found" message with a way to get back to the full ballot.
- What happens when the clipboard copy fails (e.g. browser permission denied)? The voter sees an error/fallback (e.g. the URL is shown so it can be copied manually) instead of a silent failure.
- What happens when the share URL is opened without ever having looked up an address? The page has no address to pre-fill from the URL's own address parameter, so it uses the address encoded in the URL itself.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated page that shows every candidate for one specific contest from a voter's sample ballot.
- **FR-002**: System MUST display, for each candidate, all available details already surfaced elsewhere in the product: name, party, photo, bio/website link, phone, email, and social media channels.
- **FR-003**: System MUST lay candidates out side by side (columns) on desktop-width viewports and stacked (single column) on mobile-width viewports.
- **FR-004**: System MUST render a clickable icon for each of a candidate's social media channels among Twitter/X, Facebook, and YouTube, linking to that candidate's channel.
- **FR-005**: System MUST show a "Back to ballot" breadcrumb/link on the page that returns the voter to the full sample ballot for the same address.
- **FR-006**: System MUST provide a share action that copies a URL identifying both the specific contest and the voter's address, such that opening that URL shows the same contest's candidate comparison with the address pre-filled.
- **FR-007**: System MUST give the voter a visible confirmation when the share URL is successfully copied, and a fallback when the copy action fails.
- **FR-008**: System MUST show a clear empty-state message when a contest has no candidates, rather than an empty comparison view.
- **FR-009**: System MUST show a clear not-found message, with a path back to the full ballot, when the requested contest cannot be located for the given address.
- **FR-010**: System MUST omit any candidate detail field that has no data, rather than displaying it as empty or as a placeholder.

### Key Entities

- **Contest**: A single race on the ballot (e.g. office and district) containing one or more candidates; identified uniquely enough to be referenced by a shareable URL for a given address.
- **Candidate**: A person running in a contest; attributes include name, party, photo, bio/website link, phone, email, and a set of social media channels.
- **Social Channel**: A named platform (Twitter/X, Facebook, YouTube) plus the candidate's identifier/handle on that platform, used to build a link to their profile.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter can go from the sample ballot to a full side-by-side comparison of a contest's candidates in one interaction (a single click/tap).
- **SC-002**: 100% of candidate detail fields present in the underlying data (bio link, photo, contact info, social channels) are visible on the comparison page without additional navigation.
- **SC-003**: A voter can return to their full sample ballot from any candidate comparison page in one interaction, without re-entering their address.
- **SC-004**: A voter can generate a shareable link to a specific contest's comparison in one interaction, and a recipient opening that link sees the identical contest and address with zero manual re-entry.
- **SC-005**: The comparison view is fully readable (no horizontal scrolling or overlapping content) on both common desktop widths and common mobile widths.

## Assumptions

- This feature reuses the existing sample-ballot data (the same candidate fields already returned for the ballot: name, party, bio link, photo, phone, email, social channels) rather than introducing new candidate data.
- "Side-by-side" applies per contest — i.e., the candidates within one selected contest are compared next to each other; this feature does not introduce comparison across multiple different contests at once.
- The share link encodes the address and the contest so the destination page can render without the recipient needing to have looked up their own address first.
- Contact info (phone/email) display follows the same voter-initiated disclosure pattern already used elsewhere in the product, rather than always being shown expanded by default.
- "Mobile" and "desktop" breakpoints follow the responsive breakpoints already established across the rest of the site (e.g. existing Tailwind `md:` usage in ballot/contest pages).
