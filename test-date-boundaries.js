const { PrismaClient } = require('./src/generated/prisma')
require('dotenv').config({ path: '.env.development' })

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

function getGroundTruthV3MonthBoundaries() {
  // This is the logic from ground-truth-v3.ts
  const now = new Date()
  const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

  const thisMonthStart = new Date(toronto.getFullYear(), toronto.getMonth(), 1)
  const thisMonthEnd = new Date(toronto.getFullYear(), toronto.getMonth() + 1, 0, 23, 59, 59, 999)

  return { thisMonthStart, thisMonthEnd }
}

async function compareBoundaries() {
  console.log('🔍 Comparing Date Boundary Calculations\n')

  // Current time info
  const now = new Date()
  const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }))

  console.log('📅 Current Time Info:')
  console.log(`  UTC Now: ${now.toISOString()}`)
  console.log(`  Toronto Now: ${toronto.toLocaleString("en-US", { timeZone: "America/Toronto" })}`)
  console.log(`  Toronto Year: ${toronto.getFullYear()}, Month: ${toronto.getMonth() + 1}`)
  console.log('')

  // Get boundaries from our script
  const ourBoundaries = getCurrentMonthBoundaries()
  console.log('🚀 Our Script (get-monthly-sales.js) Boundaries:')
  console.log(`  Start: ${ourBoundaries.startOfMonthUTC.toISOString()}`)
  console.log(`  End:   ${ourBoundaries.endOfMonthUTC.toISOString()}`)
  console.log('')

  // Get boundaries from ground-truth-v3
  const groundTruthBoundaries = getGroundTruthV3MonthBoundaries()
  console.log('📊 Ground Truth V3 Boundaries:')
  console.log(`  Start: ${groundTruthBoundaries.thisMonthStart.toISOString()}`)
  console.log(`  End:   ${groundTruthBoundaries.thisMonthEnd.toISOString()}`)
  console.log('')

  // Check if they match
  const startMatch = ourBoundaries.startOfMonthUTC.getTime() === groundTruthBoundaries.thisMonthStart.getTime()
  const endMatch = ourBoundaries.endOfMonthUTC.getTime() === groundTruthBoundaries.thisMonthEnd.getTime()

  console.log('🔍 Comparison Results:')
  console.log(`  Start dates match: ${startMatch ? '✅' : '❌'}`)
  console.log(`  End dates match:   ${endMatch ? '✅' : '❌'}`)

  if (!startMatch) {
    const diffHours = (groundTruthBoundaries.thisMonthStart.getTime() - ourBoundaries.startOfMonthUTC.getTime()) / (1000 * 60 * 60)
    console.log(`  Start difference: ${diffHours} hours`)
  }

  if (!endMatch) {
    const diffHours = (groundTruthBoundaries.thisMonthEnd.getTime() - ourBoundaries.endOfMonthUTC.getTime()) / (1000 * 60 * 60)
    console.log(`  End difference: ${diffHours} hours`)
  }

  console.log('')

  // Test with Prisma - count orders in each range
  const prisma = new PrismaClient()

  try {
    console.log('📊 Testing Order Counts:')

    const ourCount = await prisma.order.count({
      where: {
        date: {
          gte: ourBoundaries.startOfMonthUTC,
          lte: ourBoundaries.endOfMonthUTC
        }
      }
    })

    const groundTruthCount = await prisma.order.count({
      where: {
        date: {
          gte: groundTruthBoundaries.thisMonthStart,
          lte: groundTruthBoundaries.thisMonthEnd
        }
      }
    })

    console.log(`  Our script count: ${ourCount}`)
    console.log(`  Ground truth count: ${groundTruthCount}`)
    console.log(`  Counts match: ${ourCount === groundTruthCount ? '✅' : '❌'}`)

    await prisma.$disconnect()

  } catch (error) {
    console.error('❌ Error testing order counts:', error)
    await prisma.$disconnect()
  }
}

compareBoundaries().catch(console.error)