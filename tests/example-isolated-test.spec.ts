import { test, expect } from '@playwright/test';
import TestDataManager from './test-data-manager';

test.describe('AI Query System - Isolated Testing', () => {
  test.beforeEach(async () => {
    // Create isolated test data for this test
    await TestDataManager.createDateBasedTestData();
  });

  test.afterEach(async () => {
    // Clean up test data after each test
    await TestDataManager.cleanupAllTestData();
  });

  test('should handle basic sales queries with test data', async ({ page }) => {
    // This test uses isolated test data, not historical Square data

    await page.goto('/dashboard');

    // Test the AI chat with predictable test data
    await page.fill('[data-testid="ai-chat-input"]', 'What were our sales today?');
    await page.click('[data-testid="ai-chat-submit"]');

    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]');

    // Verify response contains expected test data
    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toContain('$100.00'); // Our test data amount
  });

  test('should preserve historical data while testing', async ({ page }) => {
    // Verify that historical Square data is still intact
    const status = await TestDataManager.getTestDataStatus();

    expect(status.isolationWorking).toBe(true);
    expect(status.realSales).toBeGreaterThan(0); // Historical data preserved
    expect(status.testSales).toBeGreaterThan(0); // Test data created
  });

  test('should handle user authentication with test users', async ({ page }) => {
    // Create a test user that won't conflict with real users
    const testUser = await TestDataManager.createTestUser('test-auth@example.com', {
      password: 'test123',
      verified: true
    });

    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', 'test123');
    await page.click('[data-testid="login-button"]');

    // Verify successful login
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle location-specific queries with test locations', async ({ page }) => {
    // Create test sales for specific test location
    const testLocationId = await TestDataManager.ensureTestLocation('Test Coffee Shop');

    await TestDataManager.createTestSale({
      locationId: testLocationId,
      totalSales: 250.00,
      date: new Date(),
      items: [
        { name: 'Test Espresso', price: 3.50, quantity: 50 },
        { name: 'Test Croissant', price: 4.00, quantity: 25 }
      ]
    });

    await page.goto('/dashboard');

    // Query for the test location
    await page.fill('[data-testid="ai-chat-input"]', 'What were sales at Test Coffee Shop?');
    await page.click('[data-testid="ai-chat-submit"]');

    await page.waitForSelector('[data-testid="ai-response"]');
    const response = await page.textContent('[data-testid="ai-response"]');

    expect(response).toContain('$250.00');
    expect(response).toContain('Test Coffee Shop');
  });
});

test.describe('Integration with Historical Data', () => {
  test('should query historical data without modifying it', async ({ page }) => {
    // This test can query real historical data for integration testing
    // without creating or modifying it

    await page.goto('/dashboard');

    // Query historical data (this will hit real Square data)
    await page.fill('[data-testid="ai-chat-input"]', 'What were our total sales in 2024?');
    await page.click('[data-testid="ai-chat-submit"]');

    await page.waitForSelector('[data-testid="ai-response"]');
    const response = await page.textContent('[data-testid="ai-response"]');

    // Verify response format and structure, not exact amounts
    expect(response).toMatch(/\$[\d,]+\.\d{2}/); // Currency format
    expect(response).toContain('2024');
  });

  test('should handle large dataset queries efficiently', async ({ page }) => {
    // Test that queries against large historical datasets work

    await page.goto('/dashboard');

    // This query will hit the full 2-year dataset
    await page.fill('[data-testid="ai-chat-input"]', 'Show me monthly sales breakdown for all time');
    await page.click('[data-testid="ai-chat-submit"]');

    // Verify response comes back in reasonable time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });
    const responseTime = Date.now() - startTime;

    // Should respond within 30 seconds even with large dataset
    expect(responseTime).toBeLessThan(30000);

    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(0);
  });
});