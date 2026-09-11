-- VOT-75: backend-only data plane and refresh controls. See docs/DATABASE_ACCESS.md.
-- Keep this body identical in both migration histories until VOT-79 consolidates them.
BEGIN;

-- Invoker functions must not resolve objects in a client-writable schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role;

DO $$
DECLARE
    table_name text;
    column_names text;
    existing_policy record;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'pa_elections', 'pa_election_dates', 'al_elections', 'al_election_dates',
        'ak_elections', 'ak_election_dates', 'wi_elections', 'wi_election_dates',
        'mi_elections', 'mi_election_dates', 'oh_elections', 'oh_election_dates',
        'ga_elections', 'ga_election_dates', 'az_elections', 'az_election_dates',
        'nv_elections', 'nv_election_dates', 'nc_elections', 'nc_election_dates',
        'fl_elections', 'fl_election_dates', 'refresh_leases', 'refresh_snapshots'
    ] LOOP
        -- The older Supabase history creates only PA/AL/AK. Do not create data here.
        IF to_regclass(format('public.%I', table_name)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        -- These service-owned objects have no client row policies, including legacy ones.
        FOR existing_policy IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', existing_policy.policyname, table_name);
        END LOOP;
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
        -- Table-level REVOKE alone leaves separately granted column privileges intact.
        SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO column_names
        FROM pg_attribute WHERE attrelid = to_regclass(format('public.%I', table_name))
            AND attnum > 0 AND NOT attisdropped;
        EXECUTE format(
            'REVOKE SELECT (%1$s), INSERT (%1$s), UPDATE (%1$s), REFERENCES (%1$s) ON public.%2$I FROM PUBLIC, anon, authenticated, service_role',
            column_names, table_name);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
    END LOOP;

    IF to_regclass('public.refresh_snapshots_id_seq') IS NOT NULL THEN
        REVOKE ALL ON SEQUENCE public.refresh_snapshots_id_seq FROM PUBLIC, anon, authenticated, service_role;
        GRANT USAGE, SELECT ON SEQUENCE public.refresh_snapshots_id_seq TO service_role;
    END IF;
    IF to_regprocedure('public.acquire_refresh_lease(text,text,timestamptz)') IS NOT NULL THEN
        ALTER FUNCTION public.acquire_refresh_lease(text, text, timestamptz) SECURITY INVOKER;
        ALTER FUNCTION public.acquire_refresh_lease(text, text, timestamptz) SET search_path = public, pg_temp;
        REVOKE ALL ON FUNCTION public.acquire_refresh_lease(text, text, timestamptz) FROM PUBLIC, anon, authenticated, service_role;
        GRANT EXECUTE ON FUNCTION public.acquire_refresh_lease(text, text, timestamptz) TO service_role;
    END IF;
END $$;

ALTER FUNCTION public.set_scraped_at() SECURITY INVOKER;
ALTER FUNCTION public.set_scraped_at() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_scraped_at() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_scraped_at() TO service_role;

-- Defaults apply to the executing migration owner only, not other object creators.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
-- PostgreSQL's global PUBLIC EXECUTE default cannot be undone by a per-schema revoke.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
