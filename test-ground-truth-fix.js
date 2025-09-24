const { calculateGroundTruthV3 } = require('./src/test/ground-truth-v3')

async function testGroundTruthFix() {
  console.log('🧪 Testing fixed ground truth calculation...\n')

  try {
    const groundTruth = await calculateGroundTruthV3()

    console.log('📊 Ground Truth Results:')
    console.log('Last week best day:', groundTruth.lastWeekBestDay)
    console.log('Last week best day revenue:', groundTruth.lastWeekBestDayRevenue)
    console.log('Last week total revenue:', groundTruth.lastWeekRevenue)

    // Verify the fix worked
    if (groundTruth.lastWeekBestDayRevenue > 20000) {
      console.log('✅ Fix successful! Revenue is now in the expected range.')
    } else {
      console.log('❌ Issue still exists. Revenue is too low.')
    }

  } catch (error) {
    console.error('❌ Error testing ground truth:', error)
  }
}

testGroundTruthFix().catch(console.error)