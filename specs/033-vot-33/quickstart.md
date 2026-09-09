# Validation: VOT-33

Use Node 24 (CI version) and Yarn Classic. Run from `frontend/`, without environment secrets.

1. `yarn install` to reconcile changed direct requirements with the existing lock.
2. `shasum -a 256 yarn.lock`, then `yarn install --frozen-lockfile`, then repeat the digest; values must match.
3. `yarn list --pattern postcss` and inspect all `node_modules/**/postcss/package.json` versions. Resolve PostCSS from the frontend, Next, and Tailwind contexts: all must report the same version >=8.5.18.
4. `yarn lint`, `yarn tsc --noEmit`, `yarn test`, and `yarn build`; each must exit zero.
5. Confirm `.next/static` contains emitted CSS and `.next/standalone/server.js` exists.

Record actual commands, runtime versions, outcomes, limitations, and requirement coverage in `docs/agent-tracking/VOT-33.md`. A successful install does not prove the quality/build gates; run each explicitly.
