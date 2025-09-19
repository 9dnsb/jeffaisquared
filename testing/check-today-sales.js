// Quick script to check for sales today (2025-09-19)
const { PrismaClient } = require('../src/generated/prisma')
const prisma = new PrismaClient()

async function checkTodaySales() {
  console.log('🔍 Checking for sales on September 19, 2025...\n')

  const today = new Date('2025-09-19')
  const tomorrow = new Date('2025-09-20')

  // Get sales for today
  const todaySales = await prisma.sale.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
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

  if (todaySales.length === 0) {
    console.log('❌ No sales found for today (September 19, 2025)')
  } else {
    console.log(`✅ Found ${todaySales.length} sales for today:`)

    let totalRevenue = 0
    todaySales.forEach((sale, index) => {
      const revenue = parseFloat(sale.totalSales)
      totalRevenue += revenue

      console.log(`\n${index + 1}. Sale ID: ${sale.id}`)
      console.log(`   Location: ${sale.location.name}`)
      console.log(`   Time: ${sale.date.toISOString()}`)
      console.log(`   Total: $${revenue.toFixed(2)}`)
      console.log(`   Items: ${sale.saleItems.length}`)

      if (sale.saleItems.length > 0) {
        sale.saleItems.forEach(item => {
          console.log(`     - ${item.item.name}: $${parseFloat(item.price).toFixed(2)} x${item.quantity}`)
        })
      }
    })

    console.log(`\n📊 Total revenue for today: $${totalRevenue.toFixed(2)}`)
  }

  // Also check the date range of all data
  const dateRange = await prisma.sale.aggregate({
    _min: {
      date: true
    },
    _max: {
      date: true
    }
  })

  console.log(`\n📅 Database date range: ${dateRange._min.date?.toISOString().split('T')[0]} to ${dateRange._max.date?.toISOString().split('T')[0]}`)

  await prisma.$disconnect()
}

checkTodaySales().catch(console.error)