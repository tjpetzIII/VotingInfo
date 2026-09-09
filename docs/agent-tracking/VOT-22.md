---
tags: [voteready, agent-task]
issue: VOT-22
status: implementing
---
# VOT-22: Reminder signup

Created Spec Kit artifacts and implemented a reusable bilingual, accessible, explicit-consent reminder form plus typed subscribe boundary. It submits only normalized address context and email after validation; the inherited VOT-21 no-send provider prevents outbound mail in tests. Confirmation/unsubscribe delivery remains provider-owned.

Validation: `git diff --check` passes; frontend dependency checks require the parent install.
