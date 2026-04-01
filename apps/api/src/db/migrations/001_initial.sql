-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SESSION TABLE (required by connect-pg-simple)
-- ============================================================
CREATE TABLE "session" (
  "sid"    VARCHAR NOT NULL PRIMARY KEY,
  "sess"   JSON    NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- ============================================================
-- PARTNERS
-- ============================================================
CREATE TABLE partners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  name_lookup      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Prospecto',
  logo             TEXT,
  partnership_type TEXT NOT NULL DEFAULT 'Por definir',
  key_terms        TEXT NOT NULL DEFAULT '',
  start_date       TEXT,
  end_date         TEXT,
  monthly_revenue  NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_revenue   NUMERIC(12,2) NOT NULL DEFAULT 0,
  main_channel     TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_partners_name_lookup ON partners (name_lookup);

-- ============================================================
-- CONTACTS (belong to a partner)
-- ============================================================
CREATE TABLE contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  email      TEXT NOT NULL,
  ig         TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_partner_id ON contacts (partner_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  partner_id    UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'Pendiente',
  due_date      TEXT NOT NULL,
  value         NUMERIC(12,2) NOT NULL DEFAULT 0,
  gcal_event_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_partner_id ON tasks (partner_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);
CREATE INDEX idx_tasks_status ON tasks (status);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROFILE (single row)
-- ============================================================
CREATE TABLE user_profile (
  id                    INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name                  TEXT NOT NULL DEFAULT '',
  avatar                TEXT NOT NULL DEFAULT '',
  handle                TEXT NOT NULL DEFAULT '',
  bio                   TEXT,
  social_profiles       JSONB NOT NULL DEFAULT '{}',
  media_kit             JSONB NOT NULL DEFAULT '{}',
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GOALS (belong to user profile)
-- ============================================================
CREATE TABLE goals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area               TEXT NOT NULL DEFAULT '',
  general_goal       TEXT NOT NULL DEFAULT '',
  success_metric     TEXT NOT NULL DEFAULT '',
  specific_target    TEXT NOT NULL DEFAULT '',
  timeframe          TEXT NOT NULL DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'Pendiente',
  priority           TEXT NOT NULL DEFAULT 'Media',
  revenue_estimation NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER SETTINGS (single row)
-- ============================================================
CREATE TABLE user_settings (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  accent_color TEXT NOT NULL DEFAULT '#C96F5B',
  theme        TEXT NOT NULL DEFAULT 'light',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED: ensure single rows exist for profile and settings
-- ============================================================
INSERT INTO user_profile (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO user_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
