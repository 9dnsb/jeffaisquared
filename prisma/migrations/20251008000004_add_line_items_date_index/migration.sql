-- ============================================================================
-- Add Line Items Date Index for Item Revenue Queries
-- ============================================================================
-- Optimizes queries that filter line_items by date for item-specific analysis
-- (e.g., "What was Latte revenue in August?")
-- ============================================================================

-- Create BRIN index on line_items.createdAt for time-series queries
CREATE INDEX IF NOT EXISTS idx_line_items_created_at ON line_items USING brin("createdAt");

-- Create composite index for item revenue queries (itemId + date + price)
CREATE INDEX IF NOT EXISTS idx_line_items_item_date_revenue ON line_items ("itemId", "createdAt", "totalPriceAmount");

-- Run ANALYZE to update query planner statistics
ANALYZE line_items;
