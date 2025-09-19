// Quick script to check for sales yesterday (2025-09-18)
const { PrismaClient } = require('../src/generated/prisma')
const prisma = new PrismaClient()

async function checkYesterdaySales() {
  console.log('🔍 Checking for sales on September 18, 2025...\n')

  const yesterday = new Date('2025-09-18')
  const today = new Date('2025-09-19')

  // Get sales for yesterday
  const yesterdaySales = await prisma.sale.findMany({
    where: {
      date: {
        gte: yesterday,
        lt: today
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

  if (yesterdaySales.length === 0) {
    console.log('❌ No sales found for yesterday (September 18, 2025)')
  } else {
    console.log(`✅ Found ${yesterdaySales.length} sales for yesterday:`)

    let totalRevenue = 0
    const locationCounts = new Map()

    yesterdaySales.forEach((sale, index) => {
      const revenue = parseFloat(sale.totalSales)
      totalRevenue += revenue

      // Count by location
      const locationName = sale.location.name
      locationCounts.set(locationName, (locationCounts.get(locationName) || 0) + 1)

      console.log(`\n${index + 1}. Sale ID: ${sale.id}`)
      console.log(`   Location: ${locationName}`)
      console.log(`   Time: ${sale.date.toISOString()}`)
      console.log(`   Total: $${revenue.toFixed(2)}`)
      console.log(`   Items: ${sale.saleItems.length}`)
    })

    console.log(`\n📊 Summary for yesterday:`)
    console.log(`Total revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`Total transactions: ${yesterdaySales.length}`)
    console.log(`Average transaction: $${(totalRevenue / yesterdaySales.length).toFixed(2)}`)
    console.log(`Locations with sales: ${locationCounts.size}`)

    console.log(`\nRevenue by location:`)
    const locationRevenue = new Map()
    yesterdaySales.forEach(sale => {
      const locationName = sale.location.name
      const revenue = parseFloat(sale.totalSales)
      locationRevenue.set(locationName, (locationRevenue.get(locationName) || 0) + revenue)
    })

    // Sort by revenue
    const sortedLocations = Array.from(locationRevenue.entries()).sort((a, b) => b[1] - a[1])
    sortedLocations.forEach(([location, revenue]) => {
      console.log(`- ${location}: $${revenue.toFixed(2)}`)
    })
  }

  await prisma.$disconnect()
}

checkYesterdaySales().catch(console.error)