-- ============================================================================
-- Allow WITH clauses (CTEs) in exec_sql_query function
-- ============================================================================
-- This migration updates exec_sql_query to allow Common Table Expressions (WITH)
-- while maintaining security by blocking INSERT, UPDATE, DELETE, DROP, etc.
-- CTEs are read-only query syntax and pose no security risk.
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql_query(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executes with function owner's privileges
SET search_path = public -- Prevent search_path attacks
SET statement_timeout = '60s' -- Set 60-second timeout for query execution
AS $$
DECLARE
  result JSON;
  trimmed_query TEXT;
BEGIN
  -- Trim whitespace and convert to lowercase for validation
  trimmed_query := LOWER(TRIM(sql_query));

  -- Security Check 1: Must start with SELECT or WITH
  IF trimmed_query !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed. Query must start with SELECT or WITH.'
      USING HINT = 'Attempted query: ' || LEFT(sql_query, 100);
  END IF;

  -- Security Check 2: Block dangerous keywords
  IF trimmed_query ~* '\y(insert|update|delete|drop|truncate|alter|create|grant|revoke)\y' THEN
    RAISE EXCEPTION 'Query contains forbidden SQL keywords (INSERT, UPDATE, DELETE, DROP, etc.)'
      USING HINT = 'Only SELECT queries are permitted';
  END IF;

  -- Security Check 3: Block multiple statements (prevent SQL injection)
  IF trimmed_query ~* ';\s*(select|insert|update|delete|drop|create|with)' THEN
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
COMMENT ON FUNCTION exec_sql_query IS 'Safely executes SELECT-only SQL queries (including WITH clauses) for AI-generated Text-to-SQL RAG system with 60s timeout and security validations';
