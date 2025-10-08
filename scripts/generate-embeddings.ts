/**
 * Generate and Store Schema Embeddings
 * Creates OpenAI embeddings for schema documentation and stores in Supabase
 *
 * Usage: dotenv -e .env.development -- npx tsx scripts/generate-embeddings.ts
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { generateSchemaDocumentation } from './generate-schema-docs'

// Environment validation
const openaiApiKey = process.env['OPENAI_API_KEY']
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!openaiApiKey) {
  console.error('❌ Missing OPENAI_API_KEY environment variable')
  process.exit(1)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize clients
const openai = new OpenAI({ apiKey: openaiApiKey })
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536 // Default for text-embedding-3-small
const BATCH_SIZE = 100 // OpenAI allows up to 2048 inputs per request, but we'll be conservative

/**
 * Generate embedding for a single text string
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    })

    return response.data[0].embedding
  } catch (err) {
    console.error('❌ Failed to generate embedding:', err)
    throw err
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI API supports batch embedding requests for better performance
 */
async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  try {
    console.log(`   📡 Calling OpenAI API for ${texts.length} embeddings...`)

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      encoding_format: 'float',
    })

    // Sort by index to ensure correct order
    const sorted = response.data.sort((a, b) => a.index - b.index)
    const embeddings = sorted.map(item => item.embedding)

    console.log(`   ✅ Received ${embeddings.length} embeddings`)
    console.log(`   💰 Tokens used: ${response.usage.total_tokens}`)

    return embeddings
  } catch (err) {
    console.error('❌ Failed to generate embeddings batch:', err)
    throw err
  }
}

/**
 * Store embeddings in Supabase schema_embeddings table
 * Uses direct INSERT with raw SQL for better permissions handling
 */
async function storeEmbeddings(
  objectName: string,
  objectType: string,
  description: string,
  embedding: number[]
): Promise<void> {
  // Convert embedding array to pgvector format string
  const vectorString = `[${embedding.join(',')}]`

  // Use direct SQL INSERT instead of RPC function
  const { data, error } = await supabase
    .from('schema_embeddings')
    .upsert({
      object_name: objectName,
      object_type: objectType,
      description: description,
      embedding: vectorString,
    }, {
      onConflict: 'object_name'
    })

  if (error) {
    throw new Error(`Failed to store embedding for ${objectName}: ${error.message}`)
  }
}

/**
 * Clear existing embeddings (optional - for fresh start)
 */
async function clearExistingEmbeddings(): Promise<void> {
  console.log('🗑️  Clearing existing embeddings...')

  const { data, error } = await supabase.rpc('clear_schema_embeddings')

  if (error) {
    throw new Error(`Failed to clear embeddings: ${error.message}`)
  }

  console.log(`✅ Cleared ${data} existing embeddings\n`)
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🚀 Schema Embedding Generation\n')
  console.log('=' .repeat(80))
  console.log(`\nModel: ${EMBEDDING_MODEL}`)
  console.log(`Dimensions: ${EMBEDDING_DIMENSIONS}`)
  console.log(`Batch Size: ${BATCH_SIZE}\n`)

  try {
    // Step 1: Generate schema documentation
    console.log('📚 Step 1: Generating schema documentation...\n')
    const schemaDocs = generateSchemaDocumentation()
    console.log(`✅ Generated ${schemaDocs.length} schema documentation entries\n`)

    // Step 2: Clear existing embeddings (optional)
    const shouldClear = process.argv.includes('--clear')
    if (shouldClear) {
      await clearExistingEmbeddings()
    }

    // Step 3: Generate embeddings in batches
    console.log('🧠 Step 2: Generating embeddings via OpenAI...\n')

    let totalTokens = 0
    let successCount = 0
    let errorCount = 0

    // Process in batches
    for (let i = 0; i < schemaDocs.length; i += BATCH_SIZE) {
      const batch = schemaDocs.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(schemaDocs.length / BATCH_SIZE)

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      try {
        // Extract descriptions for batch
        const descriptions = batch.map(doc => doc.description)

        // Generate embeddings
        const embeddings = await generateEmbeddingsBatch(descriptions)

        // Step 4: Store embeddings
        console.log(`   💾 Storing embeddings in database...`)

        for (let j = 0; j < batch.length; j++) {
          const doc = batch[j]
          const embedding = embeddings[j]

          try {
            await storeEmbeddings(
              doc.objectName,
              doc.objectType,
              doc.description,
              embedding
            )
            successCount++
          } catch (storeErr) {
            console.error(
              `   ❌ Failed to store ${doc.objectName}:`,
              storeErr instanceof Error ? storeErr.message : storeErr
            )
            errorCount++
          }
        }

        console.log(`   ✅ Batch ${batchNum} completed`)

        // Rate limiting: wait 1 second between batches
        if (i + BATCH_SIZE < schemaDocs.length) {
          console.log(`   ⏳ Waiting 1s before next batch...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (batchErr) {
        console.error(`   ❌ Batch ${batchNum} failed:`, batchErr)
        errorCount += batch.length
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('\n📊 Summary:\n')
    console.log(`✅ Successfully stored: ${successCount} embeddings`)
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} embeddings`)
    }

    // Verify count in database
    console.log('\n🔍 Verifying database...\n')
    const { count: dbCount, error: countError } = await supabase
      .from('schema_embeddings')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Failed to verify count:', countError.message)
    } else {
      console.log(`✅ Database contains ${dbCount} embeddings`)
    }

    // Show sample
    console.log('\n📋 Sample embeddings:\n')
    const { data: sampleData, error: sampleError } = await supabase
      .from('schema_embeddings')
      .select('object_name, object_type, description')
      .limit(5)

    if (sampleError) {
      console.error('❌ Failed to fetch samples:', sampleError.message)
    } else if (sampleData) {
      for (const sample of sampleData) {
        const preview = sample.description.substring(0, 80)
        console.log(
          `  - [${sample.object_type}] ${sample.object_name}: ${preview}...`
        )
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✨ Embedding generation complete!\n')
    console.log('🎯 Next Steps:')
    console.log('   1. Test match_schema() function with a sample query')
    console.log('   2. Proceed to Phase 3: Build /api/text-to-sql route\n')
  } catch (err) {
    console.error('\n❌ Error:', err)
    process.exit(1)
  }
}

// Run
main().catch(console.error)
