-- ============================================================
-- Remove subject column from templates table
-- ============================================================
ALTER TABLE templates DROP COLUMN IF EXISTS subject;
