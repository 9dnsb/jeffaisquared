/**
 * Text-to-SQL RAG API Route
 * Converts natural language questions to SQL queries using vector similarity search
 *
 * Flow:
 * 1. Embed user question → OpenAI embeddings API
 * 2. Retrieve schema context → match_schema() RPC via Supabase
 * 3. Generate SQL → OpenAI GPT-4o with schema context
 * 4. Execute SQL → exec_sql_query() RPC
 * 5. Stream results → Server-Sent Events (SSE)
 */

import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Configuration
// ============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small'
const CHAT_MODEL = 'gpt-4o' // or 'gpt-4o-mini' for cost savings
const SCHEMA_MATCH_THRESHOLD = 0.0 // Minimum similarity score (0.0 = return all matches)
const SCHEMA_MATCH_COUNT = 10 // Number of schema objects to retrieve
const MAX_QUERY_TIMEOUT = 10000 // 10 seconds max for SQL execution

// ============================================================================
// Types
// ============================================================================

interface TextToSQLRequest {
  question: string
  conversationId?: string
}

interface SchemaMatch {
  id: number
  object_name: string
  object_type: string
  description: string
  similarity: number
}

interface SSEEvent {
  type: 'status' | 'schema' | 'sql' | 'results' | 'error' | 'complete'
  message?: string
  context?: string[]
  query?: string
  explanation?: string
  data?: unknown[]
  error?: string
}

// ============================================================================
// Initialize Clients
// ============================================================================

// Mark route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']!,
})

// Initialize Supabase client lazily to avoid build-time issues
const getSupabaseClient = () => {
  return createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send SSE event to client
 */
function sendSSE(controller: ReadableStreamDefaultController, event: SSEEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`
  controller.enqueue(new TextEncoder().encode(data))
}

/**
 * Step 1: Generate embedding for user question
 */
async function embedQuestion(question: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
    encoding_format: 'float',
  })

  return response.data[0].embedding
}

/**
 * Step 2: Retrieve relevant schema context using vector similarity
 */
async function retrieveSchemaContext(
  questionEmbedding: number[]
): Promise<SchemaMatch[]> {
  // Convert embedding array to pgvector format
  const vectorString = `[${questionEmbedding.join(',')}]`

  console.log('[retrieveSchemaContext] Starting schema retrieval...')
  console.log('[retrieveSchemaContext] Embedding length:', questionEmbedding.length)
  console.log('[retrieveSchemaContext] Vector string preview:', vectorString.substring(0, 100) + '...')

  const supabase = getSupabaseClient()

  console.log('[retrieveSchemaContext] Calling match_schema RPC...')
  const { data, error } = await supabase.rpc('match_schema', {
    query_embedding: vectorString,
    match_threshold: SCHEMA_MATCH_THRESHOLD,
    match_count: SCHEMA_MATCH_COUNT,
  })

  console.log('[retrieveSchemaContext] RPC response:', {
    hasData: !!data,
    dataLength: data?.length,
    hasError: !!error,
    errorMessage: error?.message,
    errorDetails: error?.details,
    errorHint: error?.hint,
    errorCode: error?.code
  })

  if (error) {
    console.error('[retrieveSchemaContext] Full error object:', JSON.stringify(error, null, 2))
    throw new Error(`Schema retrieval failed: ${error.message}`)
  }

  return (data || []) as SchemaMatch[]
}

/**
 * Step 3: Generate SQL query using OpenAI with schema context
 */
async function generateSQL(
  question: string,
  schemaContext: SchemaMatch[]
): Promise<{ sql: string; explanation: string }> {
  // Build schema context string
  const schemaDescription = schemaContext
    .map(
      (match) =>
        `[${match.object_type.toUpperCase()}] ${match.object_name} (similarity: ${(match.similarity * 100).toFixed(1)}%)\n${match.description}`
    )
    .join('\n\n')

  // System prompt with schema context
  const systemPrompt = `You are a SQL query generator for a sales analytics database.

DATABASE SCHEMA:
${schemaDescription}

GUIDELINES:
- Generate only SELECT queries (no INSERT, UPDATE, DELETE, DROP)
- Use proper table aliases for readability
- **CRITICAL: ALWAYS quote column names with double quotes (e.g., "totalAmount", "locationId", "itemId")**
- Column names are case-sensitive camelCase and MUST be quoted
- Leverage indexed columns for filtering (date, "locationId", "itemId", category)
- Convert cents to dollars for currency display (amount / 100.0)
- Use proper date handling (date_trunc, intervals, CURRENT_DATE)
- Return results in JSON-compatible format
- Use proper GROUP BY for aggregations
- Order results meaningfully (usually DESC for rankings, ASC for chronological)
- Handle NULL values appropriately
- **CRITICAL JOIN RELATIONSHIPS:**
  - orders → locations: JOIN locations l ON o."locationId" = l."squareLocationId"
  - orders → line_items: JOIN line_items li ON o."id" = li."orderId"
  - line_items → items: JOIN items i ON li."itemId" = i."id"
  - items → categories: JOIN categories c ON i."squareCategoryId" = c."squareCategoryId"

IMPORTANT NOTES:
- **JOIN KEY WARNING:** orders."locationId" joins to locations."squareLocationId" (NOT locations."id"!)
- **ALWAYS use double quotes around column names:** "totalAmount", "locationId", "itemId", "createdAt", etc.
- Column names are camelCase and case-sensitive - quoting is REQUIRED
- All monetary amounts in the database are stored in CENTS (divide by 100.0 for dollars)
- Use proper SQL syntax for PostgreSQL
- Example: SELECT o."totalAmount" FROM orders o WHERE o."locationId" = 'xyz'
- **CRITICAL: Always use DATE() to cast timestamp columns for day-based filtering**
- For "yesterday", use: WHERE DATE("date") = (CURRENT_DATE - INTERVAL '1 day')::date
- For "today", use: WHERE DATE("date") = CURRENT_DATE
- For "last 7 days", use: WHERE DATE("date") >= (CURRENT_DATE - INTERVAL '7 days')::date
- For "last week", use: WHERE DATE("date") >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date AND DATE("date") < date_trunc('week', CURRENT_DATE)::date
- For "last month", use: WHERE DATE("date") >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::date
- Example: WHERE DATE(o."date") = (CURRENT_DATE - INTERVAL '1 day')::date

USER QUESTION: ${question}

Generate a PostgreSQL query that accurately answers this question.`

  // Use function calling to structure the response
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    functions: [
      {
        name: 'generate_sql',
        description: 'Generate SQL query based on user question and schema',
        parameters: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'PostgreSQL SELECT query',
            },
            explanation: {
              type: 'string',
              description: 'Human-readable explanation of what the query does',
            },
          },
          required: ['sql', 'explanation'],
        },
      },
    ],
    function_call: { name: 'generate_sql' },
    temperature: 0, // Deterministic for SQL generation
  })

  const functionCall = response.choices[0].message.function_call
  if (!functionCall || !functionCall.arguments) {
    throw new Error('Failed to generate SQL query')
  }

  const result = JSON.parse(functionCall.arguments) as {
    sql: string
    explanation: string
  }

  return result
}

/**
 * Step 4: Execute SQL query safely
 */
async function executeSQL(sql: string): Promise<unknown[]> {
  // Remove trailing semicolons (GPT-4o often adds them)
  const cleanSQL = sql.trim().replace(/;+$/, '')

  console.log('[executeSQL] Starting query execution...')
  console.log('[executeSQL] SQL:', cleanSQL)

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: cleanSQL,
  })

  console.log('[executeSQL] RPC response:', {
    hasData: !!data,
    dataType: typeof data,
    hasError: !!error,
    errorMessage: error?.message,
    errorDetails: error?.details,
    errorHint: error?.hint,
    errorCode: error?.code
  })

  if (error) {
    console.error('[executeSQL] Full error object:', JSON.stringify(error, null, 2))
    throw new Error(`Query execution failed: ${error.message}`)
  }

  // Parse JSON result
  const results = typeof data === 'string' ? JSON.parse(data) : data
  console.log('[executeSQL] Parsed results count:', Array.isArray(results) ? results.length : 'not an array')
  return Array.isArray(results) ? results : []
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Parse request body
        const body = (await request.json()) as TextToSQLRequest

        if (!body.question || body.question.trim() === '') {
          sendSSE(controller, {
            type: 'error',
            error: 'Question is required',
          })
          controller.close()
          return
        }

        const question = body.question.trim()

        // ================================================================
        // Step 1: Embed question
        // ================================================================
        sendSSE(controller, {
          type: 'status',
          message: 'Analyzing your question...',
        })

        const questionEmbedding = await embedQuestion(question)

        // ================================================================
        // Step 2: Retrieve schema context
        // ================================================================
        sendSSE(controller, {
          type: 'status',
          message: 'Retrieving relevant schema context...',
        })

        const schemaMatches = await retrieveSchemaContext(questionEmbedding)

        sendSSE(controller, {
          type: 'schema',
          message: `Found ${schemaMatches.length} relevant schema objects`,
          context: schemaMatches.map(
            (m) => `${m.object_type}: ${m.object_name} (${(m.similarity * 100).toFixed(1)}%)`
          ),
        })

        // ================================================================
        // Step 3: Generate SQL
        // ================================================================
        sendSSE(controller, {
          type: 'status',
          message: 'Generating SQL query...',
        })

        const { sql, explanation } = await generateSQL(question, schemaMatches)

        sendSSE(controller, {
          type: 'sql',
          message: explanation,
          query: sql,
          explanation: explanation,
        })

        // ================================================================
        // Step 4: Execute SQL
        // ================================================================
        sendSSE(controller, {
          type: 'status',
          message: 'Executing query...',
        })

        const results = await executeSQL(sql)

        sendSSE(controller, {
          type: 'results',
          message: `Query returned ${results.length} row(s)`,
          data: results,
        })

        // ================================================================
        // Complete
        // ================================================================
        sendSSE(controller, {
          type: 'complete',
          message: 'Query completed successfully',
        })

        controller.close()
      } catch (err) {
        // Handle errors
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred'

        sendSSE(controller, {
          type: 'error',
          error: errorMessage,
        })

        controller.close()
      }
    },
  })

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
