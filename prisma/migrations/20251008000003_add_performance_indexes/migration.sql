-- ============================================================================
-- Add Performance Optimization Indexes
-- ============================================================================
-- Based on Supabase optimization guide, this migration adds:
-- 1. BRIN index on orders.date (10x smaller for time-series data)
-- 2. Partial index for recent orders (most common queries)
-- 3. Composite index for top-selling items queries
-- ============================================================================

-- 1. Replace B-tree index with BRIN for date column (time-series optimization)
-- BRIN indexes are much smaller and faster for sequentially increasing values
DROP INDEX IF EXISTS "orders_date_idx";
CREATE INDEX idx_orders_date_brin ON orders USING brin(date);

-- 2. Composite index for date-based revenue queries
-- Optimized for time-based aggregations and filtering
CREATE INDEX idx_orders_date_revenue ON orders (date, "totalAmount");

-- 3. Composite index for top-selling items queries
-- Optimized for aggregations on item sales performance
CREATE INDEX idx_line_items_sales_performance ON line_items
  ("itemId", quantity, "totalPriceAmount")
WHERE "totalPriceAmount" > 0;

-- 4. Run ANALYZE to update statistics for query planner
ANALYZE orders;
ANALYZE line_items;
ANALYZE items;
