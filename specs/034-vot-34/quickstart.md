# Validation: VOT-34

Run from `frontend/` with Node 24 and Yarn Classic. No application secrets are required.

1. Record `sha256sum yarn.lock`, run `yarn install --frozen-lockfile`, and record the digest again; the values must match.
2. Inspect `package.json`, `yarn.lock`, and `node_modules/**/sharp/package.json`; every sharp version must be at least 0.35.0.
3. Run `yarn lint`, `npx tsc --noEmit`, `yarn test`, and `yarn build`.
4. Record actual versions, outcomes, and any sandbox or host limitation in `docs/agent-tracking/VOT-34.md`.
