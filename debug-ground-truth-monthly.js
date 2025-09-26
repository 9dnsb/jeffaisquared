const { calculateGroundTruthV3 } = require('./src/test/ground-truth-v3')

async function debugGroundTruth() {
  console.log('🔍 Debugging Ground Truth V3 Monthly Calculation\n')

  try {
    const groundTruth = await calculateGroundTruthV3()

    console.log('📊 Monthly Revenue Values from Ground Truth V3:')
    console.log(`  thisMonthRevenue: $${groundTruth.thisMonthRevenue.toFixed(2)}`)
    console.log(`  august2025Revenue: $${groundTruth.august2025Revenue.toFixed(2)}`)
    console.log(`  july2025Revenue: $${groundTruth.july2025Revenue.toFixed(2)}`)
    console.log('')

    console.log('📊 Transaction Counts:')
    console.log(`  thisMonthTransactionCount: ${groundTruth.thisMonthTransactionCount}`)
    console.log(`  august2025TransactionCount: ${groundTruth.august2025TransactionCount}`)
    console.log(`  july2025TransactionCount: ${groundTruth.july2025TransactionCount}`)
    console.log('')

    console.log('📊 Expected Values (from our script):')
    console.log(`  This Month (Sept): $372,734.91`)
    console.log(`  August 2025: $503,240.17`)
    console.log(`  July 2025: $441,251.69`)
    console.log('')

    console.log('🔍 Differences:')
    console.log(`  This Month: ${groundTruth.thisMonthRevenue === 372734.91 ? '✅ MATCH' : `❌ DIFF: $${(groundTruth.thisMonthRevenue - 372734.91).toFixed(2)}`}`)
    console.log(`  August: ${groundTruth.august2025Revenue === 503240.17 ? '✅ MATCH' : `❌ DIFF: $${(groundTruth.august2025Revenue - 503240.17).toFixed(2)}`}`)
    console.log(`  July: ${groundTruth.july2025Revenue === 441251.69 ? '✅ MATCH' : `❌ DIFF: $${(groundTruth.july2025Revenue - 441251.69).toFixed(2)}`}`)

  } catch (error) {
    console.error('❌ Error calculating ground truth:', error)
  }
}

debugGroundTruth().catch(console.error)