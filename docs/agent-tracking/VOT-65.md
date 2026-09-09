---
tags: [voteready, agent-task]
issue: VOT-65
status: reviewed-integrated
---
# VOT-65: Preserve deadline method, cutoff time, timezone, and election applicability

## Evidence and handoff

Spec Kit artifacts created in `specs/065-vot-65/`. Added backward-compatible typed deadline records, category-derived method/action semantics, deterministic date arithmetic, and optional frontend fields. Date-only records retain unknown cutoff/timezone and `/dates` displays conservative guidance plus source wording. Backend library compilation and focused model/date tests passed; restricted wiremock tests could not bind ports (`Operation not permitted`). Scraper prose migration remains conservative until source schemas expose structured cutoff/timezone fields.
