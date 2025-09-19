// Quick script to check for sales in the last week (Sept 13-19, 2025)
const { PrismaClient } = require('../src/generated/prisma')
const prisma = new PrismaClient()

async function checkLastWeekSales() {
  console.log('🔍 Checking for sales in the last week (September 13-19, 2025)...\n')

  const weekStart = new Date('2025-09-13')
  const weekEnd = new Date('2025-09-20')

  // Get sales for last week
  const lastWeekSales = await prisma.sale.findMany({
    where: {
      date: {
        gte: weekStart,
        lt: weekEnd
      }
    },
    include: {
      location: true,
      saleItems: {
        include: {
          item: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  })

  if (lastWeekSales.length === 0) {
    console.log('❌ No sales found for last week (September 13-19, 2025)')
  } else {
    console.log(`✅ Found ${lastWeekSales.length} sales for last week:`)

    let totalRevenue = 0
    const locationCounts = new Map()
    const locationRevenue = new Map()

    lastWeekSales.forEach((sale) => {
      const revenue = parseFloat(sale.totalSales)
      totalRevenue += revenue

      // Count by location
      const locationName = sale.location.name
      locationCounts.set(locationName, (locationCounts.get(locationName) || 0) + 1)
      locationRevenue.set(locationName, (locationRevenue.get(locationName) || 0) + revenue)
    })

    console.log(`\n📊 Summary for last week:`)
    console.log(`Total revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`Total transactions: ${lastWeekSales.length}`)
    console.log(`Average transaction: $${(totalRevenue / lastWeekSales.length).toFixed(2)}`)
    console.log(`Locations with sales: ${locationCounts.size}`)

    console.log(`\nRevenue by location:`)
    // Sort by revenue
    const sortedLocations = Array.from(locationRevenue.entries()).sort((a, b) => b[1] - a[1])
    sortedLocations.forEach(([location, revenue]) => {
      const count = locationCounts.get(location)
      console.log(`- ${location}: $${revenue.toFixed(2)} (${count} transactions)`)
    })

    console.log(`\nDaily breakdown:`)
    const dailyRevenue = new Map()
    lastWeekSales.forEach(sale => {
      const day = sale.date.toISOString().split('T')[0]
      const revenue = parseFloat(sale.totalSales)
      dailyRevenue.set(day, (dailyRevenue.get(day) || 0) + revenue)
    })

    const sortedDays = Array.from(dailyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    sortedDays.forEach(([day, revenue]) => {
      console.log(`- ${day}: $${revenue.toFixed(2)}`)
    })
  }

  await prisma.$disconnect()
}

checkLastWeekSales().catch(console.error)