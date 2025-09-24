const { PrismaClient } = require('./src/generated/prisma')
require('dotenv').config({ path: '.env.development' })

const prisma = new PrismaClient()

async function getTodaysSales() {
  try {
    // Get current date in Toronto timezone
    const now = new Date()
    const torontoToday = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

    // Set to start of day in Toronto (00:00:00)
    const startOfDayToronto = new Date(torontoToday)
    startOfDayToronto.setHours(0, 0, 0, 0)

    // Set to end of day in Toronto (23:59:59.999)
    const endOfDayToronto = new Date(torontoToday)
    endOfDayToronto.setHours(23, 59, 59, 999)

    // Convert Toronto times to UTC for database query
    // Toronto time -> UTC conversion
    const startOfDayUTC = new Date(startOfDayToronto.getTime() + (startOfDayToronto.getTimezoneOffset() * 60000))
    const endOfDayUTC = new Date(endOfDayToronto.getTime() + (endOfDayToronto.getTimezoneOffset() * 60000))

    console.log('🕐 Toronto Eastern Time Query:')
    console.log(`  Current UTC: ${now.toISOString()}`)
    console.log(`  Current Toronto: ${torontoToday.toLocaleString("en-US", { timeZone: "America/Toronto" })}`)
    console.log(`  Query Range (UTC): ${startOfDayUTC.toISOString()} to ${endOfDayUTC.toISOString()}`)
    console.log('')

    // Query orders within today's date range (database stores in UTC)
    const todaysSales = await prisma.order.findMany({
      where: {
        date: {
          gte: startOfDayUTC,
          lte: endOfDayUTC
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

    console.log(`📊 Found ${todaysSales.length} sales for today`)

    if (todaysSales.length === 0) {
      console.log('💡 No sales data found for today in Toronto Eastern Time')
      return { totalSales: 0, totalRevenue: 0, sales: [] }
    }

    // Calculate totals
    let totalRevenue = 0
    const locationSales = {}

    console.log('\n📋 TODAY\'S SALES DETAILS:')

    todaysSales.forEach((sale, index) => {
      const saleAmount = sale.totalAmount || 0
      totalRevenue += saleAmount

      // Convert UTC timestamp to Toronto time for display
      const saleTimeToronto = new Date(sale.date).toLocaleString("en-US", {
        timeZone: "America/Toronto",
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })

      const locationName = sale.location?.name || 'Unknown Location'
      if (!locationSales[locationName]) {
        locationSales[locationName] = { revenue: 0, count: 0 }
      }
      locationSales[locationName].revenue += saleAmount
      locationSales[locationName].count += 1

      console.log(`  ${index + 1}. ${saleTimeToronto} | $${(saleAmount / 100).toFixed(2)} | ${sale.lineItems.length} items | Walk-in | ${locationName}`)
    })

    console.log('\n📈 TODAY\'S SALES SUMMARY (Toronto Eastern Time):')
    console.log(`   💰 Total Revenue: $${(totalRevenue / 100).toFixed(2)}`)
    console.log(`   🏪 Number of Sales: ${todaysSales.length}`)
    console.log('')

    console.log('🏢 SALES BY LOCATION:')
    Object.entries(locationSales)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .forEach(([location, data]) => {
        console.log(`   📍 ${location}: $${(data.revenue / 100).toFixed(2)} (${data.count} sales)`)
      })

    return {
      totalSales: todaysSales.length,
      totalRevenue,
      sales: todaysSales
    }

  } catch (error) {
    console.error('❌ Error fetching today\'s sales:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
getTodaysSales()