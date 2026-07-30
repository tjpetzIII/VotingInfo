# Feature Specification: Single Shared Address Entry

**Feature Branch**: `004-shared-address-context`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "The linear ticket vot-57"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter address once, reuse everywhere (Priority: P1)

A voter enters their home address on one page (for example, to check their polling location) and then navigates to another page that also needs an address (for example, to see their sample ballot or election dates). Instead of being asked to type the address again, that page automatically shows results for the address already entered.

**Why this priority**: This is the entire value of the feature — eliminating repeated address entry is the problem statement. Without this, the other stories have nothing to build on.

**Independent Test**: Enter a valid address on the polling-location page, then navigate directly to the ballot page. The ballot page shows results for that address without displaying an empty form first.

**Acceptance Scenarios**:

1. **Given** no address has been entered yet, **When** a user visits any address-driven page, **Then** they see the existing empty address entry form, unchanged from current behavior.
2. **Given** a user has already entered a valid address on one address-driven page, **When** they navigate to a different address-driven page, **Then** that page automatically fetches and displays results for the previously entered address without requiring re-entry.
3. **Given** a user has already entered a valid address, **When** they navigate between any of the seven address-driven pages in any order, **Then** every page consistently uses that same address.

---

### User Story 2 - Change the address from any page (Priority: P2)

A voter who has already entered an address (for example, because they moved, or made a typo) wants to update it. They can do this from whichever address-driven page they're currently on, and the update applies everywhere, not just that page.

**Why this priority**: Without an easy way to correct or update the address, a wrong first entry would "stick" across every page with no way out short of clearing browser data — that would make the feature actively worse than the current per-page-entry behavior.

**Independent Test**: With a saved address already in place, open the "Change" control on any address-driven page, submit a different valid address, then visit a second address-driven page and confirm it now reflects the new address.

**Acceptance Scenarios**:

1. **Given** a saved address is in use on a page, **When** the user views that page, **Then** a visible control (e.g. "Using: {address} · Change") indicates the address currently in use and offers a way to change it.
2. **Given** the user opens the change control, **Then** the address entry form reopens pre-filled with the previously entered values.
3. **Given** the user submits a new, valid address from the change control on any page, **When** they then visit a different address-driven page, **Then** that page shows results for the newly entered address, not the old one.
4. **Given** the user submits an invalid address (fails existing validation), **When** they view the inline error, **Then** the error behaves exactly as it does today and the previously saved address remains in effect until a valid replacement is submitted.

---

### User Story 3 - Address survives page reload (Priority: P3)

A voter enters their address, closes the tab or reloads the browser, and returns to the app later. Their previously entered address is still there — they don't have to enter it again just because the page refreshed.

**Why this priority**: This extends the convenience of Story 1 across sessions, not just across in-app navigation. It's valuable but the app is still usable without it (the user would just re-enter the address once per session), so it ranks below the core cross-page reuse behavior.

**Independent Test**: Enter a valid address, fully reload the browser tab (or reopen it), and confirm the previously entered address is still in use without re-entering it.

**Acceptance Scenarios**:

1. **Given** a user has entered an address, **When** they fully reload the page, **Then** the address-driven page they land on still uses the previously entered address.
2. **Given** a user has entered an address in a previous browser session, **When** they return to the app later, **Then** the saved address is still available for use.

---

### Edge Cases

- What happens when no address has ever been saved? The page shows today's empty address entry form — no change from current behavior.
- What happens when the saved address is stale or no longer valid (e.g., the address no longer resolves, or the underlying data source has no results for it)? The page attempts to use it and surfaces the existing not-found/error state, with the change control still available to enter a different address.
- What happens if the browser cannot persist data (e.g., storage is disabled or full)? The app degrades to the current per-page, non-persisted behavior rather than failing to load; nothing is silently lost or corrupted.
- What happens if saved address data is unreadable or corrupted? The app treats it the same as no saved address, rather than erroring.
- What happens with multiple browser tabs open to different pages at once? Each page reads the shared address when it loads; a change made in one tab is not required to instantly update an already-open, unrefreshed tab.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST share a single entered address across all address-driven pages (voter info, elections search, election contest detail, sample ballot, ballot contest detail, polling locations, and election dates) so it does not need to be re-entered when moving between them.
- **FR-002**: When a shared address is already set, each address-driven page MUST automatically use it to fetch and display results, rather than first presenting an empty form.
- **FR-003**: Each address-driven page MUST display a visible indicator of the address currently in use, along with a control to change it.
- **FR-004**: Submitting a new, valid address from any address-driven page MUST update the shared address such that every other address-driven page uses the new value going forward.
- **FR-005**: The shared address MUST persist across a full page reload or a new browser session, not only across in-app navigation.
- **FR-006**: The system MUST retain only the single most recently entered address; it MUST NOT retain a history of multiple previously entered addresses.
- **FR-007**: Existing per-page address validation and inline error messaging MUST remain unchanged for users entering or editing an address.
- **FR-008**: The change control MUST reopen the address entry form pre-filled with the currently saved address values, so the user can edit rather than retype from scratch.
- **FR-009**: If no address has ever been entered, or previously saved address data cannot be read, each address-driven page MUST fall back to its current empty-form behavior rather than erroring.

### Key Entities

- **Saved Address**: The single most-recently-entered address (street, city, state, zip) shared across all address-driven pages. Exactly one may exist at a time; entering a new one replaces it entirely rather than adding to a list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who enters their address once can visit all seven address-driven pages and see address-specific results on each, without re-entering the address more than the one time.
- **SC-002**: 100% of address-driven pages show a visible, working control for viewing and changing the currently used address.
- **SC-003**: A user who reloads the browser after entering an address sees their previous address's results on first load, with no re-prompt, in at least 95% of cases (allowing for edge cases like disabled storage).
- **SC-004**: Changing the address on any single page is reflected on every other address-driven page the next time it is viewed — no page continues to show results for a stale, previously-entered address.
- **SC-005**: Time spent re-typing an address when moving between address-driven pages during a single visit is reduced to zero after the first entry.

## Assumptions

- Persistence is scoped to a single browser on a single device (matching the existing `LocaleContext` persistence pattern already used for language selection); syncing an address across devices or user accounts is out of scope.
- No real-time synchronization is required between multiple simultaneously open tabs — each page/tab picks up the shared address when it loads or navigates, not via a live cross-tab push update.
- URL-based address sharing (`?address=` deep links) is explicitly out of scope for this feature and is tracked separately (VOT-25); it may later be layered on top of this shared address as an additional source.
- Supporting multiple saved addresses or an address book/history is explicitly out of scope, consistent with the original scope referenced from VOT-7.
- This feature is frontend-only; no backend or API contract changes are required, since every affected page already calls existing address-driven endpoints.
