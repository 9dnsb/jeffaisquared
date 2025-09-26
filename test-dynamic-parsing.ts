import { parseDynamicTimeframe, getSupportedTimeframExamples } from './src/lib/ai-v3/utils/dynamic-date-parser'

// Test the dynamic date parser
const testCases = [
  'today', 'yesterday', 'this week', 'this month', 'last 2 days',
  'last 3 weeks', 'August 2025', 'Q1 2024', '2025', 'invalid'
]

console.log('=== Dynamic Date Parser Test Results ===\n')

for (const testCase of testCases) {
  const result = parseDynamicTimeframe(testCase)
  console.log(`Input: "${testCase}"`)
  console.log(`Success: ${result.success}`)

  if (result.success && result.dateRange) {
    console.log(`Description: ${result.dateRange.description}`)
    console.log(`Range: ${result.dateRange.startDate.toDateString()} to ${result.dateRange.endDate.toDateString()}`)
  } else {
    console.log(`Error: ${result.error}`)
  }
  console.log('---')
}

console.log('\nSupported Examples:')
getSupportedTimeframExamples().forEach(example => console.log(`  • ${example}`))