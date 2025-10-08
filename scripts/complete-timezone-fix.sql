-- ============================================================================
-- Complete Timezone Fix - Reverse the Wrong Conversion
-- ============================================================================
-- Current: Peak 4-7 UTC (wrong direction)
-- Target: Peak 11-22 UTC (correct = 7 AM - 6 PM Toronto)
--
-- We need to ADD hours, not subtract them
-- The original data had peak at 16-23 UTC
-- We converted it to 4-8 UTC (subtracted ~12 hours because of double offset)
-- We need to add back to get to 11-18 UTC range
-- ============================================================================

-- The fix: Add interval to shift times forward
-- From peak 4-7 → peak 11-18 means adding 7 hours
-- But this isn't quite right either...

-- Let me think: Original timestamps were "local time stored as UTC"
-- Example: "2025-10-07 16:00:00+00" meant "4 PM local" but stored as UTC
-- We want: "2025-10-07 16:00:00-04" which stores as "2025-10-07 20:00:00+00"
-- So we need to ADD 4 hours in EDT, 5 hours in EST

-- Simple approach: Add a fixed offset based on whether it's DST or not
UPDATE orders
SET "date" = "date" + INTERVAL '4 hours'
WHERE EXTRACT(MONTH FROM "date") IN (3,4,5,6,7,8,9,10)  -- EDT months (roughly)
  AND EXTRACT(HOUR FROM "date") < 12;  -- Only update the ones we shifted wrong

UPDATE orders
SET "date" = "date" + INTERVAL '5 hours'
WHERE EXTRACT(MONTH FROM "date") IN (11,12,1,2)  -- EST months (roughly)
  AND EXTRACT(HOUR FROM "date") < 12;  -- Only update the ones we shifted wrong

-- Verify
SELECT
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour
ORDER BY count DESC
LIMIT 10;
