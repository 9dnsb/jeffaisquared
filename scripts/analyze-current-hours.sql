-- ============================================================================
-- Analyze Current Hour Distribution
-- ============================================================================
-- Check what hours orders are currently showing up in
-- ============================================================================

-- Show hour distribution for all orders
SELECT
  EXTRACT(HOUR FROM "date") as current_hour_stored,
  COUNT(*) as order_count
FROM orders
WHERE state = 'COMPLETED'
GROUP BY current_hour_stored
ORDER BY order_count DESC;
