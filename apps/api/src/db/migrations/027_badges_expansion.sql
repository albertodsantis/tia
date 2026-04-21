-- ============================================================
-- BADGES EXPANSION: hábitos, rachas, leyenda, fundador
-- ============================================================

-- tasks: snapshot de la due_date original (para placa Cierre Limpio).
-- due_date es TEXT (ISO date), replicamos tipo.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_due_date TEXT;
UPDATE tasks SET original_due_date = due_date WHERE original_due_date IS NULL;

-- efisystem_summary: tracking persistente de racha y pipeline zen / semanas perfectas.
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS current_streak_days      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS longest_streak_days      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS last_active_date         DATE;
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS clean_pipeline_days      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS perfect_weeks_count      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE efisystem_summary ADD COLUMN IF NOT EXISTS perfect_weeks_month_key  TEXT;

-- ============================================================
-- Backfill: placa 'fundador' para los primeros 500 usuarios por created_at.
-- El copy público dice "etapa beta" — nunca exponer el número 500.
-- ============================================================
INSERT INTO efisystem_badges (user_id, badge_key, unlocked_at)
SELECT u.id, 'fundador', NOW()
FROM (
  SELECT id FROM users ORDER BY created_at ASC LIMIT 500
) u
ON CONFLICT (user_id, badge_key) DO NOTHING;
