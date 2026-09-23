CREATE TABLE acc.m_users (
  id UUID DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT pk_m_users PRIMARY KEY (id),
  CONSTRAINT chk_m_users_status CHECK (status IN ('active', 'suspended', 'restricted', 'deleted'))
);

CREATE INDEX idx_m_users_status ON acc.m_users (status);

CREATE TRIGGER trg_m_users_set_updated_at
BEFORE UPDATE ON acc.m_users
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.m_auth_identities (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_auth_identities PRIMARY KEY (id),
  CONSTRAINT fk_m_auth_identities_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_m_auth_identities_provider_subject UNIQUE (provider, provider_subject),
  CONSTRAINT chk_m_auth_identities_provider CHECK (provider IN ('email', 'phone', 'google', 'apple'))
);

CREATE INDEX idx_m_auth_identities_user_id ON acc.m_auth_identities (user_id);

CREATE UNIQUE INDEX uq_m_auth_identities_email
  ON acc.m_auth_identities (email)
  WHERE email IS NOT NULL AND verified_at IS NOT NULL;

CREATE UNIQUE INDEX uq_m_auth_identities_phone
  ON acc.m_auth_identities (phone)
  WHERE phone IS NOT NULL AND verified_at IS NOT NULL;

CREATE TRIGGER trg_m_auth_identities_set_updated_at
BEFORE UPDATE ON acc.m_auth_identities
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.m_devices (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_identifier TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  push_token TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_m_devices PRIMARY KEY (id),
  CONSTRAINT fk_m_devices_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_m_devices_device_identifier UNIQUE (device_identifier),
  CONSTRAINT chk_m_devices_platform CHECK (platform IN ('ios', 'android', 'web'))
);

CREATE INDEX idx_m_devices_user_id ON acc.m_devices (user_id);

CREATE TRIGGER trg_m_devices_set_updated_at
BEFORE UPDATE ON acc.m_devices
FOR EACH ROW
EXECUTE FUNCTION acc.set_updated_at();

CREATE TABLE acc.sessions (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  device_id UUID,
  platform TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_sessions PRIMARY KEY (id),
  CONSTRAINT fk_sessions_m_users FOREIGN KEY (user_id) REFERENCES acc.m_users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_sessions_m_devices FOREIGN KEY (device_id) REFERENCES acc.m_devices (id) ON DELETE SET NULL,
  CONSTRAINT uq_sessions_refresh_token_hash UNIQUE (refresh_token_hash),
  CONSTRAINT chk_sessions_refresh_token_hash_present CHECK (length(refresh_token_hash) > 0)
);

CREATE INDEX idx_sessions_user_id ON acc.sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON acc.sessions (expires_at);

-- Current phone/email sign-in stores a hash, never the code.
CREATE TABLE acc.otp_verifications (
  id UUID DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  channel TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_otp_verifications PRIMARY KEY (id),
  CONSTRAINT chk_otp_verifications_channel CHECK (channel IN ('sms', 'email')),
  CONSTRAINT chk_otp_verifications_attempt_count CHECK (attempt_count >= 0),
  CONSTRAINT chk_otp_verifications_hash_present CHECK (length(otp_hash) > 0)
);

CREATE INDEX idx_otp_verifications_destination_created
  ON acc.otp_verifications (destination, channel, created_at DESC);

CREATE INDEX idx_otp_verifications_expires_at
  ON acc.otp_verifications (expires_at);
