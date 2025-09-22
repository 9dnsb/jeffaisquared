import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Test Data Manager - Utilities for managing test data in E2E tests
 * without affecting historical Square data
 */

export class TestDataManager {
  private static readonly TEST_PREFIX = 'E2E_TEST_';

  /**
   * Create a test user for authentication flows
   */
  static async createTestUser(email: string, options: {
    password?: string,
    verified?: boolean
  } = {}) {
    const testUser = {
      id: `${this.TEST_PREFIX}USER_${Date.now()}`,
      email,
      ...options
    };

    return await prisma.profile.create({
      data: testUser
    });
  }

  /**
   * Create test sales data for specific test scenarios
   */
  static async createTestSale(data: {
    locationId?: string,
    totalSales: number,
    date: Date,
    items?: Array<{ name: string, price: number, quantity: number }>
  }) {
    const saleId = `${this.TEST_PREFIX}SALE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orderId = `${this.TEST_PREFIX}ORDER_${Date.now()}`;

    // Use test location if not specified
    const locationId = data.locationId || await this.ensureTestLocation();

    const sale = await prisma.order.create({
      data: {
        id: saleId,
        squareOrderId: orderId,
        locationId,
        totalAmount: data.totalSales,
        state: 'COMPLETED',
        currency: 'CAD',
        date: data.date
      }
    });

    // Create sale items if provided
    if (data.items) {
      for (const item of data.items) {
        const itemId = await this.ensureTestItem(item.name, item.price);

        await prisma.lineItem.create({
          data: {
            id: `${this.TEST_PREFIX}ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: sale.id,
            itemId,
            squareLineItemUid: `${this.TEST_PREFIX}LINE_${Date.now()}`,
            name: item.name,
            quantity: item.quantity,
            unitPriceAmount: item.price,
            totalPriceAmount: item.price * item.quantity,
            currency: 'CAD'
          }
        });
      }
    }

    return sale;
  }

  /**
   * Ensure a test location exists
   */
  static async ensureTestLocation(name?: string): Promise<string> {
    const locationId = `${this.TEST_PREFIX}LOC_DEFAULT`;
    const locationName = name || `${this.TEST_PREFIX}Default Location`;

    await prisma.location.upsert({
      where: { squareLocationId: locationId },
      update: {},
      create: {
        squareLocationId: locationId,
        name: locationName,
        address: 'Test Address'
      }
    });

    return locationId;
  }

  /**
   * Ensure a test item exists
   */
  static async ensureTestItem(name: string, basePrice: number): Promise<string> {
    const itemId = `${this.TEST_PREFIX}ITEM_${name.replace(/\s+/g, '_').toUpperCase()}`;

    await prisma.item.upsert({
      where: { id: itemId },
      update: {},
      create: {
        id: itemId,
        name: `${this.TEST_PREFIX}${name}`,
        squareItemId: `${this.TEST_PREFIX}SQ_${itemId}`,
        squareCatalogId: `${this.TEST_PREFIX}CAT_${itemId}`,
        category: 'Test Category'
      }
    });

    return itemId;
  }

  /**
   * Create test data for date-based queries
   */
  static async createDateBasedTestData() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Create predictable test data for today, yesterday, last week
    await Promise.all([
      this.createTestSale({
        totalSales: 100.00,
        date: today,
        items: [{ name: 'Test Coffee', price: 5.00, quantity: 20 }]
      }),
      this.createTestSale({
        totalSales: 85.50,
        date: yesterday,
        items: [{ name: 'Test Latte', price: 4.25, quantity: 20 }]
      }),
      this.createTestSale({
        totalSales: 200.00,
        date: lastWeek,
        items: [{ name: 'Test Sandwich', price: 10.00, quantity: 20 }]
      })
    ]);

    return {
      todayExpected: 100.00,
      yesterdayExpected: 85.50,
      lastWeekExpected: 200.00
    };
  }

  /**
   * Clean up all test data created by this manager
   */
  static async cleanupAllTestData() {
    const deleteOperations = [
      prisma.lineItem.deleteMany({
        where: { id: { startsWith: this.TEST_PREFIX } }
      }),
      prisma.order.deleteMany({
        where: { id: { startsWith: this.TEST_PREFIX } }
      }),
      prisma.item.deleteMany({
        where: { id: { startsWith: this.TEST_PREFIX } }
      }),
      prisma.location.deleteMany({
        where: { squareLocationId: { startsWith: this.TEST_PREFIX } }
      }),
      prisma.profile.deleteMany({
        where: { email: { startsWith: `${this.TEST_PREFIX.toLowerCase()}test` } }
      })
    ];

    // Execute in order to respect foreign key constraints
    for (const operation of deleteOperations) {
      await operation;
    }
  }

  /**
   * Get test data isolation status
   */
  static async getTestDataStatus() {
    const counts = await Promise.all([
      prisma.order.count({ where: { id: { startsWith: this.TEST_PREFIX } } }),
      prisma.order.count({ where: { id: { not: { startsWith: this.TEST_PREFIX } } } }),
      prisma.profile.count({ where: { email: { startsWith: `${this.TEST_PREFIX.toLowerCase()}test` } } })
    ]);

    return {
      testSales: counts[0],
      realSales: counts[1],
      testUsers: counts[2],
      isolationWorking: counts[1] > 0 // We have real data preserved
    };
  }
}

export default TestDataManager;