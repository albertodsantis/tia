-- ============================================================
-- PROFESSION: add primary and secondary profession fields
-- to user_profile for onboarding personalization
-- ============================================================
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS primary_profession      TEXT,
  ADD COLUMN IF NOT EXISTS secondary_professions   JSONB NOT NULL DEFAULT '[]';
