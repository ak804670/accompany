ALTER TABLE acc.m_profiles
  ADD COLUMN IF NOT EXISTS account_intent TEXT NOT NULL DEFAULT 'provider',
  ADD COLUMN IF NOT EXISTS support_role TEXT,
  ADD COLUMN IF NOT EXISTS expert_subject TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE acc.m_profiles ALTER COLUMN onboarding_step SET DEFAULT 'intent';

UPDATE acc.m_profiles
SET account_intent = CASE WHEN onboarding_step = 'complete' THEN 'provider' ELSE 'provider' END,
    support_role = CASE WHEN onboarding_step = 'complete' THEN 'friendly' ELSE NULL END
WHERE support_role IS NULL;

ALTER TABLE acc.m_profiles DROP CONSTRAINT IF EXISTS chk_m_profiles_onboarding_step;
ALTER TABLE acc.m_profiles ADD CONSTRAINT chk_m_profiles_onboarding_step CHECK (
  onboarding_step IN ('intent', 'role', 'certificate', 'basics', 'gender', 'location', 'photo', 'about', 'interests', 'preferences', 'rates', 'review', 'complete')
);
ALTER TABLE acc.m_profiles DROP CONSTRAINT IF EXISTS chk_m_profiles_intent;
ALTER TABLE acc.m_profiles ADD CONSTRAINT chk_m_profiles_intent CHECK (account_intent IN ('anonymous', 'provider'));
ALTER TABLE acc.m_profiles DROP CONSTRAINT IF EXISTS chk_m_profiles_role;
ALTER TABLE acc.m_profiles ADD CONSTRAINT chk_m_profiles_role CHECK (support_role IS NULL OR support_role IN ('friendly', 'astrologer', 'counselor', 'expert'));
ALTER TABLE acc.m_profiles DROP CONSTRAINT IF EXISTS chk_m_profiles_verification;
ALTER TABLE acc.m_profiles ADD CONSTRAINT chk_m_profiles_verification CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE acc.m_profiles DROP CONSTRAINT IF EXISTS chk_m_profiles_expert_subject;
ALTER TABLE acc.m_profiles ADD CONSTRAINT chk_m_profiles_expert_subject CHECK ((support_role = 'expert' AND length(btrim(expert_subject)) BETWEEN 2 AND 80) OR (support_role IS DISTINCT FROM 'expert' AND expert_subject IS NULL));

CREATE TABLE IF NOT EXISTS acc.m_support_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES acc.m_users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  support_role TEXT NOT NULL CHECK (support_role IN ('astrologer', 'counselor', 'expert')),
  expert_subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_support_credentials_match ON acc.m_support_credentials(user_id, support_role, expert_subject, status);
CREATE INDEX IF NOT EXISTS ix_profiles_discovery_intent ON acc.m_profiles(profile_status, account_intent);

UPDATE acc.m_profiles p SET profile_status = 'hidden'
WHERE p.account_intent = 'anonymous' AND p.profile_status = 'active';
