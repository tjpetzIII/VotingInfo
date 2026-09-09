# Implementation Plan: VOT-35 ws dependency audit

**Branch**: `codex/vot-35` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

## Summary

Audit the existing frontend manifest, Yarn lock, Supabase graph, and Dependabot history. Preserve the lockfile when the active graph contains no vulnerable `ws` resolution. Record deterministic validation and any host/network limitation.

## Technical Context

- Frontend: Next.js 16.2.12, Yarn Classic 1.22.22, Node 24 in CI.
- Direct Supabase packages: `@supabase/ssr ^0.12.4` and `@supabase/supabase-js ^2.111.0`.
- Current lock: `@supabase/realtime-js 2.111.0` depends on `@supabase/phoenix 0.4.5` and `tslib`, with no `ws` edge; no `ws@` lock record is present.
- Historical evidence: Dependabot commit `ec217d0` upgraded the former indirect `ws` resolution from 8.20.0 to 8.21.1; subsequent Supabase updates removed the edge.
- Scope: Spec Kit artifacts and `docs/agent-tracking/VOT-35.md`; no production code or dependency upgrade is planned.

## Constitution Check

Pass. Frontend/backend boundaries and application behavior are unchanged. No live service or secret is needed. Documentation remains under `specs/` and `docs/`. The audit avoids unrelated dependency changes.

## Implementation Strategy

1. Inspect manifest, lockfile, Supabase records, history, and Dependabot branches.
2. Attempt `yarn install --frozen-lockfile` and compare lock digests.
3. Run applicable frontend gates when dependencies are available; record blocked checks accurately.
4. Map requirements to evidence in the tracking note and commit the focused artifacts.
