# 🎯 Text-to-SQL RAG Implementation Gameplan

## Overview

This document outlines the comprehensive implementation plan for adding Text-to-SQL Retrieval-Augmented Generation (RAG) capabilities to our sales analytics platform. This will enable users to ask any natural language question about their sales data and receive accurate SQL-generated answers.

---

## Phase 1: Database Schema Setup

### 1.1 Enable pgvector & Create Schema Embeddings Table

**Objective:** Set up vector storage infrastructure in Supabase

**Tasks:**
- Enable `vector` extension in Supabase
- Create `schema_embeddings` table to store database schema metadata with vector embeddings
- Use OpenAI's `text-embedding-3-small` (1536 dimensions, cost-effective)

**SQL Schema:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

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
```

### 1.2 Create Postgres Functions

**Objective:** Implement safe schema retrieval and SQL execution functions

**Tasks:**
- Create `match_schema()` function for cosine similarity search
- Create `exec_sql_query()` function for safe SQL execution (SELECT-only)

**SQL Functions:**
```sql
-- Schema matching function
CREATE OR REPLACE FUNCTION match_schema (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
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
  WHERE 1 - (schema_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY schema_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Safe SQL execution function
CREATE OR REPLACE FUNCTION exec_sql_query(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow SELECT queries
  IF POSITION('select' IN LOWER(sql_query)) != 1 THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Execute query and return as JSON
  EXECUTE FORMAT('SELECT json_agg(t) FROM (%s) AS t', sql_query)
  INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
```

### 1.3 Prisma Schema Updates

**Objective:** Track schema_embeddings table in Prisma (for reference only)

**Tasks:**
- Add `SchemaEmbedding` model to Prisma schema
- Keep existing models intact - query via SQL, not Prisma

**Prisma Model:**
```prisma
model SchemaEmbedding {
  id          BigInt   @id @default(autoincrement())
  objectName  String   @map("object_name")
  objectType  String   @map("object_type")
  description String
  // Note: vector type not directly supported by Prisma
  // Will use raw SQL for vector operations
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("schema_embeddings")
}
```

---

## Phase 2: Schema Embedding Generation

### 2.1 Schema Documentation Script

**Objective:** Extract and document database schema in human-readable format

**Tasks:**
- Parse `prisma/schema.prisma` to extract models, fields, relationships
- Generate descriptive text for each table, column, and relationship
- Include index information for query optimization hints
- Include data type and constraint information

**Example Schema Descriptions:**
```
Table: orders
Description: Contains customer purchase orders with transaction details including date, total amount, location, and order state. Primary table for sales analytics.
Relationships: Related to line_items (one-to-many), locations (many-to-one)
Indexes: Optimized for date-based queries, location filtering, and amount aggregations
Key Fields:
  - date: Order transaction timestamp (indexed for time-based filtering)
  - total_amount: Total order value in cents (indexed for aggregations)
  - location_id: Reference to locations table (indexed with date)
  - state: Order state (COMPLETED, CANCELED, etc.)

Table: line_items
Description: Individual items within each order. Contains product details, quantities, pricing, and category information.
Relationships: Related to orders (many-to-one), items (many-to-one)
Indexes: Covering index for order+item queries, item revenue calculations
Key Fields:
  - quantity: Number of units ordered
  - total_price_amount: Line item total in cents (indexed for revenue calculations)
  - item_id: Reference to items catalog (indexed)
  - name: Product name
  - category: Item category for grouping

Table: items
Description: Product catalog containing all available items with categories and active status.
Relationships: Related to line_items (one-to-many), categories (many-to-one)
Indexes: Name lookups, category-based queries
Key Fields:
  - name: Product name (indexed for AI parameter extraction)
  - category: Product category (indexed)
  - is_active: Current availability status
```

### 2.2 Embedding Generation

**Objective:** Generate and store vector embeddings for schema descriptions

**Tasks:**
- Create utility script or API route for embedding generation
- Use OpenAI `text-embedding-3-small` model
- Store embeddings in `schema_embeddings` table
- Handle batch processing for all schema objects

**Implementation Location:**
- Script: `scripts/generate-schema-embeddings.ts`
- Or API route: `src/app/api/admin/generate-embeddings/route.ts`

**Process:**
1. Extract schema descriptions
2. Call OpenAI embeddings API
3. Insert into `schema_embeddings` table via Supabase client (raw SQL)
4. Verify embeddings stored correctly

---

## Phase 3: RAG API Route Implementation

### 3.1 Create `/app/api/text-to-sql/route.ts`

**Objective:** Implement streaming Text-to-SQL endpoint with RAG

**API Flow:**
1. **Receive user question** from chat interface
2. **Embed question** using OpenAI embeddings API
3. **Retrieve schema context** using `match_schema()` RPC
4. **Generate SQL** using OpenAI GPT-4o with schema context
5. **Execute SQL** using `exec_sql_query()` RPC
6. **Stream results** back to frontend via SSE

**Request Format:**
```typescript
POST /api/text-to-sql
{
  "question": "What were my top 5 selling items last month?",
  "conversationId": "optional-conversation-id"
}
```

**Response Format (SSE):**
```typescript
// Event: status
data: {"type":"status","message":"Analyzing question..."}

// Event: schema
data: {"type":"schema","context":["orders table...","line_items table..."]}

// Event: sql
data: {"type":"sql","query":"SELECT i.name, SUM(li.quantity)..."}

// Event: results
data: {"type":"results","data":[{"name":"Coffee","total":342}]}

// Event: complete
data: {"type":"complete"}
```

### 3.2 Query Generation Prompt Engineering

**Objective:** Design effective prompts for accurate SQL generation

**System Prompt Structure:**
```
You are a SQL query generator for a sales analytics database.

DATABASE SCHEMA:
{retrieved_schema_context}

GUIDELINES:
- Generate only SELECT queries
- Use proper table aliases
- Leverage indexed columns for filtering (date, location_id, item_id)
- Convert cents to dollars for currency display (amount / 100.0)
- Use proper date handling (date_trunc, intervals)
- Return results in JSON-compatible format
- Use proper GROUP BY for aggregations
- Order results meaningfully

EXAMPLE QUERIES:
{sample_queries}

USER QUESTION: {user_question}

Generate a PostgreSQL query that answers this question accurately.
```

**Function Calling Schema:**
```typescript
{
  name: "generate_sql",
  description: "Generate SQL query based on user question",
  parameters: {
    type: "object",
    properties: {
      sql: { type: "string", description: "PostgreSQL SELECT query" },
      explanation: { type: "string", description: "Human explanation of query" }
    },
    required: ["sql", "explanation"]
  }
}
```

### 3.3 Security & Validation

**Objective:** Ensure safe query execution

**Security Measures:**
- Enforce SELECT-only queries (validated in `exec_sql_query()`)
- Use read-only database role for API route
- Implement query timeout limits (10 seconds max)
- Rate limiting per user (10 queries per minute)
- Log all generated SQL for monitoring
- Sanitize error messages (don't expose schema details)

**Validation Steps:**
1. Check query starts with SELECT
2. Validate no DROP, INSERT, UPDATE, DELETE statements
3. Check for suspicious patterns (UNION, nested queries depth)
4. Timeout protection
5. Result size limits (max 1000 rows)

---

## Phase 4: Frontend Integration

### 4.1 Update Chat Interface

**Objective:** Add streaming query execution UI

**Tasks:**
- Implement SSE event handler in chat component
- Display query generation progress
- Show generated SQL with syntax highlighting
- Render results as formatted tables
- Handle errors gracefully

**UI Flow:**
```
User Input: "What were my top 5 selling items last month?"

Display:
🧠 Analyzing your question...
   ↓
🔍 Retrieved schema context: orders, line_items, items
   ↓
🧩 Generating SQL query...
   [Show generated SQL with syntax highlighting]
   ↓
🚀 Executing query...
   ↓
📊 Results:
   [Formatted table with data]
```

### 4.2 Result Visualization

**Objective:** Display query results in user-friendly format

**Features:**
- **Tables:** Formatted data tables with sorting
- **Charts:** Auto-generate charts for aggregations (optional)
- **SQL Display:** Show generated SQL (collapsible)
- **Export:** Download results as CSV/JSON
- **Refinement:** "Refine this query" button to adjust

**Component Structure:**
```typescript
interface QueryResultProps {
  sql: string
  results: Record<string, unknown>[]
  explanation: string
  onRefine?: () => void
}
```

---

## Phase 5: Optimization & Monitoring

### 5.1 Vector Index Creation

**Objective:** Optimize schema similarity search performance

**Tasks:**
- Create HNSW index on `schema_embeddings.embedding`
- Configure optimal index parameters
- Monitor query performance

**SQL:**
```sql
-- Create HNSW index for fast similarity search
CREATE INDEX ON schema_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Index Parameters:**
- `m = 16` - Connections per layer (balance between speed/accuracy)
- `ef_construction = 64` - Build-time search depth
- `vector_cosine_ops` - Cosine distance operator

### 5.2 Query Performance

**Objective:** Ensure fast response times

**Monitoring:**
- Track SQL execution times
- Monitor embedding API latency
- Log slow queries (>2 seconds)

**Optimizations:**
- Cache frequently asked questions (Redis optional)
- Cache schema embeddings in memory
- Pre-compute common aggregations
- Query result caching (5-minute TTL)

### 5.3 Accuracy Improvements

**Objective:** Continuously improve query generation quality

**Tasks:**
- Collect user feedback (👍/👎 on results)
- Track query success rates
- Refine schema descriptions based on common queries
- Add example queries to schema embeddings
- A/B test prompt variations

**Feedback Loop:**
1. User rates query result (helpful/not helpful)
2. Store feedback with query + SQL + results
3. Analyze feedback weekly
4. Update schema descriptions
5. Add successful queries as examples

---

## 🔑 Key Technical Decisions

### Why Direct SQL Instead of Prisma?

1. **Flexibility** - Users can ask ANY question, not just Prisma-supported queries
2. **Performance** - Direct SQL is faster than ORM overhead
3. **Safety** - Easier to sandbox and validate raw SQL than eval'd Prisma code
4. **RAG-native** - Schema embeddings work better with SQL descriptions
5. **Analytics-focused** - Complex aggregations easier in SQL

### Why OpenAI `text-embedding-3-small`?

1. **Cost-effective** - 62,500 pages per dollar vs 9,615 for `3-large`
2. **Performance** - 62.3% MTEB score (sufficient for schema matching)
3. **Dimension** - 1536 dimensions (good balance, can reduce to 512 if needed)
4. **Speed** - Faster inference than `3-large`
5. **Max input** - 8192 tokens (plenty for schema descriptions)

### Why Cosine Distance (`<=>`)?

1. **Recommended by OpenAI** - Embeddings are L2-normalized
2. **Fast** - Can use dot product optimization (vectors normalized to length 1)
3. **Accurate** - Same ranking as Euclidean for normalized vectors
4. **Industry standard** - Most vector DBs default to cosine

### Why HNSW Index?

1. **Query speed** - Faster than IVFFlat for our small schema corpus (<1000 embeddings)
2. **Accuracy** - Better recall for small datasets
3. **Memory** - Schema embeddings are small, memory not a concern
4. **Build time** - Acceptable for infrequent schema updates
5. **Production-ready** - Recommended for most use cases

### Why Server-Sent Events (SSE)?

1. **Streaming** - Show progress as query generates
2. **Simple** - Easier than WebSockets for unidirectional flow
3. **Native** - Built-in browser support (EventSource API)
4. **Reconnection** - Automatic reconnection handling
5. **HTTP/2** - Efficient multiplexing

---

## 📋 Implementation Checklist

### Phase 1: Database Setup ✅
- [ ] Enable pgvector extension in Supabase
- [ ] Create `schema_embeddings` table
- [ ] Create `match_schema()` function
- [ ] Create `exec_sql_query()` function
- [ ] Update Prisma schema with SchemaEmbedding model
- [ ] Generate Prisma client
- [ ] Test functions in Supabase SQL editor

### Phase 2: Schema Embeddings ✅
- [ ] Create schema documentation script
- [ ] Parse Prisma schema models
- [ ] Generate descriptions for all tables
- [ ] Generate descriptions for all columns
- [ ] Generate descriptions for relationships
- [ ] Create embedding generation script
- [ ] Generate embeddings via OpenAI API
- [ ] Insert embeddings into database
- [ ] Verify embeddings stored correctly

### Phase 3: RAG API Route ✅
- [ ] Create `/app/api/text-to-sql/route.ts`
- [ ] Implement request validation
- [ ] Implement question embedding
- [ ] Implement schema context retrieval
- [ ] Implement SQL generation with GPT-4o
- [ ] Implement SQL execution
- [ ] Implement SSE streaming response
- [ ] Add error handling
- [ ] Add query validation
- [ ] Add rate limiting
- [ ] Test with sample questions

### Phase 4: Frontend Integration ✅
- [ ] Create SSE event handler
- [ ] Add progress indicators to chat UI
- [ ] Display generated SQL with syntax highlighting
- [ ] Implement result table component
- [ ] Add export functionality
- [ ] Add query refinement feature
- [ ] Handle error states
- [ ] Add loading states
- [ ] Test streaming flow
- [ ] Mobile responsiveness

### Phase 5: Optimization ✅
- [ ] Create HNSW index on embeddings
- [ ] Implement query caching
- [ ] Add performance monitoring
- [ ] Set up error logging
- [ ] Implement feedback collection
- [ ] Create analytics dashboard
- [ ] Load testing
- [ ] Optimize slow queries

---

## 🚀 Expected User Experience

### Example Interaction

**User Question:**
> "What were my top 5 selling items last month?"

**AI Response Stream:**

```
🧠 Analyzing your question...

🔍 Retrieved schema context:
   • orders table (date, total_amount, location_id)
   • line_items table (quantity, total_price_amount, item_id)
   • items table (name, category)

🧩 Generating SQL query...

┌─────────────────────────────────────────────────────────┐
│ Generated SQL:                                           │
├─────────────────────────────────────────────────────────┤
│ SELECT                                                   │
│   i.name,                                               │
│   SUM(li.quantity) as total_quantity,                   │
│   SUM(li.total_price_amount) / 100.0 as total_revenue  │
│ FROM line_items li                                      │
│ JOIN items i ON li.item_id = i.id                      │
│ JOIN orders o ON li.order_id = o.id                    │
│ WHERE o.date >= date_trunc('month', CURRENT_DATE       │
│         - interval '1 month')                           │
│   AND o.date < date_trunc('month', CURRENT_DATE)       │
│ GROUP BY i.id, i.name                                   │
│ ORDER BY total_quantity DESC                            │
│ LIMIT 5;                                                │
└─────────────────────────────────────────────────────────┘

🚀 Executing query...

📊 Results:

┌─────────────────────┬───────────────┬──────────────┐
│ Name                │ Total Sold    │ Revenue      │
├─────────────────────┼───────────────┼──────────────┤
│ Premium Coffee      │ 342           │ $1,567.50    │
│ Avocado Toast       │ 289           │ $2,312.00    │
│ Breakfast Burrito   │ 256           │ $2,048.00    │
│ Latte               │ 234           │ $1,053.00    │
│ Caesar Salad        │ 198           │ $1,584.00    │
└─────────────────────┴───────────────┴──────────────┘

💡 The Premium Coffee was your best-seller last month with 342
   units sold, generating $1,567.50 in revenue.

[Was this helpful? 👍 👎]  [Refine Query]  [Export CSV]
```

---

## 🔒 Security Considerations

### Database Security

1. **Read-Only Role**
   - Create dedicated read-only Postgres role for API
   - Grant SELECT permissions only
   - Revoke INSERT/UPDATE/DELETE/DROP

2. **Query Validation**
   - Whitelist SELECT statements only
   - Block dangerous SQL patterns (UNION injection, etc.)
   - Timeout limits (10 seconds)
   - Result size limits (1000 rows max)

3. **Error Handling**
   - Don't expose schema details in error messages
   - Log full errors server-side
   - Return generic errors to client

### API Security

1. **Rate Limiting**
   - 10 queries per minute per user
   - 100 queries per hour per user
   - IP-based fallback limits

2. **Authentication**
   - Require authenticated users only
   - Validate session tokens
   - Track usage per user

3. **Input Validation**
   - Sanitize user input
   - Limit question length (500 chars)
   - Validate conversation IDs

### Data Privacy

1. **Query Logging**
   - Log all queries for monitoring
   - Implement log retention policy (30 days)
   - Anonymize logs if needed

2. **Result Filtering**
   - Respect user data permissions
   - Filter results by user's accessible data
   - Don't expose other users' data

---

## 🧪 Testing Strategy

### Unit Tests

- Schema parsing logic
- Embedding generation utilities
- SQL validation functions
- Error handling

### Integration Tests

- OpenAI API integration
- Supabase RPC calls
- End-to-end RAG flow
- Streaming SSE responses

### E2E Tests (Playwright)

- Complete user flow (question → results)
- Error scenarios
- Edge cases (empty results, malformed questions)
- Performance under load

### Test Scenarios

```typescript
// Test cases
const testQuestions = [
  "What were my total sales last week?",
  "Show me my top 10 items by revenue",
  "What's my average order value?",
  "Which location had the most sales yesterday?",
  "What items are in the breakfast category?",
  "Show me orders over $100 from last month",
  // Edge cases
  "aksdjfh", // Gibberish
  "DROP TABLE orders;", // SQL injection attempt
  "", // Empty question
  "a".repeat(1000), // Too long
]
```

---

## 📊 Success Metrics

### Performance Metrics

- **Query response time** - Target: <3 seconds end-to-end
- **Embedding retrieval time** - Target: <100ms
- **SQL execution time** - Target: <1 second
- **Streaming latency** - Target: <200ms first token

### Quality Metrics

- **Query accuracy** - Target: >90% helpful rating
- **Schema retrieval precision** - Target: >95% relevant tables
- **SQL syntax correctness** - Target: >98% valid queries
- **Result relevance** - Target: >85% user satisfaction

### Usage Metrics

- **Daily active users** using text-to-SQL
- **Queries per user** per day
- **Common question patterns**
- **Feature adoption rate**

---

## 🛠 Development Timeline

### Week 1: Foundation
- Day 1-2: Database setup (Phase 1)
- Day 3-4: Schema embeddings generation (Phase 2)
- Day 5: Testing and validation

### Week 2: Core Implementation
- Day 1-3: RAG API route (Phase 3)
- Day 4-5: Frontend integration (Phase 4)

### Week 3: Polish & Optimization
- Day 1-2: Optimization (Phase 5)
- Day 3-4: Testing and bug fixes
- Day 5: Documentation and deployment

---

## 📚 Additional Resources

### Documentation References

- [Supabase pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

### Code Examples

- Located in: `openaidocs/`, `supabasedocs/`
- Reference implementation: `text-to-sql-rag-overview.md`

---

## ✅ Definition of Done

The Text-to-SQL RAG implementation is complete when:

1. ✅ Users can ask natural language questions about sales data
2. ✅ System retrieves relevant schema context accurately
3. ✅ Generated SQL queries are syntactically correct and secure
4. ✅ Results are displayed in a user-friendly format
5. ✅ Response time is <3 seconds for 90% of queries
6. ✅ User satisfaction rating is >85%
7. ✅ All security measures are implemented and tested
8. ✅ Error handling covers all edge cases
9. ✅ Documentation is complete
10. ✅ E2E tests pass with >90% coverage

---

**Last Updated:** 2025-10-07
**Owner:** Development Team
**Status:** Planning Phase
