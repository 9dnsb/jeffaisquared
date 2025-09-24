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

async function debugGroundTruth() {
  console.log('🐛 Debugging ground truth last week best day calculation...\n')

  // Calculate date boundaries using Toronto timezone (same as ground truth)
  const today = getTorontoDate()
  const lastWeekStart = new Date(today)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  console.log('Date range:', lastWeekStart.toISOString(), 'to', today.toISOString())

  try {
    // 1. Test the EXACT same raw SQL query from ground truth
    console.log('\n🔍 Testing EXACT ground truth SQL query:')
    const rawSqlResult = await prisma.$queryRaw`
      SELECT o.date, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM orders o
      WHERE o.date >= ${lastWeekStart} AND o.date < ${today}
      GROUP BY o.date
      ORDER BY revenue DESC
      LIMIT 1
    `

    console.log('Raw SQL result:', rawSqlResult)

    if (rawSqlResult && rawSqlResult.length > 0) {
      const rawResult = rawSqlResult[0]
      console.log('Raw BigInt revenue:', rawResult.revenue)
      console.log('Converted to dollars (divide by 100):', Number(rawResult.revenue) / 100)
    }

    // 2. Test with Prisma ORM approach
    console.log('\n🔍 Testing Prisma ORM approach:')

    const lastWeekOrders = await prisma.order.findMany({
      where: {
        date: {
          gte: lastWeekStart,
          lt: today
        }
      },
      select: {
        date: true,
        totalAmount: true
      }
    })

    console.log(`Found ${lastWeekOrders.length} orders in last week`)

    if (lastWeekOrders.length > 0) {
      // Group by date and calculate daily totals
      const dailyTotals = {}

      lastWeekOrders.forEach(order => {
        const dateString = order.date.toISOString().split('T')[0]
        const revenue = order.totalAmount || 0

        if (!dailyTotals[dateString]) {
          dailyTotals[dateString] = 0
        }
        dailyTotals[dateString] += revenue
      })

      const sortedDays = Object.entries(dailyTotals)
        .sort(([,a], [,b]) => b - a)

      console.log('Top 3 days with Prisma ORM:')
      sortedDays.slice(0, 3).forEach(([date, revenue], index) => {
        console.log(`  ${index + 1}. ${date}: $${(revenue / 100).toFixed(2)} (raw: ${revenue})`)
      })

      if (sortedDays.length > 0) {
        const [bestDate, bestRevenue] = sortedDays[0]
        console.log(`\n🏆 Best day with Prisma: ${bestDate} - $${(bestRevenue / 100).toFixed(2)}`)
      }
    }

    // 3. Test if there's a data type issue
    console.log('\n🔍 Testing data type conversion:')
    console.log('Ground truth toNumber function: (bigint) => Number(bigint) / 100')

    // Simulate what ground truth does
    if (rawSqlResult && rawSqlResult.length > 0) {
      const groundTruthValue = Number(rawSqlResult[0].revenue) / 100
      console.log('What ground truth would calculate:', groundTruthValue)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugGroundTruth().catch(console.error)