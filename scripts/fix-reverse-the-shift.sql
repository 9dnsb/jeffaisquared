-- ============================================================================
-- Fix: Reverse the Timezone Shift
-- ============================================================================
-- The previous update shifted times in the wrong direction
-- We need to reverse it by doing the opposite conversion
-- ============================================================================

-- EXPLANATION:
-- Current state: Peak hours 4-8 UTC (midnight - 4 AM Toronto) - WRONG
-- We did: UTC -> strip tz -> interpret as Toronto -> store as UTC
-- This SUBTRACTED 4 hours from the original times
--
-- We need to ADD 8 hours total (4 to undo + 4 to go the right direction)
-- Or simply: do the REVERSE conversion

-- Test first with a single month to verify
UPDATE orders
SET "date" = timezone('UTC', timezone('America/Toronto', "date"))
WHERE "date" >= '2025-10-01'::timestamptz AND "date" < '2025-10-02'::timestamptz;

-- Check the result
SELECT
  EXTRACT(HOUR FROM "date") as hour_utc,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
  AND "date" >= '2025-10-01'::timestamptz
  AND "date" < '2025-10-02'::timestamptz
GROUP BY hour_utc
ORDER BY hour_utc;
