---
tags: [voteready, agent-task]
issue: VOT-35
status: complete
---
# VOT-35: ws dependency audit

## Assignment

Agent: /root/vot_35
Worktree: `/private/tmp/voteready-vot-35`
Branch: `codex/vot-35`
Spec directory: `specs/035-vot-35`

## Evidence and handoff

- `frontend/package.json` declares `@supabase/supabase-js ^2.111.0` and `@supabase/ssr ^0.12.4`; it has no direct `ws` dependency or `resolutions.ws` policy.
- `frontend/yarn.lock` contains no `ws@` selector. The locked `@supabase/realtime-js@2.111.0` package depends only on `@supabase/phoenix 0.4.5` and `tslib 2.8.1`, so `ws` is verified non-applicable to the current graph.
- Historical Dependabot commit `ec217d0` upgraded the former indirect `ws` resolution from 8.20.0 to 8.21.1. No current standalone ws Dependabot branch is present locally or on origin.
- No manifest or lockfile change is necessary; no unrelated upgrade was introduced.

## Validation

- Lockfile digest before the frozen-install attempt: `d08e551218a75785688f500217e15ad68bb150351d9d5a5a91422fa24a818854`.
- `yarn install --frozen-lockfile --ignore-engines` was attempted because the host is Node 25.6.1; it failed at package fetching with `getaddrinfo ENOTFOUND registry.yarnpkg.com`. No lockfile mutation was observed.
- Installed-package inspection and frontend lint/type/test/build were unavailable because this checkout had no `node_modules` and the registry was unreachable. CI's Node 24 environment should rerun the frozen install and gates.

## Requirement mapping

- FR-001/FR-002: manifest, lock, and complete locked Supabase realtime records show no active `ws` package; historical `ws` was 8.21.1.
- FR-003: Dependabot history/branch inspection found the prior ws update and no current ws-specific branch; no unrelated updates made.
- FR-004: frozen install attempted; digest and network failure recorded above.
- FR-005: no-change outcome and host/network limitations recorded above.
