-- ============================================================
-- CUSTOM PROFESSION: free-text field for users who pick "other"
-- ============================================================
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS custom_profession TEXT;
