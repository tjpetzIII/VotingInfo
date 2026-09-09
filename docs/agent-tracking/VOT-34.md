---
tags: [voteready, agent-task]
issue: VOT-34
status: implementing
---
# VOT-34: sharp security baseline audit

## Assignment

Agent: /root/vot_34
Worktree: /private/tmp/voteready-vot-34
Branch: codex/vot-34
Spec directory: specs/034-vot-34

## Evidence and handoff

- Spec Kit artifacts are in `specs/034-vot-34/`.
- `frontend/package.json` already declares `resolutions.sharp: ^0.35.3`, exceeding the requested 0.35.0 floor.
- `frontend/yarn.lock` already resolves `sharp` and every `@img/sharp-*` platform package to 0.35.3; the platform libvips packages resolve to 1.3.2.
- The current branch inherits the same dependency state from `origin/main`; history shows `db6c652` added the resolution to address Next.js's transitive `sharp ^0.34.5` request and prior Dependabot alerts.
- No sharp-specific Dependabot branch is available locally or on the configured origin. No manifest or lockfile change is necessary.

## Validation

- `yarn install --frozen-lockfile` preserved the lock digest (`d08e551218a75785688f500217e15ad68bb150351d9d5a5a91422fa24a818854` before and after), but the first run was blocked by the host's Node 25.6.1 engine mismatch for jsdom (CI uses Node 24).
- `yarn install --frozen-lockfile --ignore-engines` completed and linked the locked graph. This bypass was used only to validate the current Node 25 host; the lock itself was unchanged.
- `yarn list --pattern sharp --depth=10` reported `sharp@0.35.3`, all `@img/sharp-*` binaries at 0.35.3, and all libvips packages at 1.3.2.
- `yarn lint` passed.
- `npx tsc --noEmit` passed.
- `yarn test` ran 139 tests: 136 passed and 3 pre-existing tests failed in `AddressForm.test.tsx` and `LocaleSwitcher.test.tsx` due to validation/interaction timeouts. No VOT-34 files affect those components.
- `yarn build` passed with host permission after the sandbox rejected process/port creation; `.next/static` was generated. The standalone server file was not present in this checkout's generated output, so standalone artifact verification is incomplete.

## Requirement mapping

- FR-001/FR-002: manifest and lockfile evidence above.
- FR-003: frozen-install digest comparison above.
- FR-004: lint, type-check, test, and build results above.
- FR-005: this note records the verified no-change outcome and environment limitations (Node engine mismatch, unrelated test failures, and sandbox build restriction).
