-- ============================================================
-- NOTIFICATIONS: track when user last viewed their notifications
-- ============================================================

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_seen_notifications_at TIMESTAMPTZ;
