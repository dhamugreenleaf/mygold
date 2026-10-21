import { test, expect } from '@playwright/test';

test.describe('Dashboard & Home Page', () => {
  // Set up authenticated session and mock data
  test.beforeEach(async ({ page }) => {
    // 1. Mock authentication verification
    await page.route('**/api/auth/me', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { user: { id: 1, username: 'TestUser', role: 'customer', plan: 'paid' } }
      })
    }));

    // 2. Mock gold rates API
    await page.route('**/api/rates*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          rate24K: 7500,
          rate22K: 7000,
          rate18K: 6000,
          silverRate: 100,
          silver: { '999': 100, '925': 92.5, '916': 91.6, '900': 90 }
        }
      })
    }));

    // 3. Mock health API
    await page.route('**/api/health*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));

    // 4. Mock notifications API
    await page.route('**/api/notifications*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    }));

    // 5. Mock portfolio API with controlled data
    await page.route('**/api/portfolio*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          purchases: [
            { id: 1, item_name: "Gold Coin", weight: "10.00", purity: "24K", purchase_amount: "70000", asset_type: "GOLD" },
            { id: 2, item_name: "Silver Bar", weight: "100.00", purity: "999", purchase_amount: "9000", asset_type: "SILVER" }
          ]
        }
      })
    }));

    // Inject fake JWT token into localStorage to bypass login screen
    await page.addInitScript(() => {
      localStorage.setItem('aurum_token', 'fake-jwt-token-dashboard');
      localStorage.setItem('aurum_user', JSON.stringify({ id: 1, username: 'TestUser', role: 'customer', plan: 'paid' }));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
    });
  });

  test.describe('Dashboard Layout & Data', () => {
    test('Verify Home Page loads successfully', async ({ page }) => {
      await page.goto('/');
      // Wait for network requests to settle
      await page.waitForLoadState('networkidle');
      
      // Verify user greeting
      await expect(page.getByText('Hello, TestUser')).toBeVisible();
      // Verify vault heading
      await expect(page.getByRole('heading', { name: /Your Vault/i })).toBeVisible();
    });

    test('Verify portfolio information and profit/loss', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Based on mocked data:
      // Gold: 10g * 7500 = 75,000 (Cost: 70,000)
      // Silver: 100g * 100 = 10,000 (Cost: 9,000)
      // Total Value = 85,000. Total Cost = 79,000. Profit = 6,000
      
      // Look for formatted currency values
      await expect(page.getByText('₹85,000.00')).toBeVisible(); // Total Value
      await expect(page.getByText('₹79,000.00')).toBeVisible(); // Total Amount Paid
      await expect(page.getByText('+₹6,000.00')).toBeVisible(); // Estimated Gain
    });

    test('Verify gold and silver summary cards', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check Gold Card
      await expect(page.getByText('₹75,000.00').first()).toBeVisible(); // Gold Value
      await expect(page.getByText('10.00 g').first()).toBeVisible();     // Gold Weight

      // Check Silver Card
      await expect(page.getByText('₹10,000.00').first()).toBeVisible(); // Silver Value
      await expect(page.getByText('100.00 g').first()).toBeVisible();    // Silver Weight
    });

    test('Verify live gold rate sections are displayed', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Title
      await expect(page.getByText('Chennai Live Gold & Silver Rates')).toBeVisible();

      // Ensure 24K rate is shown correctly (7500)
      await expect(page.getByText('₹7,500.00').first()).toBeVisible();
      // Ensure 22K rate is shown correctly (7000)
      await expect(page.getByText('₹7,000.00').first()).toBeVisible();
      // Ensure 18K rate is shown correctly (6000)
      await expect(page.getByText('₹6,000.00').first()).toBeVisible();
    });

    test('Verify navigation links work', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click Add Asset button
      await page.getByRole('link', { name: /Add Asset/i }).first().click();
      await expect(page).toHaveURL(/.*\/add-gold/);

      // Go back to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click Vault Details button
      await page.getByRole('link', { name: /Vault Details/i }).first().click();
      await expect(page).toHaveURL(/.*\/my-gold/);
    });
  });

  test.describe('Theme and Language Context', () => {
    test('Verify light and dark theme switching', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get the theme toggle button from Navbar
      const themeToggle = page.locator('button[aria-label="Toggle theme"]');
      await expect(themeToggle).toBeVisible();

      // Check initial theme state on html element (depends on user's system preference or default)
      // The toggle button will change it.
      await themeToggle.click();
      
      // Verify html tag has 'dark' class or doesn't have it based on click
      const isDarkFirstClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      
      await themeToggle.click();
      
      const isDarkSecondClick = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      
      // It should have toggled
      expect(isDarkFirstClick).not.toBe(isDarkSecondClick);
    });

    test('Verify language switching', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ensure it starts in English (we mock localStorage, which defaults to 'en')
      await expect(page.getByText('Your Vault')).toBeVisible();

      // Get the language toggle button from Navbar
      const langToggle = page.locator('button[aria-label="Toggle language"]');
      await expect(langToggle).toBeVisible();

      // Click to switch language (should switch to Tamil)
      await langToggle.click();

      // Ensure translation changes (Your Vault -> உங்கள் தங்க பெட்டகம்)
      await expect(page.getByText('உங்கள் தங்க பெட்டகம்')).toBeVisible();
      
      // Verify HTML lang attribute updated
      const langAttr = await page.evaluate(() => document.documentElement.lang);
      expect(langAttr).toBe('ta');
    });
  });
});
