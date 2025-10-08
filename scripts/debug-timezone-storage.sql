-- ============================================================================
-- Debug Timezone Storage
-- ============================================================================

-- Show raw timestamp format
SELECT
  "date",
  "date"::text as text_representation,
  pg_typeof("date") as data_type
FROM orders
ORDER BY "date" DESC
LIMIT 5;

-- Check if the -04 offset is actually stored or just displayed
SELECT
  "date" AT TIME ZONE 'UTC' as utc_time,
  "date" as displayed_time,
  ("date" AT TIME ZONE 'UTC') = "date" as are_they_equal
FROM orders
ORDER BY "date" DESC
LIMIT 5;
