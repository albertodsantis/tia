-- ============================================================
-- GOOGLE CALENDAR: persist OAuth tokens on users table
-- so calendar connection survives session expiry
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gcal_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS gcal_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS gcal_token_expiry  TIMESTAMPTZ;
