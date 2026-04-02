-- Fix partners name_lookup uniqueness to be scoped per user instead of global.
-- The original index from 001_initial.sql was created before multi-tenancy existed.
DROP INDEX IF EXISTS idx_partners_name_lookup;
CREATE UNIQUE INDEX idx_partners_name_lookup ON partners (user_id, name_lookup);
