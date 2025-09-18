const { PrismaClient } = require('./src/generated/prisma')

const prisma = new PrismaClient()

async function monitorData() {
  console.log('=== MONITORING DATABASE CHANGES ===')
  console.log('Watching for changes every 10 seconds...')
  console.log('Press Ctrl+C to stop')

  let previousCounts = null

  const checkCounts = async () => {
    try {
      const currentCounts = {
        locations: await prisma.location.count(),
        items: await prisma.item.count(),
        sales: await prisma.sale.count(),
        saleItems: await prisma.saleItem.count()
      }

      const timestamp = new Date().toISOString()

      if (previousCounts) {
        const changes = {
          locations: currentCounts.locations - previousCounts.locations,
          items: currentCounts.items - previousCounts.items,
          sales: currentCounts.sales - previousCounts.sales,
          saleItems: currentCounts.saleItems - previousCounts.saleItems
        }

        const hasChanges = Object.values(changes).some(change => change !== 0)

        if (hasChanges) {
          console.log(`\n🚨 CHANGE DETECTED at ${timestamp}:`)
          console.log(`  Locations: ${previousCounts.locations} → ${currentCounts.locations} (${changes.locations >= 0 ? '+' : ''}${changes.locations})`)
          console.log(`  Items: ${previousCounts.items} → ${currentCounts.items} (${changes.items >= 0 ? '+' : ''}${changes.items})`)
          console.log(`  Sales: ${previousCounts.sales} → ${currentCounts.sales} (${changes.sales >= 0 ? '+' : ''}${changes.sales})`)
          console.log(`  SaleItems: ${previousCounts.saleItems} → ${currentCounts.saleItems} (${changes.saleItems >= 0 ? '+' : ''}${changes.saleItems})`)

          // Get recent sales to see what's being added
          if (changes.sales > 0) {
            const recentSales = await prisma.sale.findMany({
              take: Math.min(changes.sales, 5),
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                date: true,
                totalSales: true,
                locationId: true,
                createdAt: true
              }
            })
            console.log('  Recent sales added:')
            recentSales.forEach(sale => {
              console.log(`    - ${sale.date.toISOString()}: $${sale.totalSales} (created: ${sale.createdAt.toISOString()})`)
            })
          }
        } else {
          process.stdout.write('.')
        }
      } else {
        console.log(`Initial counts at ${timestamp}:`)
        console.log(`  Locations: ${currentCounts.locations}`)
        console.log(`  Items: ${currentCounts.items}`)
        console.log(`  Sales: ${currentCounts.sales}`)
        console.log(`  SaleItems: ${currentCounts.saleItems}`)
      }

      previousCounts = currentCounts

    } catch (error) {
      console.error('Error checking counts:', error.message)
    }
  }

  // Initial check
  await checkCounts()

  // Set up interval
  const interval = setInterval(checkCounts, 10000)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nStopping monitor...')
    clearInterval(interval)
    await prisma.$disconnect()
    process.exit(0)
  })
}

monitorData().catch(console.error)