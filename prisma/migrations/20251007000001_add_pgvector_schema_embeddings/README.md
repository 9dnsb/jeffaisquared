# pgvector Schema Embeddings Migration

## Overview

This migration sets up the pgvector extension and creates the `schema_embeddings` table for Text-to-SQL RAG functionality.

## What This Migration Does

1. **Enables pgvector extension** - Adds vector similarity search capabilities to PostgreSQL
2. **Creates schema_embeddings table** - Stores database schema metadata with embeddings
3. **Creates indexes** - Optimizes lookups and vector similarity searches
4. **Sets up triggers** - Auto-updates `updated_at` timestamp

## Table Structure

```sql
schema_embeddings (
  id BIGSERIAL PRIMARY KEY,
  object_name TEXT NOT NULL,           -- e.g., "orders", "line_items.quantity"
  object_type TEXT NOT NULL,           -- e.g., "table", "column", "relationship"
  description TEXT NOT NULL,           -- Human-readable description
  embedding VECTOR(1536) NOT NULL,     -- OpenAI text-embedding-3-small
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

## Indexes

- `idx_schema_embeddings_object_name` - Fast lookups by object name
- `idx_schema_embeddings_object_type` - Filter by type (table/column/relationship)
- `idx_schema_embeddings_vector` - HNSW index for vector similarity search

## HNSW Index Parameters

- **m = 16** - Number of connections per layer (balanced performance)
- **ef_construction = 64** - Build-time search depth
- **Distance function** - Cosine distance (`vector_cosine_ops`)

These parameters are optimized for small datasets (<10,000 embeddings).

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Copy contents of `migration.sql`
4. Click **Run**

### Option 2: Run Helper Script

```bash
npx tsx scripts/apply-pgvector-migration.ts
```

This will display the SQL and instructions.

## Verification

After running the migration, verify:

1. **Extension enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

2. **Table created:**
   ```sql
   SELECT * FROM schema_embeddings LIMIT 1;
   ```

3. **Indexes created:**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'schema_embeddings';
   ```

## Next Steps

After this migration:

1. ✅ Prisma schema already updated (see `prisma/schema.prisma`)
2. ➡️ Proceed to Phase 1.2: Create Postgres Functions (`match_schema`, `exec_sql_query`)
3. ➡️ Then Phase 2: Generate and store schema embeddings

## Rollback

To rollback this migration:

```sql
DROP TABLE IF EXISTS schema_embeddings CASCADE;
DROP EXTENSION IF EXISTS vector CASCADE;
```

## Related Files

- `prisma/schema.prisma` - Prisma model for SchemaEmbedding
- `scripts/apply-pgvector-migration.ts` - Migration helper script
- `TEXT_TO_SQL_RAG_GAMEPLAN.md` - Complete implementation plan
