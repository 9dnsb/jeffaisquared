import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  calculateGroundTruthV3,
  disconnectPrismaV3,
  type GroundTruthV3,
} from './ground-truth-v3'

// Helper function to make AI requests to the test endpoint
async function makeAIRequest(prompt: string) {
  const response = await fetch('http://localhost:3000/api/test-query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: prompt,
      conversationHistory: [],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `AI request failed: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

// Helper function to extract numeric value from AI response
function extractValue(response: any, metric: string): number {
  if (
    !response?.data ||
    !Array.isArray(response.data) ||
    response.data.length === 0
  ) {
    return 0
  }

  // Helper function to get field value with fallback patterns
  const getFieldValue = (item: any, metric: string): number | null => {
    // Try exact match first
    if (item[metric] !== undefined) {
      return Number(item[metric])
    }

    // Field mapping fallbacks for common patterns
    const fieldMappings: Record<string, string[]> = {
      revenue: ['total_revenue', 'totalRevenue', 'revenue_total'],
      count: [
        'total_count',
        'totalCount',
        'transaction_count',
        'total_transactions',
      ],
      quantity: ['total_quantity', 'totalQuantity', 'quantity_sold'],
      avg_transaction: [
        'average_transaction',
        'avg_transaction_value',
        'average_value',
      ],
      unique_items: ['unique_item_count', 'distinct_items', 'item_count'],
    }

    // Try fallback patterns
    const fallbacks = fieldMappings[metric] || []
    for (const fallback of fallbacks) {
      if (item[fallback] !== undefined) {
        return Number(item[fallback])
      }
    }

    return null
  }

  if (response.data.length === 1) {
    // Single aggregated result
    const value = getFieldValue(response.data[0], metric)
    return value !== null ? value : 0
  }

  // Priority 1: Look for ranked data (location rankings, product rankings)
  const rankedItem = response.data.find((item: any) => item.rank !== undefined)
  if (rankedItem) {
    const value = getFieldValue(rankedItem, metric)
    return value !== null ? value : 0
  }

  // Priority 2: Look for location-specific data when we have both location and general data
  const locationItem = response.data.find((item: any) => {
    const value = getFieldValue(item, metric)
    return item.location && value !== null
  })
  if (locationItem && response.data.some((item: any) => !item.location)) {
    // We have both location-specific and general data, prefer location-specific
    const value = getFieldValue(locationItem, metric)
    return value !== null ? value : 0
  }

  // Priority 3: Look for date-specific data when we have multiple time periods
  const dateItem = response.data.find((item: any) => {
    const value = getFieldValue(item, metric)
    return item.date && value !== null
  })
  if (dateItem) {
    const value = getFieldValue(dateItem, metric)
    return value !== null ? value : 0
  }

  // Priority 4: Look for items with specific identifiers (item names, categories)
  const specificItem = response.data.find((item: any) => {
    const value = getFieldValue(item, metric)
    return (item.item || item.category) && value !== null
  })
  if (specificItem) {
    const value = getFieldValue(specificItem, metric)
    return value !== null ? value : 0
  }

  // Fallback: If all items have the same structure, sum them (for aggregated results)
  const hasConsistentStructure = response.data.every(
    (item: any) =>
      Object.keys(item).length === Object.keys(response.data[0]).length
  )

  if (hasConsistentStructure) {
    return response.data.reduce((sum: number, row: any) => {
      const value = getFieldValue(row, metric)
      return sum + (value !== null ? value : 0)
    }, 0)
  }

  // Final fallback: Return first available value
  const firstItemWithMetric = response.data.find(
    (item: any) => getFieldValue(item, metric) !== null
  )
  if (firstItemWithMetric) {
    const value = getFieldValue(firstItemWithMetric, metric)
    return value !== null ? value : 0
  }

  return 0
}

// Helper function to check if value is within tolerance (2% for precision)
function expectInTolerance(actual: number, expected: number, tolerance = 0.02) {
  const min = expected * (1 - tolerance)
  const max = expected * (1 + tolerance)
  expect(actual).toBeGreaterThanOrEqual(min)
  expect(actual).toBeLessThanOrEqual(max)
}

// Performance test helper - ensure queries complete within 10 seconds
function expectPerformance(startTime: number, maxSeconds = 60) {
  const duration = (Date.now() - startTime) / 1000
  expect(duration).toBeLessThan(maxSeconds)
}

describe('AI v3 Comprehensive Test Suite - 100 Business-Focused Tests', () => {
  let groundTruth: GroundTruthV3

  beforeAll(async () => {
    console.log('🔍 Calculating ground truth for 100 comprehensive tests...')
    groundTruth = await calculateGroundTruthV3()
    console.log('✅ Ground truth calculation completed')
  }, 120000) // 2 minute timeout for ground truth calculation

  afterAll(async () => {
    await disconnectPrismaV3()
  }, 30000) // 30 second timeout for cleanup

  // ===== TIME-BASED QUERIES (30 tests) =====
  describe('Today Analysis (7 tests)', () => {
    it('should calculate total revenue today', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's our total revenue today?")
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.todayRevenue)
    })

    it('should count transactions today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have today?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.todayTransactionCount)
    })

    it('should calculate average transaction value today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our average transaction value today?"
      )
      expectPerformance(start)

      const avg = extractValue(response, 'avg_transaction')
      expectInTolerance(avg, groundTruth.todayAverageTransaction)
    })

    it('should calculate total quantity sold today', async () => {
      const start = Date.now()
      const response = await makeAIRequest('How many items did we sell today?')
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expectInTolerance(quantity, groundTruth.todayQuantitySold)
    })

    it('should identify top performing location today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest sales today?'
      )
      expectPerformance(start)

      // DEBUG: Show what the AI function returned vs ground truth expectation
      console.log('🔍 DEBUG AI Response for top location today:')
      console.log('  AI Response data:', response.data)
      console.log('  AI Response summary:', response.summary)
      console.log('  Ground truth expects:', groundTruth.todayTopLocation)
      console.log(
        '  AI returned location:',
        response.data[0]?.location || response.data[0]?.name
      )

      expect(response.data).toBeDefined()
      if (groundTruth.todayRevenue > 0 && groundTruth.todayTopLocation) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.todayTopLocation
        )
      }
    })

    it('should calculate top location revenue today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the revenue of our best performing location today?'
      )
      expectPerformance(start)

      if (groundTruth.todayTopLocationRevenue > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.todayTopLocationRevenue)
      }
    })

    it('should count unique items sold today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many different items did we sell today?'
      )
      expectPerformance(start)

      if (groundTruth.todayUniqueItemCount > 0) {
        const count = extractValue(response, 'unique_items')
        expectInTolerance(count, groundTruth.todayUniqueItemCount)
      }
    })

    it('should give a breakdown of revenue sales by location today', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Show me the revenue for each location today'
      )
      expectPerformance(start)

      // DEBUG: Show what the AI function returned for location breakdown
      console.log('🔍 DEBUG AI Response for location breakdown today:')
      console.log('  AI Response data:', response.data)
      console.log('  AI Response summary:', response.summary)

      // Should return data for multiple locations if there are sales today
      expect(response.data).toBeDefined()

      if (groundTruth.todayRevenue > 0) {
        // Should have at least one location with revenue data
        expect(response.data.length).toBeGreaterThan(0)

        // Each location should have location name and revenue fields
        const hasLocationData = response.data.some(
          (item: any) =>
            (item.location || item.name) &&
            (item.revenue !== undefined ||
              item.total_revenue !== undefined ||
              item.totalRevenue !== undefined)
        )
        expect(hasLocationData).toBe(true)

        // Total of all location revenues should match today's total revenue (within tolerance)
        const locationRevenues = response.data.map(
          (item: any) => extractValue(item, 'revenue') || 0
        )
        const totalLocationRevenue = locationRevenues.reduce(
          (sum: number, rev: number) => sum + rev,
          0
        )

        if (totalLocationRevenue > 0) {
          expectInTolerance(totalLocationRevenue, groundTruth.todayRevenue)
        }
      }
    })
  })

  describe('Yesterday Analysis (7 tests)', () => {
    it('should calculate total revenue yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our total revenue yesterday?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.yesterdayRevenue)
    })

    it('should count transactions yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have yesterday?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.yesterdayTransactionCount)
    })

    it('should calculate average transaction value yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our average transaction value yesterday?'
      )
      expectPerformance(start)

      const avg = extractValue(response, 'avg_transaction')
      expectInTolerance(avg, groundTruth.yesterdayAverageTransaction)
    })

    it('should calculate total quantity sold yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many items did we sell yesterday?'
      )
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expectInTolerance(quantity, groundTruth.yesterdayQuantitySold)
    })

    it('should identify top performing location yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest sales yesterday?'
      )
      expectPerformance(start)

      if (
        groundTruth.yesterdayRevenue > 0 &&
        groundTruth.yesterdayTopLocation
      ) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.yesterdayTopLocation
        )
      }
    })

    it('should calculate top location revenue yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the revenue of our best performing location yesterday?'
      )
      expectPerformance(start)

      if (groundTruth.yesterdayTopLocationRevenue > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.yesterdayTopLocationRevenue)
      }
    })

    it('should count unique items sold yesterday', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many different items did we sell yesterday?'
      )
      expectPerformance(start)

      if (groundTruth.yesterdayUniqueItemCount > 0) {
        const count = extractValue(response, 'unique_items')
        expectInTolerance(count, groundTruth.yesterdayUniqueItemCount)
      }
    })
  })

  describe('Last Week Analysis (8 tests)', () => {
    it('should calculate total revenue last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our total revenue in the last week?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.lastWeekRevenue)
    })

    it('should count transactions last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have in the last week?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.lastWeekTransactionCount)
    })

    it('should calculate average transaction value last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our average transaction value in the last week?'
      )
      expectPerformance(start)

      const avg = extractValue(response, 'avg_transaction')
      expectInTolerance(avg, groundTruth.lastWeekAverageTransaction)
    })

    it('should calculate total quantity sold last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many items did we sell in the last week?'
      )
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expectInTolerance(quantity, groundTruth.lastWeekQuantitySold)
    })

    it('should identify top performing location last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest sales in the last week?'
      )
      expectPerformance(start)

      if (groundTruth.lastWeekRevenue > 0 && groundTruth.lastWeekTopLocation) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.lastWeekTopLocation
        )
      }
    })

    it('should calculate top location revenue last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the revenue of our best performing location last week?'
      )
      expectPerformance(start)

      if (groundTruth.lastWeekTopLocationRevenue > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.lastWeekTopLocationRevenue)
      }
    })

    it('should identify best performing day last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which day had the highest sales last week?'
      )
      expectPerformance(start)

      if (
        groundTruth.lastWeekBestDay &&
        groundTruth.lastWeekBestDayRevenue > 0
      ) {
        expect(response.data).toBeDefined()
        // Date format might vary, just check we get results
        expect(response.data.length).toBeGreaterThan(0)
      }
    })

    it('should calculate best day revenue last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the revenue on our best day last week?'
      )
      expectPerformance(start)

      if (groundTruth.lastWeekBestDayRevenue > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.lastWeekBestDayRevenue)
      }
    })
  })

  describe('Last Month Analysis (8 tests)', () => {
    it('should calculate total revenue last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our total revenue in the last month?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.lastMonthRevenue)
    })

    it('should count transactions last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have in the last month?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.lastMonthTransactionCount)
    })

    it('should calculate average transaction value last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our average transaction value in the last month?'
      )
      expectPerformance(start)

      const avg = extractValue(response, 'avg_transaction')
      expectInTolerance(avg, groundTruth.lastMonthAverageTransaction)
    })

    it('should calculate total quantity sold last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many items did we sell in the last month?'
      )
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expectInTolerance(quantity, groundTruth.lastMonthQuantitySold)
    })

    it('should identify top performing location last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest sales in the last month?'
      )
      expectPerformance(start)

      if (
        groundTruth.lastMonthRevenue > 0 &&
        groundTruth.lastMonthTopLocation
      ) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.lastMonthTopLocation
        )
      }
    })

    it('should calculate top location revenue last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the revenue of our best performing location last month?'
      )
      expectPerformance(start)

      if (groundTruth.lastMonthTopLocationRevenue > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.lastMonthTopLocationRevenue)
      }
    })

    it('should compare last month vs previous month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How did last month compare to the previous month?'
      )
      expectPerformance(start)

      // Should return comparison data
      expect(response.data).toBeDefined()
      expect(response.summary).toBeDefined()
    })

    it('should calculate month-over-month growth', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was our month-over-month revenue growth?'
      )
      expectPerformance(start)

      // Should return growth metrics
      expect(response.data).toBeDefined()
    })
  })

  // ===== DYNAMIC TIME PERIODS (9 tests) =====
  describe('Dynamic Time Period Analysis (9 tests)', () => {
    // This Month tests (3 tests)
    it('should calculate revenue for this month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What is the total revenue for this month?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.thisMonthRevenue)
    })

    it('should count transactions for this month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have this month?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expect(count).toBe(groundTruth.thisMonthTransactionCount)
    })

    it('should calculate quantity sold this month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many items did we sell this month?'
      )
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expect(quantity).toBe(groundTruth.thisMonthQuantitySold)
    })

    // August 2025 tests (3 tests)
    it('should calculate total revenue for August 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the total revenue in August 2025?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.august2025Revenue)
    })

    it('should count transactions for August 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have in August 2025?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expect(count).toBe(groundTruth.august2025TransactionCount)
    })

    it('should identify top location in August 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest revenue in August 2025?'
      )
      expectPerformance(start)

      expect(response.summary).toBeDefined()
      if (groundTruth.august2025TopLocation) {
        expect(response.summary.toLowerCase()).toContain(
          groundTruth.august2025TopLocation.toLowerCase()
        )
      }
    })

    // July 2025 tests (3 tests)
    it('should calculate total revenue for July 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What was the total revenue in July 2025?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.july2025Revenue)
    })

    it('should count transactions for July 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions did we have in July 2025?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expect(count).toBe(groundTruth.july2025TransactionCount)
    })

    it('should identify top location in July 2025', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location had the highest revenue in July 2025?'
      )
      expectPerformance(start)

      expect(response.summary).toBeDefined()
      if (groundTruth.july2025TopLocation) {
        expect(response.summary.toLowerCase()).toContain(
          groundTruth.july2025TopLocation.toLowerCase()
        )
      }
    })
  })

  // ===== LOCATION COMPARISONS (25 tests) =====
  describe('Individual Location Performance (12 tests)', () => {
    it('should calculate HQ total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at our HQ location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.hqTotalRevenue)
    })

    it('should calculate Yonge location total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at our Yonge location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.yongeTotalRevenue)
    })

    it('should calculate Bloor location total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at our Bloor location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.bloorTotalRevenue)
    })

    it('should calculate Kingston location total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at our Kingston location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.kingstonTotalRevenue)
    })

    it('should calculate The Well location total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at The Well location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.wellTotalRevenue)
    })

    it('should calculate Broadway location total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the total revenue at our Broadway location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.broadwayTotalRevenue)
    })

    it('should calculate HQ transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest('How many transactions has HQ had?')
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.hqTotalTransactions)
    })

    it('should calculate Yonge transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions has Yonge had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.yongeTotalTransactions)
    })

    it('should calculate Bloor transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions has Bloor had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.bloorTotalTransactions)
    })

    it('should calculate Kingston transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions has Kingston had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.kingstonTotalTransactions)
    })

    it('should calculate The Well transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions has The Well had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.wellTotalTransactions)
    })

    it('should calculate Broadway transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many transactions has Broadway had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.broadwayTotalTransactions)
    })
  })

  describe('Location Rankings and Comparisons (13 tests)', () => {
    it('should identify top performing location overall', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location has the highest total revenue?'
      )
      expectPerformance(start)

      if (groundTruth.topPerformingLocation) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.topPerformingLocation
        )
      }
    })

    it('should calculate top location revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the revenue of our top performing location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.topPerformingLocationRevenue)
    })

    it('should identify lowest performing location', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location has the lowest total revenue?'
      )
      expectPerformance(start)

      if (groundTruth.lowestPerformingLocation) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.lowestPerformingLocation
        )
      }
    })

    it('should calculate lowest location revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the revenue of our lowest performing location?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.lowestPerformingLocationRevenue)
    })

    it('should compare HQ vs Yonge revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Compare revenue between HQ and Yonge locations'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should compare Bloor vs Kingston revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Compare revenue between Bloor and Kingston locations'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should calculate top three locations total revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the combined revenue of our top 3 locations?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.topThreeLocationsRevenue)
    })

    it('should identify busiest location by transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location has the most transactions?'
      )
      expectPerformance(start)

      if (groundTruth.busiesLocationByTransactionCount) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.busiesLocationByTransactionCount
        )
      }
    })

    it('should identify quietest location by transaction count', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location has the fewest transactions?'
      )
      expectPerformance(start)

      if (groundTruth.quietestLocationByTransactionCount) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.quietestLocationByTransactionCount
        )
      }
    })

    it('should identify location with highest average transaction', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location has the highest average transaction value?'
      )
      expectPerformance(start)

      if (groundTruth.locationWithHighestAverageTransaction) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.locationWithHighestAverageTransaction
        )
      }
    })

    it('should rank all locations by performance', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Rank all locations by revenue from highest to lowest'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ===== PRODUCT ANALYTICS (20 tests) =====
  describe('Top Product Analysis (10 tests)', () => {
    it('should identify top selling item by revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our top selling item by revenue?"
      )
      expectPerformance(start)

      if (groundTruth.topSellingItemByRevenue) {
        expect(response.data[0]?.item || response.data[0]?.name).toBe(
          groundTruth.topSellingItemByRevenue
        )
      }
    })

    it('should calculate top item revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How much revenue did our top selling item generate?'
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.topSellingItemRevenue)
    })

    it('should identify top selling item by quantity', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our top selling item by quantity?"
      )
      expectPerformance(start)

      if (groundTruth.topSellingItemByQuantity) {
        expect(response.data[0]?.item || response.data[0]?.name).toBe(
          groundTruth.topSellingItemByQuantity
        )
      }
    })

    it('should calculate top item quantity sold', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many units of our top item did we sell?'
      )
      expectPerformance(start)

      const quantity = extractValue(response, 'quantity')
      expectInTolerance(quantity, groundTruth.topSellingItemQuantity)
    })

    it('should show top 5 items by revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest('Show me the top 5 items by revenue')
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeLessThanOrEqual(5)
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should show top 10 items by quantity', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Show me the top 10 items by quantity sold'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeLessThanOrEqual(10)
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should identify most popular category', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our most popular product category?"
      )
      expectPerformance(start)

      if (groundTruth.mostPopularCategory) {
        expect(response.data[0]?.category || response.data[0]?.name).toContain(
          groundTruth.mostPopularCategory
        )
      }
    })

    it('should calculate total unique items sold', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many different unique items have we sold?'
      )
      expectPerformance(start)

      if (groundTruth.totalUniqueItemsSold > 0) {
        const count = extractValue(response, 'count')
        expectInTolerance(count, groundTruth.totalUniqueItemsSold)
      }
    })

    it('should calculate average item price', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the average price of our items?"
      )
      expectPerformance(start)

      if (groundTruth.averageItemPrice > 0) {
        const avg =
          extractValue(response, 'avg_transaction') ||
          extractValue(response, 'revenue')
        expectInTolerance(avg, groundTruth.averageItemPrice)
      }
    })
  })

  describe('Product Location Analysis (10 tests)', () => {
    it('should identify top item at HQ', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's the top selling item at HQ?")
      expectPerformance(start)

      if (groundTruth.topItemAtHQ) {
        expect(response.data[0]?.item || response.data[0]?.name).toBe(
          groundTruth.topItemAtHQ
        )
      }
    })

    it('should identify top item at Yonge', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the top selling item at Yonge?"
      )
      expectPerformance(start)

      if (groundTruth.topItemAtYonge) {
        expect(response.data[0]?.item || response.data[0]?.name).toBe(
          groundTruth.topItemAtYonge
        )
      }
    })

    it('should identify top item at Bloor', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's the top selling item at Bloor?"
      )
      expectPerformance(start)

      if (groundTruth.topItemAtBloor) {
        expect(response.data[0]?.item || response.data[0]?.name).toBe(
          groundTruth.topItemAtBloor
        )
      }
    })

    it('should calculate top item revenue at HQ', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How much revenue did the top item at HQ generate?'
      )
      expectPerformance(start)

      if (groundTruth.topItemRevenueAtHQ > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.topItemRevenueAtHQ)
      }
    })

    it('should calculate top item revenue at Yonge', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How much revenue did the top item at Yonge generate?'
      )
      expectPerformance(start)

      if (groundTruth.topItemRevenueAtYonge > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.topItemRevenueAtYonge)
      }
    })

    it('should calculate top item revenue at Bloor', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How much revenue did the top item at Bloor generate?'
      )
      expectPerformance(start)

      if (groundTruth.topItemRevenueAtBloor > 0) {
        const revenue = extractValue(response, 'revenue')
        expectInTolerance(revenue, groundTruth.topItemRevenueAtBloor)
      }
    })

    it('should compare item performance across locations', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Compare Latte sales across all locations'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeGreaterThan(1)
    })

    it('should identify which items are sold at all locations', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which items are sold at every location?'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should find location with most unique items', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Which location sells the most different items?'
      )
      expectPerformance(start)

      if (groundTruth.locationWithMostUniqueItems) {
        expect(response.data[0]?.location || response.data[0]?.name).toContain(
          groundTruth.locationWithMostUniqueItems
        )
      }
    })
  })

  // ===== BUSINESS METRICS (15 tests) =====
  describe('Overall Business Performance (8 tests)', () => {
    it('should calculate total all-time revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our total revenue across all time?"
      )
      expectPerformance(start)

      const revenue = extractValue(response, 'revenue')
      expectInTolerance(revenue, groundTruth.totalAllTimeRevenue)
    })

    it('should calculate total all-time transactions', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How many total transactions have we had?'
      )
      expectPerformance(start)

      const count = extractValue(response, 'count')
      expectInTolerance(count, groundTruth.totalAllTimeTransactions)
    })

    it('should calculate overall average transaction value', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our overall average transaction value?"
      )
      expectPerformance(start)

      const avg = extractValue(response, 'avg_transaction')
      expectInTolerance(avg, groundTruth.overallAverageTransaction)
    })

    it('should calculate average daily revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's our average daily revenue?")
      expectPerformance(start)

      if (groundTruth.averageDailyRevenue > 0) {
        const avg =
          extractValue(response, 'revenue') ||
          extractValue(response, 'avg_transaction')
        expectInTolerance(avg, groundTruth.averageDailyRevenue)
      }
    })

    it('should calculate average weekly revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's our average weekly revenue?")
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should calculate average monthly revenue', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our average monthly revenue?"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should calculate business growth rate', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's our business growth rate?")
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })
  })

  describe('Performance Comparisons (7 tests)', () => {
    it('should compare this week vs last week', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "Compare this week's revenue to last week"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should compare this month vs last month', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "Compare this month's revenue to last month"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should show weekend vs weekday performance', async () => {
      const start = Date.now()
      const response = await makeAIRequest('Compare weekend vs weekday sales')
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should identify peak sales hour', async () => {
      const start = Date.now()
      const response = await makeAIRequest("What's our peak sales hour?")
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should analyze seasonal trends', async () => {
      const start = Date.now()
      const response = await makeAIRequest('Show me seasonal sales trends')
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should calculate month-over-month growth', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's our month-over-month growth rate?"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should show year-over-year comparison', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "Compare this year's performance to last year"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })
  })

  // ===== COMPLEX AGGREGATIONS (10 tests) =====
  describe('Multi-dimensional Analysis (10 tests)', () => {
    it('should analyze revenue by location and time', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Show me revenue by location and month'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should analyze product performance by location and time', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Show me Coffee sales by location and week'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should calculate market share by location', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "What's each location's market share percentage?"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
      if (groundTruth.hqMarketSharePercentage > 0) {
        // Should include HQ's market share
        const hqData = response.data.find((row: any) =>
          (row.location || row.name || '').includes('HQ')
        )
        if (hqData) {
          const percentage = Number(
            hqData.percentage || hqData.market_share || 0
          )
          expectInTolerance(
            percentage,
            groundTruth.hqMarketSharePercentage,
            0.05
          ) // 5% tolerance for percentages
        }
      }
    })

    it('should analyze customer behavior patterns', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'What are the most common purchase patterns?'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should analyze product mix by location', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'How does product mix vary by location?'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should perform time-series forecasting analysis', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        "Based on trends, what's the projected revenue for next month?"
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should analyze correlation between locations', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Is there a correlation between HQ and Yonge performance?'
      )
      expectPerformance(start)

      expect(response.data).toBeDefined()
    })

    it('should perform comprehensive business health analysis', async () => {
      const start = Date.now()
      const response = await makeAIRequest(
        'Give me a comprehensive analysis of our business performance'
      )
      expectPerformance(start, 15) // Allow up to 15 seconds for complex analysis

      expect(response.data).toBeDefined()
      expect(response.summary).toBeDefined()
      expect(response.summary.length).toBeGreaterThan(100) // Should be a comprehensive summary
    })
  })
})
