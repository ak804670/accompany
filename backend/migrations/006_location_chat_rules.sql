-- Mirrors database/migrations/016_location_chat_rules.sql for the backend migrator.

ALTER TABLE acc.m_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_discovery BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE acc.m_profiles
  DROP CONSTRAINT IF EXISTS chk_m_profiles_coordinates;

ALTER TABLE acc.m_profiles
  ADD CONSTRAINT chk_m_profiles_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  );

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE INDEX IF NOT EXISTS idx_m_profiles_earth
  ON acc.m_profiles USING gist (ll_to_earth(latitude, longitude))
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND deleted_at IS NULL
    AND location_discovery;

CREATE INDEX IF NOT EXISTS idx_presence_last_seen
  ON acc.presence (last_seen_at DESC);

ALTER TABLE acc.conversations
  DROP CONSTRAINT IF EXISTS chk_conversations_status;

ALTER TABLE acc.conversations
  ADD CONSTRAINT chk_conversations_status CHECK (
    status IN ('pending', 'active', 'ended', 'blocked', 'rejected')
  );

CREATE INDEX IF NOT EXISTS idx_conversations_status
  ON acc.conversations (status, updated_at DESC);

ALTER TABLE acc.m_interests
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'catalog';

ALTER TABLE acc.m_interests
  DROP CONSTRAINT IF EXISTS chk_m_interests_origin;

ALTER TABLE acc.m_interests
  ADD CONSTRAINT chk_m_interests_origin CHECK (origin IN ('catalog', 'custom'));

ALTER TABLE acc.m_interests
  DROP CONSTRAINT IF EXISTS chk_m_interests_name;

ALTER TABLE acc.m_interests
  ADD CONSTRAINT chk_m_interests_name CHECK (length(btrim(name)) BETWEEN 2 AND 40);
