-- ============================================================================
-- Verify Timezone Migration
-- ============================================================================
-- This script verifies all timestamp columns were converted to timestamptz
-- ============================================================================

-- Check all timestamp column types
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;
