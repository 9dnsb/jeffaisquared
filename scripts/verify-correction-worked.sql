-- ============================================================================
-- Verify Timezone Correction Worked
-- ============================================================================

-- Check hour distribution - should now show peak hours 11-18 (7 AM - 2 PM Toronto + 4 offset)
SELECT
  EXTRACT(HOUR FROM "date") as hour_utc,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour_utc
ORDER BY hour_utc;

-- Sample recent timestamps - should show proper Toronto offset
SELECT
  "date",
  "date"::text as text_format
FROM orders
ORDER BY "date" DESC
LIMIT 10;
