-- ============================================================================
-- Combined Text-to-SQL RAG Migration
-- ============================================================================
-- This combines all 3 migrations needed for the RAG system
-- Apply this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Enable pgvector & Create schema_embeddings Table
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create schema embeddings table
CREATE TABLE IF NOT EXISTS schema_embeddings (
  id BIGSERIAL PRIMARY KEY,
  object_name TEXT NOT NULL UNIQUE,
  object_type TEXT NOT NULL,
  description TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by object name
CREATE INDEX IF NOT EXISTS idx_schema_embeddings_object_name ON schema_embeddings(object_name);

-- Create index for object type filtering
CREATE INDEX IF NOT EXISTS idx_schema_embeddings_object_type ON schema_embeddings(object_type);

-- Create HNSW index for vector similarity search (cosine distance)
-- Using optimal parameters for small dataset: m=16, ef_construction=64
CREATE INDEX IF NOT EXISTS idx_schema_embeddings_vector ON schema_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_schema_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schema_embeddings_updated_at ON schema_embeddings;

CREATE TRIGGER schema_embeddings_updated_at
  BEFORE UPDATE ON schema_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_schema_embeddings_updated_at();

-- ============================================================================
-- PART 2: Create RAG Functions (match_schema, exec_sql_query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 1: match_schema
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_schema (
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  object_name TEXT,
  object_type TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schema_embeddings.id,
    schema_embeddings.object_name,
    schema_embeddings.object_type,
    schema_embeddings.description,
    1 - (schema_embeddings.embedding <=> query_embedding) AS similarity
  FROM schema_embeddings
  WHERE
    1 - (schema_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY
    schema_embeddings.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_schema IS 'Retrieves relevant database schema objects using vector similarity search for Text-to-SQL RAG system';

-- ----------------------------------------------------------------------------
-- Function 2: exec_sql_query
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION exec_sql_query(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  trimmed_query TEXT;
BEGIN
  trimmed_query := LOWER(TRIM(sql_query));

  -- Security Check 1: Must start with SELECT
  IF POSITION('select' IN trimmed_query) != 1 THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed. Query must start with SELECT.'
      USING HINT = 'Attempted query: ' || LEFT(sql_query, 100);
  END IF;

  -- Security Check 2: Block dangerous keywords
  IF trimmed_query ~* '\y(insert|update|delete|drop|truncate|alter|create|grant|revoke)\y' THEN
    RAISE EXCEPTION 'Query contains forbidden SQL keywords (INSERT, UPDATE, DELETE, DROP, etc.)'
      USING HINT = 'Only SELECT queries are permitted';
  END IF;

  -- Security Check 3: Block multiple statements
  IF trimmed_query ~* ';\s*(select|insert|update|delete|drop|create)' THEN
    RAISE EXCEPTION 'Multiple SQL statements are not allowed'
      USING HINT = 'Execute one SELECT query at a time';
  END IF;

  -- Execute the validated SELECT query
  BEGIN
    EXECUTE FORMAT('SELECT json_agg(t) FROM (%s) AS t', sql_query)
    INTO result;

    RETURN COALESCE(result, '[]'::json);

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Query execution failed: %', SQLERRM
        USING HINT = 'Check your SQL syntax and table/column names';
  END;
END;
$$;

COMMENT ON FUNCTION exec_sql_query IS 'Safely executes SELECT-only SQL queries for AI-generated Text-to-SQL RAG system with security validations';

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_schema TO authenticated;
GRANT EXECUTE ON FUNCTION match_schema TO anon;
GRANT EXECUTE ON FUNCTION exec_sql_query TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_query TO anon;

-- ============================================================================
-- PART 3: Create Helper Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 3: insert_schema_embedding
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION insert_schema_embedding(
  p_object_name TEXT,
  p_object_type TEXT,
  p_description TEXT,
  p_embedding VECTOR(1536)
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO schema_embeddings (object_name, object_type, description, embedding)
  VALUES (p_object_name, p_object_type, p_description, p_embedding)
  ON CONFLICT (object_name) DO UPDATE SET
    description = EXCLUDED.description,
    embedding = EXCLUDED.embedding,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_schema_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION insert_schema_embedding TO anon;

COMMENT ON FUNCTION insert_schema_embedding IS 'Inserts or updates schema embeddings for Text-to-SQL RAG system';

-- ----------------------------------------------------------------------------
-- Function 4: clear_schema_embeddings
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_schema_embeddings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM schema_embeddings;
  DELETE FROM schema_embeddings;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION clear_schema_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION clear_schema_embeddings TO anon;
GRANT EXECUTE ON FUNCTION clear_schema_embeddings TO service_role;

-- Grant table and sequence permissions for service_role
GRANT ALL ON TABLE schema_embeddings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE schema_embeddings_id_seq TO service_role;

COMMENT ON FUNCTION clear_schema_embeddings IS 'Clears all schema embeddings and returns count of deleted rows';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after migration to verify everything works:

-- 1. Check table exists
-- SELECT COUNT(*) FROM schema_embeddings;

-- 2. Check functions exist
-- SELECT proname FROM pg_proc WHERE proname IN ('match_schema', 'exec_sql_query', 'insert_schema_embedding', 'clear_schema_embeddings');

-- 3. Test exec_sql_query (should return [{"test":1}])
-- SELECT exec_sql_query('SELECT 1 as test');

-- 4. Test security (should fail)
-- SELECT exec_sql_query('DROP TABLE orders');

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Next: Run scripts/generate-embeddings.ts to populate schema_embeddings
-- ============================================================================
