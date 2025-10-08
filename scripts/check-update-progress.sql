-- ============================================================================
-- Check Update Progress
-- ============================================================================

-- Show hour distribution by year to see which data has been updated
SELECT
  EXTRACT(YEAR FROM "date") as year,
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY year, hour
ORDER BY year, count DESC
LIMIT 50;
