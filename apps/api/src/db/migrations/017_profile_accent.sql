-- Separate accent color for the public profile page, independent of the app accent.
-- profile_force_dark: when true, forces dark mode on the public profile regardless of OS preference.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS profile_accent_color TEXT,
  ADD COLUMN IF NOT EXISTS profile_force_dark    BOOLEAN NOT NULL DEFAULT false;
