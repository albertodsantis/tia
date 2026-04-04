ALTER TABLE tasks ADD COLUMN checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb;
