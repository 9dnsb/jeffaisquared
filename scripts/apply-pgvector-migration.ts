/**
 * Display pgvector migration instructions
 * This script reads the migration SQL and displays instructions for manual application
 *
 * Usage: npx tsx scripts/apply-pgvector-migration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function displayMigrationInstructions(): Promise<void> {
  try {
    console.log('🚀 pgvector Migration Helper')
    console.log('==============================\n')

    // Read migration SQL file
    const migrationPath = join(
      process.cwd(),
      'prisma',
      'migrations',
      '20251007_add_pgvector_schema_embeddings',
      'migration.sql'
    )

    console.log('This migration will:')
    console.log('  ✓ Enable pgvector extension')
    console.log('  ✓ Create schema_embeddings table')
    console.log('  ✓ Create vector similarity indexes (HNSW)')
    console.log('  ✓ Set up auto-update triggers\n')

    console.log(`📄 Migration file: ${migrationPath}\n`)

    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📋 MANUAL APPLICATION INSTRUCTIONS:\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('Option 1: Supabase Dashboard (Recommended)')
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

    console.log('✨ After migration completes:\n')
    console.log('1. Verify in Supabase dashboard:')
    console.log('   - Table "schema_embeddings" exists')
    console.log('   - Extension "vector" is enabled\n')
    console.log('2. No need to run db:generate - Prisma schema already updated\n')
    console.log('3. Proceed to Phase 1.2: Create Postgres Functions\n')

  } catch (err) {
    console.error('❌ Error reading migration file:')
    console.error(err)
    process.exit(1)
  }
}

displayMigrationInstructions().catch(console.error)
