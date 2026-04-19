-- ============================================================
-- PERFORMANCE: composite indexes for hot multi-tenant queries.
-- These speed up WHERE user_id = X ORDER BY <col> patterns used
-- on every bootstrap / dashboard / list endpoint.
-- ============================================================

-- tasks: dashboard upcoming, listTasks (ORDER BY due_date)
CREATE INDEX IF NOT EXISTS idx_tasks_user_due
  ON tasks (user_id, due_date);

-- partners: listPartners (ORDER BY created_at)
CREATE INDEX IF NOT EXISTS idx_partners_user_created
  ON partners (user_id, created_at);

-- task_status_history: gamification + reporting (ORDER BY changed_at)
CREATE INDEX IF NOT EXISTS idx_task_status_history_user_changed
  ON task_status_history (user_id, changed_at DESC);

-- partner_status_history: analytics (ORDER BY changed_at)
CREATE INDEX IF NOT EXISTS idx_partner_status_history_user_changed
  ON partner_status_history (user_id, changed_at DESC);
