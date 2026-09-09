---
tags: [voteready, agents, backlog]
started: 2026-09-09
status: active
---
# Linear backlog delivery

Goal: complete all 35 currently unfinished VotingInfo tickets, using one ticket agent/worktree per task and spec-driven development. Parent reviews every delivery before integration and Linear completion.

Integration worktree: /private/tmp/voteready-integration
Branch: codex/backlog-integration
Initial commit: e9efa2d

## Workflow

Specification → plan → tasks → implementation → tests → parent review → integration → verified completion.
Use the repository Spec Kit skills and constitution. Track unsupported requirements explicitly; do not mark work done from implementation intent. Existing implementation must be verified too.

## Tickets

- [[VOT-65]] — Preserve deadline method, cutoff time, timezone, and election applicability — Done; integrated `fe045d9`
- [[VOT-68]] — Add a voting preparation guide for ID, accessibility, language help, and registration changes — Done; integrated `7ed6502`
- [[VOT-73]] — Add military and overseas voting guidance with official FPCA and backup-ballot handoffs — Done; integrated `62ec26a`
- [[VOT-67]] — Add a mail-ballot journey with official request, tracking, and problem-resolution links — Done; integrated `ed161ce`
- [[VOT-72]] — Complete Spanish localization across polling, date formatting, and error states — Done; integrated `5bf5fd1`
- [[VOT-71]] — Export selected election dates and deadlines to a calendar without an account — Done; integrated `001a11c` plus test fix `528eb04`
- [[VOT-23]] — Scheduled reminder emails — Done; integrated `ea9ab64` plus warning cleanup `58233a4`
- [[VOT-22]] — Reminder signup flow — Done; integrated `abf17a5` plus test fix `8988aa2`
- [[VOT-21]] — Email notification infrastructure — Done; integrated `e5950cd`
- [[VOT-69]] — Add session-only address use, a clear-data control, and explicit address sharing — Done; integrated `53b2834`
- [[VOT-70]] — Build a personal voting plan with a printable preparation sheet — Done; integrated `8252830`
- [[VOT-24]] — Shareable polling place card — Done; integrated `2f92dab` plus PNG route `2cb8ec3`
- [[VOT-63]] — Show early-voting sites, ballot drop-off locations, and mail-only precinct guidance — Done; integrated `c751707`
- [[VOT-27]] — Invite a friend flow — Done; integrated `92b564f`
- [[VOT-25]] — Deep-linkable address URLs — Done; integrated `a83ce50` plus fixes `4e1320d`, `e144058`
- [[VOT-64]] — Expose data sources, freshness, and useful fallbacks when election data is incomplete — Done; integrated `9b4493a`
- [[VOT-66]] — Refresh state election data automatically and retain the last valid snapshot — Done; integrated `ed161ce`
- [[VOT-28]] — Rate limiting & error hardening — Done; integrated `7622af3`
- [[VOT-62]] — Select an election and keep ballot, polling, and deadlines in sync — Done; integrated `e3b6842`
- [[VOT-41]] — [Deps] axum 0.7 → 0.8 major upgrade — Done; integrated `21798e8`
- [[VOT-49]] — [Deps] TypeScript 5.9 → 7.x major upgrade — Done; integrated `29e59fd`
- [[VOT-40]] — [Info] cargo-audit false positives: quinn-proto / anyhow / wit-bindgen chain not actually compiled — Done; integrated `4b7fe86`
- [[VOT-37]] — [Security] rand 0.8/0.9 unsound custom-logger edge case — bump to 0.8.6+/0.9.3+ — Done; integrated `fe5b86a`
- [[VOT-38]] — [Security] crossbeam-epoch 0.9.18 (via moka) → 0.9.20+ — Done; integrated `cd94be3`
- [[VOT-45]] — [Deps] Routine backend dependency refresh (minor/patch) — Done; integrated `d333fef`
- [[VOT-46]] — [Deps] zod 3.25 → 4.x major upgrade — Done; integrated `29e59fd`
- [[VOT-47]] — [Deps] react-intl 8.2 → 10.x major upgrade (2 majors behind) — Done; integrated `52955c0`
- [[VOT-48]] — [Deps] @hookform/resolvers 3.10 → 5.x major upgrade — Done; integrated `5468b8f`
- [[VOT-50]] — [Deps] Routine frontend dependency refresh (minor/patch) — Done; integrated `b7684c5`
- [[VOT-33]] — [Security] Upgrade postcss → 8.5.18+ (XSS, arbitrary file read, path traversal) — Done; integrated `e2abc35`
- [[VOT-34]] — [Security] Upgrade sharp → 0.35.0+ (libvips CVEs in Next.js image optimization) — Done; integrated `a379cf4`
- [[VOT-35]] — [Security] Upgrade ws → 8.21.0+ (DoS + memory disclosure, via @supabase/realtime-js) — Done; integrated `50f7c1b`
- [[VOT-26]] — "I Voted" badge generator — Done; integrated `de7e9f3`
- [[VOT-19]] — Ballot measure explainer — Done; integrated `5670d80`
- [[VOT-31]] — CI/CD pipeline — Done; integrated `8c83d59`

## Activity

- 2026-09-09: Verified Linear inventory (35 unfinished); inspected main and existing Obsidian docs vault. Created integration and first three isolated worktrees. No product changes integrated yet.
- 2026-09-09: Started agents `/root/vot_33`, `/root/vot_41`, `/root/vot_62`; each assigned Spec Kit workflow, isolated branch, and its own tracking note. Linear moved to In Progress for those three tickets.
- 2026-09-09: Reviewed and integrated VOT-41 as `21798e8` plus note cleanup `f4ee80e`. Focused route compatibility tests passed in integration worktree; Linear moved to Done. Full suite's sandbox wiremock bind failures remain documented as baseline.
- 2026-09-09: Reviewed and integrated VOT-33 as `e2abc35` (ticket branch `d4a2adb`). Frozen install, PostCSS resolution, lint, type-check, 134 frontend tests and escalated production build passed; local Node engine mismatch and un-escalated Turbopack worker restriction are documented. Linear moved to Done.
- 2026-09-09: Started VOT-40 evidence/audit agent in `/private/tmp/voteready-vot-40` on `codex/vot-40`, based on the current integration branch. It must produce Spec Kit artifacts and a reproducible cargo-audit applicability record before parent review.
- 2026-09-09: User explicitly requires spec-driven development for every subagent, including maintenance/verification tickets. Parent review includes specification fidelity, implementation, and verification evidence.
- 2026-09-09: Integrated VOT-62 (`e3b6842`) and VOT-64 (`9b4493a`, `3b99f2c`, `aa267dd`) after parent review and validation; Linear moved both to Done. VOT-34 (`a379cf4`) and VOT-35 (`50f7c1b`) completed as evidence-backed dependency/security audits.
- 2026-09-09: Prepared isolated worktrees for VOT-28, VOT-63, VOT-65, and VOT-66. VOT-28, VOT-63, and VOT-65 are assigned to active Spec Kit agents; VOT-66 is staged for the next available agent.
- 2026-09-09: Reviewed and integrated VOT-28 (`7622af3`, note cleanup `98f2fdb`) and VOT-63 (`c751707`); backend checks passed and Linear moved both to Done. VOT-65 (`fe045d9`, spec cleanup `95dc92a`) is integrated with conservative typed deadline semantics; VOT-66 and VOT-72 are in progress.
- 2026-09-09: Found existing Dependabot PRs 45 (frontend refresh) and 46 (backend refresh), both with successful frontend/backend CI on their own heads. Their changes are not yet integrated; VOT-50/VOT-45 agents must inspect them before duplicating work.
- 2026-09-09: Reviewed and integrated VOT-67, VOT-68, VOT-69, VOT-70, VOT-71, VOT-72, VOT-73, VOT-19, VOT-21, VOT-22, VOT-24, VOT-25, VOT-26, and VOT-27. The remaining ticket is VOT-23, delegated with Spec Kit artifacts required before implementation.
- 2026-09-09: Added current CLI permissions in `~/.codex/config.toml` (`approval_policy = "never"`, `sandbox_mode = "danger-full-access"`) per user request; restart Codex to reload them.

## Scheduling and review rules

- Maximum three ticket agents run concurrently while the parent reviews and integrates.
- First wave: [[VOT-33]], [[VOT-41]], [[VOT-62]].
- Dependency/security audits next: [[VOT-34]], [[VOT-35]], [[VOT-37]], [[VOT-38]], [[VOT-40]], [[VOT-45]], [[VOT-46]], [[VOT-47]], [[VOT-48]], [[VOT-49]], [[VOT-50]]. One agent per ticket, even when implementation is already present; complete only with current evidence.
- Foundation features: [[VOT-64]], [[VOT-69]], [[VOT-72]], [[VOT-63]], [[VOT-28]], [[VOT-31]]. Coordinate shared files with election selection and integrate reviewed changes before dependent work.
- [[VOT-65]] follows election selection and provenance; [[VOT-66]] follows provenance.
- [[VOT-21]] precedes [[VOT-22]] and [[VOT-23]]. No real subscriber email is authorized as a test; use a controlled test sink and document live-delivery requirements.
- [[VOT-67]] and [[VOT-68]] use reviewed resource metadata; [[VOT-73]] can proceed independently.
- [[VOT-70]] follows selection, precise deadlines, and privacy; [[VOT-71]] follows selection and deadlines.
- [[VOT-25]], [[VOT-24]], [[VOT-27]] align with explicit address-sharing controls. [[VOT-19]] and [[VOT-26]] are separate features.
- Existing user files `.agents/`, `.codex/`, and `AGENTS.md` are left intact. Product integration uses the separate integration worktree.
- Storage constraint: root backend/target is 22GB with 31GB free. Reuse Cargo target cache with Cargo's locking; do not create a fresh backend target per ticket. Worktree source and frontend build output remain separate.
- Spec artifact rule: each ticket worktree has a unique `specs/<ticket-number>-<slug>/` directory. Do not commit the shared session pointer `.specify/feature.json`; parent will consolidate or remove it during integration.
