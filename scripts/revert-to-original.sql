-- ============================================================================
-- Revert to Original Timestamps
-- ============================================================================
-- This reverses the timezone conversion we did
-- Original peak was 16-23 UTC, we shifted to 4-7 UTC, now revert back
-- ============================================================================

-- Subtract the interval we added (reverse the conversion)
-- Our conversion subtracted ~12 hours, so add them back
UPDATE orders
SET "date" = ("date" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Also revert createdAt and updatedAt if we updated those
UPDATE orders
SET "createdAt" = ("createdAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE orders
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Verify we're back to original state (peak should be 16-23 UTC)
SELECT
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour
ORDER BY count DESC
LIMIT 10;
