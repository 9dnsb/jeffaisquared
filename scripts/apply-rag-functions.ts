/**
 * Display RAG functions migration instructions
 * This script reads the migration SQL and displays instructions for manual application
 *
 * Usage: npx tsx scripts/apply-rag-functions.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function displayMigrationInstructions(): Promise<void> {
  try {
    console.log('🚀 Text-to-SQL RAG Functions Migration Helper')
    console.log('=============================================\n')

    // Read migration SQL file
    const migrationPath = join(
      process.cwd(),
      'prisma',
      'migrations',
      '20251007_add_rag_functions',
      'migration.sql'
    )

    console.log('This migration will create 2 Postgres functions:\n')
    console.log('1. match_schema()')
    console.log('   - Retrieves relevant schema context via vector similarity')
    console.log('   - Uses cosine distance on embeddings')
    console.log('   - Returns top matching schema objects\n')
    console.log('2. exec_sql_query()')
    console.log('   - Safely executes SELECT-only SQL queries')
    console.log('   - Security DEFINER with strict validation')
    console.log('   - Blocks INSERT/UPDATE/DELETE/DROP operations\n')

    console.log(`📄 Migration file: ${migrationPath}\n`)

    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📋 APPLICATION INSTRUCTIONS:\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Supabase Dashboard:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('1. Open your Supabase project dashboard')
    console.log('2. Navigate to: SQL Editor → New Query')
    console.log('3. Copy the SQL below and paste into the editor')
    console.log('4. Click "Run" to execute the migration\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('SQL TO COPY:\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(migrationSQL)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('✨ After migration completes, verify with these queries:\n')
    console.log('-- 1. Check functions exist:')
    console.log("SELECT proname, pg_get_functiondef(oid)")
    console.log("FROM pg_proc")
    console.log("WHERE proname IN ('match_schema', 'exec_sql_query');\n")

    console.log('-- 2. Test exec_sql_query (should return [{"test":1}]):')
    console.log("SELECT exec_sql_query('SELECT 1 as test');\n")

    console.log('-- 3. Test security (should fail with error):')
    console.log("SELECT exec_sql_query('DROP TABLE orders');\n")

    console.log('🎯 Next Steps:\n')
    console.log('1. Apply this migration in Supabase SQL Editor')
    console.log('2. Run verification queries above')
    console.log('3. Proceed to Phase 2: Generate Schema Embeddings\n')

  } catch (err) {
    console.error('❌ Error reading migration file:')
    console.error(err)
    process.exit(1)
  }
}

displayMigrationInstructions().catch(console.error)
