-- Control plane for scheduled refreshes. Election tables remain last-good snapshots:
-- a run publishes rows only after a state's scrape completes successfully.
CREATE TABLE IF NOT EXISTS refresh_leases (
    name TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_snapshots (
    id BIGSERIAL PRIMARY KEY,
    version UUID NOT NULL DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    state_count INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
    error_category TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS refresh_snapshots_version_idx ON refresh_snapshots(version);

CREATE OR REPLACE FUNCTION acquire_refresh_lease(p_name TEXT, p_owner TEXT, p_expires_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE SQL AS $$
    INSERT INTO refresh_leases(name, owner, expires_at)
    VALUES (p_name, p_owner, p_expires_at)
    ON CONFLICT (name) DO UPDATE
      SET owner = EXCLUDED.owner, acquired_at = now(), expires_at = EXCLUDED.expires_at
      WHERE refresh_leases.expires_at <= now()
    RETURNING TRUE;
$$;
