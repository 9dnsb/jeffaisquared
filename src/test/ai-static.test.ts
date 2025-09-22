import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import './ai-test-matchers'
import { calculateGroundTruth, makeAIRequest, calculateRangeValue, disconnectPrisma, type GroundTruthData } from './ai-test-utils'

describe('AI Static Data Tests', () => {
  let groundTruth: GroundTruthData

  beforeAll(async () => {
    // Calculate ground truth data once for all static tests
    groundTruth = await calculateGroundTruth()
  }, 30000) // 30 second timeout for database operations

  afterAll(async () => {
    await disconnectPrisma()
  })

  describe('Historical Sales Totals', () => {
    it('should calculate total sales in 2024', async () => {
      const response = await makeAIRequest("What were our total sales in 2024?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy([])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.total2024Sales * 0.95,
        groundTruth.total2024Sales * 1.05
      )
    })

    it('should calculate total sales in 2025', async () => {
      const response = await makeAIRequest("What were our total sales in 2025?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.total2025Sales * 0.95,
        groundTruth.total2025Sales * 1.05
      )
    })

    it('should calculate total all-time sales', async () => {
      const response = await makeAIRequest("What were our total sales across all time?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.totalAllTimeSales * 0.95,
        groundTruth.totalAllTimeSales * 1.05
      )
    })

    it('should calculate total all-time transactions', async () => {
      const response = await makeAIRequest("How many transactions have we had in total?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['count'])

      const total = calculateRangeValue(response.data, 'count', 'total')
      expect(total).toBeInRange(
        groundTruth.totalAllTimeTransactions * 0.95,
        groundTruth.totalAllTimeTransactions * 1.05
      )
    })
  })

  describe('Location-Specific Analysis', () => {
    it('should calculate HQ sales correctly', async () => {
      const response = await makeAIRequest("What were sales at the main location?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.hqTotalSales * 0.95,
        groundTruth.hqTotalSales * 1.05
      )
    })

    it('should calculate Yonge location sales', async () => {
      const response = await makeAIRequest("Sales at Yonge street location")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.yongeTotalSales * 0.95,
        groundTruth.yongeTotalSales * 1.05
      )
    })

    it('should calculate Kingston location sales', async () => {
      const response = await makeAIRequest("What were sales at Kingston location?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.kingstonTotalSales * 0.95,
        groundTruth.kingstonTotalSales * 1.05
      )
    })

    it('should calculate The Well location sales', async () => {
      const response = await makeAIRequest("Sales at The Well location")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeInRange(
        groundTruth.wellTotalSales * 0.95,
        groundTruth.wellTotalSales * 1.05
      )
    })

    it('should identify highest performing location', async () => {
      const response = await makeAIRequest("Which location had the highest sales?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])
      expect(response).toHaveTopLocation('HQ')

      const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
      expect(maxValue).toBeInRange(
        groundTruth.hqTotalSales * 0.95,
        groundTruth.hqTotalSales * 1.05
      )
    })

    it('should identify lowest performing location', async () => {
      const response = await makeAIRequest("Which location had the lowest sales?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])
      expect(response).toHaveTopLocation('Broadway')

      const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
      expect(maxValue).toBeInRange(
        groundTruth.broadwayTotalSales * 0.95,
        groundTruth.broadwayTotalSales * 1.05
      )
    })
  })

  describe('Location Comparisons', () => {
    it('should compare Bloor and Yonge locations', async () => {
      const response = await makeAIRequest("Compare sales between Bloor and Yonge locations")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])
      expect(response).toHaveLocationCount(2)

      const total = calculateRangeValue(response.data, 'revenue', 'total')
      const expectedTotal = groundTruth.bloorTotalSales + groundTruth.yongeTotalSales
      expect(total).toBeInRange(
        expectedTotal * 0.95,
        expectedTotal * 1.05
      )
    })

    it('should compare Yonge and Bloor locations this year', async () => {
      const response = await makeAIRequest("Compare sales between Yonge and Bloor locations this year")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['location'])
      expect(response).toHaveLocationCount(2)
    })
  })

  describe('Product Analysis', () => {
    it('should identify top selling items by revenue', async () => {
      const response = await makeAIRequest("What are our top 3 selling items by revenue?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['item'])
      expect(response).toHaveItemCount(3)
      expect(response).toHaveTopItem(groundTruth.topSellingItem)

      const maxValue = calculateRangeValue(response.data, 'revenue', 'max')
      expect(maxValue).toBeInRange(
        groundTruth.topSellingItemRevenue * 0.95,
        groundTruth.topSellingItemRevenue * 1.05
      )
    })

    it('should calculate total Latte quantity sold', async () => {
      const response = await makeAIRequest("How many Latte did we sell total?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['quantity'])

      const total = calculateRangeValue(response.data, 'quantity', 'total')
      expect(total).toBeInRange(
        groundTruth.totalLatteQuantity * 0.95,
        groundTruth.totalLatteQuantity * 1.05
      )
    })
  })

  describe('Time-Based Historical Analysis', () => {
    it('should show monthly sales breakdown for 2024', async () => {
      const response = await makeAIRequest("Show me monthly sales breakdown for 2024")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])
      expect(response).toHaveGroupBy(['month'])

      // Should have 12 months or fewer (depending on data)
      expect(response.data.length).toBeGreaterThan(0)
      expect(response.data.length).toBeLessThanOrEqual(12)
    })

    it('should calculate sales from March to May 2024', async () => {
      const response = await makeAIRequest("What were our sales from March to May 2024?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['revenue'])

      // This would need specific ground truth calculation for this range
      const total = calculateRangeValue(response.data, 'revenue', 'total')
      expect(total).toBeGreaterThan(0)
    })
  })

  describe('Business Metrics', () => {
    it('should calculate average transaction value across all time', async () => {
      const response = await makeAIRequest("What's our average transaction value across all time?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])

      const avgValue = calculateRangeValue(response.data, 'avg_transaction', 'total')
      const expectedAvg = groundTruth.totalAllTimeSales / groundTruth.totalAllTimeTransactions
      expect(avgValue).toBeInRange(
        expectedAvg * 0.95,
        expectedAvg * 1.05
      )
    })

    it('should calculate HQ average transaction value', async () => {
      const response = await makeAIRequest("What's the average transaction value at HQ?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])

      const avgValue = calculateRangeValue(response.data, 'avg_transaction', 'total')
      expect(avgValue).toBeGreaterThan(0)
    })

    it('should calculate average transaction value by location', async () => {
      const response = await makeAIRequest("What's the average transaction value by location?")

      expect(response).toHaveValidAIStructure()
      expect(response).toHaveMetrics(['avg_transaction'])
      expect(response).toHaveGroupBy(['location'])

      // Should have data for multiple locations
      expect(response.data.length).toBeGreaterThan(1)
    })
  })
})