# Spec-Driven Development (GitHub Spec Kit)

This repo uses [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven feature
work. It's installed as Claude Code skills under `.claude/skills/speckit-*` and shared
infrastructure under `.specify/` (both are tracked in git).

## Workflow

For a non-trivial feature or change, run these in order from Claude Code:

1. `/speckit-constitution` — amend project principles (rarely needed; see
   `.specify/memory/constitution.md`)
2. `/speckit-specify` — turn a feature description into `specs/<feature>/spec.md`
3. `/speckit-clarify` (optional) — resolve ambiguities in the spec before planning
4. `/speckit-plan` — produce a technical implementation plan
5. `/speckit-tasks` — break the plan into a dependency-ordered task list
6. `/speckit-analyze` (optional) — check spec/plan/tasks are consistent before implementing
7. `/speckit-implement` — execute the tasks
8. `/speckit-converge` (optional) — diff the codebase against spec/plan/tasks and append any
   remaining work as tasks

Generated specs land in `specs/<NNN-feature-name>/` at the repo root (created on first use).

## Project constitution

`.specify/memory/constitution.md` encodes this repo's non-negotiables — independent
frontend/backend toolchains, no live-API dependencies in tests, no forwarding raw third-party
responses, CORS/secrets/rate-limiting discipline, docs in `docs/`, and the JSX comment gotcha.
It supplements, not replaces, `CLAUDE.md`; if an amendment changes a command or convention
`CLAUDE.md` documents, update both.
