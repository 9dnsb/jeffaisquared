-- ============================================================================
-- Revert Other Tables (if we updated them)
-- ============================================================================

-- Profiles
UPDATE profiles
SET created_at = (created_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE profiles
SET updated_at = (updated_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Categories
UPDATE categories
SET "createdAt" = ("createdAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE categories
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Locations
UPDATE locations
SET "createdAt" = ("createdAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE locations
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Items
UPDATE items
SET "createdAt" = ("createdAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE items
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Line Items
UPDATE line_items
SET "createdAt" = ("createdAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE line_items
SET "updatedAt" = ("updatedAt" AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Conversations
UPDATE conversations
SET created_at = (created_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE conversations
SET updated_at = (updated_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Chat Messages
UPDATE chat_messages
SET created_at = (created_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE chat_messages
SET updated_at = (updated_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

-- Schema Embeddings
UPDATE schema_embeddings
SET created_at = (created_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

UPDATE schema_embeddings
SET updated_at = (updated_at AT TIME ZONE 'America/Toronto') AT TIME ZONE 'UTC';

SELECT 'All tables reverted to original timestamps' as status;
