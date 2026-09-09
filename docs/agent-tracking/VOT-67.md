---
tags: [voteready, agent-task]
issue: VOT-67
status: reviewed-integrated
---
# VOT-67: Mail ballot journey

Created Spec Kit artifacts in `specs/067-vot-67/`. Added a typed registry for 50 states plus DC, explicit local locator status, review date, safe external links, and a bilingual `/mail-ballot` journey. The UI does not collect credentials, ballot identifiers, or personal status and does not claim acceptance/counting. Dates and voter-info now link to the journey.

Validation: `git diff --check` passes. Frontend journey uses static official-resource fixtures and local-only progress state; full frontend gates run in the parent integration worktree.
