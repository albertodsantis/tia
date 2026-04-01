-- Convert timeframe from text labels to integer months,
-- and add target_date + created_at columns to goals.

ALTER TABLE goals
  ALTER COLUMN timeframe TYPE INTEGER USING (
    CASE timeframe
      WHEN '1 año'  THEN 12
      WHEN '2 años' THEN 24
      WHEN '3 años' THEN 36
      ELSE 12
    END
  );

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill target_date for rows that have no value yet
UPDATE goals
SET target_date = (NOW() + (timeframe || ' months')::INTERVAL)::DATE
WHERE target_date IS NULL;
