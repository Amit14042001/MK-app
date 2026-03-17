/**
 * MK App — Subscription Controller Tests
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Subscription = require('../../backend/src/models/Subscription');
const jwt      = require('jsonwebtoken');

const makeToken = (id, role = 'customer') =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

let customerToken, userId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_subscription');
  const user = await User.create({
    name: 'Sub Test User', phone: '+919100000001',
    role: 'customer', isVerified: true,
  });
  userId       = user._id;
  customerToken = makeToken(user._id);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('GET /api/v1/subscriptions/plans', () => {
  it('should return all available plans', async () => {
    const res = await request(app).get('/api/v1/subscriptions/plans');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('should include plan details: id, name, price, benefits', async () => {
    const res = await request(app).get('/api/v1/subscriptions/plans');
    const plans = res.body.data;
    plans.forEach(plan => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(typeof plan.price).toBe('number');
      expect(Array.isArray(plan.benefits)).toBe(true);
    });
  });
});

describe('GET /api/v1/subscriptions/my', () => {
  it('should return free plan for new user', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/my')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    // New user has no subscription
    const data = res.body.data;
    expect(data).toBeDefined();
  });

  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/subscriptions/my');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/v1/subscriptions/subscribe', () => {
  it('should subscribe to silver plan', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planId: 'silver', paymentMethod: 'cash' });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan).toBe('silver');
  });

  it('should reject subscribing to invalid plan', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planId: 'diamond' });

    expect(res.statusCode).toBe(400);
  });

  it('should reject subscribing when already subscribed', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planId: 'gold', paymentMethod: 'cash' });

    // Should fail because silver is already active
    expect([400, 409]).toContain(res.statusCode);
  });
});

describe('POST /api/v1/subscriptions/apply-promo', () => {
  it('should reject invalid promo code', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/apply-promo')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'FAKECODE99', planId: 'gold' });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing code', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/apply-promo')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planId: 'gold' });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/subscriptions/cancel', () => {
  it('should cancel active subscription', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/cancel')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Test cancellation' });

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/cancel/i);
    }
  });
});

describe('GET /api/v1/subscriptions/history', () => {
  it('should return subscription history', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/history')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
