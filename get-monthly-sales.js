const { PrismaClient } = require('./src/generated/prisma')
require('dotenv').config({ path: '.env.development' })

const prisma = new PrismaClient()

function getTorontoDate() {
  // Create a date in Toronto timezone
  const now = new Date()
  const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

  // Set to start of day (00:00:00)
  toronto.setHours(0, 0, 0, 0)

  // Convert back to UTC for database comparison
  const utcDate = new Date(toronto.getTime() - (toronto.getTimezoneOffset() * 60000))
  return utcDate
}

function getMonthBoundaries(year, month) {
  // Create start of month in Toronto timezone
  const startOfMonthToronto = new Date(year, month - 1, 1, 0, 0, 0, 0)

  // Create end of month in Toronto timezone
  const endOfMonthToronto = new Date(year, month, 0, 23, 59, 59, 999)

  // Convert to UTC for database queries
  const startOfMonthUTC = new Date(startOfMonthToronto.getTime() + (startOfMonthToronto.getTimezoneOffset() * 60000))
  const endOfMonthUTC = new Date(endOfMonthToronto.getTime() + (endOfMonthToronto.getTimezoneOffset() * 60000))

  return { startOfMonthUTC, endOfMonthUTC }
}

function getCurrentMonthBoundaries() {
  const now = new Date()
  const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

  // Start of current month in Toronto timezone
  const startOfMonthToronto = new Date(toronto.getFullYear(), toronto.getMonth(), 1, 0, 0, 0, 0)

  // End of current month in Toronto timezone
  const endOfMonthToronto = new Date(toronto.getFullYear(), toronto.getMonth() + 1, 0, 23, 59, 59, 999)

  // Convert to UTC for database queries
  const startOfMonthUTC = new Date(startOfMonthToronto.getTime() + (startOfMonthToronto.getTimezoneOffset() * 60000))
  const endOfMonthUTC = new Date(endOfMonthToronto.getTime() + (endOfMonthToronto.getTimezoneOffset() * 60000))

  return { startOfMonthUTC, endOfMonthUTC }
}

async function getMonthlySales(year = null, month = null) {
  let monthName = ''
  let startOfMonthUTC, endOfMonthUTC

  if (year && month) {
    const boundaries = getMonthBoundaries(year, month)
    startOfMonthUTC = boundaries.startOfMonthUTC
    endOfMonthUTC = boundaries.endOfMonthUTC
    monthName = `${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })} ${year}`
  } else {
    // Get current month
    const boundaries = getCurrentMonthBoundaries()
    startOfMonthUTC = boundaries.startOfMonthUTC
    endOfMonthUTC = boundaries.endOfMonthUTC
    const now = new Date()
    const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))
    monthName = `${toronto.toLocaleDateString('en-US', { month: 'long' })} ${toronto.getFullYear()} (This Month)`
  }

  console.log(`🔍 Getting sales data for ${monthName}...`)
  console.log(`Query Range (UTC): ${startOfMonthUTC.toISOString()} to ${endOfMonthUTC.toISOString()}`)
  console.log('')

  // Get all orders for the specified month using Prisma ORM
  const monthlyOrders = await prisma.order.findMany({
    where: {
      date: {
        gte: startOfMonthUTC,
        lte: endOfMonthUTC
      }
    },
    include: {
      lineItems: {
        include: {
          item: true
        }
      },
      location: true
    },
    orderBy: {
      date: 'desc'
    }
  })

  console.log(`📊 Found ${monthlyOrders.length} orders for ${monthName}`)

  if (monthlyOrders.length === 0) {
    console.log(`💡 No sales data found for ${monthName}`)
    return {
      monthName,
      totalSales: 0,
      totalRevenue: 0,
      totalQuantity: 0,
      averageTransaction: 0,
      sales: [],
      locationBreakdown: {},
      dailyBreakdown: {}
    }
  }

  // Calculate totals and breakdowns
  let totalRevenue = 0
  let totalQuantity = 0
  const locationSales = {}
  const dailyTotals = {}

  monthlyOrders.forEach(order => {
    const saleAmount = order.totalAmount || 0
    totalRevenue += saleAmount

    // Calculate total quantity for this order
    const orderQuantity = order.lineItems.reduce((sum, lineItem) => sum + (lineItem.quantity || 0), 0)
    totalQuantity += orderQuantity

    // Location breakdown
    const locationName = order.location?.name || 'Unknown Location'
    if (!locationSales[locationName]) {
      locationSales[locationName] = { revenue: 0, count: 0, quantity: 0 }
    }
    locationSales[locationName].revenue += saleAmount
    locationSales[locationName].count += 1
    locationSales[locationName].quantity += orderQuantity

    // Daily breakdown
    const dateString = order.date.toISOString().split('T')[0]
    if (!dailyTotals[dateString]) {
      dailyTotals[dateString] = { revenue: 0, count: 0, quantity: 0 }
    }
    dailyTotals[dateString].revenue += saleAmount
    dailyTotals[dateString].count += 1
    dailyTotals[dateString].quantity += orderQuantity
  })

  const averageTransaction = monthlyOrders.length > 0 ? totalRevenue / monthlyOrders.length : 0

  console.log(`\n📈 ${monthName.toUpperCase()} SALES SUMMARY:`)
  console.log(`   💰 Total Revenue: $${(totalRevenue / 100).toFixed(2)}`)
  console.log(`   🏪 Number of Sales: ${monthlyOrders.length}`)
  console.log(`   📦 Total Quantity Sold: ${totalQuantity}`)
  console.log(`   📊 Average Transaction: $${(averageTransaction / 100).toFixed(2)}`)
  console.log('')

  console.log('🏢 SALES BY LOCATION:')
  Object.entries(locationSales)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .forEach(([location, data]) => {
      console.log(`   📍 ${location}: $${(data.revenue / 100).toFixed(2)} (${data.count} sales, ${data.quantity} items)`)
    })
  console.log('')

  console.log('📅 TOP DAILY PERFORMANCES:')
  Object.entries(dailyTotals)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .forEach(([date, data], index) => {
      console.log(`   ${index + 1}. ${date}: $${(data.revenue / 100).toFixed(2)} (${data.count} sales)`)
    })

  return {
    monthName,
    totalSales: monthlyOrders.length,
    totalRevenue,
    totalQuantity,
    averageTransaction,
    sales: monthlyOrders,
    locationBreakdown: locationSales,
    dailyBreakdown: dailyTotals,
    boundaries: { startOfMonthUTC, endOfMonthUTC }
  }
}

async function testMonthlySalesData() {
  console.log('🚀 Monthly Sales Data Ground Truth Generator\n')

  try {
    // Test 1: Get sales for current month ("this month")
    console.log('='.repeat(60))
    console.log('TEST 1: THIS MONTH SALES')
    console.log('='.repeat(60))
    const thisMonth = await getMonthlySales()

    // Test 2: Get sales for August 2025
    console.log('\n' + '='.repeat(60))
    console.log('TEST 2: AUGUST 2025 SALES')
    console.log('='.repeat(60))
    const august2025 = await getMonthlySales(2025, 8)

    // Test 3: Get sales for July 2025
    console.log('\n' + '='.repeat(60))
    console.log('TEST 3: JULY 2025 SALES')
    console.log('='.repeat(60))
    const july2025 = await getMonthlySales(2025, 7)

    // Summary of all three tests
    console.log('\n' + '='.repeat(60))
    console.log('GROUND TRUTH SUMMARY')
    console.log('='.repeat(60))

    const results = [
      { name: 'This Month', data: thisMonth },
      { name: 'August 2025', data: august2025 },
      { name: 'July 2025', data: july2025 }
    ]

    results.forEach(result => {
      console.log(`\n📋 ${result.name}:`)
      console.log(`   💰 Revenue: $${(result.data.totalRevenue / 100).toFixed(2)}`)
      console.log(`   🏪 Transactions: ${result.data.totalSales}`)
      console.log(`   📦 Quantity: ${result.data.totalQuantity}`)
      console.log(`   📊 Avg Transaction: $${(result.data.averageTransaction / 100).toFixed(2)}`)
      console.log(`   📍 Top Location: ${Object.entries(result.data.locationBreakdown).sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'None'}`)
    })

    console.log('\n✅ Ground truth data collection completed successfully!')

  } catch (error) {
    console.error('❌ Error during ground truth calculation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script if called directly
if (require.main === module) {
  testMonthlySalesData().catch(console.error)
}

module.exports = {
  getMonthlySales,
  getMonthBoundaries,
  getCurrentMonthBoundaries,
  testMonthlySalesData
}