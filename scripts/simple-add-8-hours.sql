-- ============================================================================
-- Simple Fix: Add 8 Hours
-- ============================================================================
-- Current peak: 4-7 UTC
-- Target peak: 12-15 UTC (which is 8 AM - 11 AM Toronto = reasonable)
-- Difference: +8 hours
-- ============================================================================

-- Test with October 2025 data first
UPDATE orders
SET "date" = "date" + INTERVAL '8 hours'
WHERE "date" >= '2025-10-01'::timestamptz
  AND "date" < '2025-10-09'::timestamptz;

-- Check result for just this range
SELECT
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
  AND "date" >= '2025-10-01'::timestamptz
  AND "date" < '2025-10-09'::timestamptz
GROUP BY hour
ORDER BY count DESC;
