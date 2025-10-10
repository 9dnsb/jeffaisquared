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
const CHAT_MODEL = 'gpt-4.1-nano' // Using Responses API with gpt-4.1-nano (low latency, no reasoning step)
const SCHEMA_MATCH_THRESHOLD = 0.0 // Minimum similarity score (0.0 = return all matches)
const SCHEMA_MATCH_COUNT = 10 // Number of schema objects to retrieve
const MAX_QUERY_TIMEOUT = 20000 // 15 seconds max for SQL execution

// ============================================================================
// Types
// ============================================================================

interface TextToSQLRequest {
  question: string
  conversationId?: string
  previousResponseId?: string // OpenAI response ID for conversation continuity
  conversationHistory?: Array<{ // Full conversation history for context
    role: 'user' | 'assistant'
    content: string
  }>
}

interface SchemaMatch {
  id: number
  object_name: string
  object_type: string
  description: string
  similarity: number
}

interface SSEEvent {
  type:
    | 'status'
    | 'schema'
    | 'sql'
    | 'results'
    | 'error'
    | 'complete'
    | 'response_id'
  message?: string
  context?: string[]
  query?: string
  explanation?: string
  data?: unknown[]
  error?: string
  responseId?: string // OpenAI response ID for conversation continuity
}

// ============================================================================
// Initialize Clients
// ============================================================================

// Mark route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic'
// Set maximum execution time to 60 seconds
export const maxDuration = 60

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
function sendSSE(
  controller: ReadableStreamDefaultController,
  event: SSEEvent
): void {
  const data = `data: ${JSON.stringify(event)}\n\n`
  controller.enqueue(new TextEncoder().encode(data))
}

/**
 * Log detailed RPC response information
 */
function logRPCResponse(
  context: string,
  data: unknown,
  error: { message?: string; details?: string; hint?: string; code?: string } | null
): void {
  console.log(`[${context}] RPC response:`, {
    hasData: !!data,
    dataLength: Array.isArray(data) ? data.length : undefined,
    hasError: !!error,
    errorMessage: error?.message,
    errorDetails: error?.details,
    errorHint: error?.hint,
    errorCode: error?.code,
  })
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
  console.log(
    '[retrieveSchemaContext] Embedding length:',
    questionEmbedding.length
  )
  console.log(
    '[retrieveSchemaContext] Vector string preview:',
    vectorString.substring(0, 100) + '...'
  )

  const supabase = getSupabaseClient()

  console.log('[retrieveSchemaContext] Calling match_schema RPC...')
  const { data, error } = await supabase.rpc('match_schema', {
    query_embedding: vectorString,
    match_threshold: SCHEMA_MATCH_THRESHOLD,
    match_count: SCHEMA_MATCH_COUNT,
  })

  logRPCResponse('retrieveSchemaContext', data, error)

  if (error) {
    console.error(
      '[retrieveSchemaContext] Full error object:',
      JSON.stringify(error, null, 2)
    )
    throw new Error(`Schema retrieval failed: ${error.message}`)
  }

  return (data || []) as SchemaMatch[]
}

/**
 * Step 3: Generate SQL query using OpenAI with schema context
 */
async function generateSQL(
  question: string,
  schemaContext: SchemaMatch[],
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ sql: string; explanation: string; responseId: string }> {
  // Build schema context string
  const schemaDescription = schemaContext
    .map(
      (match) =>
        `[${match.object_type.toUpperCase()}] ${
          match.object_name
        } (similarity: ${(match.similarity * 100).toFixed(1)}%)\n${
          match.description
        }`
    )
    .join('\n\n')

  // System instructions with schema context
  const instructions = `You are a SQL query generator for a sales analytics database.

DATABASE SCHEMA:
${schemaDescription}

TIMEZONE HANDLING:
- **CRITICAL: All timestamps are stored in UTC but business operates in America/Toronto timezone**
- **CRITICAL: ALWAYS convert UTC timestamps to Toronto time before date comparisons**
- **CRITICAL: Use AT TIME ZONE 'America/Toronto' for all date filtering and comparisons**
- This ensures "today" means today in Toronto, not UTC
- Database timezone: UTC (storage), Business timezone: America/Toronto (queries)

GUIDELINES:
- Generate only SELECT queries (no INSERT, UPDATE, DELETE, DROP)
- **CRITICAL: Generate EXACTLY ONE SQL query - never multiple queries separated by semicolons**
- Use proper table aliases for readability
- **CRITICAL: ALWAYS quote column names with double quotes (e.g., "totalAmount", "locationId", "itemId")**
- Column names are case-sensitive camelCase and MUST be quoted
- **CRITICAL: Use ILIKE for case-insensitive text matching (e.g., WHERE i."name" ILIKE 'latte' instead of = 'latte')**
- **PERFORMANCE: Leverage indexed columns for WHERE clauses (date, "locationId", "itemId", category)**
- **PERFORMANCE: Use date range filters efficiently (indexed BRIN on date column)**
- Convert cents to dollars for currency display (amount / 100.0)
- Use proper date handling (date_trunc, intervals, CURRENT_DATE AT TIME ZONE 'America/Toronto')
- Return results in JSON-compatible format
- Use proper GROUP BY for aggregations
- Order results meaningfully (usually DESC for rankings, ASC for chronological)
- Handle NULL values appropriately (use COALESCE when needed)
- **PERFORMANCE: Limit result sets with reasonable LIMIT clauses when possible**
- **CRITICAL JOIN RELATIONSHIPS:**
  - orders → locations: JOIN locations l ON o."locationId" = l."squareLocationId"
  - orders → line_items: JOIN line_items li ON o."id" = li."orderId"
  - line_items → items: JOIN items i ON li."itemId" = i."id"
  - items → categories: JOIN categories c ON i."squareCategoryId" = c."squareCategoryId"

**QUERY OPTIMIZATION RULES:**
- **CRITICAL: ALWAYS join to orders table and filter on orders."date" for date-based queries**
- **CRITICAL: line_items."createdAt" is database record creation time, NOT the order date**
- **CRITICAL: For date filtering, use: JOIN orders o ON li."orderId" = o."id" WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') >= '2025-08-01'**
- **CRITICAL: line_items table HAS both "name" and "category" columns (denormalized from items)**
- **CRITICAL: To query by item name, filter on line_items."name" (e.g., WHERE li."name" ILIKE 'latte')**
- **CRITICAL: To query by category, filter on line_items."category" (e.g., WHERE li."category" ILIKE 'coffee')**
- **CRITICAL: Do NOT join to items table unless you need item.id or items-specific data**
- **CRITICAL AGGREGATION RULES:**
  - "How many [items] sold" → Use SUM(li."quantity") for total units sold
  - "How many orders" → Use COUNT(*) for number of transactions
  - "How many customers" → Use COUNT(DISTINCT o."customerId") if available
  - Example: "257 lattes sold" means SUM(quantity)=257, not COUNT(*)=257
- **CRITICAL COMPARISON QUERY RULES:**
  - **ALWAYS generate a SINGLE query for ALL comparisons** - NEVER generate separate queries for each period
  - Use CASE statements or conditional aggregation to show side-by-side comparisons in columns
  - When user says "compare this/that to [date/period]", look at the previous query structure and maintain it while adding comparison columns
  - Example: If previous query was "best sellers today" grouped by item name, "compare this to oct 1" should GROUP BY item name with columns for both periods
  - Return one row per dimension (item/location/category) showing all periods for easy comparison (NOT separate queries)
  - For simple total comparisons (e.g., "compare total sales X to Y"), use CASE statements with SUM in a single row
- **CRITICAL LOCATION BREAKDOWN RULES:**
  - When user mentions "by location", "at each location", "across all locations", "for all locations", "at all locations", "per location", or "location breakdown", **ALWAYS GROUP BY location name**
  - Each location should be a separate row, NOT a single total
  - Example: "sales today across all locations" should return one row per location with location name and sales
  - Example: "compare sales today vs last week by location" should GROUP BY l."name" with separate columns for each period
  - Example: "sales at all locations" should GROUP BY l."name" showing each location separately
  - **NEVER return a single total row when user asks for location breakdown**
  - Join pattern: JOIN locations l ON o."locationId" = l."squareLocationId" then GROUP BY l."name"
  - **CRITICAL: When using "last [day of week]" formulas, ALWAYS calculate from Toronto time, not UTC**
  - Example: "compare sales yesterday to last Tuesday" should be:
    SELECT
      SUM(CASE WHEN DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE((CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '1 day') THEN o."totalAmount" ELSE 0 END)/100.0 AS "Yesterday",
      SUM(CASE WHEN DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE((CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - ((EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto'))::int - 2 + 7) % 7 + CASE WHEN EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto')) = 2 THEN 7 ELSE 0 END) * INTERVAL '1 day') THEN o."totalAmount" ELSE 0 END)/100.0 AS "LastTuesday"
    FROM orders o
- Example: For "Latte revenue in August", use:
  SELECT SUM(li."totalPriceAmount")/100.0 FROM line_items li
  JOIN orders o ON li."orderId" = o."id"
  WHERE li."name" ILIKE 'latte' AND DATE(o."date" AT TIME ZONE 'America/Toronto') >= '2025-08-01' AND DATE(o."date" AT TIME ZONE 'America/Toronto') < '2025-09-01'
- Example: For "compare this to oct 1" after "best sellers today" query:
  SELECT
    i."name",
    SUM(CASE WHEN DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') THEN li."quantity" ELSE 0 END) AS "Today",
    SUM(CASE WHEN DATE(o."date" AT TIME ZONE 'America/Toronto') = '2025-10-01' THEN li."quantity" ELSE 0 END) AS "Oct 1"
  FROM line_items li
  JOIN orders o ON li."orderId" = o."id"
  JOIN items i ON li."itemId" = i."id"
  WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') IN (DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto'), '2025-10-01')
  GROUP BY i."name"
  ORDER BY "Today" DESC
  LIMIT 10

IMPORTANT NOTES:
- **JOIN KEY WARNING:** orders."locationId" joins to locations."squareLocationId" (NOT locations."id"!)
- **ALWAYS use double quotes around column names:** "totalAmount", "locationId", "itemId", "createdAt", etc.
- Column names are camelCase and case-sensitive - quoting is REQUIRED
- All monetary amounts in the database are stored in CENTS (divide by 100.0 for dollars)
- Use proper SQL syntax for PostgreSQL
- Example: SELECT o."totalAmount" FROM orders o WHERE o."locationId" = 'xyz'
- **CRITICAL: Always convert to Toronto timezone before DATE() casting for day-based filtering**
- **CRITICAL DATE ASSUMPTION: If user specifies a date without a year, ALWAYS assume the CURRENT YEAR (${new Date().getFullYear()})**
- **CRITICAL TIMEZONE PATTERNS (use these exact patterns):**
  - For "yesterday": WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE((CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '1 day')
  - For "today": WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto')
  - For "last 7 days": WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') >= DATE((CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '7 days')
  - For "last week": WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') >= DATE(date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '1 week')) AND DATE(o."date" AT TIME ZONE 'America/Toronto') < DATE(date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto'))
  - For "last month": WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') >= DATE(date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '1 month'))
  - For specific date without year (e.g., "Oct 5", "January 15"): WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') = '${new Date().getFullYear()}-MM-DD'
  - For specific date with year (e.g., "Oct 5, 2023"): WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') = 'YYYY-MM-DD'
- **ALWAYS apply AT TIME ZONE 'America/Toronto' before DATE() conversion**
- Example: WHERE DATE(o."date" AT TIME ZONE 'America/Toronto') = DATE((CURRENT_TIMESTAMP AT TIME ZONE 'America/Toronto') - INTERVAL '1 day')

Generate a PostgreSQL query that accurately answers this question.`

  // Build input with full conversation context (if available)
  // This allows the AI to understand references like "compare all these"
  const input =
    conversationHistory && conversationHistory.length > 0
      ? [
          ...conversationHistory,
          {
            role: 'user' as const,
            content: question,
          },
        ]
      : question

  // Use function calling to structure the response
  const response = await openai.responses.create({
    model: CHAT_MODEL,
    instructions: instructions,
    input: input,
    tools: [
      {
        type: 'function',
        name: 'generate_sql',
        description: 'Generate SQL query based on user question and schema',
        strict: true,
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
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: 'function', name: 'generate_sql' },
    temperature: 0, // Deterministic for SQL generation
  })

  // Find the function call in the output
  const functionCallItem = response.output.find(
    (item) => item.type === 'function_call'
  )

  if (!functionCallItem || functionCallItem.type !== 'function_call') {
    throw new Error('Failed to generate SQL query')
  }

  const result = JSON.parse(functionCallItem.arguments) as {
    sql: string
    explanation: string
  }

  return {
    ...result,
    responseId: response.id, // Return response ID for conversation continuity
  }
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

  logRPCResponse('executeSQL', data, error)
  console.log('[executeSQL] Data type:', typeof data)
  console.log('[executeSQL] Is array:', Array.isArray(data))
  console.log('[executeSQL] Is null:', data === null)

  if (error) {
    console.error(
      '[executeSQL] Full error object:',
      JSON.stringify(error, null, 2)
    )
    throw new Error(`Query execution failed: ${error.message}`)
  }

  // Parse JSON result
  console.log('[executeSQL] Raw data:', JSON.stringify(data))

  const results = typeof data === 'string' ? JSON.parse(data) : data
  console.log('[executeSQL] Parsed results:', JSON.stringify(results))
  console.log(
    '[executeSQL] Parsed results count:',
    Array.isArray(results) ? results.length : 'not an array'
  )

  // Handle case where data is an object but not an array
  if (!Array.isArray(results) && typeof results === 'object' && results !== null) {
    console.log('[executeSQL] Converting object to array')
    return [results]
  }

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
        const conversationHistory = body.conversationHistory || []

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
            (m) =>
              `${m.object_type}: ${m.object_name} (${(
                m.similarity * 100
              ).toFixed(1)}%)`
          ),
        })

        // ================================================================
        // Step 3: Generate SQL
        // ================================================================
        sendSSE(controller, {
          type: 'status',
          message: 'Generating SQL query...',
        })

        const { sql, explanation, responseId } = await generateSQL(
          question,
          schemaMatches,
          conversationHistory
        )

        sendSSE(controller, {
          type: 'sql',
          message: explanation,
          query: sql,
          explanation: explanation,
        })

        // Send response ID for conversation continuity
        sendSSE(controller, {
          type: 'response_id',
          responseId: responseId,
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
