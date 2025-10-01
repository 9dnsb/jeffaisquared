import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

// Helper function to get order aggregates for a date range
async function getOrderAggregateForRange(startDate: Date, endDate: Date) {
  return prisma.order.aggregate({
    where: {
      date: {
        gte: startDate,
        lt: endDate
      }
    },
    _count: true,
    _sum: { totalAmount: true }
  })
}

export interface GroundTruthData {
  // Static data (doesn't change based on current date)
  total2024Sales: number
  total2025Sales: number
  totalAllTimeSales: number
  totalAllTimeTransactions: number

  // Location data
  hqTotalSales: number
  yongeTotalSales: number
  bloorTotalSales: number
  kingstonTotalSales: number
  wellTotalSales: number
  broadwayTotalSales: number

  // Item data
  totalLatteQuantity: number
  topSellingItem: string
  topSellingItemRevenue: number

  // Dynamic data (changes based on current date)
  todaySales: number
  todayTransactions: number
  yesterdaySales: number
  yesterdayTransactions: number
  lastWeekSales: number
  lastWeekTransactions: number
  thisMonthSales: number
  thisMonthTransactions: number
  last30DaysSales: number
  last30DaysTransactions: number
}

export async function calculateGroundTruth(): Promise<GroundTruthData> {
  console.log('🔍 Calculating ground truth data...')

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const lastWeekStart = new Date(today)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const last30DaysStart = new Date(today)
  last30DaysStart.setDate(last30DaysStart.getDate() - 30)

  // Static calculations (historical data)
  const [
    sales2024,
    sales2025,
    totalStats,
    locationStats,
    itemStats,
    latteStats,
    topItem,

    // Dynamic calculations
    todayStats,
    yesterdayStats,
    lastWeekStats,
    thisMonthStats,
    last30DaysStats
  ] = await Promise.all([
    // Static data
    prisma.order.aggregate({
      where: {
        date: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31')
        }
      },
      _sum: { totalAmount: true }
    }),

    prisma.order.aggregate({
      where: {
        date: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        }
      },
      _sum: { totalAmount: true }
    }),

    prisma.order.aggregate({
      _count: true,
      _sum: { totalAmount: true }
    }),

    prisma.order.groupBy({
      by: ['locationId'],
      _sum: { totalAmount: true }
    }),

    prisma.lineItem.groupBy({
      by: ['itemId'],
      _sum: { totalPriceAmount: true }
    }),

    prisma.lineItem.aggregate({
      where: {
        item: {
          name: 'Latte'
        }
      },
      _sum: { quantity: true }
    }),

    prisma.lineItem.groupBy({
      by: ['itemId'],
      _sum: { totalPriceAmount: true },
      orderBy: {
        _sum: {
          totalPriceAmount: 'desc'
        }
      },
      take: 1
    }),

    // Dynamic data
    getOrderAggregateForRange(today, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
    getOrderAggregateForRange(yesterday, today),
    getOrderAggregateForRange(lastWeekStart, today),
    getOrderAggregateForRange(thisMonthStart, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
    getOrderAggregateForRange(last30DaysStart, new Date(today.getTime() + 24 * 60 * 60 * 1000))
  ])

  // Get location mappings
  const locations = await prisma.location.findMany({
    select: { squareLocationId: true, name: true }
  })
  const locationMap = new Map(locations.map(l => [l.squareLocationId, l.name]))

  // Get top selling item name
  const topItemData = topItem[0]?.itemId ? await prisma.item.findUnique({
    where: { id: topItem[0].itemId },
    select: { name: true }
  }) : null

  // Map location sales
  const locationSalesMap = new Map(
    locationStats.map(stat => [
      locationMap.get(stat.locationId),
      Number(stat._sum.totalAmount || 0)
    ])
  )

  const groundTruth: GroundTruthData = {
    // Static data
    total2024Sales: Number(sales2024._sum.totalAmount || 0),
    total2025Sales: Number(sales2025._sum.totalAmount || 0),
    totalAllTimeSales: Number(totalStats._sum.totalAmount || 0),
    totalAllTimeTransactions: totalStats._count,

    // Location data
    hqTotalSales: Number(locationSalesMap.get('HQ') || 0),
    yongeTotalSales: Number(locationSalesMap.get('Yonge') || 0),
    bloorTotalSales: Number(locationSalesMap.get('Bloor') || 0),
    kingstonTotalSales: Number(locationSalesMap.get('Kingston') || 0),
    wellTotalSales: Number(locationSalesMap.get('The Well') || 0),
    broadwayTotalSales: Number(locationSalesMap.get('Broadway') || 0),

    // Item data
    totalLatteQuantity: latteStats._sum.quantity || 0,
    topSellingItem: topItemData?.name || '',
    topSellingItemRevenue: Number(topItem[0]?._sum.totalPriceAmount || 0),

    // Dynamic data
    todaySales: Number(todayStats._sum.totalAmount || 0),
    todayTransactions: todayStats._count,
    yesterdaySales: Number(yesterdayStats._sum.totalAmount || 0),
    yesterdayTransactions: yesterdayStats._count,
    lastWeekSales: Number(lastWeekStats._sum.totalAmount || 0),
    lastWeekTransactions: lastWeekStats._count,
    thisMonthSales: Number(thisMonthStats._sum.totalAmount || 0),
    thisMonthTransactions: thisMonthStats._count,
    last30DaysSales: Number(last30DaysStats._sum.totalAmount || 0),
    last30DaysTransactions: last30DaysStats._count
  }

  console.log('✅ Ground truth calculated:', {
    staticSample: {
      total2024Sales: groundTruth.total2024Sales,
      hqTotalSales: groundTruth.hqTotalSales,
      topSellingItem: groundTruth.topSellingItem
    },
    dynamicSample: {
      todaySales: groundTruth.todaySales,
      yesterdaySales: groundTruth.yesterdaySales,
      lastWeekSales: groundTruth.lastWeekSales
    }
  })

  return groundTruth
}

export async function makeAIRequest(prompt: string) {
  const response = await fetch('http://localhost:3000/api/test-query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: prompt,
      conversationHistory: []
    })
  })

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export function calculateRangeValue(data: any[], metric: string, testType: 'total' | 'max' | 'count' = 'total'): number {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 0
  }

  if (testType === 'count') {
    return data.length
  }

  const values = data.map(row => row[metric] || 0)

  if (testType === 'max') {
    return Math.max(...values)
  }

  // Default: total
  return values.reduce((sum, val) => sum + val, 0)
}

export function createDynamicRange(actualValue: number, tolerance: number = 0.05): { min: number, max: number } {
  return {
    min: Math.floor(actualValue * (1 - tolerance)),
    max: Math.ceil(actualValue * (1 + tolerance))
  }
}

export async function disconnectPrisma() {
  await prisma.$disconnect()
}