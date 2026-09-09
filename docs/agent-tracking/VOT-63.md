---
tags: [voteready, agent-task]
issue: VOT-63
status: reviewed-integrated
---
# VOT-63: Show early-voting sites, ballot drop-off locations, and mail-only precinct guidance

## Evidence and handoff

2026-09-09: Created Spec Kit specification, plan, research, data-model, quickstart, and tasks artifacts in `specs/063-vot-63/`. Implemented additive backend mappings for Election Day, early voting, and ballot drop-off categories, including dates, hours, notes, services, coordinates, mail-only flag, and official finder URL. Existing polling fields remain present.

Frontend polling now provides keyboard-accessible category filters, category labels, dates/notes/services, supplied-coordinate map markers, mail-only guidance, and official finder links for empty categories. Client-side external geocoding was removed because backend geocoding is authoritative and preserves failed records in cards.

Validation: backend `cargo check --lib` passed and focused frontend polling tests cover saved-address rendering, category filtering, mail-only guidance, and official finder empty states. Full frontend gates require the repository dependency install; existing sandbox socket restrictions affect a subset of wiremock tests.
