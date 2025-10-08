/**
 * Test Schema Matching with RAG System
 * Tests the match_schema() function with real questions
 *
 * Usage: npx dotenv -e .env.development -- npx tsx scripts/test-schema-matching.ts
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Environment validation
const openaiApiKey = process.env['OPENAI_API_KEY']
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Initialize clients
const openai = new OpenAI({ apiKey: openaiApiKey })
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Generate embedding for a question
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
 * Test schema matching with a question
 */
async function testSchemaMatching(question: string): Promise<void> {
  console.log('\n' + '='.repeat(80))
  console.log(`\n❓ Question: "${question}"\n`)

  // Step 1: Generate embedding for question
  console.log('🧠 Generating question embedding...')
  const questionEmbedding = await embedQuestion(question)
  console.log(`✅ Generated embedding (${questionEmbedding.length} dimensions)\n`)

  // Step 2: Match schema using vector similarity
  console.log('🔍 Searching for relevant schema objects...')
  const vectorString = `[${questionEmbedding.join(',')}]`

  const { data, error } = await supabase.rpc('match_schema', {
    query_embedding: vectorString,
    match_threshold: 0.0, // Lower threshold to see all matches
    match_count: 5,
  })

  if (error) {
    console.error('❌ Error matching schema:', error)
    return
  }

  // Step 3: Display results
  console.log(`✅ Found ${data?.length || 0} matching schema objects:\n`)

  if (data && data.length > 0) {
    for (const match of data) {
      console.log(`📊 [${match.object_type.toUpperCase()}] ${match.object_name}`)
      console.log(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`)
      console.log(`   Description: ${match.description}`)
      console.log()
    }
  } else {
    console.log('   No matches found above threshold')
  }
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
  console.log('🧪 Schema Matching Test Suite')
  console.log('='.repeat(80))

  // Test questions covering different aspects of the schema
  const testQuestions = [
    'What were my total sales last week?',
    'Show me my top selling items',
    'Which location had the most revenue?',
    'What items are in the breakfast category?',
    'How many orders did I receive yesterday?',
    'What is my average order value?',
  ]

  for (const question of testQuestions) {
    await testSchemaMatching(question)
  }

  console.log('='.repeat(80))
  console.log('\n✨ Schema Matching Test Complete!\n')
  console.log('🎯 Next Steps:')
  console.log('   1. Review the similarity scores and matched schema objects')
  console.log('   2. Proceed to Phase 3: Build /api/text-to-sql route\n')
}

// Run
main().catch(console.error)
