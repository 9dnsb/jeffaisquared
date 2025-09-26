/**
 * Manual Ground Truth Discovery for Dynamic Time Periods
 * Following AI-Testing-Cycle.md methodology - Step 1
 */

const { PrismaClient } = require('./src/generated/prisma')
const prisma = new PrismaClient()

async function verifyDynamicTimePeriods() {
  console.log('🔍 Manual Ground Truth Discovery - Dynamic Time Periods')
  console.log('=' * 60)

  try {
    // Current date in Toronto timezone for reference
    const now = new Date()
    console.log(`Current date: ${now.toISOString()}`)
    console.log('')

    // 1. THIS MONTH (September 2025)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    console.log('📅 THIS MONTH VERIFICATION')
    console.log(`Period: ${thisMonthStart.toISOString()} to ${thisMonthEnd.toISOString()}`)

    const thisMonthStats = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
        COUNT(id)::bigint as count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM orders
      WHERE date >= ${thisMonthStart} AND date <= ${thisMonthEnd}
    `

    const thisMonthQuantity = await prisma.$queryRaw`
      SELECT COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM line_items li
      JOIN orders o ON li."orderId" = o.id
      WHERE o.date >= ${thisMonthStart} AND o.date <= ${thisMonthEnd}
    `

    // Get top location for this month
    const thisMonthTopLocation = await prisma.$queryRaw`
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${thisMonthStart} AND o.date <= ${thisMonthEnd}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `

    const thisMonthRevenue = Number(thisMonthStats[0].revenue) / 100
    const thisMonthCount = Number(thisMonthStats[0].count)
    const thisMonthQty = Number(thisMonthQuantity[0].quantity)

    console.log(`Revenue: $${thisMonthRevenue.toLocaleString()}`)
    console.log(`Transactions: ${thisMonthCount.toLocaleString()}`)
    console.log(`Quantity: ${thisMonthQty.toLocaleString()}`)
    console.log(`Avg Transaction: $${thisMonthCount > 0 ? (thisMonthRevenue / thisMonthCount).toFixed(2) : '0.00'}`)
    console.log(`Top Location: ${thisMonthTopLocation[0]?.location_name || 'None'} ($${Number(thisMonthTopLocation[0]?.revenue || 0) / 100})`)
    console.log('')

    // 2. AUGUST 2025
    const aug2025Start = new Date(2025, 7, 1) // Month is 0-indexed
    const aug2025End = new Date(2025, 7, 31, 23, 59, 59, 999)

    console.log('📅 AUGUST 2025 VERIFICATION')
    console.log(`Period: ${aug2025Start.toISOString()} to ${aug2025End.toISOString()}`)

    const aug2025Stats = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
        COUNT(id)::bigint as count
      FROM orders
      WHERE date >= ${aug2025Start} AND date <= ${aug2025End}
    `

    const aug2025Quantity = await prisma.$queryRaw`
      SELECT COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM line_items li
      JOIN orders o ON li."orderId" = o.id
      WHERE o.date >= ${aug2025Start} AND o.date <= ${aug2025End}
    `

    // Get top location for August 2025
    const aug2025TopLocation = await prisma.$queryRaw`
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${aug2025Start} AND o.date <= ${aug2025End}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `

    const aug2025Revenue = Number(aug2025Stats[0].revenue) / 100
    const aug2025Count = Number(aug2025Stats[0].count)
    const aug2025Qty = Number(aug2025Quantity[0].quantity)

    console.log(`Revenue: $${aug2025Revenue.toLocaleString()}`)
    console.log(`Transactions: ${aug2025Count.toLocaleString()}`)
    console.log(`Quantity: ${aug2025Qty.toLocaleString()}`)
    console.log(`Avg Transaction: $${aug2025Count > 0 ? (aug2025Revenue / aug2025Count).toFixed(2) : '0.00'}`)
    console.log(`Top Location: ${aug2025TopLocation[0]?.location_name || 'None'} ($${Number(aug2025TopLocation[0]?.revenue || 0) / 100})`)
    console.log('')

    // 3. JULY 2025
    const jul2025Start = new Date(2025, 6, 1) // Month is 0-indexed
    const jul2025End = new Date(2025, 6, 31, 23, 59, 59, 999)

    console.log('📅 JULY 2025 VERIFICATION')
    console.log(`Period: ${jul2025Start.toISOString()} to ${jul2025End.toISOString()}`)

    const jul2025Stats = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM("totalAmount"), 0)::bigint as revenue,
        COUNT(id)::bigint as count
      FROM orders
      WHERE date >= ${jul2025Start} AND date <= ${jul2025End}
    `

    const jul2025Quantity = await prisma.$queryRaw`
      SELECT COALESCE(SUM(li.quantity), 0)::bigint as quantity
      FROM line_items li
      JOIN orders o ON li."orderId" = o.id
      WHERE o.date >= ${jul2025Start} AND o.date <= ${jul2025End}
    `

    // Get top location for July 2025
    const jul2025TopLocation = await prisma.$queryRaw`
      SELECT l.name as location_name, COALESCE(SUM(o."totalAmount"), 0)::bigint as revenue
      FROM locations l
      LEFT JOIN orders o ON l."squareLocationId" = o."locationId"
      WHERE o.date >= ${jul2025Start} AND o.date <= ${jul2025End}
      GROUP BY l.name
      ORDER BY revenue DESC
      LIMIT 1
    `

    const jul2025Revenue = Number(jul2025Stats[0].revenue) / 100
    const jul2025Count = Number(jul2025Stats[0].count)
    const jul2025Qty = Number(jul2025Quantity[0].quantity)

    console.log(`Revenue: $${jul2025Revenue.toLocaleString()}`)
    console.log(`Transactions: ${jul2025Count.toLocaleString()}`)
    console.log(`Quantity: ${jul2025Qty.toLocaleString()}`)
    console.log(`Avg Transaction: $${jul2025Count > 0 ? (jul2025Revenue / jul2025Count).toFixed(2) : '0.00'}`)
    console.log(`Top Location: ${jul2025TopLocation[0]?.location_name || 'None'} ($${Number(jul2025TopLocation[0]?.revenue || 0) / 100})`)
    console.log('')

    // Summary for ground truth implementation
    console.log('🎯 GROUND TRUTH SUMMARY')
    console.log('=' * 40)
    console.log(`This Month (${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}):`)
    console.log(`  Revenue: $${thisMonthRevenue}`)
    console.log(`  Count: ${thisMonthCount}`)
    console.log(`  Quantity: ${thisMonthQty}`)
    console.log(`  Top Location: ${thisMonthTopLocation[0]?.location_name || 'None'}`)
    console.log('')
    console.log('August 2025:')
    console.log(`  Revenue: $${aug2025Revenue}`)
    console.log(`  Count: ${aug2025Count}`)
    console.log(`  Quantity: ${aug2025Qty}`)
    console.log(`  Top Location: ${aug2025TopLocation[0]?.location_name || 'None'}`)
    console.log('')
    console.log('July 2025:')
    console.log(`  Revenue: $${jul2025Revenue}`)
    console.log(`  Count: ${jul2025Count}`)
    console.log(`  Quantity: ${jul2025Qty}`)
    console.log(`  Top Location: ${jul2025TopLocation[0]?.location_name || 'None'}`)

    return {
      thisMonth: {
        revenue: thisMonthRevenue,
        count: thisMonthCount,
        quantity: thisMonthQty,
        topLocation: thisMonthTopLocation[0]?.location_name || null
      },
      august2025: {
        revenue: aug2025Revenue,
        count: aug2025Count,
        quantity: aug2025Qty,
        topLocation: aug2025TopLocation[0]?.location_name || null
      },
      july2025: {
        revenue: jul2025Revenue,
        count: jul2025Count,
        quantity: jul2025Qty,
        topLocation: jul2025TopLocation[0]?.location_name || null
      }
    }

  } catch (error) {
    console.error('❌ Error during verification:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyDynamicTimePeriods()
    .then(results => {
      console.log('\n✅ Manual verification complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Verification failed:', error)
      process.exit(1)
    })
}

module.exports = { verifyDynamicTimePeriods }