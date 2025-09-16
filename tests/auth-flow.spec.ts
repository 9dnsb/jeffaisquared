import { test, expect } from '@playwright/test';

// Test constants to avoid duplication
const SIGNUP_LINK_TEXT = "Don't have an account? Sign up";
const CREATE_ACCOUNT_BUTTON = 'button:has-text("Create account")';
const SIGN_IN_BUTTON = 'button:has-text("Sign in")';
const AUTH_LOGIN_URL = '/auth/login';
const AUTH_REGISTER_URL = '/auth/register';
const EMAIL_INPUT = 'input[type="email"]';
const PASSWORD_INPUT = 'input[type="password"]';

test.describe('Authentication Flow', () => {
  test('should complete full signup -> login -> logout flow', async ({ page }) => {
    // Generate a unique email for this test run
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
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

    // Try to login with non-existent credentials
    await page.fill(EMAIL_INPUT, 'nonexistent@example.com');
    await page.fill(PASSWORD_INPUT, 'wrongpassword');
    await page.click(SIGN_IN_BUTTON);

    // Should stay on login page and show error
    await expect(page).toHaveURL(AUTH_LOGIN_URL);

    // Wait for error message to appear
    await page.waitForSelector('[role="alert"], .text-red-600, .error-message', { timeout: 5000 });

    console.log('✅ Invalid login credentials test passed');
  });
});