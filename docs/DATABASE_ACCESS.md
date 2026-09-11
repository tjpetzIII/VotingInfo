# Database access policy (VOT-75)

## Intended access

Browser Supabase clients are used for authentication only. Election data is read through the Rust API (`frontend/src/lib/api.ts`, `backend/src/routes/scraper.rs`). Neither `anon` nor `authenticated` needs direct database SELECT access. Both roles, and inherited `PUBLIC`, are denied table and column privileges on election snapshots and refresh controls, sequence privileges, and direct execution of project functions.

The trusted backend uses Supabase `service_role` for SELECT, INSERT, UPDATE and DELETE on the 22 state tables and two refresh control tables. It also receives USAGE/SELECT on `refresh_snapshots_id_seq` and EXECUTE on `acquire_refresh_lease(text,text,timestamptz)` and the `set_scraped_at()` trigger function. Table ownership and administrative database privileges are outside this client-role contract.

All project tables enable RLS and have no client policies, so accidental client CRUD grants still reveal/change no rows. `service_role` has Supabase's BYPASSRLS attribute; migrations do not create or elevate roles. Functions remain SECURITY INVOKER, with `search_path = public, pg_temp`, and clients cannot CREATE in public. The migration resets legacy policies and column ACLs on the explicitly listed service-owned tables; it does not alter Auth, Storage, or unrelated application tables.

Future tables/sequences created by the migration owner in public do not inherit client grants. The owner's default PUBLIC function EXECUTE is revoked globally because PostgreSQL cannot revoke a global default at schema scope; named client function defaults are revoked in public. Other object creators (including `supabase_admin`) retain their own defaults. Every future migration must explicitly enable RLS, define grants for its new objects, and extend the permission inventory test. New functions outside public created by this owner also require an explicit EXECUTE grant to their intended callers.

## Credentials

The current Rust client actually reads **SUPABASE_KEY** and SUPABASE_URL. SUPABASE_KEY must be the server's service-role credential; legacy README references to SUPABASE_SERVICE_ROLE_KEY are being reconciled by VOT-79. Keep it in ignored `backend/.env` or the deployment's server secret store. Never copy it to any `NEXT_PUBLIC_*` variable. The frontend uses only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (the public anon credential). No credentials are included in migrations or tests.

## Migration histories and dependencies

- `backend/migrations/001`–`012` define all eleven supported states plus refresh controls; `013_database_access_policy.sql` protects them.
- `supabase/migrations/` historically defines only PA/AL/AK. The timestamped database-access migration has the exact same body and protects whichever of the explicitly listed objects exist. It does not create missing data tables.
- VOT-79 owns a canonical migration source and environment-name reconciliation. Until then both policy copies must remain byte-identical, and newly introduced state/control objects must get their policy in the same migration. Applying missing older table migrations *after* this policy requires applying the policy again before exposing those objects.
- VOT-66 owns atomic snapshot publication and operator-only HTTP mutation routes. This database policy does not make the existing two-upsert refresh atomic or authorize existing HTTP scrape endpoints. A request that makes the backend use service_role is still trusted by PostgreSQL; HTTP authorization must be enforced by that separate work.

## Validation

Run from the repository root with Python 3 and Docker available:

```sh
python3 backend/tests/test_database_permissions.py
```

The runner uses a digest-pinned PostgreSQL 17 image (matching the deployed major version), and creates its own disposable container (no ports exposed), with independent databases for each migration history, and removes it in a finally block. It uses synthetic rows, no live database, and no secrets. Test bootstrap deliberately grants broad Supabase-like privileges, PUBLIC and column access, and a legacy permissive policy. Assertions cover:

- All 24 backend / 6 historical Supabase tables: real allowed server CRUD, denied anon/authenticated CRUD and TRUNCATE, table/column ACLs, and a separate RLS test after temporary client grants.
- Server upsert and scraped_at trigger, client schema CREATE denial, invoker/search-path/function execution ACLs.
- Refresh history generated IDs, denied sequence reads/nextval/setval, and actual denied client lease calls; server acquisition, contention, expiry takeover and release.
- Newly created table, sequence and function permissions under the migration owner's hardened defaults.

`--without-policy` intentionally fails with `RLS missing on ak_election_dates`, demonstrating the regression before the fix. CI runs the permission suite in addition to existing frontend/backend checks. No UI changes were made; translation and keyboard checks are not applicable.

## Read-only deployed inspection — 2026-09-11

Project: VotingApp (`yceklkqeopsluezoeufo`), PostgreSQL 17. The project was initially inactive; after the owner restarted it, read-only catalog queries and the Supabase security advisor succeeded. No production DDL or data mutation was performed.

Observed differences from the migration contract:

- 22 election tables exist, all with broad anon/authenticated/service_role table grants. PA's two tables enable RLS without policies; the other 20 tables disable RLS. No policies exist in public.
- `refresh_leases`, `refresh_snapshots`, their sequence, and `acquire_refresh_lease` are absent. The deployed schema is behind backend migration 012.
- `set_scraped_at()` is invoker, but PUBLIC/anon/authenticated can execute it and its search_path is unset.
- Client roles are not superusers and do not bypass RLS; service_role does bypass RLS, as required. Public schema grants USAGE, but not CREATE, to client roles.
- `postgres` and `supabase_admin` have permissive public table/sequence/function defaults. This migration changes defaults only for its executing owner; the other owner's defaults remain a documented deployment consideration.
- Exposed Data API schemas are **public, graphql_public**. Verified by a read-only GET of `/rest/v1/pa_elections?select=id&limit=0` with an intentionally nonexistent Accept-Profile: HTTP 406 / PGRST106 explicitly listed those schemas. No row data was fetched. `current_setting('pgrst.db_schemas', true)` was null in the management SQL session and was not used to infer exposure.
- The security advisor independently reported 20 RLS-disabled public tables, 22 tables discoverable to each client role through GraphQL, and one mutable function search_path. Its two “RLS enabled no policy” informational notices for PA are intentional for the server-only contract. A separate leaked-password-protection warning is outside this database policy change.

These observations establish deployed permission drift; they are not proof of a successful public write, and no such write was attempted. The PR delivers policy-as-code and validation, not production rollout.

## Rollout and recovery

Apply the appropriate additive policy migration as the table-owning migration role after reconciling deployed migration history. For this observed deployment, reconcile missing backend migration 012 before enabling refresh operations. Inspect the migration first: it intentionally removes existing policies and client column/table/function grants for the named service-owned objects. Do not blindly replay a second history into production.

After deployment, rerun the read-only catalog/advisor inspection, verify all expected table/RPC/sequence grants and RLS, and smoke-test backend election reads and refresh operations with the server credential. A permission failure should be repaired by restoring the intended explicit server grant or correct server credential, not by disabling RLS or restoring client writes. The migration changes no election data, columns or publication semantics. Restore any unrelated custom policy only after reconciling it with this server-only contract.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [function privileges](https://supabase.com/docs/guides/database/functions), [RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [function search-path advisor](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
