-- ============================================================================
-- Fix Step 1: Drop Views Again
-- ============================================================================
-- We need to drop views before modifying the orders table
-- ============================================================================

DROP VIEW IF EXISTS daily_sales_summary CASCADE;
DROP VIEW IF EXISTS location_performance CASCADE;
DROP VIEW IF EXISTS product_performance CASCADE;
DROP VIEW IF EXISTS business_overview CASCADE;

SELECT 'Views dropped for timezone correction' as status;
