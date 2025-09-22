import { test, expect } from '@playwright/test';
import TestDataManager from './test-data-manager';

// Test constants to avoid duplication
const SIGNUP_LINK_TEXT = "Don't have an account? Sign up";
const CREATE_ACCOUNT_BUTTON = 'button:has-text("Create account")';
const SIGN_IN_BUTTON = 'button:has-text("Sign in")';
const AUTH_LOGIN_URL = '/auth/login';
const AUTH_REGISTER_URL = '/auth/register';
const EMAIL_INPUT = 'input[type="email"]';
const PASSWORD_INPUT = 'input[type="password"]';

test.describe('Authentication Flow', () => {
  // Clean up test users after each test
  test.afterEach(async () => {
    await TestDataManager.cleanupAllTestData();
  });

  test('should complete full signup -> login -> logout flow', async ({ page }) => {
    // Generate a unique email for this test run using test prefix
    const timestamp = Date.now();
    const testEmail = `e2e-test-auth-${timestamp}@example.com`;
    const testPassword = 'password123';
    const testFirstName = 'Test';
    const testLastName = 'User';

    // Step 1: Navigate to main page and click signup link
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: SIGNUP_LINK_TEXT }).click();
    await expect(page).toHaveURL(AUTH_REGISTER_URL);

    // Step 2: Fill out registration form
    await page.fill('input[placeholder="First name"]', testFirstName);
    await page.fill('input[placeholder="Last name"]', testLastName);
    await page.fill(EMAIL_INPUT, testEmail);
    await page.fill(PASSWORD_INPUT, testPassword);

    // Submit registration form
    await page.click(CREATE_ACCOUNT_BUTTON);

    // Wait for registration to complete and redirect to login
    await page.waitForURL(AUTH_LOGIN_URL, { timeout: 10000 });
    await expect(page).toHaveURL(AUTH_LOGIN_URL);

    // Step 3: Sign in with the registered credentials
    await page.fill(EMAIL_INPUT, testEmail);
    await page.fill(PASSWORD_INPUT, testPassword);
    await page.click(SIGN_IN_BUTTON);

    // Wait for login to complete and redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in and dashboard loads
    await expect(page.locator('text=Welcome,')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    await expect(page.locator('text=Sales Analytics Platform')).toBeVisible();
    await expect(page.locator('text=Dashboard Coming Soon')).toBeVisible();

    // Step 4: Sign out
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('/', { timeout: 5000 });
    await expect(page).toHaveURL('/');

    console.log(`✅ Complete auth flow test passed for user: ${testEmail}`);
  });

  test('should handle pre-created test user login', async ({ page }) => {
    // Create a test user using TestDataManager
    const testUser = await TestDataManager.createTestUser('e2e-preauth@example.com', {
      password: 'testpass123',
      verified: true
    });

    // Navigate to login page
    await page.goto(AUTH_LOGIN_URL);
    await page.waitForLoadState('networkidle');

    // Sign in with pre-created test user
    await page.fill(EMAIL_INPUT, testUser.email);
    await page.fill(PASSWORD_INPUT, 'testpass123');
    await page.click(SIGN_IN_BUTTON);

    // Wait for login to complete
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');

    // Verify successful login
    await expect(page.locator('text=Welcome,')).toBeVisible();

    console.log(`✅ Pre-created test user login passed for: ${testUser.email}`);
  });

  test('should navigate between login and register pages', async ({ page }) => {
    // Start from main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go to register page
    await page.getByRole('link', { name: SIGNUP_LINK_TEXT }).click();
    await expect(page).toHaveURL(AUTH_REGISTER_URL);
    await expect(page.locator('text=Create your account')).toBeVisible();

    // Navigate to login page from register page
    await page.click('text=Already have an account? Sign in');
    await expect(page).toHaveURL(AUTH_LOGIN_URL);
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // Navigate back to register page from login page
    await page.getByRole('link', { name: SIGNUP_LINK_TEXT }).click();
    await expect(page).toHaveURL(AUTH_REGISTER_URL);
    await expect(page.locator('text=Create your account')).toBeVisible();

    console.log('✅ Auth page navigation test passed');
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto(AUTH_REGISTER_URL);
    await page.waitForLoadState('networkidle');

    // Try to submit form with missing required fields
    await page.click(CREATE_ACCOUNT_BUTTON);

    // Check that form validation prevents submission (stays on same page)
    await expect(page).toHaveURL(AUTH_REGISTER_URL);

    // Fill form with invalid email
    await page.fill('input[placeholder="First name"]', 'Test');
    await page.fill('input[placeholder="Last name"]', 'User');
    await page.fill(EMAIL_INPUT, 'invalid-email');
    await page.fill(PASSWORD_INPUT, '123'); // Too short

    await page.click(CREATE_ACCOUNT_BUTTON);

    // Should still be on register page due to validation errors
    await expect(page).toHaveURL(AUTH_REGISTER_URL);

    console.log('✅ Registration validation test passed');
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto(AUTH_LOGIN_URL);
    await page.waitForLoadState('networkidle');

    // Try to login with clearly non-existent test credentials
    const fakeEmail = `e2e-fake-${Date.now()}@example.com`;
    await page.fill(EMAIL_INPUT, fakeEmail);
    await page.fill(PASSWORD_INPUT, 'wrongpassword');
    await page.click(SIGN_IN_BUTTON);

    // Should stay on login page and show error
    await expect(page).toHaveURL(AUTH_LOGIN_URL);

    // Wait for error message to appear
    await page.waitForSelector('[role="alert"], .text-red-600, .error-message', { timeout: 5000 });

    console.log('✅ Invalid login credentials test passed');
  });

  test('should handle user logout and session cleanup', async ({ page }) => {
    // Create and login with test user
    const testUser = await TestDataManager.createTestUser('e2e-logout@example.com', {
      password: 'logouttest123',
      verified: true
    });

    await page.goto(AUTH_LOGIN_URL);
    await page.fill(EMAIL_INPUT, testUser.email);
    await page.fill(PASSWORD_INPUT, 'logouttest123');
    await page.click(SIGN_IN_BUTTON);

    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Sign out
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL('/');

    // Try to access protected route - should redirect to login
    await page.goto('/dashboard');
    await page.waitForURL(AUTH_LOGIN_URL, { timeout: 5000 });
    await expect(page).toHaveURL(AUTH_LOGIN_URL);

    console.log('✅ Logout and session cleanup test passed');
  });
});

test.describe('Authentication Integration with Sales Data', () => {
  test.afterEach(async () => {
    await TestDataManager.cleanupAllTestData();
  });

  test('should access dashboard and interact with sales data after login', async ({ page }) => {
    // Create test user and test sales data
    const testUser = await TestDataManager.createTestUser('e2e-sales@example.com', {
      password: 'salestest123',
      verified: true
    });

    // Create some test sales data for this user to query
    const testData = await TestDataManager.createDateBasedTestData();

    // Login
    await page.goto(AUTH_LOGIN_URL);
    await page.fill(EMAIL_INPUT, testUser.email);
    await page.fill(PASSWORD_INPUT, 'salestest123');
    await page.click(SIGN_IN_BUTTON);

    await page.waitForURL('/dashboard');

    // Test AI query functionality (if it exists on dashboard)
    if (await page.locator('[data-testid="ai-chat-input"]').isVisible()) {
      await page.fill('[data-testid="ai-chat-input"]', 'What were our sales today?');
      await page.click('[data-testid="ai-chat-submit"]');

      // Should get a response (could include test data)
      await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
      const response = await page.textContent('[data-testid="ai-response"]');
      expect(response).toBeTruthy();
    }

    console.log('✅ Authenticated sales data access test passed');
  });
});