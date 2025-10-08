-- Check current state
SELECT
  EXTRACT(HOUR FROM "date") as hour,
  COUNT(*) as count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY hour
ORDER BY count DESC
LIMIT 5;
