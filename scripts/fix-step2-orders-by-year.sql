-- ============================================================================
-- Fix Step 2: Correct Orders Timezone by Year
-- ============================================================================
-- Update one year at a time to avoid deadlock
-- Run each section separately
-- ============================================================================

-- First, check how many orders per year
SELECT
  EXTRACT(YEAR FROM "date") as year,
  COUNT(*) as order_count
FROM orders
GROUP BY year
ORDER BY year;

-- ============================================================================
-- Run these one at a time, waiting for each to complete
-- ============================================================================

-- 2023 orders
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto'
WHERE "date" >= '2023-01-01'::timestamptz
  AND "date" < '2024-01-01'::timestamptz;

-- 2024 orders
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto'
WHERE "date" >= '2024-01-01'::timestamptz
  AND "date" < '2025-01-01'::timestamptz;

-- 2025 orders
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto'
WHERE "date" >= '2025-01-01'::timestamptz
  AND "date" < '2026-01-01'::timestamptz;

SELECT 'Orders date column corrected!' as status;
