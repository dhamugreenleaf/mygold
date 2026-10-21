import { test, expect } from '@playwright/test';

test.describe('Upgrade & Subscription Module', () => {

  const defaultUser = {
    id: 1,
    username: 'RajeshKumar',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '9876543210',
    role: 'customer',
    plan: 'free',
    free_entries_used: 4,
    notifications_enabled: true
  };

  test.beforeEach(async ({ page }) => {
    // Inject authenticated session
    await page.addInitScript((u) => {
      localStorage.setItem('aurum_token', 'mock-token-upgrade-123');
      localStorage.setItem('aurum_user', JSON.stringify(u));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
      localStorage.setItem('mygold_lang', 'en');
    }, defaultUser);

    // Mock Razorpay Checkout Script
    await page.route('https://checkout.razorpay.com/v1/checkout.js', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.Razorpay = class MockRazorpay {
            constructor(options) {
              this.options = options;
              window.__lastRazorpayInstance = this;
              window.__razorpayOptions = options;
              this.eventListeners = {};
            }
            on(event, callback) {
              this.eventListeners[event] = callback;
            }
            open() {
              window.__razorpayOpened = true;
              window.dispatchEvent(new CustomEvent('razorpay:opened', { detail: this.options }));
            }
          };
        `
      });
    });

    // Mock Auth Me
    await page.route('**/api/auth/me*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { user: defaultUser }
      })
    }));

    // Mock Live Gold Rates
    await page.route('**/api/gold-rates*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          rate22k: 7000,
          rate24k: 7636,
          silverRate: 98,
          timestamp: new Date().toISOString()
        }
      })
    }));

    // Mock Subscription Pricing
    await page.route('**/api/subscription/pricing*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { price: 199 }
      })
    }));

    // Mock Entitlement Status
    await page.route('**/api/subscription/status*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          plan: 'free',
          entriesUsed: 4,
          maxEntries: 10,
          status: 'FREE'
        }
      })
    }));

    // Mock Create Monthly Subscription
    await page.route('**/api/subscription/create-monthly*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            subscriptionId: 'sub_mock_12345678',
            keyId: 'rzp_test_mockkey123',
            description: 'Monthly Premium Vault Subscription'
          }
        })
      });
    });

    // Mock Verify Monthly Subscription
    await page.route('**/api/subscription/verify-monthly*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Monthly Premium AutoPay active! Unlimited entries unlocked.'
        })
      });
    });

    // Default notifications & portfolio mocks to prevent unhandled console noise
    await page.route('**/api/notifications*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { notifications: [], unread_count: 0 } })
    }));

    await page.route('**/api/portfolio*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { totalGoldWeight: 10, totalCurrentValue: 70000 } })
    }));

    await page.route('**/api/purchases*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { purchases: [] } })
    }));
  });

  // ─────────────────────────────────────────────
  // 1. UPGRADE PAGE LOAD & VISUAL ELEMENTS
  // ─────────────────────────────────────────────
  test.describe('Upgrade Page Load & Visual Elements', () => {

    test('Verify Upgrade page loads successfully at /upgrade', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page).toHaveURL(/.*\/upgrade/);
      await expect(page.locator('h1')).toBeVisible();
    });

    test('Verify heading "Monthly AutoPay Subscription" and subtitle are displayed', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page.locator('h1:has-text("Monthly AutoPay Subscription")')).toBeVisible();
      await expect(page.locator('text=The first 10 combined Gold & Silver asset entries are free.')).toBeVisible();
    });

    test('Verify Premium Plan badge and "MONTHLY AUTOPAY" tag are rendered', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page.locator('span:has-text("Premium Unlimited Vault")').first()).toBeVisible();
      await expect(page.getByText('MONTHLY AUTOPAY', { exact: true })).toBeVisible();
    });

    test('Verify plan price from /api/subscription/pricing (e.g. ₹299) is displayed correctly', async ({ page }) => {
      await page.route('**/api/subscription/pricing*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { price: 299 }
        })
      }));

      await page.goto('/upgrade');
      await expect(page.getByText('₹299', { exact: true })).toBeVisible();
      await expect(page.locator('text=/ month')).toBeVisible();
    });

    test('Verify fallback plan price (₹199) is displayed when pricing API fails', async ({ page }) => {
      await page.route('**/api/subscription/pricing*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Pricing service unavailable' })
      }));

      await page.goto('/upgrade');
      // Fallback price state is 199
      await expect(page.getByText('₹199', { exact: true })).toBeVisible();
    });

    test('Verify all 5 premium feature bullet points are rendered', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page.locator('text=Continue beyond 10 free Gold & Silver entries')).toBeVisible();
      await expect(page.locator('text=Real-time live bullion portfolio valuation')).toBeVisible();
      await expect(page.locator('text=Encrypted cloud invoice & jewelry photo storage')).toBeVisible();
      await expect(page.locator('text=Automated monthly AutoPay with cancel anytime option')).toBeVisible();
      await expect(page.locator('text=Multi-city rate differential & profit/loss calculator')).toBeVisible();
    });

    test('Verify free entries usage tracker displays count from /api/subscription/status', async ({ page }) => {
      await page.route('**/api/subscription/status*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { entriesUsed: 7, maxEntries: 10, plan: 'free' }
        })
      }));

      await page.goto('/upgrade');
      await expect(page.locator('text=Free Entries Status:')).toBeVisible();
      await expect(page.locator('text=7 / 10 Entries Used')).toBeVisible();
    });

    test('Verify free entries usage tracker falls back to user object when status API fails', async ({ page }) => {
      await page.route('**/api/subscription/status*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Status failed' })
      }));

      await page.goto('/upgrade');
      // defaultUser has free_entries_used: 4
      await expect(page.locator('text=4 / 10 Entries Used')).toBeVisible();
    });

    test('Verify "Secure recurring subscription via Razorpay AutoPay" badge is visible', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page.locator('text=Secure recurring subscription via Razorpay AutoPay')).toBeVisible();
    });

    test('Verify language toggle updates Upgrade page content between English and Tamil', async ({ page }) => {
      await page.goto('/upgrade');
      await expect(page.locator('h1:has-text("Monthly AutoPay Subscription")')).toBeVisible();

      // Click Language Toggle in Navbar
      await page.click('button[aria-label="Toggle language"]');

      // Tamil text assertions
      await expect(page.locator('h1:has-text("மாதாந்திர பிரீமியம் சந்தா")')).toBeVisible();
      await expect(page.locator('text=இலவச பதிவுகள் நிலை:')).toBeVisible();
      await expect(page.locator('text=மாதாந்திர சந்தா')).toBeVisible();
      await expect(page.locator('text=Razorpay மூலம் பாதுகாப்பான பரிவர்த்தனை')).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 2. NAVIGATION & ENTRY POINTS
  // ─────────────────────────────────────────────
  test.describe('Navigation & Entry Points', () => {

    test('Verify clicking "Return to Dashboard" navigates back to /my-gold', async ({ page }) => {
      await page.goto('/upgrade');
      const returnBtn = page.locator('button:has-text("Return to Dashboard")');
      await expect(returnBtn).toBeVisible();
      await returnBtn.click();
      await expect(page).toHaveURL(/.*\/my-gold/);
    });

    test('Verify navigation to /upgrade from Profile page "Upgrade to Premium Monthly" button', async ({ page }) => {
      await page.goto('/profile');
      const upgradeBtn = page.locator('button:has-text("Upgrade to Premium Monthly")');
      await expect(upgradeBtn).toBeVisible();
      await upgradeBtn.click();
      await expect(page).toHaveURL(/.*\/upgrade/);
      await expect(page.locator('h1:has-text("Monthly AutoPay Subscription")')).toBeVisible();
    });

    test('Verify navigation to /upgrade from AddGold page when free limit modal is displayed', async ({ page }) => {
      // Mock entitlement with 10 entries used to trigger freeLimitReached modal
      await page.route('**/api/subscription/status*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { entriesUsed: 10, maxEntries: 10, plan: 'free' }
        })
      }));

      await page.goto('/add-gold');
      // Free limit modal should pop up
      await expect(page.locator('button:has-text("Upgrade to Premium Monthly")')).toBeVisible();
      await page.click('button:has-text("Upgrade to Premium Monthly")');
      await expect(page).toHaveURL(/.*\/upgrade/);
    });
  });

  // ─────────────────────────────────────────────
  // 3. RAZORPAY INITIALIZATION & READINESS
  // ─────────────────────────────────────────────
  test.describe('Razorpay Initialization & Readiness', () => {

    test('Verify Razorpay checkout script is loaded', async ({ page }) => {
      let scriptLoaded = false;
      await page.route('https://checkout.razorpay.com/v1/checkout.js', route => {
        scriptLoaded = true;
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.Razorpay = function() {};'
        });
      });

      await page.goto('/upgrade');
      await expect.poll(() => scriptLoaded).toBe(true);
    });

    test('Verify "Start Monthly Premium" button is disabled when Razorpay script fails to load', async ({ page }) => {
      // Block Razorpay script
      await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.abort());

      await page.goto('/upgrade');
      const subscribeBtn = page.locator('button:has-text("Start Monthly Premium")');
      await expect(subscribeBtn).toBeVisible();
      await expect(subscribeBtn).toBeDisabled();
    });

    test('Verify "Start Monthly Premium" button is enabled once Razorpay script loads', async ({ page }) => {
      await page.goto('/upgrade');
      const subscribeBtn = page.locator('button:has-text("Start Monthly Premium")');
      await expect(subscribeBtn).toBeVisible();
      await expect(subscribeBtn).toBeEnabled();
    });
  });

  // ─────────────────────────────────────────────
  // 4. SUBSCRIPTION CREATION FLOW
  // ─────────────────────────────────────────────
  test.describe('Subscription Creation Flow', () => {

    test('Verify clicking "Start Monthly Premium" calls createMonthlySubscription API', async ({ page }) => {
      let createApiCalled = false;
      await page.route('**/api/subscription/create-monthly*', async route => {
        createApiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              subscriptionId: 'sub_test_flow_01',
              keyId: 'rzp_test_flow_key',
              description: 'Monthly Premium Vault Subscription'
            }
          })
        });
      });

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect.poll(() => createApiCalled).toBe(true);
    });

    test('Verify Razorpay instance is created with correct options (keyId, subscriptionId, prefill)', async ({ page }) => {
      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      // Wait for Razorpay instance options to be captured on window
      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOptions);
      }).toBe(true);

      const options = await page.evaluate(() => window.__razorpayOptions);
      expect(options.key).toBe('rzp_test_mockkey123');
      expect(options.subscription_id).toBe('sub_mock_12345678');
      expect(options.name).toBe('My Gold');
      expect(options.prefill.name).toBe('RajeshKumar');
      expect(options.prefill.email).toBe('rajesh@example.com');
      expect(options.prefill.contact).toBe('+919876543210');
    });

    test('Verify Razorpay.open() is invoked upon subscription setup', async ({ page }) => {
      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOpened);
      }).toBe(true);
    });

    test('Verify alreadyActive response shows success toast and navigates to /my-gold', async ({ page }) => {
      await page.route('**/api/subscription/create-monthly*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            alreadyActive: true
          }
        })
      }));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      // Should show success toast
      await expect(page.locator('text=You already have an active Premium Subscription!')).toBeVisible();
      // Should redirect to /my-gold
      await expect(page).toHaveURL(/.*\/my-gold/);
    });
  });

  // ─────────────────────────────────────────────
  // 5. PAYMENT CALLBACKS & VERIFICATION
  // ─────────────────────────────────────────────
  test.describe('Payment Callbacks & Verification', () => {

    test('Verify successful Razorpay callback triggers verifyMonthlySubscription API', async ({ page }) => {
      let verifyApiCalled = false;
      let verifyPayload = null;

      await page.route('**/api/subscription/verify-monthly*', async route => {
        verifyApiCalled = true;
        verifyPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Monthly Premium AutoPay active! Unlimited entries unlocked.'
          })
        });
      });

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      // Wait until Razorpay is opened
      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOpened);
      }).toBe(true);

      // Simulate successful Razorpay payment callback
      await page.evaluate(() => {
        window.__lastRazorpayInstance.options.handler({
          razorpay_subscription_id: 'sub_mock_12345678',
          razorpay_payment_id: 'pay_mock_abc123',
          razorpay_signature: 'sig_mock_xyz789'
        });
      });

      await expect.poll(() => verifyApiCalled).toBe(true);
      expect(verifyPayload.razorpay_subscription_id).toBe('sub_mock_12345678');
      expect(verifyPayload.razorpay_payment_id).toBe('pay_mock_abc123');
      expect(verifyPayload.razorpay_signature).toBe('sig_mock_xyz789');

      // Should show success toast and navigate to /my-gold
      await expect(page.locator('text=Monthly Premium AutoPay active! Unlimited entries unlocked.')).toBeVisible();
      await expect(page).toHaveURL(/.*\/my-gold/);
    });

    test('Verify user dismissal of Razorpay modal triggers dismissal toast without redirect', async ({ page }) => {
      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOpened);
      }).toBe(true);

      // Trigger modal dismissal
      await page.evaluate(() => {
        window.__lastRazorpayInstance.options.modal.ondismiss();
      });

      await expect(page.locator('text=Subscription setup dismissed.')).toBeVisible();
      // Should remain on /upgrade page
      await expect(page).toHaveURL(/.*\/upgrade/);
    });

    test('Verify Razorpay payment.failed event displays failure toast with error description', async ({ page }) => {
      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOpened);
      }).toBe(true);

      // Fire payment.failed event
      await page.evaluate(() => {
        const failureCallback = window.__lastRazorpayInstance.eventListeners['payment.failed'];
        if (failureCallback) {
          failureCallback({
            error: {
              description: 'Card was declined by issuing bank'
            }
          });
        }
      });

      await expect(page.locator('text=AutoPay Authorization Failed: Card was declined by issuing bank')).toBeVisible();
      // Should remain on /upgrade page
      await expect(page).toHaveURL(/.*\/upgrade/);
    });
  });

  // ─────────────────────────────────────────────
  // 6. ERROR HANDLING & RESILIENCE
  // ─────────────────────────────────────────────
  test.describe('Error Handling & Resilience', () => {

    test('Verify error toast when createMonthlySubscription returns 500 server error', async ({ page }) => {
      await page.route('**/api/subscription/create-monthly*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Razorpay Subscription Error' })
      }));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect(page.locator('text=Internal Razorpay Subscription Error')).toBeVisible();
      // Button should be re-enabled after failure
      const subscribeBtn = page.locator('button:has-text("Start Monthly Premium")');
      await expect(subscribeBtn).toBeEnabled();
    });

    test('Verify error toast when createMonthlySubscription returns 400 bad request', async ({ page }) => {
      await page.route('**/api/subscription/create-monthly*', route => route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Customer phone number is invalid' })
      }));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect(page.locator('text=Customer phone number is invalid')).toBeVisible();
    });

    test('Verify error toast when verifyMonthlySubscription returns 500 error', async ({ page }) => {
      await page.route('**/api/subscription/verify-monthly*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Subscription signature verification failed on server' })
      }));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      await expect.poll(async () => {
        return await page.evaluate(() => !!window.__razorpayOpened);
      }).toBe(true);

      // Trigger payment handler callback
      await page.evaluate(() => {
        window.__lastRazorpayInstance.options.handler({
          razorpay_subscription_id: 'sub_test',
          razorpay_payment_id: 'pay_test',
          razorpay_signature: 'invalid_sig'
        });
      });

      await expect(page.locator('text=Subscription signature verification failed on server')).toBeVisible();
      // Must not navigate to /my-gold
      await expect(page).toHaveURL(/.*\/upgrade/);
    });

    test('Verify network failure on createMonthlySubscription is handled gracefully', async ({ page }) => {
      await page.route('**/api/subscription/create-monthly*', route => route.abort('failed'));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      // Toast error displayed
      await expect(page.locator('text=Failed to initialize subscription')).toBeVisible();
      // Button re-enabled
      await expect(page.locator('button:has-text("Start Monthly Premium")')).toBeEnabled();
    });

    test('Verify malformed response on createMonthlySubscription does not crash the app', async ({ page }) => {
      await page.route('**/api/subscription/create-monthly*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null })
      }));

      await page.goto('/upgrade');
      await page.click('button:has-text("Start Monthly Premium")');

      // Does not crash page, header remains visible
      await expect(page.locator('h1')).toBeVisible();
    });
  });

});
