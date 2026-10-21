import { test, expect } from '@playwright/test';

test.describe('Notifications Module', () => {

  const sampleNotifications = [
    {
      id: 101,
      type: 'rate',
      title: 'Gold Rate Surge: 22K Up by ₹50',
      message: 'Chennai 22K gold rate rose to ₹7,050/g today.',
      is_read: false,
      url: '/gold-rates',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 mins ago
    },
    {
      id: 102,
      type: 'portfolio',
      title: 'Portfolio Value Update',
      message: 'Your bullion vault gained +₹2,400 with current market rates.',
      is_read: false,
      url: '/my-gold',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    },
    {
      id: 103,
      type: 'general',
      title: 'Weekly Vault Summary',
      message: 'Check your current gold assets and latest price trends.',
      is_read: true,
      url: '#',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('aurum_token', 'mock-token-notif-123');
      localStorage.setItem('aurum_user', JSON.stringify({
        id: 1,
        username: 'RajeshKumar',
        role: 'customer',
        plan: 'free',
        notifications_enabled: true
      }));
      localStorage.setItem('mygold_disclaimer_ack_1', 'true');
      localStorage.setItem('mygold_lang', 'en');
    });

    // Mock auth me
    await page.route('**/api/auth/me*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 1,
            username: 'RajeshKumar',
            role: 'customer',
            plan: 'free',
            notifications_enabled: true
          }
        }
      })
    }));

    // Mock gold rates
    await page.route('**/api/rates*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { rate24K: 7500, rate22K: 7000, silverRate: 100 }
      })
    }));

    // Mock subscription status
    await page.route('**/api/subscription/status*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { status: 'FREE', entriesUsed: 2, limit: 10 }
      })
    }));

    // Mock purchases
    await page.route('**/api/purchases*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { purchases: [] } })
    }));

    // Mock health
    await page.route('**/api/health*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'UP' })
    }));

    // Default mock for notifications status
    await page.route('**/api/notifications/status*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { notifications_enabled: true } })
    }));

    // Default mock for notifications list
    await page.route('**/api/notifications', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              notifications: sampleNotifications,
              unread_count: 2
            }
          })
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'All notifications cleared' })
        });
      } else {
        await route.continue();
      }
    });

    // Mock read-all
    await page.route('**/api/notifications/read-all*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Marked all as read' })
    }));

    // Mock read single notification
    await page.route('**/api/notifications/*/read*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Marked as read' })
    }));
  });

  // ─────────────────────────────────────────────
  // 1. NOTIFICATION DISPLAY & HEADER BELL
  // ─────────────────────────────────────────────
  test.describe('Notification Display & Header Bell', () => {

    test('Verify notification bell button is visible in the Navbar', async ({ page }) => {
      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();
    });

    test('Verify unread badge displays correct unread count (2)', async ({ page }) => {
      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();

      // Badge should show 2
      const badge = bellBtn.locator('span.rounded-full:has-text("2")');
      await expect(badge).toBeVisible();
    });

    test('Verify unread badge displays "9+" when unread count exceeds 9', async ({ page }) => {
      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                notifications: sampleNotifications,
                unread_count: 12
              }
            })
          });
        }
      });

      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();

      const badge = bellBtn.locator('span.rounded-full:has-text("9+")');
      await expect(badge).toBeVisible();
    });

    test('Verify green pulse dot appears when notifications are enabled and unread count is 0', async ({ page }) => {
      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                notifications: [],
                unread_count: 0
              }
            })
          });
        }
      });

      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();

      // Green pulse indicator
      const greenDot = bellBtn.locator('span.bg-emerald-500');
      await expect(greenDot).toBeVisible();
    });

    test('Verify bell-off state when notifications are disabled', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aurum_user', JSON.stringify({
          id: 1,
          username: 'RajeshKumar',
          notifications_enabled: false
        }));
      });

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 1, username: 'RajeshKumar', notifications_enabled: false } }
        })
      }));

      await page.route('**/api/notifications/status*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { notifications_enabled: false } })
      }));

      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { notifications: [], unread_count: 0 } })
          });
        }
      });

      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();

      // Should not have green active dot or unread count
      await expect(bellBtn.locator('span.bg-emerald-500')).not.toBeVisible();
      await expect(bellBtn.locator('span.rounded-full')).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 2. NOTIFICATION POPOVER & LIST RENDERING
  // ─────────────────────────────────────────────
  test.describe('Notification Popover & List Rendering', () => {

    test('Verify clicking notification bell opens popover with Live Notifications heading', async ({ page }) => {
      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await bellBtn.click();

      // Popover header
      await expect(page.locator('h3:has-text("Live Notifications")')).toBeVisible();
      await expect(page.locator('text=Gold & Silver Market Broadcasts')).toBeVisible();
      await expect(page.locator('span:has-text("2 new")')).toBeVisible();
    });

    test('Verify notification items render title, message, and category icons', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Check item 1 (Rate notification)
      await expect(page.locator('text=Gold Rate Surge: 22K Up by ₹50')).toBeVisible();
      await expect(page.locator('text=Chennai 22K gold rate rose to ₹7,050/g today.')).toBeVisible();

      // Check item 2 (Portfolio notification)
      await expect(page.locator('text=Portfolio Value Update')).toBeVisible();
      await expect(page.locator('text=Your bullion vault gained +₹2,400 with current market rates.')).toBeVisible();

      // Check item 3 (General notification)
      await expect(page.locator('text=Weekly Vault Summary')).toBeVisible();
    });

    test('Verify unread items have visual unread indicator dot', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Unread notifications have amber indicator dot: span.w-1.5.h-1.5.rounded-full.bg-amber-500
      const unreadDots = page.locator('div:has(> div:has-text("Gold Rate Surge")) span.bg-amber-500');
      await expect(unreadDots.first()).toBeVisible();
    });

    test('Verify empty notification state displays informative message', async ({ page }) => {
      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                notifications: [],
                unread_count: 0
              }
            })
          });
        }
      });

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Verify empty state
      await expect(page.locator('h4:has-text("No notifications yet.")')).toBeVisible();
      await expect(page.locator('text=Receive daily live gold rate and portfolio updates.')).toBeVisible();
    });

    test('Verify close button (X) dismisses the popover', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');
      await expect(page.locator('h3:has-text("Live Notifications")')).toBeVisible();

      // Click Close button
      await page.click('button[aria-label="Close"]');
      await expect(page.locator('h3:has-text("Live Notifications")')).not.toBeVisible();
    });

    test('Verify clicking outside the popover dismisses it', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');
      await expect(page.locator('h3:has-text("Live Notifications")')).toBeVisible();

      // Click outside on the body
      await page.mouse.click(10, 10);
      await expect(page.locator('h3:has-text("Live Notifications")')).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 3. NOTIFICATION ACTIONS
  // ─────────────────────────────────────────────
  test.describe('Notification Actions', () => {

    test('Verify clicking an unread notification calls markOneAsRead API', async ({ page }) => {
      let markOneCalled = false;
      await page.route('**/api/notifications/101/read*', route => {
        markOneCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Marked as read' })
        });
      });

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Click the first unread notification
      await page.click('text=Gold Rate Surge: 22K Up by ₹50');

      await expect.poll(() => markOneCalled).toBe(true);
    });

    test('Verify clicking a notification with navigation url redirects and closes popover', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Click item 1 which has url: '/gold-rates'
      await page.click('text=Gold Rate Surge: 22K Up by ₹50');

      // Should navigate to /gold-rates
      await expect(page).toHaveURL(/.*\/gold-rates/);
      await expect(page.locator('h3:has-text("Live Notifications")')).not.toBeVisible();
    });

    test('Verify Mark all as read button calls API and clears unread status', async ({ page }) => {
      let markAllCalled = false;
      await page.route('**/api/notifications/read-all*', route => {
        markAllCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'All notifications marked as read' })
        });
      });

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Button visible because unreadCount = 2
      const markAllBtn = page.locator('button:has-text("Mark all as read")');
      await expect(markAllBtn).toBeVisible();

      await markAllBtn.click();

      await expect.poll(() => markAllCalled).toBe(true);
      // Unread count badge inside header should disappear
      await expect(page.locator('span:has-text("2 new")')).not.toBeVisible();
    });

    test('Verify Clear all button opens confirmation dialog', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await page.click('button:has-text("Clear all")');

      // Confirmation box should appear
      await expect(page.locator('text=Clear all notifications?')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:text-is("Clear All")')).toBeVisible();
    });

    test('Verify clicking Cancel in confirmation dialog does not clear notifications', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await page.click('button:has-text("Clear all")');
      await expect(page.locator('text=Clear all notifications?')).toBeVisible();

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Confirmation box should close, notifications remain
      await expect(page.locator('text=Clear all notifications?')).not.toBeVisible();
      await expect(page.locator('text=Gold Rate Surge: 22K Up by ₹50')).toBeVisible();
    });

    test('Verify confirming Clear All calls delete API and displays empty state', async ({ page }) => {
      let clearApiCalled = false;
      await page.route('**/api/notifications', async route => {
        if (route.request().method() === 'DELETE') {
          clearApiCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'All notifications cleared' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                notifications: sampleNotifications,
                unread_count: 2
              }
            })
          });
        }
      });

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await page.click('button:has-text("Clear all")');
      await page.click('button:text-is("Clear All")');

      await expect.poll(() => clearApiCalled).toBe(true);

      // Now should show empty state
      await expect(page.locator('h4:has-text("No notifications yet.")')).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 4. NOTIFICATION SETTINGS & PREFERENCES
  // ─────────────────────────────────────────────
  test.describe('Notification Settings & Preferences', () => {

    test('Verify popover footer shows Push Alerts status and toggle switch', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await expect(page.locator('text=Push Alerts: ON')).toBeVisible();
      await expect(page.locator('button[aria-label="Toggle notifications"]')).toBeVisible();
    });

    test('Verify Settings link in popover footer navigates to /profile', async ({ page }) => {
      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      // Click Settings link in popover footer
      await page.click('div.p-3 a[href="/profile"]:has-text("Settings")');

      await expect(page).toHaveURL(/.*\/profile/);
    });

    test('Verify Profile page notification card displays ACTIVE badge when enabled', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('h1')).toBeVisible();

      await expect(page.locator('span:text-is("Push Notifications")')).toBeVisible();
      await expect(page.locator('span:has-text("ACTIVE")')).toBeVisible();
      await expect(page.locator('button:has-text("Send Test Push Notification")')).toBeVisible();
    });

    test('Verify clicking Send Test Push Notification in Profile calls API', async ({ page }) => {
      let testAlertCalled = false;
      await page.route('**/api/notifications/test*', route => {
        testAlertCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Test push notification sent!' })
        });
      });

      await page.goto('/profile');
      await expect(page.locator('h1')).toBeVisible();

      const testBtn = page.locator('button:has-text("Send Test Push Notification")');
      await expect(testBtn).toBeVisible();
      await testBtn.click();

      await expect.poll(() => testAlertCalled).toBe(true);
    });

    test('Verify Profile displays DISABLED badge when notifications are off', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('aurum_user', JSON.stringify({
          id: 1,
          username: 'RajeshKumar',
          notifications_enabled: false
        }));
      });

      await page.route('**/api/auth/me*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { user: { id: 1, username: 'RajeshKumar', notifications_enabled: false } }
        })
      }));

      await page.route('**/api/notifications/status*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { notifications_enabled: false } })
      }));

      await page.goto('/profile');
      await expect(page.locator('h1')).toBeVisible();

      await expect(page.locator('span:has-text("DISABLED")')).toBeVisible();
      // Test alert button should not be rendered when disabled
      await expect(page.locator('button:has-text("Send Test Push Notification")')).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────
  // 5. ERROR HANDLING & RESILIENCE
  // ─────────────────────────────────────────────
  test.describe('Error Handling & Resilience', () => {

    test('Verify Navbar and application do not crash if /api/notifications returns 500 error', async ({ page }) => {
      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Notifications service unavailable' })
          });
        }
      });

      await page.goto('/');
      // Bell button should still render without error
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();

      // Open popover, should render empty state safely
      await bellBtn.click();
      await expect(page.locator('h3:has-text("Live Notifications")')).toBeVisible();
      await expect(page.locator('h4:has-text("No notifications yet.")')).toBeVisible();
    });

    test('Verify application does not crash if /api/notifications/status returns 500 error', async ({ page }) => {
      await page.route('**/api/notifications/status*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' })
      }));

      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();
    });

    test('Verify error toast when Mark all as read API fails', async ({ page }) => {
      await page.route('**/api/notifications/read-all*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to mark notifications as read.' })
      }));

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await page.click('button:has-text("Mark all as read")');
      await expect(page.locator('text=Failed to mark notifications as read.')).toBeVisible();
    });

    test('Verify error toast when Clear all notifications API fails', async ({ page }) => {
      await page.route('**/api/notifications', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Failed to clear notifications.' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                notifications: sampleNotifications,
                unread_count: 2
              }
            })
          });
        }
      });

      await page.goto('/');
      await page.click('button[aria-label="User Notification Center"]');

      await page.click('button:has-text("Clear all")');
      await page.click('button:text-is("Clear All")');

      await expect(page.locator('text=Failed to clear notifications.')).toBeVisible();
    });

    test('Verify error toast when Send test alert API fails in Profile', async ({ page }) => {
      await page.route('**/api/notifications/test*', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Push notification dispatch failed' })
      }));

      await page.goto('/profile');
      await expect(page.locator('h1')).toBeVisible();

      await page.click('button:has-text("Send Test Push Notification")');
      await expect(page.locator('text=Push notification dispatch failed')).toBeVisible();
    });

    test('Verify malformed notifications payload is handled safely', async ({ page }) => {
      await page.route('**/api/notifications', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: null // malformed/null
            })
          });
        }
      });

      await page.goto('/');
      const bellBtn = page.locator('button[aria-label="User Notification Center"]');
      await expect(bellBtn).toBeVisible();
      await bellBtn.click();

      // Handled gracefully without crash
      await expect(page.locator('h3:has-text("Live Notifications")')).toBeVisible();
      await expect(page.locator('h4:has-text("No notifications yet.")')).toBeVisible();
    });
  });

});
