import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '../src/generated/prisma';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function globalSetup() {
  console.log('🔄 Setting up E2E test environment...');

  try {
    // Strategy: Preserve historical data, create isolated test users and sessions

    // 1. Check if historical data exists
    const dataExists = await checkHistoricalDataExists();

    if (!dataExists) {
      console.log('📦 No historical data found, performing initial seed...');
      // Only reset/seed if no data exists (fresh setup)
      await execAsync('npx prisma migrate reset --force --skip-generate');
      await execAsync('npm run db:seed');
    } else {
      console.log('✅ Historical data preserved, setting up test isolation...');
    }

    // 2. Create isolated test users (won't conflict with real users)
    await createTestUsers();

    // 3. Create test-specific data that can be safely cleaned up
    await createTestData();

    // 4. Set up database triggers if needed
    await ensureDatabaseTriggers();

    console.log('✅ E2E test environment setup complete');
  } catch (err) {
    console.error('❌ Failed to setup E2E test environment:', err);
    throw err;
  }
}

async function checkHistoricalDataExists(): Promise<boolean> {
  try {
    const ordersCount = await prisma.order.count();
    console.log(`📊 Found ${ordersCount} order records in database`);

    // Consider data exists if we have substantial historical data
    return ordersCount > 1000; // Threshold for "historical data exists"
  } catch (error) {
    console.log('❌ Error checking data existence:', error);
    return false;
  }
}

async function createTestUsers() {
  console.log('👤 Creating isolated test profiles...');

  // Create test profiles that won't conflict with real users
  const testProfiles = [
    {
      id: 'test-user-e2e-1',
      email: 'e2e-test-1@example.com',
      firstName: 'E2E',
      lastName: 'Test1'
    },
    {
      id: 'test-user-e2e-2',
      email: 'e2e-test-2@example.com',
      firstName: 'E2E',
      lastName: 'Test2'
    }
  ];

  for (const profile of testProfiles) {
    try {
      // Use upsert to avoid conflicts if profile already exists
      await prisma.profile.upsert({
        where: { email: profile.email },
        update: {}, // Don't update existing test profiles
        create: profile
      });
      console.log(`✅ Test profile created/verified: ${profile.email}`);
    } catch (error) {
      console.log(`⚠️ Test profile setup warning for ${profile.email}:`, error);
      // Continue with other profiles even if one fails
    }
  }
}

async function createTestData() {
  console.log('🧪 Creating test-specific data...');

  // Create test data that can be safely cleaned up
  // This data should be clearly marked as test data
  const testDataPrefix = 'E2E_TEST_';

  // Example: Create test locations that won't conflict with real Square data
  const testLocations = [
    {
      squareLocationId: `${testDataPrefix}LOC_1`,
      name: `${testDataPrefix}Test Location 1`,
      address: 'Test Address 1'
    }
  ];

  for (const location of testLocations) {
    try {
      await prisma.location.upsert({
        where: { squareLocationId: location.squareLocationId },
        update: location,
        create: location
      });
      console.log(`✅ Test location created: ${location.name}`);
    } catch (error) {
      console.log(`⚠️ Test location warning:`, error);
    }
  }

  // Create minimal test sales data for scenarios that need specific data
  // This ensures tests don't depend on specific historical data patterns
  await createMinimalTestSales();
}

async function createMinimalTestSales() {
  console.log('💰 Creating minimal test order data...');

  const testOrders = [
    {
      id: 'E2E_TEST_ORDER_1',
      squareOrderId: 'E2E_TEST_SQ_ORDER_1',
      locationId: 'E2E_TEST_LOC_1',
      totalAmount: 10000, // $100.00 in cents
      date: new Date('2025-01-01'),
      state: 'COMPLETED',
      currency: 'USD'
    },
    {
      id: 'E2E_TEST_ORDER_2',
      squareOrderId: 'E2E_TEST_SQ_ORDER_2',
      locationId: 'E2E_TEST_LOC_1',
      totalAmount: 15000, // $150.00 in cents
      date: new Date('2025-01-02'),
      state: 'COMPLETED',
      currency: 'USD'
    }
  ];

  for (const order of testOrders) {
    try {
      await prisma.order.upsert({
        where: { squareOrderId: order.squareOrderId },
        update: order,
        create: order
      });
    } catch (error) {
      console.log(`⚠️ Test order warning:`, error);
    }
  }
}

async function ensureDatabaseTriggers() {
  console.log('🔧 Ensuring database triggers are set up...');

  try {
    // Run trigger setup script if it exists
    await execAsync('npm run db:setup-triggers');
    console.log('✅ Database triggers verified');
  } catch (error) {
    console.log('⚠️ Trigger setup warning (may not be critical):', error);
  }
}

export default globalSetup;