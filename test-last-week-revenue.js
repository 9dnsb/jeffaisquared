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

async function testLastWeekRevenue() {
  console.log('🔍 Testing last week best day revenue calculation...')

  // Calculate date boundaries using Toronto timezone (same logic as ground truth)
  const today = getTorontoDate()
  console.log('Today (Toronto):', today.toISOString())

  const lastWeekStart = new Date(today)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  console.log('Last week start:', lastWeekStart.toISOString())
  console.log('')

  // Get all orders from last week using Prisma ORM
  const lastWeekOrders = await prisma.order.findMany({
    where: {
      date: {
        gte: lastWeekStart,
        lt: today
      }
    },
    select: {
      date: true,
      totalAmount: true,
      location: {
        select: {
          name: true
        }
      }
    }
  })

  console.log(`📊 Found ${lastWeekOrders.length} orders in last week`)

  if (lastWeekOrders.length === 0) {
    console.log('💡 No orders found for last week')
    return
  }

  // Group by date and calculate daily totals
  const dailyTotals = {}
  let totalWeekRevenue = 0

  lastWeekOrders.forEach(order => {
    const dateString = order.date.toISOString().split('T')[0]
    const revenue = order.totalAmount || 0

    if (!dailyTotals[dateString]) {
      dailyTotals[dateString] = 0
    }
    dailyTotals[dateString] += revenue
    totalWeekRevenue += revenue
  })

  console.log('\n📈 DAILY REVENUE BREAKDOWN:')
  const sortedDays = Object.entries(dailyTotals)
    .sort(([,a], [,b]) => b - a)

  sortedDays.forEach(([date, revenue], index) => {
    console.log(`  ${index + 1}. ${date}: $${(revenue / 100).toFixed(2)}`)
  })

  console.log(`\n💰 Total last week revenue: $${(totalWeekRevenue / 100).toFixed(2)}`)

  if (sortedDays.length > 0) {
    const [bestDate, bestRevenue] = sortedDays[0]
    console.log(`🏆 Best day: ${bestDate} with $${(bestRevenue / 100).toFixed(2)}`)
  }

  await prisma.$disconnect()
}

testLastWeekRevenue().catch(console.error)