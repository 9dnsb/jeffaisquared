-- ============================================================================
-- Verify Toronto Timezone Data
-- ============================================================================
-- This script confirms all timestamps are properly stored and interpreted
-- as Toronto time (America/Toronto)
-- ============================================================================

-- Check current database timezone setting
SHOW timezone;

-- Sample some order timestamps and show them in different timezones
SELECT
  "date" as original_timestamp,
  "date" AT TIME ZONE 'America/Toronto' as toronto_time,
  "date" AT TIME ZONE 'UTC' as utc_time,
  "date" AT TIME ZONE 'America/Los_Angeles' as la_time,
  EXTRACT(TIMEZONE FROM "date") / 3600 as timezone_offset_hours
FROM orders
ORDER BY "date" DESC
LIMIT 5;

-- Verify business hours distribution (should peak 11 AM - 6 PM Toronto time)
SELECT
  EXTRACT(HOUR FROM "date" AT TIME ZONE 'America/Toronto') as hour_of_day,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour_of_day
ORDER BY hour_of_day;

-- Check if any orders have unexpected timezone offsets
SELECT
  DISTINCT EXTRACT(TIMEZONE FROM "date") / 3600 as timezone_offset_hours,
  COUNT(*) as count
FROM orders
GROUP BY timezone_offset_hours
ORDER BY timezone_offset_hours;
