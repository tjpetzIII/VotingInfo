# Database access contract
- anon and authenticated: denied SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on all project tables; denied sequence access and direct function execution.
- service_role: SELECT/INSERT/UPDATE/DELETE on every project table; USAGE/SELECT on refresh_snapshots_id_seq; EXECUTE on acquire_refresh_lease(text,text,timestamptz) and set_scraped_at(). No grant option or schema CREATE.
- RLS enabled on all project tables with no client policies. No SECURITY DEFINER functions. Existing trigger execution and lease semantics remain intact.
- Public reads continue through the backend API. Browser Supabase credentials are auth-only.
- Future objects created by the migration owner receive no client table/sequence grants or public function execution. Other owners must configure their own defaults and new tables must explicitly enable RLS.
