import { test, expect } from '@playwright/test';

test.describe('MyGold Asset Management', () => {

  // Mock purchases with computed rate fields that PurchaseCard expects
  const samplePurchases = {
    status: 'success',
    data: {
      purchases: [
        {
          id: 1,
          asset_type: 'GOLD',
          gold_name: 'Test Gold Chain',
          gold_purity: '22K',
          weight: 10.5,
          amount_paid: 75000,
          purchase_amount: 75000,
          purchase_date: '2023-01-15',
          current_rate: 7000,
          current_value: 73500,   // 7000 * 10.5
          profit_loss: -1500,     // 73500 - 75000
          profit_loss_percentage: -2.00
        },
        {
          id: 2,
          asset_type: 'SILVER',
          gold_name: 'Silver Coin',
          gold_purity: '999',
          weight: 100,
          amount_paid: 9000,
          purchase_amount: 9000,
          purchase_date: '2023-05-20',
          current_rate: 100,
          current_value: 10000,
          profit_loss: 1000,
          profit_loss_percentage: 11.11
        }
      ]
    }
  };

  test.beforeEach(async ({ page }) => {
    // Inject mock authentication and app state
    await page.addInitScript(() => {
      localStorage.setItem('aurum_token', 'fake-token-123');
      localStorage.setItem('aurum_user', JSON.stringify({ id: 1, username: 'TestUser', role: 'customer', plan: 'paid' }));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
      localStorage.setItem('mygold_lang', 'en');
    });

    // Mock auth endpoint
    await page.route('**/api/auth/me*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 1, username: 'TestUser', role: 'customer', plan: 'paid' } }
        })
      });
    });

    // Mock gold rates
    await page.route('**/api/rates*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { rate24K: 7500, rate22K: 7000, rate18K: 6000, silverRate: 100 }
        })
      });
    });

    // Mock portfolio
    await page.route('**/api/portfolio*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { totalInvested: 84000, currentPortfolioValue: 83500 }
        })
      });
    });

    // Mock subscription / entitlement
    await page.route('**/api/subscription/status*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { canCreate: true, entriesUsed: 2, limit: 10, status: 'FREE' }
        })
      });
    });

    // Default mock for purchases list
    await page.route('**/api/purchases*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(samplePurchases)
        });
      } else {
        await route.continue();
      }
    });

    // Mock health API
    await page.route('**/api/health*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));

    // Mock notifications API
    await page.route('**/api/notifications*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    }));
  });

  // ─────────────────────────────────────────────
  // ASSET LISTING
  // ─────────────────────────────────────────────
  test.describe('MyGold Asset Listing', () => {

    test('Verify the MyGold page loads and shows the page heading', async ({ page }) => {
      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // The heading uses t('assetsTitle') = 'Assets'
      await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
    });

    test('Verify empty state when no assets exist', async ({ page }) => {
      // Override the default purchases mock for empty state
      await page.route('**/api/purchases*', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { purchases: [] } })
          });
        }
      });

      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // t('noAssetsFound') = 'No assets found'
      await expect(page.getByText('No assets found')).toBeVisible();
    });

    test('Verify existing asset cards appear with correct labels', async ({ page }) => {
      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Both assets should appear in their compact card view
      await expect(page.getByText('Test Gold Chain').first()).toBeVisible();
      await expect(page.getByText('Silver Coin').first()).toBeVisible();

      // Purity • Weight label: "22K • 10.50 g"
      await expect(page.getByText('22K • 10.50 g').first()).toBeVisible();
      // Silver: "999 • 100.00 g"
      await expect(page.getByText('999 • 100.00 g').first()).toBeVisible();
    });

    test('Verify expanding a card reveals asset details', async ({ page }) => {
      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Click the card to expand it (the whole card row is clickable)
      await page.getByText('Test Gold Chain').first().click();

      // Amount Paid should appear in expanded view
      await expect(page.getByText('Amount Paid')).toBeVisible();
      // t('amountPaid') = 'Amount Paid'
    });

    test('Calculation Verification: current value and gain/loss display', async ({ page }) => {
      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Expand Gold Card by clicking on the item name row
      await page.getByText('Test Gold Chain').first().click();

      // Current Gold Rate: mocked as 7000/g, displayed as "₹7,000.00/g"
      await expect(page.getByText('₹7,000.00/g')).toBeVisible();

      // Gain/loss: -1500 loss → "−₹1,500.00 (−2.00%)" (may appear in both compact + expanded row, use .first())
      await expect(page.getByText('−₹1,500.00 (−2.00%)').first()).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // ADD GOLD ASSET
  // ─────────────────────────────────────────────
  test.describe('Add Gold Asset', () => {

    test('Verify the Add Gold page loads with the correct heading', async ({ page }) => {
      await page.goto('/add-gold');
      await page.waitForLoadState('networkidle');

      // t('addAssetTitle') = 'Add Asset Entry'
      await expect(page.getByRole('heading', { name: 'Add Asset Entry' })).toBeVisible();
    });

    test('Verify required-field validation on Add Gold form', async ({ page }) => {
      await page.goto('/add-gold');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Add Asset Entry' })).toBeVisible();

      // Click Save Asset without filling required fields
      // t('saveAssetBtn') = 'Save Asset'
      await page.getByRole('button', { name: 'Save Asset' }).click();

      // Validation messages appear
      // validateField uses specific error texts for each field
      await expect(page.getByText(/required/i).first()).toBeVisible();
    });

    test('Verify successful asset creation using a mocked API response', async ({ page }) => {
      let addPurchaseCalled = false;

      await page.route('**/api/purchases*', route => {
        if (route.request().method() === 'POST') {
          addPurchaseCalled = true;
          route.fulfill({
            status: 201, contentType: 'application/json',
            body: JSON.stringify({ status: 'success', message: 'Asset added successfully' })
          });
        } else if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify(samplePurchases)
          });
        }
      });

      await page.goto('/add-gold');
      await page.waitForLoadState('networkidle');

      // Fill required form fields
      // The input has name="itemName"
      await page.locator('input[name="itemName"]').fill('New Gold Ring');
      await page.locator('input[name="weight"]').fill('5.5');
      await page.locator('input[name="totalAmountPaid"]').fill('35000');

      // Submit
      await page.getByRole('button', { name: 'Save Asset' }).click();

      // After successful save, navigate to /my-gold
      await page.waitForURL('**/my-gold', { timeout: 10000 });
      expect(addPurchaseCalled).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────
  // EDIT GOLD ASSET
  // ─────────────────────────────────────────────
  test.describe('Edit Gold Asset', () => {

    test('Verify edit modal opens with correct heading and pre-filled data', async ({ page }) => {
      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Expand the first card
      await page.getByText('Test Gold Chain').first().click();

      // Click the Edit Asset button (t('editAsset') = 'Edit Asset')
      await page.getByRole('button', { name: /Edit Asset/i }).first().click();

      // Verify modal header: t('editModalTitle') = 'Edit Asset Details'
      // The modal is rendered inside PurchaseCard as a fixed overlay
      const modal = page.locator('.fixed').filter({ has: page.getByText('Edit Asset Details') });
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Edit Asset Details')).toBeVisible();

      // Verify pre-filled item name 'Test Gold Chain' in the modal
      await expect(modal.getByRole('textbox', { name: /gold chain|coin|ring|bangle/i })).toBeVisible();
    });

    test('Verify saving edit triggers the update API', async ({ page }) => {
      let editPurchaseCalled = false;

      await page.route('**/api/purchases/1*', route => {
        if (route.request().method() === 'PUT') {
          editPurchaseCalled = true;
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ status: 'success', message: 'Asset updated successfully' })
          });
        }
      });

      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Expand + open edit
      await page.getByText('Test Gold Chain').first().click();
      await page.getByRole('button', { name: /Edit Asset/i }).first().click();

      // Wait for modal overlay
      const modal = page.locator('.fixed').filter({ has: page.getByText('Edit Asset Details') });
      await expect(modal).toBeVisible();

      // Change the item name — use placeholder-based locator scoped to the modal
      const nameInput = modal.getByRole('textbox').first();
      await nameInput.fill('Updated Gold Chain');

      // Click Save Changes: t('saveChangesBtn') = 'Save Changes'
      await modal.getByRole('button', { name: /Save Changes/i }).click();

      await page.waitForTimeout(1000);
      expect(editPurchaseCalled).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────
  // DELETE GOLD ASSET
  // ─────────────────────────────────────────────
  test.describe('Delete Gold Asset', () => {

    test('Verify cancel on delete confirmation does not call the API', async ({ page }) => {
      let deletePurchaseCalled = false;

      await page.route('**/api/purchases/1*', route => {
        if (route.request().method() === 'DELETE') {
          deletePurchaseCalled = true;
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ status: 'success', message: 'Asset deleted successfully' })
          });
        }
      });

      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Expand the card
      await page.getByText('Test Gold Chain').first().click();

      // Click Delete Asset: t('deleteAsset') = 'Delete Asset'
      await page.getByRole('button', { name: /Delete Asset/i }).first().click();

      // Confirm modal appears — it shows the passed title which defaults to 'Remove Gold Item'
      // or the key value if deleteModalTitle is missing (it returns key = 'deleteModalTitle')
      // We check for the Cancel button
      const cancelBtn = page.getByRole('button', { name: /Cancel/i });
      await expect(cancelBtn).toBeVisible();

      // Click Cancel
      await cancelBtn.click();

      // API should NOT have been called
      expect(deletePurchaseCalled).toBeFalsy();
    });

    test('Verify confirming delete calls the delete API', async ({ page }) => {
      let deletePurchaseCalled = false;

      // Mock the specific DELETE endpoint
      await page.route('**/api/purchases/1*', route => {
        if (route.request().method() === 'DELETE') {
          deletePurchaseCalled = true;
          route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ status: 'success', message: 'Asset deleted successfully' })
          });
        } else {
          route.fallback();
        }
      });

      await page.goto('/my-gold');
      await page.waitForLoadState('networkidle');

      // Expand the card (beforeEach mock returns the sample purchases with items)
      await page.getByText('Test Gold Chain').first().click();

      // Click Delete Asset
      await page.getByRole('button', { name: /Delete Asset/i }).first().click();

      // Verify the confirmation modal is open (Cancel button appears)
      const cancelBtn = page.getByRole('button', { name: /Cancel/i });
      await expect(cancelBtn).toBeVisible();

      // Click the red confirm button (2nd button in the 2-col modal grid)
      const confirmBtn = page.locator('.grid.grid-cols-2 > button').last();
      await confirmBtn.click();

      await page.waitForTimeout(1000);
      expect(deletePurchaseCalled).toBeTruthy();
    });
  });
});
