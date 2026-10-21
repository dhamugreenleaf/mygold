import { test, expect } from '@playwright/test';

test.describe('Profile Module', () => {

  const defaultUser = {
    id: 1,
    username: 'RajeshKumar',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '9876543210',
    role: 'customer',
    plan: 'free',
    subscription_status: null,
    created_at: '2023-06-15T10:30:00.000Z'
  };

  const defaultEntitlement = {
    canCreate: true,
    entriesUsed: 2,
    limit: 10,
    status: 'FREE'
  };

  test.beforeEach(async ({ page }) => {
    // Inject mock authentication and initial settings
    await page.addInitScript(() => {
      localStorage.setItem('aurum_token', 'mock-token-profile-123');
      localStorage.setItem('aurum_user', JSON.stringify({
        id: 1,
        username: 'RajeshKumar',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '9876543210',
        role: 'customer',
        plan: 'free',
        subscription_status: null,
        created_at: '2023-06-15T10:30:00.000Z'
      }));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
      localStorage.setItem('mygold_lang', 'en');
    });

    // Mock auth me endpoint
    await page.route('**/api/auth/me*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: defaultUser }
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
          data: { rate24K: 7500, rate22K: 7000, silverRate: 100 }
        })
      });
    });

    // Mock subscription status
    await page.route('**/api/subscription/status*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: defaultEntitlement
        })
      });
    });

    // Mock purchases / assets count
    await page.route('**/api/purchases*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { purchases: [{ id: 1 }, { id: 2 }] }
        })
      });
    });

    // Mock health
    await page.route('**/api/health*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));

    // Mock notifications
    await page.route('**/api/notifications/status*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { notifications_enabled: true } })
    }));

    await page.route('**/api/notifications*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    }));

    // Mock logout
    await page.route('**/api/auth/logout*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Logged out successfully' })
    }));
  });

  // ─────────────────────────────────────────────
  // 1. PROFILE DISPLAY & INFORMATION
  // ─────────────────────────────────────────────
  test.describe('Profile Display & Information', () => {

    test('Verify Profile page loads with user heading and avatar initial', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('h1')).toContainText('RajeshKumar');

      // Check user avatar initial
      const avatar = page.locator('div.rounded-full:has-text("R")').first();
      await expect(avatar).toBeVisible();

      // Check account verified badge
      await expect(page.locator('text=Account Verified')).toBeVisible();
    });

    test('Verify account details card displays Username, Email, Phone, and Member Since', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('h2:has-text("Account Information")')).toBeVisible();

      // Check field values
      await expect(page.locator('span:text-is("Username") + span')).toHaveText('RajeshKumar');
      await expect(page.locator('span:text-is("Email") + span')).toHaveText('rajesh@example.com');
      await expect(page.locator('span:text-is("Mobile Number") + span')).toHaveText('+91 9876543210');
      await expect(page.locator('span:text-is("Member Since") + span')).toContainText('2023');
    });

    test('Verify missing phone shows "Not Linked" fallback', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aurum_user', JSON.stringify({
          id: 2,
          username: 'NoPhoneUser',
          email: 'nophone@example.com',
          phone: '',
          role: 'customer'
        }));
      });

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 2, username: 'NoPhoneUser', email: 'nophone@example.com', phone: '', role: 'customer' } }
        })
      }));

      await page.goto('/profile');
      await expect(page.locator('span:text-is("Mobile Number") + span')).toHaveText('Not Linked');
    });

    test('Verify missing email shows "N/A" fallback', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aurum_user', JSON.stringify({
          id: 3,
          username: 'NoEmailUser',
          email: '',
          phone: '9876500000',
          role: 'customer'
        }));
      });

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 3, username: 'NoEmailUser', email: '', phone: '9876500000', role: 'customer' } }
        })
      }));

      await page.goto('/profile');
      await expect(page.locator('span:text-is("Email") + span')).toHaveText('N/A');
    });

    test('Verify missing username shows "Vault Member" fallback', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aurum_user', JSON.stringify({
          id: 4,
          username: '',
          name: '',
          email: 'anon@example.com',
          role: 'customer'
        }));
      });

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 4, username: '', name: '', email: 'anon@example.com', role: 'customer' } }
        })
      }));

      await page.goto('/profile');
      await expect(page.locator('h1')).toHaveText('Vault Member');
    });
  });

  // ─────────────────────────────────────────────
  // 2. SUBSCRIPTION & PLAN SECTION
  // ─────────────────────────────────────────────
  test.describe('Subscription & Plan Display', () => {

    test('Verify Free Tier user displays Free Plan badge, entries used count, and Upgrade button', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('text=Free Tier')).toBeVisible();
      await expect(page.locator('text=Free Plan')).toBeVisible();
      await expect(page.locator('text=/ 10 Used')).toBeVisible();
      await expect(page.locator('button:has-text("Upgrade to Premium Monthly")')).toBeVisible();
    });

    test('Verify Upgrade button navigates to /upgrade', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Upgrade to Premium Monthly")')).toBeVisible();
      await page.click('button:has-text("Upgrade to Premium Monthly")');
      await expect(page).toHaveURL(/.*\/upgrade/);
    });

    test('Verify Paid/Premium user displays Active Premium badge, unlimited entries, and AutoPay status', async ({ page }) => {
      const paidUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'active',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, paidUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: paidUser } })
      }));

      await page.route('**/api/subscription/status*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'PAID', currentPeriodEnd: '2026-11-01T00:00:00.000Z' }
        })
      }));

      await page.goto('/profile');
      await expect(page.locator('text=Active Premium')).toBeVisible();
      await expect(page.locator('text=Premium Monthly Vault')).toBeVisible();
      await expect(page.locator('text=∞')).toBeVisible();
      await expect(page.locator('text=AutoPay:')).toBeVisible();
      await expect(page.locator('span:text-is("ON")')).toBeVisible();
      await expect(page.locator('button:has-text("Manage Subscription & AutoPay")')).toBeVisible();
    });

    test('Verify Manage Subscription modal opens with details and action buttons', async ({ page }) => {
      const paidUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'active',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, paidUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: paidUser } })
      }));

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Manage Subscription & AutoPay")')).toBeVisible();
      await page.click('button:has-text("Manage Subscription & AutoPay")');

      // Verify modal is open
      await expect(page.locator('h3:has-text("Manage Subscription")')).toBeVisible();
      await expect(page.locator('button:has-text("Pause AutoPay")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel Subscription")')).toBeVisible();
    });

    test('Verify Pause AutoPay confirmation modal and confirm pause API call', async ({ page }) => {
      let pauseCalled = false;
      await page.route('**/api/subscription/pause*', route => {
        pauseCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'AutoPay paused successfully' })
        });
      });

      const paidUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'active',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, paidUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: paidUser } })
      }));

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Manage Subscription & AutoPay")')).toBeVisible();
      await page.click('button:has-text("Manage Subscription & AutoPay")');
      await page.click('button:has-text("Pause AutoPay")');

      // Verify Pause Confirmation dialog
      await expect(page.locator('h3:has-text("Pause AutoPay?")')).toBeVisible();
      await expect(page.locator('button:has-text("Keep Active")')).toBeVisible();
      await expect(page.locator('button:has-text("Confirm Pause")')).toBeVisible();

      await page.click('button:has-text("Confirm Pause")');
      await expect.poll(() => pauseCalled).toBe(true);
    });

    test('Verify Cancel Subscription confirmation modal and confirm cancel API call', async ({ page }) => {
      let cancelCalled = false;
      await page.route('**/api/subscription/cancel*', route => {
        cancelCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'AutoPay renewal cancelled' })
        });
      });

      const paidUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'active',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, paidUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: paidUser } })
      }));

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Manage Subscription & AutoPay")')).toBeVisible();
      await page.click('button:has-text("Manage Subscription & AutoPay")');
      await page.click('button:has-text("Cancel Subscription")');

      // Verify Cancel Confirmation dialog
      await expect(page.locator('h3:has-text("Cancel AutoPay?")')).toBeVisible();
      await expect(page.locator('button:has-text("Keep Subscription")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel AutoPay")')).toBeVisible();

      await page.click('button:has-text("Cancel AutoPay")');
      await expect.poll(() => cancelCalled).toBe(true);
    });

    test('Verify Resume AutoPay button is shown when subscription is paused and calls resume API', async ({ page }) => {
      let resumeCalled = false;
      await page.route('**/api/subscription/resume*', route => {
        resumeCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'AutoPay resumed successfully' })
        });
      });

      const pausedUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'paused',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, pausedUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: pausedUser } })
      }));

      await page.goto('/profile');
      await expect(page.locator('text=AutoPay Paused')).toBeVisible();
      await page.click('button:has-text("Manage Subscription & AutoPay")');

      // Check Resume AutoPay button
      const resumeBtn = page.locator('button:has-text("Resume AutoPay")');
      await expect(resumeBtn).toBeVisible();
      await resumeBtn.click();
      await expect.poll(() => resumeCalled).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // 3. PROFILE EDITING
  // ─────────────────────────────────────────────
  test.describe('Profile Editing', () => {

    test('Verify Edit Profile modal opens with pre-filled Username and Email', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      // Check modal heading and inputs
      await expect(page.locator('h3:has-text("Edit Profile")')).toBeVisible();
      await expect(page.locator('input[placeholder="Enter your username"]')).toHaveValue('RajeshKumar');
      await expect(page.locator('input[placeholder="Enter your email"]')).toHaveValue('rajesh@example.com');
      await expect(page.locator('button:has-text("Continue & Verify")')).toBeVisible();
    });

    test('Verify validation error when username is cleared', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      const usernameInput = page.locator('input[placeholder="Enter your username"]');
      await usernameInput.fill('');

      // Input has required attribute
      const isRequired = await usernameInput.getAttribute('required');
      expect(isRequired).not.toBeNull();

      await page.click('button:has-text("Continue & Verify")');

      // Form remains in Step 1 and input is marked invalid
      await expect(usernameInput).toBeVisible();
      const isValid = await usernameInput.evaluate((el) => el.checkValidity());
      expect(isValid).toBe(false);
    });

    test('Verify validation error when no changes are made', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');
      await page.click('button:has-text("Continue & Verify")');
      // Toast message: "No changes to save."
      await expect(page.locator('text=No changes to save.')).toBeVisible();
    });

    test('Verify requesting edit OTP sends request and advances to Step 2', async ({ page }) => {
      let requestPayload = null;
      await page.route('**/api/users/profile/update/request*', async route => {
        requestPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent to registered mobile' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      const usernameInput = page.locator('input[placeholder="Enter your username"]');
      await usernameInput.fill('RajeshUpdated');

      await page.click('button:has-text("Continue & Verify")');

      await expect.poll(() => requestPayload).toEqual({
        username: 'RajeshUpdated',
        email: 'rajesh@example.com'
      });

      // Verify transitioned to Step 2
      await expect(page.locator('text=sent an OTP to your')).toBeVisible();
      await expect(page.locator('button:has-text("Verify & Save")')).toBeVisible();
      await expect(page.locator('button:has-text("Back")')).toBeVisible();
    });

    test('Verify Back button in Step 2 returns to Step 1', async ({ page }) => {
      await page.route('**/api/users/profile/update/request*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      await page.locator('input[placeholder="Enter your username"]').fill('RajeshNew');
      await page.click('button:has-text("Continue & Verify")');

      // Click Back
      await page.click('button:has-text("Back")');

      // Back at Step 1
      await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
      await expect(page.locator('button:has-text("Continue & Verify")')).toBeVisible();
    });

    test('Verify entering 6-digit OTP and verifying triggers profile update API', async ({ page }) => {
      let verifiedOtp = null;
      await page.route('**/api/users/profile/update/request*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent' })
        });
      });

      await page.route('**/api/users/profile/update/verify*', async route => {
        verifiedOtp = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Profile updated successfully' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      await page.locator('input[placeholder="Enter your username"]').fill('RajeshVerified');
      await page.click('button:has-text("Continue & Verify")');

      // Wait for step 2 to load
      await expect(page.locator('button:has-text("Verify & Save")')).toBeVisible();

      // Click first OTP input and type 6 digits
      const firstOtpInput = page.locator('form:has-text("Verify & Save") input').first();
      await firstOtpInput.click();
      await page.keyboard.type('123456');

      await page.click('button:has-text("Verify & Save")');

      await expect.poll(() => verifiedOtp).toEqual({ otp: '123456' });
    });

    test('Verify closing Edit Profile modal dismisses it', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      await expect(page.locator('h3:has-text("Edit Profile")')).toBeVisible();

      // Click close (X)
      const closeBtn = page.locator('div:has(> h3:has-text("Edit Profile")) button').first();
      await closeBtn.click();

      await expect(page.locator('h3:has-text("Edit Profile")')).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 4. CHANGE MOBILE NUMBER
  // ─────────────────────────────────────────────
  test.describe('Change Mobile Number', () => {

    test('Verify Change Mobile modal opens with 10-digit number field', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      await expect(page.locator('h3:has-text("Change Mobile")')).toBeVisible();
      await expect(page.locator('input[placeholder="Enter 10-digit number"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send OTP")')).toBeVisible();
    });

    test('Verify Send OTP button is disabled when phone number has fewer than 10 digits', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      const telInput = page.locator('input[placeholder="Enter 10-digit number"]');
      await telInput.fill('98765');

      const sendOtpBtn = page.locator('button:has-text("Send OTP")');
      await expect(sendOtpBtn).toBeDisabled();
    });

    test('Verify requesting mobile change OTP sends API request and advances to OTP step', async ({ page }) => {
      let requestedMobile = null;
      await page.route('**/api/auth/mobile/change/request-otp*', async route => {
        requestedMobile = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent to new mobile' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      await page.locator('input[placeholder="Enter 10-digit number"]').fill('9876509876');
      await page.click('button:has-text("Send OTP")');

      await expect.poll(() => requestedMobile).toEqual({ newMobile: '9876509876' });

      // Check OTP step
      await expect(page.locator('text=Enter the code sent to')).toBeVisible();
      await expect(page.locator('button:has-text("Verify & Update")')).toBeVisible();
    });

    test('Verify entering OTP calls verifyChangeMobileOtp API', async ({ page }) => {
      let verifyPayload = null;
      await page.route('**/api/auth/mobile/change/request-otp*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent' })
        });
      });

      await page.route('**/api/auth/mobile/change/verify-otp*', async route => {
        verifyPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Mobile number updated successfully' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      await page.locator('input[placeholder="Enter 10-digit number"]').fill('9876509876');
      await page.click('button:has-text("Send OTP")');

      // Wait for step 2 to load
      await expect(page.locator('button:has-text("Verify & Update")')).toBeVisible();

      // Click first OTP input and type 6 digits
      const firstOtpInput = page.locator('form:has-text("Verify & Update") input').first();
      await firstOtpInput.click();
      await page.keyboard.type('123456');

      await page.click('button:has-text("Verify & Update")');

      await expect.poll(() => verifyPayload).toEqual({
        newMobile: '9876509876',
        otp: '123456'
      });
    });

    test('Verify closing Change Mobile modal dismisses it', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      await expect(page.locator('h3:has-text("Change Mobile")')).toBeVisible();

      // Click close (X)
      const closeBtn = page.locator('div:has(> h3:has-text("Change Mobile")) button').first();
      await closeBtn.click();

      await expect(page.locator('h3:has-text("Change Mobile")')).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 5. SECURITY, TERMS & PREFERENCES
  // ─────────────────────────────────────────────
  test.describe('Security, Terms & Language Preferences', () => {

    test('Verify "Your Vault is Private" security notice is rendered', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('h3:has-text("Your Vault is Private")')).toBeVisible();
      await expect(page.locator('text=All your gold entries, purchase receipts')).toBeVisible();
    });

    test('Verify Terms & Conditions card is displayed and opens TermsModal', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('h3:has-text("Terms & Conditions")')).toBeVisible();
      await page.click('button:has-text("View Terms & Conditions")');

      // Modal appears
      await expect(page.locator('h4:has-text("Disclaimer")')).toBeVisible();
      await expect(page.locator('text=MyGold is an informational application')).toBeVisible();

      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('h4:has-text("Disclaimer")')).not.toBeVisible();
    });

    test('Verify Language switcher cards switch between English and தமிழ்', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('button:has-text("🇮🇳 தமிழ்")')).toBeVisible();

      const tamilBtn = page.locator('button:has-text("🇮🇳 தமிழ்")');
      await tamilBtn.click();

      // Verify language changed to Tamil subtitle
      await expect(page.locator('text=மொழியைத் தேர்ந்தெடுக்கவும்')).toBeVisible();

      // Switch back to English
      const englishBtn = page.locator('button:has-text("🇬🇧 English")');
      await englishBtn.click();
      await expect(page.locator('text=Select Language')).toBeVisible();
    });

    test('Verify Push Notifications setting card renders with toggle', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('span:text-is("Push Notifications")')).toBeVisible();
      await expect(page.locator('button[aria-label="Toggle Daily Notifications"]')).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 6. ACCOUNT MENU COMPONENT
  // ─────────────────────────────────────────────
  test.describe('AccountMenu Component (Navbar)', () => {

    test('Verify AccountMenu button displays avatar initial and username', async ({ page }) => {
      await page.goto('/profile');
      const menuBtn = page.locator('header button[aria-haspopup="true"]');
      await expect(menuBtn).toBeVisible();
      await expect(menuBtn).toContainText('RajeshKumar');
      await expect(menuBtn.locator('div.rounded-xl')).toHaveText('R');
    });

    test('Verify clicking AccountMenu opens dropdown menu with user info and links', async ({ page }) => {
      await page.goto('/profile');
      const menuBtn = page.locator('header button[aria-haspopup="true"]');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      // Dropdown should be open
      const dropdown = page.locator('div.shadow-2xl:has-text("FREE TIER")');
      await expect(dropdown).toBeVisible();
      await expect(dropdown.locator('a[href="/profile"]')).toBeVisible();
      await expect(dropdown.locator('a[href="/my-gold"]')).toBeVisible();
      await expect(dropdown.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
    });

    test('Verify clicking My Gold link in AccountMenu dropdown navigates to /my-gold', async ({ page }) => {
      await page.goto('/profile');
      const menuBtn = page.locator('header button[aria-haspopup="true"]');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      const dropdown = page.locator('div.shadow-2xl:has-text("FREE TIER")');
      await dropdown.locator('a[href="/my-gold"]').click();
      await expect(page).toHaveURL(/.*\/my-gold/);
    });

    test('Verify language toggle inside AccountMenu dropdown switches language', async ({ page }) => {
      await page.goto('/profile');
      const menuBtn = page.locator('header button[aria-haspopup="true"]');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      // Dropdown language item
      const langItem = page.locator('div:has-text("FREE TIER") ~ div button:has-text("Language")');
      await expect(langItem).toBeVisible();
      await langItem.click();

      // Page should reflect Tamil
      await expect(page.locator('text=மொழியைத் தேர்ந்தெடுக்கவும்')).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 7. LOGOUT FUNCTIONALITY
  // ─────────────────────────────────────────────
  test.describe('Logout Functionality', () => {

    test('Verify logout via Profile page "Lock Vault & Logout" button', async ({ page }) => {
      let logoutApiCalled = false;
      await page.route('**/api/auth/logout*', route => {
        logoutApiCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Logged out' })
        });
      });

      await page.goto('/profile');
      const logoutBtn = page.locator('button:has-text("Lock Vault & Logout")');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();

      // Verify redirected to login page
      await expect(page).toHaveURL(/.*\/login/);

      // Verify authentication state is cleared from localStorage
      const token = await page.evaluate(() => localStorage.getItem('aurum_token'));
      const user = await page.evaluate(() => localStorage.getItem('aurum_user'));
      expect(token).toBeNull();
      expect(user).toBeNull();
    });

    test('Verify logout via Navbar AccountMenu dropdown', async ({ page }) => {
      await page.route('**/api/auth/logout*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Logged out' })
        });
      });

      await page.goto('/profile');
      const menuBtn = page.locator('header button[aria-haspopup="true"]');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      const dropdownLogoutBtn = page.getByRole('button', { name: 'Logout', exact: true });
      await expect(dropdownLogoutBtn).toBeVisible();
      await dropdownLogoutBtn.click();

      // Verify redirected to login page
      await expect(page).toHaveURL(/.*\/login/);

      const token = await page.evaluate(() => localStorage.getItem('aurum_token'));
      const user = await page.evaluate(() => localStorage.getItem('aurum_user'));
      expect(token).toBeNull();
      expect(user).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // 8. ERROR HANDLING & RESILIENCE
  // ─────────────────────────────────────────────
  test.describe('Error Handling & Resilience', () => {

    test('Verify profile page renders safely when subscription/status API returns 500 error', async ({ page }) => {
      await page.route('**/api/subscription/status*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' })
        });
      });

      await page.goto('/profile');
      // The page should still render the profile and user info
      await expect(page.locator('h1')).toContainText('RajeshKumar');
      await expect(page.locator('h2:has-text("Account Information")')).toBeVisible();
    });

    test('Verify profile page renders safely when purchases API returns 500 error', async ({ page }) => {
      await page.route('**/api/purchases*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to fetch purchases' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('h1')).toContainText('RajeshKumar');
      await expect(page.locator('text=Subscription & Plan')).toBeVisible();
    });

    test('Verify error toast when requesting profile update OTP fails (HTTP 400)', async ({ page }) => {
      await page.route('**/api/users/profile/update/request*', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Username already taken' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      await page.locator('input[placeholder="Enter your username"]').fill('TakenUsername');
      await page.click('button:has-text("Continue & Verify")');

      await expect(page.locator('text=Username already taken')).toBeVisible();
    });

    test('Verify error toast when verifying profile update OTP fails with invalid code', async ({ page }) => {
      await page.route('**/api/users/profile/update/request*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OTP sent' })
        });
      });

      await page.route('**/api/users/profile/update/verify*', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid or expired OTP' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();
      await page.click('button:has-text("Edit Profile")');

      await page.locator('input[placeholder="Enter your username"]').fill('RajeshNew');
      await page.click('button:has-text("Continue & Verify")');

      // Wait for step 2
      await expect(page.locator('button:has-text("Verify & Save")')).toBeVisible();

      // Fill 6 OTP digits
      const firstOtpInput = page.locator('form:has-text("Verify & Save") input').first();
      await firstOtpInput.click();
      await page.keyboard.type('000000');

      await page.click('button:has-text("Verify & Save")');
      await expect(page.locator('text=Invalid or expired OTP')).toBeVisible();
    });

    test('Verify error toast when change mobile OTP request fails', async ({ page }) => {
      await page.route('**/api/auth/mobile/change/request-otp*', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Mobile number already registered to another user' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Change Mobile Number")')).toBeVisible();
      await page.click('button:has-text("Change Mobile Number")');

      await page.locator('input[placeholder="Enter 10-digit number"]').fill('9999999999');
      await page.click('button:has-text("Send OTP")');

      await expect(page.locator('text=Mobile number already registered to another user')).toBeVisible();
    });

    test('Verify error toast when subscription action fails', async ({ page }) => {
      await page.route('**/api/subscription/pause*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Gateway communication error' })
        });
      });

      const paidUser = {
        ...defaultUser,
        plan: 'paid',
        subscription_status: 'active',
        current_period_end: '2026-11-01T00:00:00.000Z'
      };

      await page.addInitScript((u) => {
        localStorage.setItem('aurum_user', JSON.stringify(u));
      }, paidUser);

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: paidUser } })
      }));

      await page.goto('/profile');
      await expect(page.locator('button:has-text("Manage Subscription & AutoPay")')).toBeVisible();
      await page.click('button:has-text("Manage Subscription & AutoPay")');
      await page.click('button:has-text("Pause AutoPay")');
      await page.click('button:has-text("Confirm Pause")');

      await expect(page.locator('text=Gateway communication error')).toBeVisible();
    });
  });

});
