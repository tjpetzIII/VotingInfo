# Feature Specification: Database access policy (VOT-75)

**Feature Branch**: `codex/vot-75`
**Created**: 2026-09-11
**Status**: Ready for planning
**Input**: [VOT-75](https://linear.app/votinginfo/issue/VOT-75): define and test Supabase grants, RLS and refresh RPC permissions.

## User Scenarios & Testing

### User Story 1 — Protect published election data (Priority: P1)
Voters receive election information through VoteReady; browser credentials cannot directly read or change the database snapshots.
**Why this priority**: Untrusted clients must not corrupt the information voters rely on.
**Independent Test**: Attempt read, insert, update and delete with signed-out and signed-in client roles against every election table; all are denied. Verify the server can perform all four operations.
**Acceptance Scenarios**:
1. Given existing broad client grants, when the policy is installed, then client reads and writes are denied.
2. Given a trusted server, when it reads or publishes election data, then the existing operations succeed.

### User Story 2 — Restrict refresh controls (Priority: P1)
Only the trusted server can inspect or mutate refresh leases and run history or acquire a lease.
**Why this priority**: Client access could interfere with refresh scheduling or expose internal operations.
**Independent Test**: Assert denied client and allowed server operations on control tables, their sequence, and the lease operation.
**Acceptance Scenarios**:
1. Given either client role, when it requests a lease or changes refresh history, then access is denied.
2. Given the server role, when it creates history and acquires/releases a lease, then the operations succeed, including generated history IDs.

### User Story 3 — Reproduce and inspect the policy (Priority: P2)
Maintainers can reproduce the permission contract and compare deployed configuration without changing live data.
**Why this priority**: Dashboard defaults and duplicate migration histories must not determine security silently.
**Independent Test**: Run deterministic tests against both migration trees in disposable databases; inspect live configuration read-only and record differences.
**Acceptance Scenarios**:
1. Given either migration tree, when applied to a fresh database with permissive defaults, then all objects it creates satisfy the same access contract.
2. Given the deployed project, when its configuration is inspected, then actual grants, row security, function permissions and schema exposure are recorded with differences or explicit gaps.

### Edge Cases
- Existing broad grants, inherited PUBLIC function execution, and serial sequence access must be revoked.
- Row security must deny clients even if table privileges are accidentally granted later.
- Older migration trees lack some state/control objects; protect all existing project objects and test each tree's inventory without silently creating missing business tables.
- Unavailable deployed configuration blocks live verification; local tests are not proof of deployed permissions.

## Requirements
### Functional Requirements
- **FR-001**: Record intended access for signed-out, signed-in and operator roles. Public database reads are allowed only if an existing consumer requires them.
- **FR-002**: Explicitly revoke client and PUBLIC access and enable row security on all project election and control tables in both migration trees.
- **FR-003**: Permit only the trusted server role to read/mutate snapshots and refresh controls and execute refresh operations; secure associated sequences and trigger functions.
- **FR-004**: Verify deployed grants, row security, function privileges and exposed schemas read-only; report differences from the migration contract.
- **FR-005**: Keep privileged credentials server-only, outside NEXT_PUBLIC variables.
- **FR-006**: Test allowed/denied SELECT, INSERT, UPDATE, DELETE and lease calls for anon, authenticated and operator roles in disposable local databases, without live services or secrets.
- **FR-007**: Coordinate with migration-source and atomic-snapshot work without changing data publication semantics.

### Key Entities
- Election snapshots: elections and dates for each supported state, owned by the ingestion service.
- Refresh controls: exclusive leases and run metadata, visible only to operators.
- Access roles: anonymous client, authenticated client, trusted backend operator.

## Success Criteria
- **SC-001**: Every client data operation in the permission matrix is denied; every required server operation succeeds.
- **SC-002**: Both migration histories produce the documented policy for every object they contain.
- **SC-003**: Maintainers have a reproducible validation command and an evidence-backed live configuration comparison.
- **SC-004**: PR CI passes, the PR is merged, and the requirements are reverified on local main.

## Assumptions
- The existing backend credential represents Supabase's service_role; browser credentials are only used for authentication. No direct client database reads are needed by current consumers.
- Live inspection is read-only; restoring a paused project or applying production migrations is outside that inspection.
- Existing migration-source and atomic publication tickets own consolidation and publication redesign.
