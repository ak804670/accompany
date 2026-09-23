CREATE TABLE acc.m_profiles (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  date_of_birth DATE,
  bio TEXT,
  location TEXT,
  language_preferences TEXT[] NOT NULL DEFAULT '{}',
  profile_status TEXT NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT pk_m_profiles PRIMARY KEY (id),
  CONSTRAINT fk_m_profiles_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_m_profiles_user UNIQUE (user_id),
  CONSTRAINT chk_m_profiles_status CHECK (profile_status IN ('incomplete', 'active', 'hidden')),
  CONSTRAINT chk_m_profiles_display_name CHECK (length(btrim(display_name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_m_profiles_bio_length CHECK (bio IS NULL OR length(bio) <= 2000)
);

CREATE TRIGGER trg_m_profiles_set_updated_at
BEFORE UPDATE ON acc.m_profiles
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.m_profile_media (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT pk_m_profile_media PRIMARY KEY (id),
  CONSTRAINT fk_m_profile_media_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_m_profile_media_type CHECK (media_type IN ('image')),
  CONSTRAINT chk_m_profile_media_moderation CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT chk_m_profile_media_sort_order CHECK (sort_order >= 0),
  CONSTRAINT chk_m_profile_media_storage_key CHECK (length(btrim(storage_key)) > 0)
);

CREATE INDEX idx_m_profile_media_user_sort
  ON acc.m_profile_media (user_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_m_profile_media_primary
  ON acc.m_profile_media (user_id)
  WHERE is_primary AND deleted_at IS NULL;

CREATE TRIGGER trg_m_profile_media_set_updated_at
BEFORE UPDATE ON acc.m_profile_media
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.m_interests (
  id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_interests PRIMARY KEY (id),
  CONSTRAINT uq_m_interests_slug UNIQUE (slug),
  CONSTRAINT chk_m_interests_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT chk_m_interests_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TRIGGER trg_m_interests_set_updated_at
BEFORE UPDATE ON acc.m_interests
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.p_user_interests (
  user_id UUID NOT NULL,
  interest_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_p_user_interests PRIMARY KEY (user_id, interest_id),
  CONSTRAINT fk_p_user_interests_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_p_user_interests_m_interests FOREIGN KEY (interest_id) REFERENCES acc.m_interests (id) ON DELETE RESTRICT
);

CREATE INDEX idx_p_user_interests_interest_id ON acc.p_user_interests (interest_id);

CREATE TABLE acc.m_companion_profiles (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  availability_status TEXT NOT NULL DEFAULT 'offline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_companion_profiles PRIMARY KEY (id),
  CONSTRAINT fk_m_companion_profiles_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_m_companion_profiles_user UNIQUE (user_id),
  CONSTRAINT chk_m_companion_profiles_availability CHECK (availability_status IN ('offline', 'available', 'busy')),
  CONSTRAINT chk_m_companion_profiles_availability_flag CHECK (
    (availability_status = 'available' AND is_available)
    OR (availability_status <> 'available' AND NOT is_available)
  )
);

CREATE INDEX idx_m_companion_profiles_available
  ON acc.m_companion_profiles (updated_at DESC)
  WHERE is_available;

CREATE TRIGGER trg_m_companion_profiles_set_updated_at
BEFORE UPDATE ON acc.m_companion_profiles
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

-- Current price list. A billable interaction copies rate_coins onto its charge.
-- Later edits here do not change charges already written.
CREATE TABLE acc.m_companion_rates (
  id UUID DEFAULT gen_random_uuid(),
  companion_user_id UUID NOT NULL,
  communication_type TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  rate_coins BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_companion_rates PRIMARY KEY (id),
  CONSTRAINT fk_m_companion_rates_m_companion_profiles FOREIGN KEY (companion_user_id) REFERENCES acc.m_companion_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_m_companion_rates_type CHECK (communication_type IN ('message', 'voice_call', 'video_call')),
  CONSTRAINT chk_m_companion_rates_rate_type CHECK (rate_type IN ('per_message', 'per_minute')),
  CONSTRAINT chk_m_companion_rates_pairing CHECK (
    (communication_type = 'message' AND rate_type = 'per_message')
    OR (communication_type IN ('voice_call', 'video_call') AND rate_type = 'per_minute')
  ),
  CONSTRAINT chk_m_companion_rates_coins_non_negative CHECK (rate_coins >= 0)
);

CREATE UNIQUE INDEX uq_m_companion_rates_active
  ON acc.m_companion_rates (companion_user_id, communication_type)
  WHERE is_active;

CREATE INDEX idx_m_companion_rates_companion
  ON acc.m_companion_rates (companion_user_id, communication_type, created_at DESC);

CREATE TRIGGER trg_m_companion_rates_set_updated_at
BEFORE UPDATE ON acc.m_companion_rates
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();
