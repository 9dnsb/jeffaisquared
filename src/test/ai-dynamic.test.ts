import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import './ai-test-matchers'
import { calculateGroundTruth, makeAIRequest, calculateRangeValue, createDynamicRange, disconnectPrisma, type GroundTruthData } from './ai-test-utils'

describe('AI Dynamic Data Tests', () => {
  let groundTruth: GroundTruthData

  beforeAll(async () => {
    // Calculate ground truth data once for all dynamic tests
    groundTruth = await calculateGroundTruth()
  }, 30000) // 30 second timeout for database operations

  afterAll(async () => {
    await disconnectPrisma()
  })

  // Test structure follows consistent pattern for different time periods
  // Each time period (today, yesterday, last week, etc.) requires similar assertions with different ground truth values
  // jscpd:ignore-start
  describe('Today Analysis', () => {
    it('should calculate total sales today', async () => {
      const response = await makeAIRequest("What are our total sales today?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedRange = createDynamicRange(groundTruth.todaySales, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate transaction count today', async () => {
      const response = await makeAIRequest("How many transactions did we have today?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'count', 'total')
      const expectedRange = createDynamicRange(groundTruth.todayTransactions, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate average transaction value today', async () => {
      const response = await makeAIRequest("What's our average transaction value today?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])
      expect(response).toHaveGroupBy([])

      const avgValue = calculateRangeValue(response.data, 'avg_transaction', 'total')
      const expectedAvg = groundTruth.todayTransactions > 0
        ? groundTruth.todaySales / groundTruth.todayTransactions
        : 0

      if (expectedAvg > 0) {
        const expectedRange = createDynamicRange(expectedAvg, 0.1)
        expect(avgValue).toBeInRange(expectedRange.min, expectedRange.max)
      } else {
        expect(avgValue).toBe(0)
      }
    })

    it('should identify busiest location today', async () => {
      const response = await makeAIRequest("Which location had the most sales today?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])

      // We can't predict which location will be busiest today,
      // but we can verify the structure and that data exists
      if (groundTruth.todaySales > 0) {
        expect(response.data.length).toBeGreaterThan(0)
        const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
        expect(maxValue).toBeGreaterThan(0)
      }
    })

    it('should count different locations with sales today', async () => {
      const response = await makeAIRequest("How many different locations had sales today?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy(['location'])

      if (groundTruth.todayTransactions > 0) {
        const locationCount = calculateRangeValue(response.data, 'count', 'count')
        expect(locationCount).toBeGreaterThan(0)
        expect(locationCount).toBeLessThanOrEqual(6) // Max 6 locations
      }
    })
  })

  describe('Yesterday Analysis', () => {
    it('should calculate total sales yesterday', async () => {
      const response = await makeAIRequest("What were our total sales yesterday?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedRange = createDynamicRange(groundTruth.yesterdaySales, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate transaction count yesterday', async () => {
      const response = await makeAIRequest("How many transactions did we have yesterday?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'count', 'total')
      const expectedRange = createDynamicRange(groundTruth.yesterdayTransactions, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate average transaction value yesterday', async () => {
      const response = await makeAIRequest("What was our average transaction value yesterday?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])
      expect(response).toHaveGroupBy([])

      const avgValue = calculateRangeValue(response.data, 'avg_transaction', 'total')
      const expectedAvg = groundTruth.yesterdayTransactions > 0
        ? groundTruth.yesterdaySales / groundTruth.yesterdayTransactions
        : 0

      if (expectedAvg > 0) {
        const expectedRange = createDynamicRange(expectedAvg, 0.1)
        expect(avgValue).toBeInRange(expectedRange.min, expectedRange.max)
      } else {
        expect(avgValue).toBe(0)
      }
    })

    it('should identify busiest location yesterday', async () => {
      const response = await makeAIRequest("Which location had the most sales yesterday?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])

      if (groundTruth.yesterdaySales > 0) {
        expect(response.data.length).toBeGreaterThan(0)
        const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
        expect(maxValue).toBeGreaterThan(0)
      }
    })

    it('should count different locations with sales yesterday', async () => {
      const response = await makeAIRequest("How many different locations had sales yesterday?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy(['location'])

      if (groundTruth.yesterdayTransactions > 0) {
        const locationCount = calculateRangeValue(response.data, 'count', 'count')
        expect(locationCount).toBeGreaterThan(0)
        expect(locationCount).toBeLessThanOrEqual(6)
      }
    })
  })

  describe('Last Week Analysis', () => {
    it('should calculate total sales in the last week', async () => {
      const response = await makeAIRequest("What were our total sales in the last week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedRange = createDynamicRange(groundTruth.lastWeekSales, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate transaction count in the last week', async () => {
      const response = await makeAIRequest("How many transactions did we have in the last week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'count', 'total')
      const expectedRange = createDynamicRange(groundTruth.lastWeekTransactions, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate average transaction value in the last week', async () => {
      const response = await makeAIRequest("What was our average transaction value in the last week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])
      expect(response).toHaveGroupBy([])

      const avgValue = calculateRangeValue(response.data, 'avg_transaction', 'total')
      const expectedAvg = groundTruth.lastWeekTransactions > 0
        ? groundTruth.lastWeekSales / groundTruth.lastWeekTransactions
        : 0

      if (expectedAvg > 0) {
        const expectedRange = createDynamicRange(expectedAvg, 0.1)
        expect(avgValue).toBeInRange(expectedRange.min, expectedRange.max)
      } else {
        expect(avgValue).toBe(0)
      }
    })

    it('should identify busiest location in the last week', async () => {
      const response = await makeAIRequest("Which location had the most sales in the last week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])

      if (groundTruth.lastWeekSales > 0) {
        expect(response.data.length).toBeGreaterThan(0)
        const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
        expect(maxValue).toBeGreaterThan(0)
      }
    })

    it('should count different locations with sales in the last week', async () => {
      const response = await makeAIRequest("How many different locations had sales in the last week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy(['location'])

      if (groundTruth.lastWeekTransactions > 0) {
        const locationCount = calculateRangeValue(response.data, 'count', 'count')
        expect(locationCount).toBeGreaterThan(0)
        expect(locationCount).toBeLessThanOrEqual(6)
      }
    })

    it('should identify busiest day this week', async () => {
      const response = await makeAIRequest("Which day had the most sales this week?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['date'])

      if (groundTruth.lastWeekSales > 0) {
        expect(response.data.length).toBeGreaterThan(0)
        expect(response.data.length).toBeLessThanOrEqual(7) // Max 7 days
      }
    })
  })

  describe('Monthly Analysis', () => {
    it('should calculate sales this month', async () => {
      const response = await makeAIRequest("What were our sales this month?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedRange = createDynamicRange(groundTruth.thisMonthSales, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate transaction count this month', async () => {
      const response = await makeAIRequest("How many transactions did we have this month?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'count', 'total')
      const expectedRange = createDynamicRange(groundTruth.thisMonthTransactions, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })
  })

  describe('30-Day Analysis', () => {
    it('should calculate sales in the last 30 days', async () => {
      const response = await makeAIRequest("What were our sales in the last 30 days?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedRange = createDynamicRange(groundTruth.last30DaysSales, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })

    it('should calculate transaction count in the last 30 days', async () => {
      const response = await makeAIRequest("How many transactions did we have in the last 30 days?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'count', 'total')
      const expectedRange = createDynamicRange(groundTruth.last30DaysTransactions, 0.1)
      expect(total).toBeInRange(expectedRange.min, expectedRange.max)
    })
  })
  // jscpd:ignore-end

  describe('Dynamic Business Metrics', () => {
    it('should calculate average daily sales based on current data', async () => {
      const response = await makeAIRequest("What's our average daily sales?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      // This is dynamic based on current data patterns
      const avgValue = calculateRangeValue(response.data, 'revenue', 'total')
      expect(avgValue).toBeGreaterThan(0)
    })

    it('should calculate average transactions per day', async () => {
      const response = await makeAIRequest("How many transactions do we average per day?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])
      expect(response).toHaveGroupBy([])

      const avgValue = calculateRangeValue(response.data, 'count', 'total')
      expect(avgValue).toBeGreaterThan(0)
    })

    it('should calculate average monthly sales based on current data', async () => {
      const response = await makeAIRequest("What's our average monthly sales?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const avgValue = calculateRangeValue(response.data, 'revenue', 'total')
      expect(avgValue).toBeGreaterThan(0)
    })
  })

  describe('Dynamic Time Comparisons', () => {
    it('should calculate sales two weeks ago', async () => {
      const response = await makeAIRequest("What were our sales two weeks ago?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      // Dynamic range - we can't predict exact value
      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeGreaterThanOrEqual(0)
    })
  })
})