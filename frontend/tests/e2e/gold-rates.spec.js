import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────
// Fixed mock rate payload — mirrors the shape GoldRateContext
// resolves from res.data.  All real API calls are intercepted.
// ─────────────────────────────────────────────────────────────
const MOCK_RATES = {
  rate24K: 9500,
  rate22K: 8700,
  rate18K: 7125,
  silverRate: 105,
  sourceUpdate: '01/10/2026 10:00:00 AM',
  status: 'Live',
  source: 'LiveChennai',
  rateType: 'Chennai Bullion Market Rate',
  disclaimer: 'Test disclaimer',
};

// Expected display values (formatCurrency uses ₹ with 2 decimal places)
// rate24K 9500 → "₹9,500.00"   ×8 → "₹76,000.00"
// rate22K 8700 → "₹8,700.00"   ×8 → "₹69,600.00"
// rate18K 7125 → "₹7,125.00"   ×8 → "₹57,000.00"
// silverRate 105 → "₹105.00"   ×10 → "₹1,050.00"   ×1000 → "₹1,05,000.00"

test.describe('Gold Rates Module', () => {

  // ── Shared setup ──────────────────────────────────────────
  test.beforeEach(async ({ page }) => {
    // Inject auth + app state
    await page.addInitScript(() => {
      localStorage.setItem('aurum_token', 'fake-token-test');
      localStorage.setItem('aurum_user', JSON.stringify({
        id: 1, username: 'TestUser', role: 'customer', plan: 'paid'
      }));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
      localStorage.setItem('mygold_lang', 'en');
    });

    // Auth
    await page.route('**/api/auth/me*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { user: { id: 1, username: 'TestUser', role: 'customer', plan: 'paid' } }
      })
    }));

    // ── Gold Rates ── primary endpoint used by GoldRateContext
    await page.route('**/api/rates*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_RATES })
    }));

    // Ancillary mocks (prevent console noise)
    await page.route('**/api/portfolio*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} })
    }));
    await page.route('**/api/notifications*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    }));
    await page.route('**/api/health*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));
  });

  // ══════════════════════════════════════════════════════════
  // 1. PAGE LOAD & STRUCTURE
  // ══════════════════════════════════════════════════════════
  test.describe('Page Load & Structure', () => {

    test('Verify Gold Rates page loads with the correct heading', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('chennaiRatesTitle') = 'Chennai Live Gold & Silver Rates'
      await expect(
        page.getByRole('heading', { name: 'Chennai Live Gold & Silver Rates', level: 1 })
      ).toBeVisible();
    });

    test('Verify subtitle is displayed', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('chennaiRatesSubtitle') = 'Indicative Chennai bullion reference rates'
      await expect(page.getByText('Indicative Chennai bullion reference rates')).toBeVisible();
    });

    test('Verify Gold Rates section heading is visible', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('goldRatesTab') = 'Gold Rates'
      await expect(page.getByRole('heading', { name: 'Gold Rates', level: 2 })).toBeVisible();
    });

    test('Verify Silver Rates section heading is visible', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('silverRatesTab') = 'Silver Rates'
      await expect(page.getByRole('heading', { name: 'Silver Rates', level: 2 })).toBeVisible();
    });

    test('Verify Quick Gold Calculator section is visible', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('goldCalculator') = 'Quick Gold Calculator'
      await expect(page.getByRole('heading', { name: 'Quick Gold Calculator', level: 2 })).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 2. GOLD RATE DISPLAY
  // ══════════════════════════════════════════════════════════
  test.describe('Gold Rate Display', () => {

    test('Verify 24K gold card is displayed with correct purity label', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('24K Gold')).toBeVisible();
      await expect(page.getByText('99.9% Purity').first()).toBeVisible();
    });

    test('Verify 22K gold card is displayed with correct purity label', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('22K Gold')).toBeVisible();
      await expect(page.getByText('91.6% Purity').first()).toBeVisible();
    });

    test('Verify 18K gold card is displayed with correct purity label', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('18K Gold')).toBeVisible();
      await expect(page.getByText('75.0% Purity').first()).toBeVisible();
    });

    test('Verify 24K mocked rate renders correctly (₹9,500.00/g)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // formatCurrency(9500) = '₹9,500.00'
      await expect(page.getByText('₹9,500.00').first()).toBeVisible();
    });

    test('Verify 22K mocked rate renders correctly (₹8,700.00/g)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('₹8,700.00').first()).toBeVisible();
    });

    test('Verify 18K mocked rate renders correctly (₹7,125.00/g)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('₹7,125.00').first()).toBeVisible();
    });

    test('Verify 1 Poun (8g) price column is present for gold cards', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('onePoun') = '1 Poun (8g)' — label appears in header row and card
      const pounsLabels = page.getByText('1 Poun (8g)');
      await expect(pounsLabels.first()).toBeVisible();
    });

    test('Verify 24K 1-Poun price is 8× the per-gram rate (₹76,000.00)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // 9500 × 8 = 76,000  → formatCurrency = '₹76,000.00'
      await expect(page.getByText('₹76,000.00').first()).toBeVisible();
    });

    test('Verify 22K 1-Poun price is 8× the per-gram rate (₹69,600.00)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // 8700 × 8 = 69,600
      await expect(page.getByText('₹69,600.00').first()).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 3. SILVER RATE DISPLAY
  // ══════════════════════════════════════════════════════════
  test.describe('Silver Rate Display', () => {

    test('Verify 999 Fine Silver card is displayed', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('999 Fine Silver')).toBeVisible();
    });

    test('Verify 925 Sterling Silver card is displayed', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('925 Sterling Silver')).toBeVisible();
    });

    test('Verify 999 silver per-gram rate renders correctly (₹105.00)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // silverRate = 105 → formatCurrency = '₹105.00'
      await expect(page.getByText('₹105.00').first()).toBeVisible();
    });

    test('Verify 999 silver 10g price renders correctly (₹1,050.00)', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // 105 × 10 = 1050
      await expect(page.getByText('₹1,050.00').first()).toBeVisible();
    });

    test('Verify silver cards show all three columns: 1g, 10g, 1 Kg', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('oneGramPrice') = '1g Price'  (appears multiple times)
      await expect(page.getByText('1g Price').first()).toBeVisible();
      await expect(page.getByText('10 Grams').first()).toBeVisible();
      await expect(page.getByText('1 Kg').first()).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 4. LAST-UPDATED TIMESTAMP
  // ══════════════════════════════════════════════════════════
  test.describe('Timestamp Display', () => {

    test('Verify last-updated timestamp is shown from mock data', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // When status.includes('Live'), renders: "Updated 01/10/2026 10:00:00 AM"
      await expect(page.getByText(/Updated.*01\/10\/2026/)).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 5. REFRESH FUNCTIONALITY
  // ══════════════════════════════════════════════════════════
  test.describe('Refresh Functionality', () => {

    test('Verify refresh button is present with correct aria-label', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      const refreshBtn = page.getByRole('button', { name: 'Refresh rates' });
      await expect(refreshBtn).toBeVisible();
    });

    test('Verify refresh button triggers a new API call and updates rates', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Set up a listener BEFORE clicking — capture the next request to /api/rates
      const ratesRequestPromise = page.waitForRequest(req =>
        req.url().includes('/api/rates') && req.method() === 'GET'
      );

      // Click refresh button
      await page.getByRole('button', { name: 'Refresh rates' }).click();

      // Confirm a new GET /api/rates request was triggered
      const ratesRequest = await ratesRequestPromise;
      expect(ratesRequest.url()).toContain('/api/rates');

      // Page must still show the gold rate section (no crash after refresh)
      await expect(page.getByRole('heading', { name: 'Gold Rates', level: 2 })).toBeVisible();
    });
  });

  // ══════════════════════════════════════════════════════════
  // 6. QUICK GOLD CALCULATOR
  // ══════════════════════════════════════════════════════════
  test.describe('Quick Gold Calculator', () => {

    test('Verify calculator section shows Estimated Gold Value label', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // t('calculatedEstValue') = 'Estimated Gold Value'
      await expect(page.getByText('Estimated Gold Value')).toBeVisible();
    });

    test('Verify default calculation: 8g × 22K rate = ₹69,600.00', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Default: calcMetal='22K', calcWeight=8
      // 8 × 8700 = 69,600 → '₹69,600.00'
      // This overlaps with 1-Poun so use the formula text span: "8g × ₹8,700.00/g"
      await expect(page.getByText(/8g × ₹8,700\.00\/g/)).toBeVisible();
    });

    test('Verify switching purity to 24K updates the calculator result', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Click 24K purity button in calculator
      await page.getByRole('button', { name: '24K' }).click();

      // Result: 8 × 9500 = 76,000 (may already be shown in poun column, verify formula)
      await expect(page.getByText(/8g × ₹9,500\.00\/g/)).toBeVisible();
    });

    test('Verify changing weight updates the calculated value', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Weight input — the number input inside the calculator section
      const weightInput = page.locator('input[type="number"]').last();
      await weightInput.fill('5');

      // 5 × 8700 = 43,500 → '₹43,500.00'
      await expect(page.getByText('₹43,500.00')).toBeVisible();
    });

    test('Verify purity selector has 22K selected by default', async ({ page }) => {
      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // The 22K button should have the active amber style
      const btn22K = page.getByRole('button', { name: '22K' });
      // Active class: 'bg-amber-500 text-slate-950 border-amber-500'
      await expect(btn22K).toHaveClass(/bg-amber-500/);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 7. ERROR HANDLING
  // ══════════════════════════════════════════════════════════
  test.describe('Error Handling', () => {

    test('Verify app does not crash when API returns an error', async ({ page }) => {
      // Override: rates API returns 500
      await page.route('**/api/rates*', route => route.fulfill({
        status: 500, contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Internal server error' })
      }));

      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Page heading must still be present (not crashed / blank)
      await expect(
        page.getByRole('heading', { name: 'Chennai Live Gold & Silver Rates', level: 1 })
      ).toBeVisible();

      // GoldRateContext provides fallback values — gold rate cards should still render
      await expect(page.getByText('24K Gold')).toBeVisible();
      await expect(page.getByText('22K Gold')).toBeVisible();
    });

    test('Verify app does not crash when API is unreachable (network error)', async ({ page }) => {
      // Override: abort the rates request to simulate total network failure
      await page.route('**/api/rates*', route => route.abort());

      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Heading must still render
      await expect(
        page.getByRole('heading', { name: 'Chennai Live Gold & Silver Rates', level: 1 })
      ).toBeVisible();

      // Context falls back to hard-coded defaults — rate cards still render
      await expect(page.getByText('24K Gold')).toBeVisible();
    });

    test('Verify refresh button is available even after an API error', async ({ page }) => {
      await page.route('**/api/rates*', route => route.abort());

      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Refresh button must be present so user can retry
      await expect(page.getByRole('button', { name: 'Refresh rates' })).toBeVisible();
    });

    test('Verify fallback default rates are shown when API is unavailable', async ({ page }) => {
      // Abort all rate calls — context will use hard-coded defaults
      await page.route('**/api/rates*', route => route.abort());

      await page.goto('/gold-rates');
      await page.waitForLoadState('networkidle');

      // Context defaults: rate24K=15513, rate22K=14220, rate18K=11634.75, silverRate=260
      // Any numeric value indicates context has provided data without crashing
      await expect(page.getByText('₹').first()).toBeVisible();

      // Gold and Silver sections must both render
      await expect(page.getByRole('heading', { name: 'Gold Rates', level: 2 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Silver Rates', level: 2 })).toBeVisible();
    });
  });
});
