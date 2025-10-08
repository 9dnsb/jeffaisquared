-- ============================================================================
-- Fix Step 2: Correct Orders Timezone Interpretation
-- ============================================================================
-- The timestamps are stored as UTC but represent Toronto local time.
-- We need to reinterpret them as Toronto time.
--
-- Current: "2025-10-07 16:00:00+00" (stored as 4 PM UTC)
-- Should be: "2025-10-07 16:00:00-04" (4 PM Toronto, stored as 8 PM UTC)
--
-- IMPORTANT: This will rewrite 361k+ rows in the orders table.
-- Expected runtime: 2-3 minutes
-- ============================================================================

-- Update orders.date column
-- We treat the current timestamp (which is in UTC) as if it's a local Toronto time
-- This effectively "shifts" the timestamp to the correct UTC value
UPDATE orders
SET "date" = (
  -- Remove timezone to get local time representation
  ("date" AT TIME ZONE 'UTC')
  -- Then interpret it as Toronto time (which converts to UTC storage)
  AT TIME ZONE 'America/Toronto'
);

SELECT 'Orders date column corrected!' as status;
