-- PA Upcoming Elections
-- Scraped from https://www.pa.gov/agencies/vote/elections/upcoming-elections
CREATE TABLE IF NOT EXISTS pa_elections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_name   TEXT    NOT NULL,
    election_type   TEXT    NOT NULL,  -- 'primary' | 'general' | 'special' | 'other'
    election_date   TEXT    NOT NULL,
    polls_hours     TEXT,
    registration_deadline  TEXT,
    mail_in_deadline       TEXT,
    state_code      TEXT    NOT NULL DEFAULT 'PA',
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (election_date, election_type)
);

-- PA Important Election Dates (full calendar table on the page)
CREATE TABLE IF NOT EXISTS pa_election_dates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date          TEXT    NOT NULL,
    event_description   TEXT    NOT NULL,
    election_year       INT     NOT NULL,
    state_code          TEXT    NOT NULL DEFAULT 'PA',
    scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_date, event_description, election_year)
);

-- Optional: keep scraped_at current on re-upserts
CREATE OR REPLACE FUNCTION set_scraped_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.scraped_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER pa_elections_scraped_at
    BEFORE INSERT OR UPDATE ON pa_elections
    FOR EACH ROW EXECUTE FUNCTION set_scraped_at();

CREATE OR REPLACE TRIGGER pa_election_dates_scraped_at
    BEFORE INSERT OR UPDATE ON pa_election_dates
    FOR EACH ROW EXECUTE FUNCTION set_scraped_at();
