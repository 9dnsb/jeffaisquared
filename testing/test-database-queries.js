// Quick script to get actual data for test calculations
const { PrismaClient } = require('./src/generated/prisma')
const prisma = new PrismaClient()

async function getTestData() {
  console.log('🔍 Analyzing actual database data for test calculations...\n')

  // 1. Total sales and transactions
  const totalStats = await prisma.sale.aggregate({
    _count: true,
    _sum: { totalSales: true },
    _avg: { totalSales: true },
    _min: { date: true },
    _max: { date: true }
  })

  console.log('📊 Overall Statistics:')
  console.log(`Total Transactions: ${totalStats._count}`)
  console.log(`Total Sales: $${Number(totalStats._sum.totalSales).toFixed(2)}`)
  console.log(`Average Transaction: $${Number(totalStats._avg.totalSales).toFixed(2)}`)
  console.log(`Date Range: ${totalStats._min.date.toISOString().split('T')[0]} to ${totalStats._max.date.toISOString().split('T')[0]}\n`)

  // 2. Sales by location
  const locationStats = await prisma.sale.groupBy({
    by: ['locationId'],
    _count: true,
    _sum: { totalSales: true },
    _avg: { totalSales: true }
  })

  const locations = await prisma.location.findMany({
    select: { locationId: true, name: true }
  })
  const locationMap = new Map(locations.map(l => [l.locationId, l.name]))

  console.log('📍 Sales by Location:')
  locationStats
    .sort((a, b) => Number(b._sum.totalSales) - Number(a._sum.totalSales))
    .forEach(stat => {
      const name = locationMap.get(stat.locationId) || stat.locationId
      const revenue = Number(stat._sum.totalSales)
      const percentage = (revenue / Number(totalStats._sum.totalSales) * 100).toFixed(1)
      console.log(`${name}: $${revenue.toFixed(2)} (${percentage}%) - ${stat._count} transactions`)
    })

  // 3. Sales by item
  const itemStats = await prisma.saleItem.groupBy({
    by: ['itemId'],
    _count: true,
    _sum: { quantity: true, price: true },
    _avg: { price: true }
  })

  const items = await prisma.item.findMany({
    select: { id: true, name: true }
  })
  const itemMap = new Map(items.map(i => [i.id, i.name]))

  console.log('\n🍰 Sales by Item:')
  itemStats
    .sort((a, b) => Number(b._sum.price) - Number(a._sum.price))
    .forEach(stat => {
      const name = itemMap.get(stat.itemId) || 'Unknown'
      const revenue = Number(stat._sum.price)
      const quantity = stat._sum.quantity
      console.log(`${name}: $${revenue.toFixed(2)} - ${quantity} units - ${stat._count} line items`)
    })

  // 4. Monthly breakdown for 2024
  const sales2024 = await prisma.sale.findMany({
    where: {
      date: {
        gte: new Date('2024-01-01'),
        lte: new Date('2024-12-31')
      }
    },
    select: { date: true, totalSales: true }
  })

  const monthlyStats = {}
  sales2024.forEach(sale => {
    const month = sale.date.toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyStats[month]) {
      monthlyStats[month] = { count: 0, revenue: 0 }
    }
    monthlyStats[month].count++
    monthlyStats[month].revenue += Number(sale.totalSales)
  })

  console.log('\n📅 Monthly Sales for 2024:')
  Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, stats]) => {
      console.log(`${month}: $${stats.revenue.toFixed(2)} - ${stats.count} transactions`)
    })

  // 5. Recent month data (September 2025)
  const septStats = await prisma.sale.aggregate({
    where: {
      date: {
        gte: new Date('2025-09-01'),
        lte: new Date('2025-09-30')
      }
    },
    _count: true,
    _sum: { totalSales: true },
    _avg: { totalSales: true }
  })

  console.log(`\n📊 September 2025 Stats:`)
  console.log(`Transactions: ${septStats._count}`)
  console.log(`Revenue: $${Number(septStats._sum.totalSales || 0).toFixed(2)}`)
  console.log(`Avg Transaction: $${Number(septStats._avg.totalSales || 0).toFixed(2)}`)

  await prisma.$disconnect()
}

getTestData().catch(console.error)