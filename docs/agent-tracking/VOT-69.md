---
tags: [voteready, agent-task]
issue: VOT-69
status: implementing
---
# VOT-69: Private voting data by default

## Assignment

Agent: vot_28
Worktree: /private/tmp/voteready-vot-69
Branch: codex/vot-69
Spec directory: specs/069-vot-69

## Evidence and handoff

- Spec Kit artifacts were created before implementation.
- Address state now defaults to session storage; durable storage is explicit opt-in compatible with
  legacy local storage entries.
- Clear voting data removes address and election state, clears React Query, and broadcasts an event.
- English/Spanish accessible clear-data labels and deployment privacy guidance were added.
- Share URL construction is centralized: address is removed by default and included only via an
  explicit accessible checkbox; clipboard failure retains a manual-copy fallback.
