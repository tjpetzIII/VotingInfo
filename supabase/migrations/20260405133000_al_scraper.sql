-- AL Upcoming Elections
-- Scraped from https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections
CREATE TABLE IF NOT EXISTS al_elections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_name   TEXT    NOT NULL,
    election_type   TEXT    NOT NULL,  -- 'primary' | 'general' | 'special' | 'other'
    election_date   TEXT    NOT NULL,
    polls_hours     TEXT,
    registration_deadline  TEXT,
    mail_in_deadline       TEXT,
    state_code      TEXT    NOT NULL DEFAULT 'AL',
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (election_date, election_type)
);

-- AL Local Elections / Referendums (treated as "important dates")
CREATE TABLE IF NOT EXISTS al_election_dates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date          TEXT    NOT NULL,
    event_description   TEXT    NOT NULL,
    election_year       INT     NOT NULL,
    state_code          TEXT    NOT NULL DEFAULT 'AL',
    scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_date, event_description, election_year)
);

-- The set_scraped_at() function is created in 001_pa_scraper.sql; we only
-- need to attach new triggers that call it.
CREATE OR REPLACE TRIGGER al_elections_scraped_at
    BEFORE INSERT OR UPDATE ON al_elections
    FOR EACH ROW EXECUTE FUNCTION set_scraped_at();

CREATE OR REPLACE TRIGGER al_election_dates_scraped_at
    BEFORE INSERT OR UPDATE ON al_election_dates
    FOR EACH ROW EXECUTE FUNCTION set_scraped_at();
