-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema embeddings table
CREATE TABLE IF NOT EXISTS schema_embeddings (
  id BIGSERIAL PRIMARY KEY,
  object_name TEXT NOT NULL,
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

CREATE TRIGGER schema_embeddings_updated_at
  BEFORE UPDATE ON schema_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_schema_embeddings_updated_at();
