# Research: VOT-34 sharp security baseline

## Decision

Keep the existing frontend manifest and lockfile unchanged. The current `frontend/package.json` contains `resolutions.sharp: ^0.35.3`, and `frontend/yarn.lock` resolves `sharp` to 0.35.3. All listed `@img/sharp-*` platform packages also resolve to 0.35.3; the associated libvips packages resolve to 1.3.2.

## Evidence reviewed

- `origin/main` and the current branch both contain the same sharp resolution. The existing history shows commit `db6c652` added the project-wide sharp resolution specifically to address the Next.js transitive range and Dependabot alerts.
- Next.js 16.2.12 requests `sharp ^0.34.5` transitively, while Yarn's resolution selector combines it with the project's `sharp ^0.35.3` override into the single locked 0.35.3 package.
- No separate sharp-specific Dependabot branch is present among the available local or origin branches; the prior grouped npm update branches were inspected for context.

## Rationale

The requested floor is already exceeded by the resolved package. Refreshing the lock would add churn without improving the security posture and could alter unrelated transitive packages.

## Alternatives considered

- Upgrade sharp to a newer release: rejected because the current 0.35.3 resolution already satisfies the stated floor and no newer version is required by the ticket.
- Add sharp as a direct runtime dependency: rejected because Next.js owns the runtime integration and the existing Yarn resolution already enforces the whole graph.
- Change the lockfile manually: rejected because there is no stale vulnerable resolution to correct.
