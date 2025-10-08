-- ============================================================================
-- STEP 3: Convert All Other Tables (Fast - smaller tables)
-- ============================================================================

SET TIME ZONE 'America/Toronto';

-- Table: profiles
ALTER TABLE profiles
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';
ALTER TABLE profiles
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- Table: categories
ALTER TABLE categories
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';
ALTER TABLE categories
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- Table: locations
ALTER TABLE locations
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';
ALTER TABLE locations
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- Table: items
ALTER TABLE items
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';
ALTER TABLE items
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- Table: line_items
ALTER TABLE line_items
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'America/Toronto';
ALTER TABLE line_items
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'America/Toronto';

-- Table: conversations
ALTER TABLE conversations
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';
ALTER TABLE conversations
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- Table: chat_messages
ALTER TABLE chat_messages
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';
ALTER TABLE chat_messages
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

-- Table: schema_embeddings
ALTER TABLE schema_embeddings
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'America/Toronto';
ALTER TABLE schema_embeddings
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'America/Toronto';

RESET TIME ZONE;

SELECT 'All other tables converted successfully!' as status;
