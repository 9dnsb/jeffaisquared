-- ============================================================================
-- Fix Step 3: Correct Other Timestamp Columns
-- ============================================================================
-- Apply the same correction to createdAt and updatedAt across all tables
-- ============================================================================

-- Orders table (createdAt, updatedAt)
UPDATE orders
SET "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE orders
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Profiles
UPDATE profiles
SET created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE profiles
SET updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Categories
UPDATE categories
SET "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE categories
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Locations
UPDATE locations
SET "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE locations
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Items
UPDATE items
SET "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE items
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Line Items
UPDATE line_items
SET "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE line_items
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Conversations
UPDATE conversations
SET created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE conversations
SET updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Chat Messages
UPDATE chat_messages
SET created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE chat_messages
SET updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

-- Schema Embeddings
UPDATE schema_embeddings
SET created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

UPDATE schema_embeddings
SET updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Toronto';

SELECT 'All timestamp columns corrected!' as status;
