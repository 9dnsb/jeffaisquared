-- ============================================================================
-- STEP 1: Drop Views Only
-- ============================================================================
-- Run this first to remove view dependencies
-- ============================================================================

DROP VIEW IF EXISTS daily_sales_summary CASCADE;
DROP VIEW IF EXISTS location_performance CASCADE;
DROP VIEW IF EXISTS product_performance CASCADE;
DROP VIEW IF EXISTS business_overview CASCADE;

SELECT 'Views dropped successfully!' as status;
