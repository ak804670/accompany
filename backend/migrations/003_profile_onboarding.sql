DO $$
BEGIN
  IF to_regclass('acc.m_profiles') IS NULL THEN
    RAISE EXCEPTION 'acc.m_profiles is missing. Apply database/migrations before profile onboarding.';
  END IF;
END $$;

ALTER TABLE acc.m_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT NOT NULL DEFAULT 'basics';

ALTER TABLE acc.m_profiles
  DROP CONSTRAINT IF EXISTS chk_m_profiles_onboarding_step;

ALTER TABLE acc.m_profiles
  ADD CONSTRAINT chk_m_profiles_onboarding_step CHECK (
    onboarding_step IN ('basics', 'photo', 'about', 'interests', 'preferences', 'review', 'complete')
  );
