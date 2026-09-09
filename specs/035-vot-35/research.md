# Research: VOT-35 ws dependency audit

## Decision

Keep `frontend/package.json` and `frontend/yarn.lock` unchanged. The active lock has no `ws` package record. Its locked Supabase realtime graph is `@supabase/realtime-js@2.111.0` → `@supabase/phoenix@0.4.5` + `tslib@2.8.1`; it does not depend on `ws`.

## Evidence reviewed

- `frontend/package.json` declares `@supabase/supabase-js ^2.111.0` and `@supabase/ssr ^0.12.4`; it has no direct `ws` dependency or resolution.
- `frontend/yarn.lock` resolves Supabase packages at 2.111.0 and contains no `ws@` selector.
- Historical Dependabot commit `ec217d0` upgraded the former indirect `ws` entry from 8.20.0 to 8.21.1. The active history later replaced that dependency graph during Supabase updates.
- Available local and origin Dependabot branches include grouped npm updates but no separate current `ws` branch.

## Rationale

Adding a direct `ws` dependency or a Yarn resolution would introduce an unused package and unnecessary lock churn. The security floor is satisfied by verified absence from the active graph, and the last historical resolution already exceeded 8.21.0.

## Validation limitation

The frozen install was attempted with Yarn 1.22.22 and `--ignore-engines` because the host is Node 25.6.1 while CI uses Node 24. Yarn could not resolve packages because `registry.yarnpkg.com` was unavailable (`ENOTFOUND`). The lock digest was inspected before the attempt; no lockfile mutation was observed. Installed-package and frontend gate checks remain unavailable because this checkout started without `node_modules`.
