-- ============================================================
-- MULTI-TENANT: scope all data tables by user_id
-- ============================================================

-- 1. User profile: remove singleton constraint, add user_id, fix id auto-increment
ALTER TABLE user_profile DROP CONSTRAINT IF EXISTS user_profile_id_check;
CREATE SEQUENCE IF NOT EXISTS user_profile_id_seq OWNED BY user_profile.id;
SELECT setval('user_profile_id_seq', COALESCE((SELECT MAX(id) FROM user_profile), 0) + 1, false);
ALTER TABLE user_profile ALTER COLUMN id SET DEFAULT nextval('user_profile_id_seq');
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

-- 2. User settings: remove singleton constraint, add user_id, fix id auto-increment
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_id_check;
CREATE SEQUENCE IF NOT EXISTS user_settings_id_seq OWNED BY user_settings.id;
SELECT setval('user_settings_id_seq', COALESCE((SELECT MAX(id) FROM user_settings), 0) + 1, false);
ALTER TABLE user_settings ALTER COLUMN id SET DEFAULT nextval('user_settings_id_seq');
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 3. Goals: add user_id
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- 4. Tasks: add user_id
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- 5. Partners: add user_id
ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- 6. Contacts: add user_id (for direct query efficiency)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- 7. Templates: add user_id
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- 8. Task status history: add user_id
ALTER TABLE task_status_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_task_status_history_user_id ON task_status_history(user_id);

-- 9. Partner status history: add user_id
ALTER TABLE partner_status_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_partner_status_history_user_id ON partner_status_history(user_id);

-- Clean up orphaned singleton data (no user_id = old seed/test data)
DELETE FROM task_status_history WHERE user_id IS NULL;
DELETE FROM partner_status_history WHERE user_id IS NULL;
DELETE FROM contacts WHERE user_id IS NULL;
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM partners WHERE user_id IS NULL;
DELETE FROM goals WHERE user_id IS NULL;
DELETE FROM templates WHERE user_id IS NULL;
DELETE FROM user_settings WHERE user_id IS NULL;
DELETE FROM user_profile WHERE user_id IS NULL;
