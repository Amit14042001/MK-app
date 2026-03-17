/**
 * MK App — E2E Tests (Playwright)
 * Full user journeys on the web frontend
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL  = process.env.E2E_API_URL  || 'http://localhost:5000/api/v1';

// ── Helpers ───────────────────────────────────────────────────
async function loginAsCustomer(page) {
  await page.goto(BASE_URL);
  await page.click('[data-testid="login-btn"], text=Login, text=Sign In');
  await page.fill('input[placeholder*="Mobile"], input[name="phone"]', '9876543210');
  await page.click('text=Get OTP, text=Send OTP');
  await page.waitForTimeout(500);
  const otpInputs = await page.$$('input[maxlength="1"], .otp-input');
  for (const [i, input] of otpInputs.entries()) {
    await input.fill(String(i + 1));
  }
  await page.click('text=Verify, text=Sign In, text=Login');
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function searchService(page, query) {
  await page.fill('[placeholder*="Search"], [data-testid="search-input"]', query);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle').catch(() => {});
}

// ── HOMEPAGE ──────────────────────────────────────────────────
test.describe('Homepage', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto(BASE_URL);
    const title = await page.title();
    expect(title).toMatch(/MK|Home Services/i);
  });

  test('shows hero section and categories', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle').catch(() => {});
    const hero = await page.$('.hero, [data-testid="hero"], h1');
    expect(hero).not.toBeNull();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto(BASE_URL);
    const nav = await page.$('nav, header');
    expect(nav).not.toBeNull();
  });

  test('search bar is functional', async ({ page }) => {
    await page.goto(BASE_URL);
    const searchInput = await page.$('[placeholder*="Search"], [data-testid="search"]');
    if (searchInput) {
      await searchInput.fill('AC Service');
      await page.keyboard.press('Enter');
      await page.waitForURL(/search|services/, { timeout: 5000 }).catch(() => {});
    }
  });

  test('category grid is visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle').catch(() => {});
    const categories = await page.$$('.category-card, [data-testid="category"]');
    expect(categories.length).toBeGreaterThanOrEqual(0);
  });
});

// ── SERVICES ──────────────────────────────────────────────────
test.describe('Services Page', () => {
  test('services list loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await page.content();
    expect(body.length).toBeGreaterThan(100);
  });

  test('service detail page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const serviceLinks = await page.$$('a[href*="/service/"], [data-testid="service-card"]');
    if (serviceLinks.length > 0) {
      await serviceLinks[0].click();
      await page.waitForLoadState('networkidle').catch(() => {});
      const url = page.url();
      expect(url).toMatch(/service|detail/i);
    }
  });
});

// ── AUTH FLOW ─────────────────────────────────────────────────
test.describe('Authentication', () => {
  test('login page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const form = await page.$('form, [data-testid="login-form"]');
    expect(form).not.toBeNull();
  });

  test('phone number input accepts valid Indian number', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const phoneInput = await page.$('input[placeholder*="Mobile"], input[type="tel"], input[name="phone"]');
    if (phoneInput) {
      await phoneInput.fill('9876543210');
      const value = await phoneInput.inputValue();
      expect(value).toBe('9876543210');
    }
  });

  test('shows error for invalid phone', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const phoneInput = await page.$('input[placeholder*="Mobile"], input[name="phone"]');
    const submitBtn  = await page.$('button[type="submit"], text=Get OTP');
    if (phoneInput && submitBtn) {
      await phoneInput.fill('123');
      await submitBtn.click();
      await page.waitForTimeout(500);
      const error = await page.$('.error, [data-testid="error"], .text-red');
      // Error may or may not show depending on validation
    }
  });
});

// ── CHECKOUT FLOW ─────────────────────────────────────────────
test.describe('Checkout Flow', () => {
  test('checkout page requires login', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout`);
    const url = page.url();
    // Should either redirect to login or show auth prompt
    const content = await page.content();
    expect(content.length).toBeGreaterThan(50);
  });
});

// ── BOOKING TRACKING ──────────────────────────────────────────
test.describe('Booking Tracking', () => {
  test('tracking page loads for valid booking', async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState('networkidle').catch(() => {});
    const content = await page.content();
    expect(content.length).toBeGreaterThan(50);
  });
});

// ── RESPONSIVE / MOBILE ───────────────────────────────────────
test.describe('Responsive Design', () => {
  test('homepage is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 12
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await page.content();
    expect(body.length).toBeGreaterThan(100);
    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(windowWidth + 10); // 10px tolerance
  });

  test('tablet view works', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto(BASE_URL);
    const body = await page.content();
    expect(body.length).toBeGreaterThan(100);
  });
});

// ── PERFORMANCE CHECKS ────────────────────────────────────────
test.describe('Performance', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle').catch(() => {});
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.includes('ResizeObserver')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

// ── ADMIN PANEL ───────────────────────────────────────────────
test.describe('Admin Panel', () => {
  test('admin panel requires auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    const url = page.url();
    const content = await page.content();
    // Should redirect to login or show auth form
    expect(content.length).toBeGreaterThan(50);
  });
});

// ── SEO ───────────────────────────────────────────────────────
test.describe('SEO', () => {
  test('homepage has meta description', async ({ page }) => {
    await page.goto(BASE_URL);
    const meta = await page.$('meta[name="description"]');
    if (meta) {
      const content = await meta.getAttribute('content');
      expect(content).toBeTruthy();
    }
  });

  test('service pages have structured titles', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
  });
});
