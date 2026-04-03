-- ============================================================
-- EFISYSTEM: gamification layer
-- ============================================================

-- Point ledger: every award is an append-only row
CREATE TABLE efisystem_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  points      INTEGER     NOT NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_efisystem_tx_user_id ON efisystem_transactions (user_id);
CREATE INDEX idx_efisystem_tx_user_event_date
  ON efisystem_transactions (user_id, event_type, created_at);

-- Badge registry: one row per user per badge; insert = unlock
CREATE TABLE efisystem_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key   TEXT        NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_efisystem_badges_user_id ON efisystem_badges (user_id);

-- Derived summary: cached total per user, updated on every award
CREATE TABLE efisystem_summary (
  user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points  INTEGER     NOT NULL DEFAULT 0,
  current_level INTEGER     NOT NULL DEFAULT 1,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
