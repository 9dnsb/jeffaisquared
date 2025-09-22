require('dotenv').config({ path: '.env.development' })
const { exec } = require('child_process')
const path = require('path')
const { promisify } = require('util')

const execAsync = promisify(exec)

// Wrapper script to handle Square data syncing workflow
async function syncSquareData(mode = 'incremental') {
  console.log(`🔄 Starting Square Data Sync in ${mode.toUpperCase()} mode...\n`)

  try {
    if (mode === 'full') {
      // Full 2-year historical fetch + seed
      console.log('📊 Step 1: Fetching 2 years of historical data from Square...')
      await execAsync('node fetch-historical-square-data-comprehensive.js')

      console.log('\n🌱 Step 2: Seeding database with historical data...')
      await execAsync('npm run db:seed')

    } else if (mode === 'incremental') {
      // Incremental fetch + seed
      console.log('⚡ Step 1: Fetching incremental data from Square...')
      const { stdout } = await execAsync('node fetch-incremental-square-data.js')
      console.log(stdout)

      // Check if there was actually new data to process
      if (stdout.includes('No new orders found')) {
        console.log('✅ No new data to sync')
        return
      }

      console.log('\n🌱 Step 2: Seeding database with incremental data...')
      await execAsync('SEED_MODE=incremental npm run db:seed')

    } else {
      throw new Error(`Invalid mode: ${mode}. Use 'full' or 'incremental'`)
    }

    console.log('\n🎉 Square data sync completed successfully!')

    // Show sync status
    console.log('\n📊 Current sync status:')
    await showSyncStatus()

  } catch (error) {
    console.error(`❌ Error during ${mode} sync:`, error.message)

    if (error.stdout) {
      console.error('stdout:', error.stdout)
    }
    if (error.stderr) {
      console.error('stderr:', error.stderr)
    }

    process.exit(1)
  }
}

// Show current sync status
async function showSyncStatus() {
  try {
    const fs = require('fs').promises
    const metadataPath = path.join(__dirname, 'historical-data', 'sync-metadata.json')

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))

    console.log(`📅 Last sync: ${metadata.lastSyncTimestamp || 'Never'}`)
    console.log(`📊 Total orders synced: ${metadata.totalOrdersSynced}`)
    console.log(`📈 Sync history entries: ${metadata.syncHistory.length}`)

    if (metadata.dataRanges.earliest && metadata.dataRanges.latest) {
      console.log(`📅 Data range: ${metadata.dataRanges.earliest.split('T')[0]} to ${metadata.dataRanges.latest.split('T')[0]}`)
    }

  } catch (error) {
    console.log('   ℹ️ No sync metadata available (fresh installation)')
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const mode = args[0] || 'incremental'

// Validate mode
if (!['full', 'incremental'].includes(mode)) {
  console.error('❌ Invalid mode. Usage:')
  console.error('  node sync-square-data.js full       # Full 2-year historical sync')
  console.error('  node sync-square-data.js incremental # Sync only new data since last run')
  process.exit(1)
}

// Run the sync
if (require.main === module) {
  syncSquareData(mode)
}

module.exports = {
  syncSquareData,
  showSyncStatus
}