# VOT-63: Voting location categories

## User Story 1 (P1)
As a voter, I can distinguish Election Day, early voting, and ballot drop-off sites, with their official hours, dates, notes, services, and map coordinates.

Acceptance: each Civic category maps into typed project models; one address may appear in multiple categories without losing fields; mail-only precincts are explained; missing category data links to the official finder; supplied coordinates are preferred and missing coordinates are geocoded through the existing backend service.

## Requirements
- FR-001 Map `pollingLocations`, `earlyVoteSites`, and `dropOffLocations` into project-owned typed fields, preserving location metadata and compatibility.
- FR-002 Render accessible category filters, cards, and map markers on `/polling`, including mail-only and category-specific empty states.
- FR-003 Use supplied coordinates first and existing paced geocoding only when absent; preserve records on failures.
- FR-004 Add deterministic backend/frontend tests and keep all quality gates passing.

## Edge cases
Missing fields, mixed services at one address, missing coordinates, failed geocoding, and an upstream `mailOnly` response must remain distinguishable.
