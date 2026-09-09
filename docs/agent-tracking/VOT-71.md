---
tags: [voteready, agent-task]
issue: VOT-71
status: reviewed-integrated
---
# VOT-71: Calendar export

Created Spec Kit artifacts under `specs/071-vot-71/`. Added pure RFC5545 serializer with CRLF output, escaping, folding, stable UIDs, all-day exclusive next-day boundaries, and exclusion of unknown actions. `/dates` now offers local selected-date export and snapshot disclaimer with bilingual copy. No address, account, or external app links are embedded.

Validation: `git diff --check` passes. RFC5545 serializer tests cover CRLF, escaping, folding, stable IDs, all-day boundaries, and unknown cutoffs; full frontend gates run in the parent integration worktree.
