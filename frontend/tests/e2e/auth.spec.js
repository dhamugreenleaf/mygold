import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  // Common mocks for all tests
  test.beforeEach(async ({ page }) => {
    // Mock the rates and health API calls that the app makes on load
    await page.route('**/api/rates*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { rate24k: 7000, rate22k: 6500, rate18k: 5500, silver: 90 } })
    }));
    await page.route('**/api/health*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));
    // Removed msg91 aborts that might have been blocking other requests
  });

  test.describe('Login', () => {
    test('Verify login page loads', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    test('Verify required-field validation', async ({ page }) => {
      await page.goto('/login');
      await page.locator('button[type="submit"]').click();
      
      // HTML5 Validation will block submission if required fields are empty
      // Or toast will appear. Based on code, they have 'required' attributes on inputs.
      const usernameInput = page.locator('input[name="username"]');
      const isRequired = await usernameInput.evaluate((el) => el.required);
      expect(isRequired).toBe(true);
    });

    test('Verify invalid login displays the correct error', async ({ page }) => {
      await page.route('**/api/auth/login', route => route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid credentials' })
      }));

      await page.goto('/login');
      await page.locator('input[name="username"]').fill('wronguser');
      await page.locator('input[name="password"]').fill('wrongpass');
      await page.locator('button[type="submit"]').click();

      // Check if toast appears
      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });

    test('Verify successful login redirects to expected page', async ({ page }) => {
      await page.route('**/api/auth/login', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'fake-jwt-token',
            user: { id: 1, username: 'testuser', role: 'user' }
          }
        })
      }));

      // Mock the /auth/me call that runs on app initialization if token exists
      await page.route('**/api/auth/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 1, username: 'testuser', role: 'user' }
        })
      }));

      await page.goto('/login');
      await page.locator('input[name="username"]').fill('testuser');
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('button[type="submit"]').click();

      // Wait for redirect to home
      await page.waitForURL('**/');
      
      // Verify token in localStorage
      const token = await page.evaluate(() => localStorage.getItem('aurum_token'));
      expect(token).toBe('fake-jwt-token');
    });
  });

  test.describe('Registration', () => {
    test('Verify registration page loads', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /Create Your Vault/i })).toBeVisible();
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="tel"]')).toBeVisible();
    });

    test('Verify invalid registration displays the correct error', async ({ page }) => {
      await page.goto('/register');
      // Fill invalid data and verify toast
      await page.locator('input[name="username"]').fill('a'); // < 3 chars
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('input[type="tel"]').fill('9876543210');
      await page.locator('input[type="password"]').fill('password123');
      
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/Username must be at least 3 characters/i)).toBeVisible();
    });

    test('Test successful registration using safe mocked response', async ({ page }) => {
      // Mock Request OTP
      await page.route('**/api/auth/register/request-otp', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OTP sent successfully to your mobile.' })
      }));

      // Mock Verify OTP
      await page.route('**/api/auth/register/verify-otp', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'fake-jwt-token-reg',
            user: { id: 2, username: 'newuser', role: 'user' }
          }
        })
      }));
      
      // Mock /auth/me for redirect
      await page.route('**/api/auth/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 2, username: 'newuser', role: 'user' }
        })
      }));

      await page.goto('/register');
      
      // Step 1
      await page.locator('input[name="username"]').fill('newuser');
      await page.locator('input[name="email"]').fill('new@example.com');
      await page.locator('input[type="tel"]').fill('9876543210');
      await page.locator('input[type="password"]').fill('password123');
      
      await page.locator('button[type="submit"]').click();
      
      // Should show OTP success toast and move to step 2
      await expect(page.getByText('OTP sent successfully to your mobile.')).toBeVisible();

      // Wait for step 2 (OTP input) to appear
      const otpInput = page.locator('input[inputmode="numeric"]');
      await expect(otpInput).toBeVisible();
      
      // Step 2
      await otpInput.fill('123456');
      await page.locator('button[type="submit"]').click();

      // Wait for redirect
      await page.waitForURL('**/');
      
      // Check success toast
      await expect(page.getByText('Account verified & created! 🎉')).toBeVisible();

      // Verify token
      const token = await page.evaluate(() => localStorage.getItem('aurum_token'));
      expect(token).toBe('fake-jwt-token-reg');
    });
  });
});
