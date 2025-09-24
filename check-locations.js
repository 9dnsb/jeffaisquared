const { PrismaClient } = require('./src/generated/prisma');

async function checkLocations() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking location data for ground truth analysis...\n');

    // Get all locations
    const locations = await prisma.location.findMany({
      select: {
        name: true,
        squareLocationId: true,
        _count: {
          select: { orders: true }
        }
      }
    });

    console.log('📍 Available locations:');
    locations.forEach(loc => {
      console.log(`  - ${loc.name} (ID: ${loc.squareLocationId}, Orders: ${loc._count.orders})`);
    });

    console.log('\n🔎 Testing "Kingston" matches...');

    // Test exact match
    const exactMatch = await prisma.location.findMany({
      where: { name: 'Kingston' },
      select: { name: true, squareLocationId: true }
    });
    console.log('Exact match "Kingston":', exactMatch);

    // Test case-insensitive contains
    const containsMatch = await prisma.location.findMany({
      where: { name: { contains: 'Kingston', mode: 'insensitive' } },
      select: { name: true, squareLocationId: true }
    });
    console.log('Contains match "Kingston":', containsMatch);

    // Test case-insensitive contains with variations
    const variations = ['kingston', 'KINGSTON', 'Kingston', 'King'];
    for (const variation of variations) {
      const matches = await prisma.location.findMany({
        where: { name: { contains: variation, mode: 'insensitive' } },
        select: { name: true, squareLocationId: true }
      });
      if (matches.length > 0) {
        console.log(`Variation "${variation}" matches:`, matches);
      }
    }

    console.log('\n💰 Revenue calculation for each location:');

    // Calculate revenue for each location using the same method as ground truth
    const locationRevenue = await prisma.location.findMany({
      select: {
        name: true,
        orders: {
          select: {
            totalAmount: true
          }
        }
      }
    });

    locationRevenue.forEach(loc => {
      const revenue = loc.orders.reduce((sum, order) => sum + order.totalAmount, 0) / 100; // Convert cents to dollars
      console.log(`  ${loc.name}: $${revenue.toFixed(2)}`);
    });

    console.log('\n🎯 Testing Kingston revenue specifically:');

    // Test what the handleLocationMetrics function would return for Kingston
    const kingstonTest = await prisma.location.findMany({
      where: {
        OR: [{
          name: {
            contains: 'Kingston',
            mode: 'insensitive'
          }
        }]
      },
      include: {
        orders: {
          select: {
            totalAmount: true
          }
        }
      }
    });

    if (kingstonTest.length === 0) {
      console.log('❌ No locations found matching "Kingston" - this explains why ground truth returns 0');
    } else {
      kingstonTest.forEach(loc => {
        const revenue = loc.orders.reduce((sum, order) => sum + order.totalAmount, 0) / 100;
        console.log(`✅ Found "${loc.name}" with revenue: $${revenue.toFixed(2)}`);
      });
    }

  } catch (error) {
    console.error('Error checking locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLocations().catch(console.error);