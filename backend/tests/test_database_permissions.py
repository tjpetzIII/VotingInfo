#!/usr/bin/env python3
"""Exercise both migration histories in a disposable, secret-free PostgreSQL container."""
import argparse
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
POLICY = "database_access_policy.sql"


def run(*args, input=None):
    return subprocess.run(args, input=input, text=True, check=True, capture_output=True).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--without-policy", action="store_true", help="Prove the regression fails before the fix")
    args = parser.parse_args()
    name = "vot75-permissions-" + uuid.uuid4().hex[:12]
    migrations = sorted((ROOT / "supabase/migrations").glob("*" + POLICY))
    if len(migrations) != 1:
        raise AssertionError("Expected one Supabase access policy migration")
    if not args.without_policy:
        assert migrations[0].read_bytes() == (ROOT / "backend/migrations/013_database_access_policy.sql").read_bytes(), "Policy histories diverged"
    try:
        run("docker", "run", "--detach", "--rm", "--name", name,
            "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73")
        for _ in range(60):
            try:
                run("docker", "exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres")
                break
            except subprocess.CalledProcessError:
                time.sleep(0.25)
        else:
            raise RuntimeError("Disposable PostgreSQL did not become ready")

        def sql(database, source):
            return run("docker", "exec", "-i", name, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database, input=source)

        sql("postgres", "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;")
        for tree, count in [("backend", 24), ("supabase", 6)]:
            run("docker", "exec", name, "createdb", "-U", "postgres", tree)
            sql(tree, """
                GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC, anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
                ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
            """)
            for migration in sorted((ROOT / tree / "migrations").glob("*.sql")):
                if migration.name.endswith(POLICY):
                    # Reproduce legacy table/column ACLs and a permissive dashboard policy.
                    sql(tree, """
                        GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
                        GRANT SELECT(election_name), UPDATE(election_name), INSERT(election_name), REFERENCES(election_name)
                            ON public.pa_elections TO anon, authenticated, PUBLIC;
                        CREATE POLICY legacy_client_access ON public.pa_elections TO anon, authenticated USING (true) WITH CHECK (true);
                    """)
                    if args.without_policy:
                        continue
                sql(tree, migration.read_text())
            sql(tree, f"DO $$ BEGIN IF (SELECT count(*) FROM pg_tables WHERE schemaname='public') <> {count} THEN RAISE EXCEPTION 'Unexpected migration inventory'; END IF; END $$;")
            assertions = (ROOT / "backend/tests/database_permissions.sql").read_text()
            result = sql(tree, assertions)
            if not args.without_policy:
                # Verify the contract again after reapplying the additive policy.
                sql(tree, migrations[0].read_text())
                sql(tree, assertions)
            print(f"{tree}: {count} tables; CRUD, RLS, sequence, RPC and default privilege checks passed", flush=True)
            if result.strip():
                print(result.strip())
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr)
        raise SystemExit(error.returncode) from error
