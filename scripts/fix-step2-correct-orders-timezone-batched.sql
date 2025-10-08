-- ============================================================================
-- Fix Step 2: Correct Orders Timezone (BATCHED)
-- ============================================================================
-- Update in smaller batches to avoid deadlock
-- Run this script multiple times until it shows 0 rows updated
-- ============================================================================

-- Update orders.date column in batches of 10,000
UPDATE orders
SET "date" = (
  ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto'
)
WHERE id IN (
  SELECT id
  FROM orders
  WHERE "date"::text LIKE '%+00'  -- Only update rows still in UTC
  LIMIT 10000
);

-- Check progress
SELECT
  COUNT(*) as remaining_utc_rows
FROM orders
WHERE "date"::text LIKE '%+00';
