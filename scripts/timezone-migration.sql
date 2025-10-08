-- ============================================================================
-- Timezone Migration: Convert all timestamp columns to timestamptz
-- ============================================================================
-- This migration converts all DateTime columns from "timestamp without time zone"
-- to "timestamp with time zone" (timestamptz), interpreting existing timestamps
-- as America/Toronto time.
--
-- IMPORTANT: This assumes your current data is already in Toronto time.
-- Based on business hours analysis, this is confirmed to be true.
-- ============================================================================

-- Set session timezone to America/Toronto for this migration
SET TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: profiles
-- ============================================================================
ALTER TABLE profiles
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';

ALTER TABLE profiles
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: categories
-- ============================================================================
ALTER TABLE categories
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';

ALTER TABLE categories
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: locations
-- ============================================================================
ALTER TABLE locations
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';

ALTER TABLE locations
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: items
-- ============================================================================
ALTER TABLE items
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';

ALTER TABLE items
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: orders (MOST IMPORTANT - includes transaction date)
-- ============================================================================
ALTER TABLE orders
  ALTER COLUMN "date" TYPE timestamptz USING "date" AT TIME ZONE 'America/Toronto';

ALTER TABLE orders
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';

ALTER TABLE orders
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: line_items
-- ============================================================================
ALTER TABLE line_items
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';

ALTER TABLE line_items
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: conversations
-- ============================================================================
ALTER TABLE conversations
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';

ALTER TABLE conversations
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: chat_messages
-- ============================================================================
ALTER TABLE chat_messages
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';

ALTER TABLE chat_messages
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Table: schema_embeddings
-- ============================================================================
ALTER TABLE schema_embeddings
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';

ALTER TABLE schema_embeddings
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- After migration, verify the changes:
--
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND data_type LIKE '%timestamp%'
-- ORDER BY table_name, ordinal_position;
--
-- You should see "timestamp with time zone" for all datetime columns
-- ============================================================================

-- Reset session timezone
RESET TIME ZONE;

SELECT 'Timezone migration completed successfully!' as status;
