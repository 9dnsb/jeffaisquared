// Test script to validate AI responses against expected results
// Using built-in fetch (Node.js 18+)

const TEST_CASES = [
  {
    id: 'basic_total_sales',
    prompt: "What were our total sales in 2024?",
    expectedRange: { min: 200000, max: 210000 }, // Ground truth: $203,201 total for 2024
    expectedMetrics: ['revenue'],
    expectedGroupBy: []
  },
  {
    id: 'september_transactions',
    prompt: "How many transactions did we have in September 2025?",
    expectedRange: { min: 880, max: 890 }, // Actual: 882 transactions
    expectedMetrics: ['count'],
    expectedGroupBy: []
  },
  {
    id: 'average_transaction',
    prompt: "What's our average transaction value in September 2025?",
    expectedRange: { min: 17, max: 18 }, // Ground truth: $17.73 average transaction
    expectedMetrics: ['avg_transaction'],
    expectedGroupBy: []
  },
  {
    id: 'location_comparison',
    prompt: "Compare sales between Yonge and Bloor locations this year",
    expectedRange: { min: 59000, max: 60000 }, // Ground truth 2025: Yonge $24,979 + Bloor $34,162 = $59,141
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['location'],
    expectedLocationCount: 2
  },
  {
    id: 'best_location',
    prompt: "Which location had the highest sales?",
    expectedRange: { min: 87000, max: 89000 }, // HQ should be highest: $87,988
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['location'],
    expectedTopLocation: 'HQ'
  },
  {
    id: 'top_items',
    prompt: "What are our top 3 selling items by revenue?",
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['item'],
    expectedItemCount: 3,
    expectedTopItem: 'Brew Coffee' // $72,806 revenue
  },
  {
    id: 'latte_quantity',
    prompt: "How many Latte did we sell total?",
    expectedRange: { min: 9800, max: 9850 }, // Actual: 9,818 lattes
    expectedMetrics: ['quantity'],
    expectedItems: ['Latte']
  },
  {
    id: 'monthly_breakdown',
    prompt: "Show me monthly sales breakdown for 2024",
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['month'],
    expectedRange: { min: 10000, max: 30000 } // Per month: typical range $10k-30k based on actual data
  },
  {
    id: 'location_keywords_hq',
    prompt: "What were sales at the main location?",
    expectedRange: { min: 87000, max: 89000 }, // Ground truth: HQ total $87,988
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    expectedLocationMapping: 'LZEVY2P88KZA8'
  },
  {
    id: 'location_keywords_yonge',
    prompt: "Sales at Yonge street location",
    expectedRange: { min: 58000, max: 60000 }, // Ground truth: Yonge total $58,989
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    expectedLocationMapping: 'LAH170A0KK47P'
  },
  {
    id: 'date_range_query',
    prompt: "What were our sales from March to May 2024?",
    expectedRange: { min: 65000, max: 67000 }, // Ground truth: Mar $22,087 + Apr $22,033 + May $21,694 = $65,814
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    category: 'time_analysis'
  },
  {
    id: 'location_transaction_volume',
    prompt: "Which location has the most transactions?",
    expectedRange: { min: 5280, max: 5300 }, // Ground truth: HQ has 5288 transactions
    expectedMetrics: ['count'],
    expectedGroupBy: ['location'],
    expectedTopLocation: 'HQ',
    category: 'location_analysis'
  },
  {
    id: 'today_total_sales',
    prompt: "What are our total sales today?",
    expectedRange: { min: 710, max: 720 }, // Ground truth: $718.97 for September 19, 2025
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'today_transaction_count',
    prompt: "How many transactions did we have today?",
    expectedRange: { min: 48, max: 48 }, // Ground truth: exactly 48 transactions today
    expectedMetrics: ['count'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'today_average_transaction',
    prompt: "What's our average transaction value today?",
    expectedRange: { min: 14, max: 16 }, // Ground truth: $718.97 / 48 = $14.98
    expectedMetrics: ['avg_transaction'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'today_busiest_location',
    prompt: "Which location had the most sales today?",
    expectedRange: { min: 210, max: 220 }, // Ground truth: HQ had highest with $213.92
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['location'],
    expectedTopLocation: 'HQ',
    category: 'daily_location_analysis'
  },
  {
    id: 'today_location_count',
    prompt: "How many different locations had sales today?",
    expectedRange: { min: 6, max: 6 }, // Ground truth: 6 locations had sales today
    expectedMetrics: ['count'],
    expectedGroupBy: ['location'],
    category: 'daily_location_analysis'
  },
  {
    id: 'yesterday_total_sales',
    prompt: "What were our total sales yesterday?",
    expectedRange: { min: 790, max: 810 }, // Ground truth: $799.14 for September 18, 2025
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'yesterday_transaction_count',
    prompt: "How many transactions did we have yesterday?",
    expectedRange: { min: 48, max: 48 }, // Ground truth: exactly 48 transactions yesterday
    expectedMetrics: ['count'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'yesterday_average_transaction',
    prompt: "What was our average transaction value yesterday?",
    expectedRange: { min: 16, max: 17 }, // Ground truth: $799.14 / 48 = $16.65
    expectedMetrics: ['avg_transaction'],
    expectedGroupBy: [],
    category: 'daily_analysis'
  },
  {
    id: 'yesterday_busiest_location',
    prompt: "Which location had the most sales yesterday?",
    expectedRange: { min: 215, max: 225 }, // Ground truth: HQ had highest with $219.62
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['location'],
    expectedTopLocation: 'HQ', // HQ was highest with $219.62
    category: 'daily_location_analysis'
  },
  {
    id: 'yesterday_location_count',
    prompt: "How many different locations had sales yesterday?",
    expectedRange: { min: 6, max: 6 }, // Ground truth: 6 locations (HQ, Bloor, Kingston, Broadway, Yonge, The Well)
    expectedMetrics: ['count'],
    expectedGroupBy: ['location'],
    category: 'daily_location_analysis'
  },
  {
    id: 'last_week_total_sales',
    prompt: "What were our total sales in the last week?",
    expectedRange: { min: 5280, max: 5300 }, // Correct Sept 13-19: $5,287.98
    expectedMetrics: ['revenue'],
    expectedGroupBy: [],
    category: 'weekly_analysis'
  },
  {
    id: 'last_week_transaction_count',
    prompt: "How many transactions did we have in the last week?",
    expectedRange: { min: 309, max: 309 }, // Correct Sept 13-19: 309 transactions
    expectedMetrics: ['count'],
    expectedGroupBy: [],
    category: 'weekly_analysis'
  },
  {
    id: 'last_week_average_transaction',
    prompt: "What was our average transaction value in the last week?",
    expectedRange: { min: 17, max: 18 }, // Ground truth: $5,287.98 / 309 = $17.11
    expectedMetrics: ['avg_transaction'],
    expectedGroupBy: [],
    category: 'weekly_analysis'
  },
  {
    id: 'last_week_busiest_location',
    prompt: "Which location had the most sales in the last week?",
    expectedRange: { min: 1380, max: 1390 }, // Correct Sept 13-19: HQ $1,386.64
    expectedMetrics: ['revenue'],
    expectedGroupBy: ['location'],
    expectedTopLocation: 'HQ',
    category: 'weekly_location_analysis'
  },
  {
    id: 'last_week_location_count',
    prompt: "How many different locations had sales in the last week?",
    expectedRange: { min: 6, max: 6 }, // Ground truth: 6 locations
    expectedMetrics: ['count'],
    expectedGroupBy: ['location'],
    category: 'weekly_location_analysis'
  }
]

async function testAIResponse(testCase) {
  console.log(`\n🧪 Testing: ${testCase.id}`)
  console.log(`Prompt: "${testCase.prompt}"`)

  try {
    const response = await fetch('http://localhost:3000/api/test-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testCase.prompt,
        conversationHistory: []
      })
    })

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      return { testCase, success: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    console.log(`📝 AI Response: ${data.summary?.slice(0, 150)}...`)

    // Analyze response
    const results = analyzeResponse(data, testCase)

    if (results.success) {
      console.log(`✅ Test passed`)
    } else {
      console.log(`❌ Test failed: ${results.issues.join(', ')}`)
    }

    return { testCase, ...results, aiResponse: data }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { testCase, success: false, error: error.message }
  }
}

function analyzeResponse(data, testCase) {
  const issues = []

  // Check if response was successful
  if (!data.success) {
    issues.push('AI query failed')
    return { success: false, issues }
  }

  // Check data structure
  if (!data.data || !Array.isArray(data.data)) {
    issues.push('Missing or invalid data array')
    return { success: false, issues }
  }

  // Check metrics - the actual response format has metrics at the top level of data objects
  if (testCase.expectedMetrics) {
    const hasExpectedMetrics = testCase.expectedMetrics.every(metric =>
      data.data.some(row => row[metric] !== undefined)
    )
    if (!hasExpectedMetrics) {
      issues.push(`Missing expected metrics: ${testCase.expectedMetrics.join(', ')}`)
    }
  }

  // Check groupBy
  if (testCase.expectedGroupBy) {
    // This would require checking the AI's parameter extraction
    // For now, we'll check if the data structure matches grouping expectations
    if (testCase.expectedGroupBy.length === 0) {
      // Should be simple aggregate (single row) - but allow grouped results if they sum to the expected range
      if (data.data.length !== 1 && data.data.length > 10) {
        issues.push(`Expected simple aggregate or reasonable grouping, got ${data.data.length} rows`)
      }
    } else if (testCase.expectedGroupBy.includes('location') && testCase.expectedLocationCount) {
      if (data.data.length !== testCase.expectedLocationCount) {
        issues.push(`Expected ${testCase.expectedLocationCount} locations, got ${data.data.length}`)
      }
    }
  }

  // Check value ranges
  if (testCase.expectedRange) {
    const metric = testCase.expectedMetrics?.[0] || 'revenue'
    const values = data.data.map(row => row[metric] || 0)
    const total = values.reduce((sum, val) => sum + val, 0)
    const maxValue = Math.max(...values)

    // For simple aggregates or location-specific tests, use total
    // For comparison queries (best/top/highest), use max value
    // For location_comparison, use total even though it contains 'comparison'
    // For location_count tests, use the number of location rows
    const isLocationSpecificTest = testCase.expectedLocationMapping // Tests for specific location
    const isComparisonQuery = testCase.id.includes('best_') || testCase.id.includes('top_')
    const isLocationComparison = testCase.id === 'location_comparison'
    const isLocationCountTest = testCase.id.includes('location_count')
    const useTotal = testCase.expectedGroupBy?.length === 0 || isLocationSpecificTest || isLocationComparison

    let valueToCheck
    if (isLocationCountTest && testCase.expectedGroupBy?.includes('location')) {
      // For "how many locations" questions, count the number of location rows
      valueToCheck = data.data.length
    } else if (useTotal && !isComparisonQuery) {
      valueToCheck = total
    } else {
      valueToCheck = maxValue
    }

    if (valueToCheck < testCase.expectedRange.min || valueToCheck > testCase.expectedRange.max) {
      issues.push(`Value ${valueToCheck.toFixed(2)} outside expected range ${testCase.expectedRange.min}-${testCase.expectedRange.max}`)
    }
  }

  // Check location mapping for keyword tests
  if (testCase.expectedLocationMapping) {
    // This would require inspecting the query parameters or response
    // For now, we'll rely on the value range check
  }

  // Check top items
  if (testCase.expectedTopItem) {
    const topItem = data.data[0]?.item || data.data[0]?.name
    if (topItem !== testCase.expectedTopItem) {
      issues.push(`Expected top item '${testCase.expectedTopItem}', got '${topItem}'`)
    }
  }


  // Check item count for specific count expectations
  if (testCase.expectedItemCount && data.data.length !== testCase.expectedItemCount) {
    issues.push(`Expected ${testCase.expectedItemCount} items, got ${data.data.length}`)
  }

  // Check top location for performance tests
  if (testCase.expectedTopLocation) {
    const topLocation = data.data[0]?.location || data.data[0]?.name
    if (topLocation && !topLocation.includes(testCase.expectedTopLocation)) {
      issues.push(`Expected top location to contain '${testCase.expectedTopLocation}', got '${topLocation}'`)
    }
  }

  return { success: issues.length === 0, issues }
}

async function runAllTests() {
  console.log('🚀 Starting AI Response Testing Suite')
  console.log(`Testing ${TEST_CASES.length} scenarios...\n`)

  const results = []

  for (const testCase of TEST_CASES) {
    const result = await testAIResponse(testCase)
    results.push(result)

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)

  if (failed > 0) {
    console.log('\n🔍 Failed Tests:')
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.testCase.id}: ${result.issues?.join(', ') || result.error}`)
    })
  }

  return results
}

// Run tests
runAllTests().catch(console.error)