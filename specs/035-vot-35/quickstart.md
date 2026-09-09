# Validation: VOT-35

Run from `frontend/` with Node 24 and Yarn Classic.

1. Record `sha256sum yarn.lock`, run `yarn install --frozen-lockfile`, and record the digest again. If the host engine blocks installation, repeat only with `--ignore-engines` and record that fact.
2. Inspect `package.json` and all `ws@` records in `yarn.lock`; every resolved version must be at least 8.21.0, or the absence of `ws` must be explained by the locked Supabase graph.
3. Run `yarn lint`, `npx tsc --noEmit`, `yarn test`, and `yarn build` when installation succeeds.
4. Record actual outcomes and limitations in `docs/agent-tracking/VOT-35.md`.
