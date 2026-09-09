---
tags: [voteready, agent-task]
issue: VOT-62
status: reviewed-integrated
---
# VOT-62: Select an election and keep ballot, polling, and deadlines in sync

[Linear](https://linear.app/votinginfo/issue/VOT-62/select-an-election-and-keep-ballot-polling-and-deadlines-in-sync) · [[Backlog delivery]]

## Assignment

Agent: vot_62_retry (parent review and completion)
Worktree: /private/tmp/voteready-vot-62
Branch: codex/vot-62
Spec directory: specs/062-vot-62

## Ticket requirements

## Problem and evidence

A voter cannot choose which election their address lookup targets. AddressQuery and CivicApiClient::fetch_raw accept only address; caches also use address alone. This can produce irrelevant or apparently empty results when several elections apply.

Research checked 2026-09-09: [Google's voterInfoQuery reference](<https://developers.google.com/civic-information/docs/v2/elections/voterInfoQuery>) documents electionId and otherElections, including disambiguation when multiple elections share a date.

## Scope and acceptance criteria

* Add optional election_id to address-based API queries and a typed list of applicable election choices in the discovery response. Preserve existing behavior when omitted and only one election applies.
* Show an accessible election chooser when multiple options apply, including election name and date. Do not treat the nationwide all-elections list as proof an election applies to an address. Require selection for ambiguous same-day results.
* Persist selected election in shared session context and support an electionId URL parameter. Ballot, contest detail, polling, voter-info and dates must show the same election. Reset/revalidate selection when address changes.
* Include address and election ID in every affected backend cache and frontend query key. Late responses from a previous selection cannot overwrite current results. Reject invalid IDs through a stable project error.
* Scope scraped deadlines to the selected election; unavailable or unverifiable matching data must not be silently replaced by the nearest different election. Never silently change a selected election on upstream error.
* Cover zero, one, and multiple elections, explicit unavailable IDs, same-day ambiguity, address changes, and keyboard selection.

## Implementation and validation

Start in backend/src/routes/elections.rs, services/civic_api.rs, services/election_dates.rs, models/mod.rs; frontend/src/lib/api.ts and shared contexts. Use wiremock to assert forwarding and cache isolation for two elections at one address; frontend tests must switch elections while requests resolve out of order.

## Backlog boundary

Extends completed <issue id="833e6c65-bc06-497b-81e0-527b1d751d16" href="https://linear.app/votinginfo/issue/VOT-16/contests-and-candidates-api-route">VOT-16</issue>/17/57. Coordinate URL semantics with <issue id="045c7c8f-6d42-491c-b066-0b97b91ebbd2" href="https://linear.app/votinginfo/issue/VOT-25/deep-linkable-address-urls">VOT-25</issue>; this ticket owns election context, while <issue id="045c7c8f-6d42-491c-b066-0b97b91ebbd2" href="https://linear.app/votinginfo/issue/VOT-25/deep-linkable-address-urls">VOT-25</issue> owns general address deep-link support. No candidate recommendations or inferred party membership.

## Delivery requirements

Before implementing, follow docs/SPEC_KIT.md for the feature spec, plan, and tasks. Follow .specify/memory/constitution.md: independent service toolchains; typed upstream mapping; existing CORS, rate limits, and cache guarantees; shared frontend shell and react-query conventions; English and Spanish UI text. Use deterministic fixtures and mocked upstreams, with no live services or secrets in tests. Run applicable frontend lint, type-check, Vitest and production build; backend fmt, tests and clippy. Record UX checks and screenshots for UI changes in the PR.

## Evidence and handoff

Completed Spec Kit artifacts and implementation committed as `bfd9691` and integrated as `e3b6842` on `codex/backlog-integration`. Parent review added actionable empty discovery on upstream 404, deterministic wiremock coverage for discovery/ambiguity/forwarding, strict selected-election name/date matching, stale-response guards on imperative pages, and chooser/API tests.

Validation: backend `cargo test --locked --lib` (70 passed), focused integration discovery/forwarding tests passed; frontend `yarn lint`, `tsc --noEmit`, `vitest run` (36 files, 139 tests), and production `yarn build` passed. UI states are covered by `ElectionChooser.test.tsx`; build used an in-worktree dependency copy because Next rejects external symlinked node_modules. Generated build-info and dependencies are excluded from the commit.
