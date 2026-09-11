-- Tests use real statements, not just catalog assertions. Everything rolls back.
BEGIN;
CREATE FUNCTION pg_temp.denied(client text, command text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE rejected boolean := false;
BEGIN
    EXECUTE format('SET LOCAL ROLE %I', client);
    BEGIN
        EXECUTE command;
    EXCEPTION WHEN insufficient_privilege THEN
        rejected := true;
    END;
    RESET ROLE;
    IF NOT rejected THEN
        RAISE EXCEPTION 'Expected permission denial for %: %', client, command;
    END IF;
END $$;

DO $$
DECLARE
    tab record;
    client text;
    insertion text;
    mutation text;
    total integer;
    privilege text;
BEGIN
    FOR tab IN SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LOOP
        IF NOT tab.rowsecurity THEN
            RAISE EXCEPTION 'RLS missing on %', tab.tablename;
        END IF;
        IF tab.tablename LIKE '%_elections' THEN
            insertion := format('INSERT INTO public.%I (election_name,election_type,election_date) VALUES (''Synthetic election'',''general'',''2099-11-03'')', tab.tablename);
            mutation := 'election_name = ''Updated election''';
        ELSIF tab.tablename LIKE '%_election_dates' THEN
            insertion := format('INSERT INTO public.%I (event_date,event_description,election_year) VALUES (''2099-11-03'',''Synthetic event'',2099)', tab.tablename);
            mutation := 'event_description = ''Updated event''';
        ELSIF tab.tablename = 'refresh_leases' THEN
            insertion := 'INSERT INTO public.refresh_leases(name,owner,expires_at) VALUES (''test'',''operator'',''2099-01-01'')';
            mutation := 'owner = ''updated operator''';
        ELSIF tab.tablename = 'refresh_snapshots' THEN
            insertion := 'INSERT INTO public.refresh_snapshots(started_at,status) VALUES (''2099-01-01'',''running'')';
            mutation := 'status = ''succeeded''';
        ELSE
            RAISE EXCEPTION 'Uncovered table: %', tab.tablename;
        END IF;
        SET LOCAL ROLE service_role;
        EXECUTE insertion;
        EXECUTE format('SELECT count(*) FROM public.%I', tab.tablename) INTO total;
        IF total <> 1 THEN RAISE EXCEPTION 'Server read failed on %', tab.tablename; END IF;
        EXECUTE format('UPDATE public.%I SET %s', tab.tablename, mutation);
        GET DIAGNOSTICS total = ROW_COUNT;
        IF total <> 1 THEN RAISE EXCEPTION 'Server update failed'; END IF;
        RESET ROLE;

        FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
            PERFORM pg_temp.denied(client, format('SELECT * FROM public.%I', tab.tablename));
            PERFORM pg_temp.denied(client, insertion);
            PERFORM pg_temp.denied(client, format('UPDATE public.%I SET %s', tab.tablename, mutation));
            PERFORM pg_temp.denied(client, format('DELETE FROM public.%I', tab.tablename));
            PERFORM pg_temp.denied(client, format('TRUNCATE public.%I', tab.tablename));
            FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
                IF has_table_privilege(client, format('public.%I', tab.tablename), privilege) THEN
                    RAISE EXCEPTION 'Unexpected % grant for % on %', privilege, client, tab.tablename;
                END IF;
            END LOOP;
            IF has_any_column_privilege(client, format('public.%I', tab.tablename), 'SELECT,INSERT,UPDATE,REFERENCES') THEN
                RAISE EXCEPTION 'Unexpected column grant for % on %', client, tab.tablename;
            END IF;
            -- Independently prove RLS protects rows even after accidental CRUD grants.
            EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO %I', tab.tablename, client);
            IF tab.tablename = 'refresh_snapshots' THEN
                EXECUTE format('GRANT USAGE ON SEQUENCE public.refresh_snapshots_id_seq TO %I', client);
            END IF;
            EXECUTE format('SET LOCAL ROLE %I', client);
            EXECUTE format('SELECT count(*) FROM public.%I', tab.tablename) INTO total;
            IF total <> 0 THEN RAISE EXCEPTION 'RLS exposed rows'; END IF;
            EXECUTE format('UPDATE public.%I SET %s', tab.tablename, mutation);
            GET DIAGNOSTICS total = ROW_COUNT;
            IF total <> 0 THEN RAISE EXCEPTION 'RLS allowed update'; END IF;
            EXECUTE format('DELETE FROM public.%I', tab.tablename);
            GET DIAGNOSTICS total = ROW_COUNT;
            IF total <> 0 THEN RAISE EXCEPTION 'RLS allowed delete'; END IF;
            RESET ROLE;
            PERFORM pg_temp.denied(client, insertion);
            EXECUTE format('REVOKE ALL ON public.%I FROM %I', tab.tablename, client);
            IF tab.tablename = 'refresh_snapshots' THEN
                EXECUTE format('REVOKE ALL ON SEQUENCE public.refresh_snapshots_id_seq FROM %I', client);
            END IF;
        END LOOP;
        SET LOCAL ROLE service_role;
        EXECUTE format('DELETE FROM public.%I', tab.tablename);
        GET DIAGNOSTICS total = ROW_COUNT;
        IF total <> 1 THEN RAISE EXCEPTION 'Client modified rows or server delete failed'; END IF;
        RESET ROLE;
    END LOOP;
END $$;
DO $$
DECLARE
    client text;
    fn record;
    acquired boolean;
    total integer;
BEGIN
    FOR fn IN SELECT p.oid, p.oid::regprocedure AS signature, p.prosecdef, p.proconfig
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    LOOP
        IF fn.prosecdef OR fn.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY(fn.proconfig)) THEN
            RAISE EXCEPTION 'Unsafe function configuration: %', fn.signature;
        END IF;
        IF NOT has_function_privilege('service_role', fn.oid, 'EXECUTE') THEN
            RAISE EXCEPTION 'Missing operator function grant';
        END IF;
        FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
            IF has_function_privilege(client, fn.oid, 'EXECUTE') THEN
                RAISE EXCEPTION 'Client can execute %', fn.signature;
            END IF;
        END LOOP;
    END LOOP;
    FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
        PERFORM pg_temp.denied(client, 'SELECT public.set_scraped_at()');
        PERFORM pg_temp.denied(client, 'CREATE TABLE public.client_created (id integer)');
    END LOOP;
    IF to_regclass('public.refresh_snapshots') IS NOT NULL THEN
        FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
            PERFORM pg_temp.denied(client, 'SELECT nextval(''public.refresh_snapshots_id_seq'')');
            PERFORM pg_temp.denied(client, 'SELECT last_value FROM public.refresh_snapshots_id_seq');
            PERFORM pg_temp.denied(client, 'SELECT setval(''public.refresh_snapshots_id_seq'', 100)');
            PERFORM pg_temp.denied(client, 'SELECT public.acquire_refresh_lease(''denied'', ''client'', ''2099-01-01'')');
        END LOOP;
        SET LOCAL ROLE service_role;
        -- Ignore caller search_path, preserving access through the invoker RPC.
        SET LOCAL search_path = pg_temp;
        SELECT public.acquire_refresh_lease('lease-test', 'operator-a', '2099-01-01') INTO acquired;
        IF acquired IS DISTINCT FROM true THEN RAISE EXCEPTION 'First lease acquisition failed'; END IF;
        SELECT public.acquire_refresh_lease('lease-test', 'operator-b', '2099-01-01') INTO acquired;
        IF acquired IS true THEN RAISE EXCEPTION 'Active lease stolen'; END IF;
        UPDATE public.refresh_leases SET expires_at='2000-01-01' WHERE name='lease-test';
        SELECT public.acquire_refresh_lease('lease-test', 'operator-b', '2099-01-01') INTO acquired;
        IF acquired IS DISTINCT FROM true THEN RAISE EXCEPTION 'Expired lease takeover failed'; END IF;
        DELETE FROM public.refresh_leases WHERE name='lease-test' AND owner='operator-b';
        GET DIAGNOSTICS total = ROW_COUNT;
        IF total <> 1 THEN RAISE EXCEPTION 'Lease release failed'; END IF;
        RESET search_path;
        RESET ROLE;
    END IF;
    SET LOCAL ROLE service_role;
    INSERT INTO public.pa_elections(election_name,election_type,election_date,scraped_at)
        VALUES ('First','general','2099-11-03','2000-01-01');
    INSERT INTO public.pa_elections(election_name,election_type,election_date)
        VALUES ('Replacement','general','2099-11-03')
        ON CONFLICT(election_date,election_type) DO UPDATE SET election_name=EXCLUDED.election_name;
    IF NOT EXISTS (SELECT 1 FROM public.pa_elections WHERE election_name='Replacement' AND scraped_at=now()) THEN
        RAISE EXCEPTION 'Operator upsert/trigger failed';
    END IF;
    RESET ROLE;
END $$;

-- Future migration-owner objects must not inherit permissive client defaults.
CREATE TABLE public.future_policy_test (id bigint GENERATED BY DEFAULT AS IDENTITY);
CREATE FUNCTION public.future_policy_test() RETURNS integer LANGUAGE sql AS 'SELECT 1';
DO $$
DECLARE client text;
BEGIN
    FOREACH client IN ARRAY ARRAY['anon','authenticated'] LOOP
        PERFORM pg_temp.denied(client, 'SELECT * FROM public.future_policy_test');
        PERFORM pg_temp.denied(client, 'INSERT INTO public.future_policy_test DEFAULT VALUES');
        PERFORM pg_temp.denied(client, 'UPDATE public.future_policy_test SET id=2');
        PERFORM pg_temp.denied(client, 'DELETE FROM public.future_policy_test');
        PERFORM pg_temp.denied(client, 'SELECT nextval(''public.future_policy_test_id_seq'')');
        PERFORM pg_temp.denied(client, 'SELECT public.future_policy_test()');
    END LOOP;
END $$;
ROLLBACK;
