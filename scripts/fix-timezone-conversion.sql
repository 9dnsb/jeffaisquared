-- ============================================================================
-- Fix Timezone Conversion
-- ============================================================================
-- The previous migration converted column types but didn't properly interpret
-- the timestamps as Toronto time. This script fixes that.
--
-- IMPORTANT: This will rewrite 361k+ rows in the orders table.
-- Expected runtime: 2-3 minutes
-- ============================================================================

SET TIME ZONE 'America/Toronto';

-- The issue: When we did "USING date AT TIME ZONE 'America/Toronto'",
-- PostgreSQL interpreted the timestamp (which had NO timezone info) as being
-- IN the America/Toronto zone and converted it TO UTC (the storage format).
--
-- We need to do the OPPOSITE: interpret the timestamp as UTC and convert it
-- TO America/Toronto, then store it (which will convert back to UTC with offset).
--
-- WAIT - Let me first check what the actual timestamps look like to understand
-- if they're already correct or not.

-- Show sample data before any changes
SELECT
  "date" as stored_timestamp,
  "date" AT TIME ZONE 'UTC' as if_utc,
  "date" AT TIME ZONE 'America/Toronto' as if_toronto,
  EXTRACT(HOUR FROM "date") as stored_hour,
  EXTRACT(HOUR FROM "date" AT TIME ZONE 'America/Toronto') as toronto_hour
FROM orders
WHERE state = 'COMPLETED'
  AND "date" >= '2025-10-07'::date
  AND "date" < '2025-10-08'::date
ORDER BY "date"
LIMIT 10;
