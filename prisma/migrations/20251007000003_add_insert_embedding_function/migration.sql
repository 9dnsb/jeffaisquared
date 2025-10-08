-- ============================================================================
-- Insert Embedding Function
-- ============================================================================
-- This function allows inserting embeddings into schema_embeddings table
-- Needed because the exec_sql_query function only allows SELECT queries
-- ============================================================================

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_schema_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION insert_schema_embedding TO anon;

COMMENT ON FUNCTION insert_schema_embedding IS 'Inserts or updates schema embeddings for Text-to-SQL RAG system';

-- ============================================================================
-- Clear Schema Embeddings Function
-- ============================================================================
-- Helper function to clear all schema embeddings (useful for regeneration)
-- ============================================================================

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION clear_schema_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION clear_schema_embeddings TO anon;

COMMENT ON FUNCTION clear_schema_embeddings IS 'Clears all schema embeddings and returns count of deleted rows';
