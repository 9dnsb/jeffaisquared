import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Strategy: Clean up only test-specific data, preserve historical data

    // 1. Clean up test users (identified by email pattern)
    await cleanupTestUsers();

    // 2. Clean up test-specific data (identified by prefix)
    await cleanupTestData();

    // 3. Clean up any test sessions or temporary data
    await cleanupTestSessions();

    console.log('✅ E2E test environment cleanup complete');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
    // Don't throw - we don't want cleanup failures to fail the test run
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupTestUsers() {
  console.log('👤 Cleaning up test profiles...');

  try {
    // Delete profiles with test email patterns
    const deletedProfiles = await prisma.profile.deleteMany({
      where: {
        OR: [
          { email: { contains: 'e2e-test' } },
          { email: { contains: '@example.com' } },
          { email: { endsWith: '@example.com' } }
        ]
      }
    });

    console.log(`🗑️ Deleted ${deletedProfiles.count} test profiles`);
  } catch (error) {
    console.log('⚠️ Error cleaning up test profiles:', error);
  }
}

async function cleanupTestData() {
  console.log('🧪 Cleaning up test-specific data...');

  const testDataPrefix = 'E2E_TEST_';

  try {
    // Clean up test line items first (foreign key constraints)
    const deletedLineItems = await prisma.lineItem.deleteMany({
      where: {
        OR: [
          { id: { startsWith: testDataPrefix } },
          { squareLineItemUid: { startsWith: testDataPrefix } }
        ]
      }
    });
    console.log(`🗑️ Deleted ${deletedLineItems.count} test line items`);

    // Clean up test orders (this won't affect historical Square data)
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        OR: [
          { id: { startsWith: testDataPrefix } },
          { squareOrderId: { startsWith: testDataPrefix } },
          { locationId: { startsWith: testDataPrefix } }
        ]
      }
    });
    console.log(`🗑️ Deleted ${deletedOrders.count} test orders`);

    // Clean up test locations (preserve real Square locations)
    const deletedLocations = await prisma.location.deleteMany({
      where: {
        OR: [
          { squareLocationId: { startsWith: testDataPrefix } },
          { name: { startsWith: testDataPrefix } }
        ]
      }
    });
    console.log(`🗑️ Deleted ${deletedLocations.count} test locations`);

    // Clean up test items
    const deletedItems = await prisma.item.deleteMany({
      where: {
        OR: [
          { id: { startsWith: testDataPrefix } },
          { name: { startsWith: testDataPrefix } }
        ]
      }
    });
    console.log(`🗑️ Deleted ${deletedItems.count} test items`);

  } catch (error) {
    console.log('⚠️ Error cleaning up test data:', error);
  }
}

async function cleanupTestSessions() {
  console.log('🔐 Cleaning up test sessions...');

  try {
    // Clean up any session data for test profiles
    // Since we're using Supabase auth, sessions are managed externally
    // This is mainly for any local session artifacts

    console.log('✅ Test sessions cleaned up (Supabase manages auth sessions)');
  } catch (error) {
    console.log('⚠️ Error cleaning up test sessions:', error);
  }
}

export default globalTeardown;