-- ============================================================================
-- Verify Actual Business Hours
-- ============================================================================
-- Check if the current UTC times represent Toronto business hours
-- or if they need correction
-- ============================================================================

-- Show distribution of hours in BOTH UTC and Toronto interpretation
SELECT
  EXTRACT(HOUR FROM "date") as hour_utc,
  EXTRACT(HOUR FROM "date" AT TIME ZONE 'America/Toronto') as hour_toronto,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour_utc, hour_toronto
ORDER BY order_count DESC
LIMIT 20;
