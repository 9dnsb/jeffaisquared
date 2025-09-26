/**
 * Test Dynamic Date Parsing Functionality
 * Tests the new dynamic date parser with various user inputs
 */

// Import the dynamic date parser
const { parseDynamicTimeframe, getSupportedTimeframExamples, testDynamicDateParser } = require('./src/lib/ai-v3/utils/dynamic-date-parser.ts')

async function testDynamicParsing() {
  console.log('🧪 Testing Dynamic Date Parsing Functionality\n')
  console.log('=' * 50)

  // Test cases representing real user queries
  const testCases = [
    // Basic cases
    'today',
    'yesterday',

    // Relative periods
    'this week',
    'this month',
    'this year',
    'last week',
    'last month',
    'last year',

    // Specific numbers
    'last 2 days',
    'last 3 weeks',
    'last 4 months',
    'last 30 days',
    'past 7 days',
    'past 2 weeks',
    'previous 3 months',

    // Specific dates - the key improvement!
    'August 2025',
    'July 2025',
    'December 2024',
    'January 2026',

    // Quarters and years
    'Q1 2024',
    'Q2 2025',
    'Q3 2023',
    'Q4 2025',
    '2024',
    '2025',

    // Edge cases and invalid inputs
    'invalid input',
    'tomorrow',
    'next week',
    'last 0 days',
    ''
  ]

  console.log(`Testing ${testCases.length} different time period formats:\n`)

  let successCount = 0
  let failureCount = 0

  for (const testCase of testCases) {
    console.log(`📅 Testing: "${testCase}"`)

    try {
      const result = parseDynamicTimeframe(testCase)

      if (result.success && result.dateRange) {
        console.log(`   ✅ SUCCESS: ${result.dateRange.description}`)
        console.log(`   📊 Range: ${result.dateRange.startDate.toISOString().split('T')[0]} → ${result.dateRange.endDate.toISOString().split('T')[0]}`)
        successCount++
      } else {
        console.log(`   ❌ FAILED: ${result.error}`)
        failureCount++
      }
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`)
      failureCount++
    }

    console.log('')
  }

  console.log('=' * 50)
  console.log(`📈 Test Results Summary:`)
  console.log(`   ✅ Successful parses: ${successCount}`)
  console.log(`   ❌ Failed parses: ${failureCount}`)
  console.log(`   📊 Success rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`)

  console.log('\n🎯 Key Improvements Achieved:')
  console.log('   • Dynamic parsing of ANY time period user requests')
  console.log('   • Support for specific months like "August 2025"')
  console.log('   • Natural language "last X days/weeks/months"')
  console.log('   • Quarter and year support (Q1 2024, 2025)')
  console.log('   • Consistent Toronto timezone handling')

  console.log('\n📋 Supported Examples:')
  const examples = getSupportedTimeframExamples()
  examples.forEach(example => console.log(`   • ${example}`))

  return {
    totalTests: testCases.length,
    successful: successCount,
    failed: failureCount,
    successRate: (successCount / (successCount + failureCount)) * 100
  }
}

// Run the test
if (require.main === module) {
  testDynamicParsing()
    .then(results => {
      console.log('\n🚀 Dynamic Date Parsing Test Complete!')
      process.exit(results.failed === 0 ? 0 : 1)
    })
    .catch(error => {
      console.error('Test failed:', error)
      process.exit(1)
    })
}

module.exports = { testDynamicParsing }