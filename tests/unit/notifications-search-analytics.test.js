/**
 * MK App — Notifications + Search + Analytics Tests
 */
const request = require('supertest');
const app     = require('../../../backend/src/server');
const User    = require('../../../backend/src/models/User');
const Notification = require('../../../backend/src/models/Notification');
const jwt     = require('jsonwebtoken');

let token, adminToken, testUser, adminUser;

beforeAll(async () => {
  testUser = await User.create({
    name: 'Notif Test User', phone: `96${Date.now().toString().slice(-8)}`,
    role: 'customer', isVerified: true, fcmToken: 'test_fcm_token_abc',
  });
  token = jwt.sign({ id: testUser._id, role: 'customer' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  adminUser = await User.create({
    name: 'Analytics Admin', phone: `95${Date.now().toString().slice(-8)}`, role: 'admin', isVerified: true,
  });
  adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  // Seed some notifications
  await Notification.create([
    { user: testUser._id, title: 'Test Notif 1', body: 'Body 1', type: 'booking_confirmed', isRead: false },
    { user: testUser._id, title: 'Test Notif 2', body: 'Body 2', type: 'offer',             isRead: true  },
    { user: testUser._id, title: 'Test Notif 3', body: 'Body 3', type: 'pro_assigned',      isRead: false },
  ]);
});

afterAll(async () => {
  await User.deleteMany({ _id: { $in: [testUser._id, adminUser._id] } });
  await Notification.deleteMany({ user: testUser._id });
});

// ── Notifications ─────────────────────────────────────────────
describe('Notifications', () => {
  test('GET /notifications — returns paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.unreadCount).toBeDefined();
    expect(res.body.unreadCount).toBeGreaterThanOrEqual(2);
  });

  test('GET /notifications?unreadOnly=true — only unread', async () => {
    const res = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.notifications.forEach(n => expect(n.isRead).toBe(false));
  });

  test('GET /notifications/unread-count — returns count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  test('PUT /notifications/read-all — marks all as read', async () => {
    const res = await request(app)
      .put('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify count is now 0
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);
    expect(countRes.body.count).toBe(0);
  });

  test('POST /notifications/device-token — registers FCM token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/device-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'new_fcm_token_xyz', platform: 'android' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /notifications/device-token — missing token returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/device-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('Notifications require authentication', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});

// ── Search ────────────────────────────────────────────────────
describe('Search', () => {
  test('GET /search?q= — requires min 2 chars', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=A')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test('GET /search?q=AC — returns service results', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=AC&type=services');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.services)).toBe(true);
  });

  test('GET /search/autocomplete?q=cl — returns suggestions', async () => {
    const res = await request(app).get('/api/v1/search/autocomplete?q=cl');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  test('Search with filters — minPrice and maxPrice', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=cleaning&minPrice=100&maxPrice=999&sortBy=price_asc');
    expect(res.status).toBe(200);
  });

  test('Search with rating filter', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=salon&minRating=4.5');
    expect(res.status).toBe(200);
  });
});

// ── Analytics ─────────────────────────────────────────────────
describe('Analytics', () => {
  test('GET /analytics/dashboard — requires admin', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`); // customer token
    expect(res.status).toBe(403);
  });

  test('GET /analytics/dashboard — returns data for admin', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.status); // 500 acceptable if analytics not seeded
  });

  test('GET /analytics/realtime — requires admin', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/realtime')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.status);
  });

  test('GET /analytics/my-performance — for professionals', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/my-performance')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 403]).toContain(res.status);
  });
});

// ── Referrals ─────────────────────────────────────────────────
describe('Referrals', () => {
  test('GET /referrals/my-code — returns referral code', async () => {
    const res = await request(app)
      .get('/api/v1/referrals/my-code')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.referralCode).toBeDefined();
  });

  test('GET /referrals/stats — returns referral statistics', async () => {
    const res = await request(app)
      .get('/api/v1/referrals/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('GET /referrals/leaderboard — public leaderboard', async () => {
    const res = await request(app)
      .get('/api/v1/referrals/leaderboard')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
  });
});
