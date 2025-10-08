/**
 * Generate and Store Schema Embeddings (Direct SQL)
 * Bypasses RPC functions and uses direct SQL INSERT
 *
 * Usage: dotenv -e .env.development -- npx tsx scripts/generate-embeddings-direct.ts
 */

import OpenAI from 'openai'
import { Client } from 'pg'
import { generateSchemaDocumentation } from './generate-schema-docs'

// Environment validation
const openaiApiKey = process.env['OPENAI_API_KEY']
const databaseUrl = process.env['DATABASE_URL']

if (!openaiApiKey) {
  console.error('❌ Missing OPENAI_API_KEY environment variable')
  process.exit(1)
}

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable')
  process.exit(1)
}

// Initialize clients
const openai = new OpenAI({ apiKey: openaiApiKey })
const pgClient = new Client({ connectionString: databaseUrl })

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const BATCH_SIZE = 100

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  console.log(`   📡 Calling OpenAI API for ${texts.length} embeddings...`)

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    encoding_format: 'float',
  })

  const sorted = response.data.sort((a, b) => a.index - b.index)
  const embeddings = sorted.map(item => item.embedding)

  console.log(`   ✅ Received ${embeddings.length} embeddings`)
  console.log(`   💰 Tokens used: ${response.usage.total_tokens}`)

  return embeddings
}

/**
 * Store embeddings using direct SQL INSERT
 */
async function storeEmbeddingDirect(
  objectName: string,
  objectType: string,
  description: string,
  embedding: number[]
): Promise<void> {
  const vectorString = `[${embedding.join(',')}]`

  await pgClient.query(
    `INSERT INTO schema_embeddings (object_name, object_type, description, embedding)
     VALUES ($1, $2, $3, $4::vector)
     ON CONFLICT (object_name) DO UPDATE SET
       description = EXCLUDED.description,
       embedding = EXCLUDED.embedding,
       updated_at = NOW()`,
    [objectName, objectType, description, vectorString]
  )
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🚀 Schema Embedding Generation (Direct SQL)\n')
  console.log('='.repeat(80))
  console.log(`\nModel: ${EMBEDDING_MODEL}`)
  console.log(`Dimensions: ${EMBEDDING_DIMENSIONS}`)
  console.log(`Batch Size: ${BATCH_SIZE}\n`)

  try {
    // Connect to database
    await pgClient.connect()
    console.log('✅ Connected to database\n')

    // Step 1: Generate schema documentation
    console.log('📚 Step 1: Generating schema documentation...\n')
    const schemaDocs = generateSchemaDocumentation()
    console.log(`✅ Generated ${schemaDocs.length} schema documentation entries\n`)

    // Step 2: Generate embeddings in batches
    console.log('🧠 Step 2: Generating embeddings via OpenAI...\n')

    const totalBatches = Math.ceil(schemaDocs.length / BATCH_SIZE)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < schemaDocs.length; i += BATCH_SIZE) {
      const batch = schemaDocs.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      // Generate embeddings for batch
      const texts = batch.map(doc => doc.description)
      const embeddings = await generateEmbeddingsBatch(texts)

      // Store embeddings
      console.log(`   💾 Storing embeddings in database...`)

      for (let j = 0; j < batch.length; j++) {
        try {
          await storeEmbeddingDirect(
            batch[j].objectName,
            batch[j].objectType,
            batch[j].description,
            embeddings[j]
          )
          successCount++
        } catch (err) {
          console.error(`   ❌ Failed to store ${batch[j].objectName}:`, err)
          failCount++
        }
      }

      console.log(`   ✅ Batch ${batchNum} completed`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n📊 Summary:\n')
    console.log(`✅ Successfully stored: ${successCount} embeddings`)
    console.log(`❌ Failed: ${failCount} embeddings\n`)

    // Step 3: Verify database
    console.log('🔍 Verifying database...\n')

    const countResult = await pgClient.query('SELECT COUNT(*) as count FROM schema_embeddings')
    console.log(`📊 Total embeddings in database: ${countResult.rows[0].count}\n`)

    // Sample embeddings
    const sampleResult = await pgClient.query(
      'SELECT object_name, object_type FROM schema_embeddings ORDER BY id LIMIT 5'
    )

    console.log('📋 Sample embeddings:\n')
    sampleResult.rows.forEach(row => {
      console.log(`   • ${row.object_type}: ${row.object_name}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('\n✨ Embedding generation complete!\n')
    console.log('🎯 Next Steps:')
    console.log('   1. Test match_schema() function with a sample query')
    console.log('   2. Test /api/text-to-sql endpoint')
    console.log('   3. Try the chat interface at http://localhost:3000/chat\n')

  } catch (err) {
    console.error('\n❌ Error:', err)
    throw err
  } finally {
    await pgClient.end()
  }
}

// Run main function
main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
