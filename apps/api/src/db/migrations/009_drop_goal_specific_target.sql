-- Migration 009: Remove specific_target column from goals table
-- The field was redundant given successMetric already captures the measurable target.

ALTER TABLE goals DROP COLUMN IF EXISTS specific_target;
