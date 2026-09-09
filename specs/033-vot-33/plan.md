# Implementation Plan: VOT-33 PostCSS security baseline

**Branch**: `codex/vot-33` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

## Summary

Raise the direct frontend PostCSS requirement from `^8` to `^8.5.18`. Preserve the existing `resolutions.postcss` override and locked 8.5.25 package; regenerate only obsolete lock selectors. Verify a clean installation, all physical PostCSS package copies and Next/Tailwind resolution, then frontend quality and build compatibility.

## Technical Context

- JavaScript/TypeScript frontend, Node 24 in CI, Yarn Classic 1.22.22; local Node version recorded with validation.
- Next.js 16.2.12, Tailwind 4, PostCSS already locked to 8.5.25 for all selectors.
- Tooling: Yarn frozen install, dependency inspection, ESLint, TypeScript, Vitest, Next build.
- No data storage or external interface changes. Scope: frontend package metadata and specification/evidence artifacts.
- No new network-dependent tests or application code.

## Constitution Check

Pre-design and post-design: pass. Frontend tooling remains independent. Existing tests remain deterministic and secret-free. All frontend quality gates are required. No backend, security configuration, UX, cache, standalone-output, or JSX changes. Specification artifacts live in the mandated specs directory and tracking evidence in root docs. No deviations.

## Project Structure

- `frontend/package.json`: direct PostCSS minimum.
- `frontend/yarn.lock`: retain locked patched version while removing obsolete direct selector.
- `specs/033-vot-33/`: spec, checklist, plan, research, data-model, quickstart, tasks.
- `docs/agent-tracking/VOT-33.md`: central Obsidian progress and evidence (parent repository note).

## Implementation Strategy

1. Finish specification and advisory evidence before manifest mutation.
2. Change minimum and run Yarn in this isolated worktree.
3. Inspect actual installed packages and direct/transitive module resolution, compare lock digest across frozen install.
4. Run existing tests, lint, type check, build. Inspect generated CSS and standalone artifact. Review focused diff and converge requirements.

No contracts directory is needed: this change modifies internal build tooling only. No additional application tests are justified for a package metadata edit; executable dependency checks and the existing suite directly validate the requirement.
