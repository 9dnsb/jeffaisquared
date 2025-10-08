-- ============================================================================
-- Final Timezone Verification - CORRECT METHOD
-- ============================================================================

-- Check sample timestamps with proper timezone display
SELECT
  "date",
  to_char("date", 'YYYY-MM-DD HH24:MI:SS TZ') as formatted_with_tz,
  EXTRACT(TIMEZONE_HOUR FROM "date") as tz_offset_hours
FROM orders
ORDER BY "date" DESC
LIMIT 10;

-- Verify business hours in Toronto time (should peak 11 AM - 6 PM)
SELECT
  EXTRACT(HOUR FROM "date") as hour_of_day_toronto,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour_of_day_toronto
ORDER BY hour_of_day_toronto;

-- Confirm timezone offset distribution
-- Should show -4 for EDT (summer) and -5 for EST (winter)
SELECT
  EXTRACT(TIMEZONE_HOUR FROM "date") as timezone_offset_hours,
  COUNT(*) as count,
  MIN("date"::date) as earliest_date,
  MAX("date"::date) as latest_date
FROM orders
GROUP BY timezone_offset_hours
ORDER BY timezone_offset_hours;
