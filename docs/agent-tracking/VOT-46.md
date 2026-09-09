---
tags: [voteready, agent-task]
issue: VOT-46
status: queued
---
# VOT-46: [Deps] zod 3.25 → 4.x major upgrade

[Linear](https://linear.app/votinginfo/issue/VOT-46/deps-zod-325-4x-major-upgrade) · [[Backlog delivery]]

## Assignment

Agent: pending
Worktree: /private/tmp/voteready-vot-46
Branch: codex/vot-46
Spec directory: specs/046-vot-46

## Ticket requirements

`zod` is declared as `^3` in `frontend/package.json` (locked 3.25.76); latest is 4.4.3. Used in `src/app/login/page.tsx` (with `@hookform/resolvers`) for form validation.

Zod v4 is a rewrite with breaking changes: error customization API (`.error`/`issues` shape), some `.parse`/`.safeParse` behavior changes, and a bundle-split entrypoint structure (`zod` vs `zod/v4` during the transition period). Should be upgraded in lockstep with `@hookform/resolvers` (see that ticket) since the resolver package's Zod-adapter major versions track Zod's majors.

Not urgent — no security driver, login form validation currently works fine on v3.

Source: npm registry currency check against `frontend/package.json`/`yarn.lock`.

## Evidence and handoff

Pending specification, plan, tasks, implementation, checks and parent review.

