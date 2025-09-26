/**
 * Test Ground Truth Dynamic Time Period Calculations
 * Verify that our ground truth system calculates the expected values
 */

const { calculateGroundTruthV3, disconnectPrismaV3 } = require('./src/test/ground-truth-v3.ts')

async function testGroundTruthDynamic() {
  console.log('🧪 Testing Ground Truth Dynamic Time Period Calculations')
  console.log('=' * 60)

  try {
    console.log('⏳ Calculating ground truth data...')
    const groundTruth = await calculateGroundTruthV3()

    console.log('\n📊 Dynamic Time Period Results:')
    console.log('=' * 40)

    console.log('\n🗓️  THIS MONTH:')
    console.log(`   Revenue: $${groundTruth.thisMonthRevenue?.toLocaleString() || 'N/A'}`)
    console.log(`   Transactions: ${groundTruth.thisMonthTransactionCount?.toLocaleString() || 'N/A'}`)
    console.log(`   Quantity: ${groundTruth.thisMonthQuantitySold?.toLocaleString() || 'N/A'}`)
    console.log(`   Top Location: ${groundTruth.thisMonthTopLocation || 'N/A'}`)

    console.log('\n🗓️  AUGUST 2025:')
    console.log(`   Revenue: $${groundTruth.august2025Revenue?.toLocaleString() || 'N/A'}`)
    console.log(`   Transactions: ${groundTruth.august2025TransactionCount?.toLocaleString() || 'N/A'}`)
    console.log(`   Quantity: ${groundTruth.august2025QuantitySold?.toLocaleString() || 'N/A'}`)
    console.log(`   Top Location: ${groundTruth.august2025TopLocation || 'N/A'}`)

    console.log('\n🗓️  JULY 2025:')
    console.log(`   Revenue: $${groundTruth.july2025Revenue?.toLocaleString() || 'N/A'}`)
    console.log(`   Transactions: ${groundTruth.july2025TransactionCount?.toLocaleString() || 'N/A'}`)
    console.log(`   Quantity: ${groundTruth.july2025QuantitySold?.toLocaleString() || 'N/A'}`)
    console.log(`   Top Location: ${groundTruth.july2025TopLocation || 'N/A'}`)

    // Validation checks
    console.log('\n✅ Validation Results:')
    console.log('=' * 30)

    const validations = [
      {
        name: 'This Month Revenue',
        value: groundTruth.thisMonthRevenue,
        expected: 372734.91,
        tolerance: 1000
      },
      {
        name: 'August 2025 Revenue',
        value: groundTruth.august2025Revenue,
        expected: 503240.17,
        tolerance: 1000
      },
      {
        name: 'July 2025 Revenue',
        value: groundTruth.july2025Revenue,
        expected: 441251.69,
        tolerance: 1000
      },
      {
        name: 'August 2025 Top Location',
        value: groundTruth.august2025TopLocation,
        expected: 'De Mello Coffee - The Well'
      }
    ]

    let passCount = 0
    let failCount = 0

    for (const validation of validations) {
      if (typeof validation.expected === 'string') {
        const passed = validation.value === validation.expected
        console.log(`${passed ? '✅' : '❌'} ${validation.name}: ${validation.value} ${passed ? '==' : '!='} ${validation.expected}`)
        passed ? passCount++ : failCount++
      } else {
        const difference = Math.abs(validation.value - validation.expected)
        const passed = difference <= validation.tolerance
        console.log(`${passed ? '✅' : '❌'} ${validation.name}: $${validation.value} (diff: $${difference.toFixed(2)}, tolerance: $${validation.tolerance})`)
        passed ? passCount++ : failCount++
      }
    }

    console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed`)

    if (failCount === 0) {
      console.log('🎉 All validations passed! Ground truth calculations are working correctly.')
    } else {
      console.log('⚠️  Some validations failed. Check the calculations.')
    }

    return { passCount, failCount, groundTruth }

  } catch (error) {
    console.error('❌ Error during ground truth test:', error)
    throw error
  } finally {
    await disconnectPrismaV3()
  }
}

// Run test if called directly
if (require.main === module) {
  testGroundTruthDynamic()
    .then(results => {
      console.log('\n✅ Ground truth test complete!')
      process.exit(results.failCount === 0 ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Ground truth test failed:', error)
      process.exit(1)
    })
}

module.exports = { testGroundTruthDynamic }