-- ============================================================================
-- Phase 1.2: Text-to-SQL RAG Postgres Functions
-- ============================================================================
-- This migration creates two critical functions for the RAG system:
-- 1. match_schema() - Retrieves relevant schema context via vector similarity
-- 2. exec_sql_query() - Safely executes SELECT-only SQL queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 1: match_schema
-- ----------------------------------------------------------------------------
-- Purpose: Find relevant database schema objects using vector similarity search
-- Input:
--   - query_embedding: VECTOR(1536) - Embedding of user's question
--   - match_threshold: FLOAT - Minimum similarity score (0.0 to 1.0)
--   - match_count: INT - Maximum number of results to return
-- Output: Table with matching schema objects and similarity scores
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
    -- Calculate similarity: 1 - cosine_distance = cosine_similarity
    -- Higher score = more similar (0 = completely different, 1 = identical)
    1 - (schema_embeddings.embedding <=> query_embedding) AS similarity
  FROM schema_embeddings
  WHERE
    -- Only return results above similarity threshold
    1 - (schema_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY
    -- Order by distance (ascending) = order by similarity (descending)
    schema_embeddings.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION match_schema IS 'Retrieves relevant database schema objects using vector similarity search for Text-to-SQL RAG system';

-- ----------------------------------------------------------------------------
-- Function 2: exec_sql_query
-- ----------------------------------------------------------------------------
-- Purpose: Safely execute SELECT-only SQL queries for AI-generated queries
-- Input:
--   - sql_query: TEXT - The SQL query to execute (must be SELECT)
-- Output: JSON array of query results
-- Security: SECURITY DEFINER allows execution with function owner's privileges
--           but we validate to only allow SELECT queries
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exec_sql_query(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executes with function owner's privileges
SET search_path = public -- Prevent search_path attacks
AS $$
DECLARE
  result JSON;
  trimmed_query TEXT;
BEGIN
  -- Trim whitespace and convert to lowercase for validation
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

  -- Security Check 3: Block multiple statements (prevent SQL injection)
  IF trimmed_query ~* ';\s*(select|insert|update|delete|drop|create)' THEN
    RAISE EXCEPTION 'Multiple SQL statements are not allowed'
      USING HINT = 'Execute one SELECT query at a time';
  END IF;

  -- Execute the validated SELECT query and return as JSON array
  BEGIN
    EXECUTE FORMAT('SELECT json_agg(t) FROM (%s) AS t', sql_query)
    INTO result;

    -- Return empty array if no results (instead of NULL)
    RETURN COALESCE(result, '[]'::json);

  EXCEPTION
    WHEN OTHERS THEN
      -- Catch execution errors and return helpful message
      RAISE EXCEPTION 'Query execution failed: %', SQLERRM
        USING HINT = 'Check your SQL syntax and table/column names';
  END;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION exec_sql_query IS 'Safely executes SELECT-only SQL queries for AI-generated Text-to-SQL RAG system with security validations';

-- ----------------------------------------------------------------------------
-- Grant Permissions
-- ----------------------------------------------------------------------------
-- Grant execute permissions to authenticated users
-- Note: Adjust these based on your security requirements

-- Allow authenticated users to use match_schema
GRANT EXECUTE ON FUNCTION match_schema TO authenticated;
GRANT EXECUTE ON FUNCTION match_schema TO anon;

-- Allow authenticated users to use exec_sql_query
GRANT EXECUTE ON FUNCTION exec_sql_query TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_query TO anon;

-- ----------------------------------------------------------------------------
-- Verification Queries
-- ----------------------------------------------------------------------------
-- After migration, you can verify with:
--
-- 1. Check functions exist:
--    SELECT proname, prosrc FROM pg_proc WHERE proname IN ('match_schema', 'exec_sql_query');
--
-- 2. Test match_schema (will return no results until embeddings are added):
--    SELECT * FROM match_schema(ARRAY[0.1, 0.2, ...]::vector(1536), 0.5, 5);
--
-- 3. Test exec_sql_query:
--    SELECT exec_sql_query('SELECT 1 as test');
--
-- 4. Test security (should fail):
--    SELECT exec_sql_query('DROP TABLE test');
-- ----------------------------------------------------------------------------
