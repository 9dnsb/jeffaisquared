-- ============================================================================
-- Correct Timezone Interpretation
-- ============================================================================
-- The timestamps are currently stored as UTC, but they should be interpreted
-- as Toronto time. This means we need to SUBTRACT the Toronto offset to get
-- the correct UTC storage value.
--
-- Example: If a timestamp shows "2025-10-07 15:00:00+00" (3 PM UTC)
--          but it should be "2025-10-07 15:00:00-04" (3 PM Toronto = 7 PM UTC)
--          we need to ADD 4 hours to convert it properly.
--
-- WAIT - Let me think about this more carefully...
-- ============================================================================

-- First, let's verify what the business hours look like NOW
SELECT
  EXTRACT(HOUR FROM "date") as hour_utc,
  EXTRACT(HOUR FROM "date" AT TIME ZONE 'America/Toronto') as hour_toronto,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
  AND "date" >= '2025-10-07'::timestamptz
  AND "date" < '2025-10-08'::timestamptz
GROUP BY hour_utc, hour_toronto
ORDER BY count DESC
LIMIT 10;
