const { PrismaClient } = require('./src/generated/prisma')

async function verifyHQvsYongeComparison() {
  const prisma = new PrismaClient()

  try {
    console.log('=== Manual Ground Truth: HQ vs Yonge Revenue Comparison ===')

    // Query both locations individually using location relation
    const hqRevenue = await prisma.order.aggregate({
      where: {
        location: {
          name: 'De Mello Coffee - HQ'
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    const yongeRevenue = await prisma.order.aggregate({
      where: {
        location: {
          name: 'De Mello Coffee - Yonge'
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    })

    console.log('HQ Revenue:', {
      totalRevenue: hqRevenue._sum.totalAmount?.toString() || '0',
      transactionCount: hqRevenue._count.id,
      location: 'HQ'
    })

    console.log('Yonge Revenue:', {
      totalRevenue: yongeRevenue._sum.totalAmount?.toString() || '0',
      transactionCount: yongeRevenue._count.id,
      location: 'Yonge'
    })

    // Get detailed comparison data by joining orders with locations
    const comparisonData = await prisma.order.groupBy({
      by: ['locationId'],
      where: {
        location: {
          name: {
            in: ['De Mello Coffee - HQ', 'De Mello Coffee - Yonge']
          }
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        _all: true
      }
    })

    // Get location names for each locationId
    const locationsMap = {}
    const locations = await prisma.location.findMany({
      where: {
        name: {
          in: ['De Mello Coffee - HQ', 'De Mello Coffee - Yonge']
        }
      },
      select: {
        squareLocationId: true,
        name: true
      }
    })
    locations.forEach(loc => {
      locationsMap[loc.squareLocationId] = loc.name
    })

    console.log('\n=== Comparison Data (should have 2 items) ===')
    console.log('Length:', comparisonData.length)
    comparisonData.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        locationId: item.locationId,
        locationName: locationsMap[item.locationId],
        revenue: item._sum.totalAmount?.toString() || '0',
        transactions: item._count._all
      })
    })

    // Check what locations actually exist
    const allLocations = await prisma.location.findMany({
      select: { name: true, squareLocationId: true },
    })

    console.log('\n=== All Available Locations ===')
    console.log('Available locations:', allLocations.map(l => l.name).sort())

    // Also check what orders exist and their location relations
    const orderLocations = await prisma.order.findMany({
      select: {
        location: {
          select: { name: true }
        }
      },
      distinct: ['locationId']
    })

    console.log('\n=== Locations with Orders ===')
    console.log('Locations with orders:', orderLocations.map(ol => ol.location.name).sort())

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyHQvsYongeComparison()