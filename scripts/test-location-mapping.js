const { PrismaClient } = require('../src/generated/prisma')

const prisma = new PrismaClient()

async function testLocationMapping() {
  console.log('Testing location mapping functionality...')

  try {
    // Test 1: Check all locations with names
    console.log('\n=== TEST 1: All Locations ===')
    const locations = await prisma.location.findMany()
    console.log('Locations with names:')
    locations.forEach(loc => {
      console.log(`  ${loc.locationId} -> "${loc.name}"`)
    })

    // Test 2: Sample sales data with location information
    console.log('\n=== TEST 2: Sample Sales with Location Names ===')
    const salesWithLocations = await prisma.sale.findMany({
      include: {
        location: true
      },
      take: 5
    })

    if (salesWithLocations.length > 0) {
      console.log('Sample sales with location names:')
      salesWithLocations.forEach(sale => {
        console.log(`  Sale ${sale.id}: $${sale.totalSales} at "${sale.location.name}" (${sale.location.locationId})`)
      })
    } else {
      console.log('No sales found in database')
    }

    // Test 3: Location-specific query simulation
    console.log('\n=== TEST 3: Location-Specific Query Simulation ===')
    console.log('Simulating query: "What are sales at Bloor vs The Well?"')

    const bloorLocation = locations.find(loc => loc.name?.includes('Bloor'))
    const wellLocation = locations.find(loc => loc.name?.includes('Well'))

    if (bloorLocation && wellLocation) {
      console.log(`Found locations:`)
      console.log(`  Bloor: ${bloorLocation.locationId} -> "${bloorLocation.name}"`)
      console.log(`  The Well: ${wellLocation.locationId} -> "${wellLocation.name}"`)

      const bloorSales = await prisma.sale.aggregate({
        where: { locationId: bloorLocation.locationId },
        _count: true,
        _sum: { totalSales: true }
      })

      const wellSales = await prisma.sale.aggregate({
        where: { locationId: wellLocation.locationId },
        _count: true,
        _sum: { totalSales: true }
      })

      console.log(`Sales comparison:`)
      console.log(`  ${bloorLocation.name}: ${bloorSales._count} sales, $${bloorSales._sum.totalSales || 0} total`)
      console.log(`  ${wellLocation.name}: ${wellSales._count} sales, $${wellSales._sum.totalSales || 0} total`)
    } else {
      console.log('Could not find Bloor or Well locations for testing')
    }

    console.log('\n✅ Location mapping test completed successfully!')

  } catch (error) {
    console.error('❌ Error during location mapping test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLocationMapping()