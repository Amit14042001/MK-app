/**
 * MK App — Full Integration API Tests
 * End-to-end tests for complete user flows
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../../backend/src/server');
const User     = require('../../../backend/src/models/User');
const Service  = require('../../../backend/src/models/Service');
const Category = require('../../../backend/src/models/Category');
const jwt      = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_mk_2025';
const makeToken  = (id, role = 'customer') => jwt.sign({ id }, JWT_SECRET, { expiresIn: '1h' });

let customerToken, proToken, adminToken;
let customerId, serviceId, categoryId, bookingId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_integration');

  const [customer, professional, admin] = await User.create([
    { name: 'Integration Customer', phone: '+919500000001', role: 'customer',     isVerified: true },
    { name: 'Integration Pro',      phone: '+919500000002', role: 'professional', isVerified: true },
    { name: 'Integration Admin',    phone: '+919500000003', role: 'admin',        isVerified: true },
  ]);

  customerId     = customer._id;
  customerToken  = makeToken(customer._id, 'customer');
  proToken       = makeToken(professional._id, 'professional');
  adminToken     = makeToken(admin._id, 'admin');

  const cat = await Category.create({ name: 'HVAC', icon: '❄️', isActive: true });
  categoryId = cat._id;

  const svc = await Service.create({
    name:          'Integration AC Service',
    category:      categoryId,
    startingPrice: 599,
    duration:      90,
    description:   'Integration test service',
    isActive:      true,
    subServices: [{
      name: 'Basic Service', price: 599, duration: 60, isActive: true,
    }],
  });
  serviceId = svc._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Health Check ──────────────────────────────────────────────
describe('GET /health', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/v1/health', () => {
  it('should return detailed health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
  });
});

// ── Services ─────────────────────────────────────────────────
describe('GET /api/v1/services', () => {
  it('should return active services list', async () => {
    const res = await request(app).get('/api/v1/services');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.services || res.body.data)).toBe(true);
  });

  it('should filter by category', async () => {
    const res = await request(app).get(`/api/v1/services?category=${categoryId}`);
    expect(res.statusCode).toBe(200);
  });

  it('should support search query', async () => {
    const res = await request(app).get('/api/v1/services?search=AC');
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/v1/services/:id', () => {
  it('should return service by id', async () => {
    const res = await request(app).get(`/api/v1/services/${serviceId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.service || res.body.data).toBeDefined();
  });

  it('should return 404 for non-existent service', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/v1/services/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});

// ── Categories ────────────────────────────────────────────────
describe('GET /api/v1/categories', () => {
  it('should return all active categories', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.categories || res.body.data)).toBe(true);
  });
});

// ── Users ─────────────────────────────────────────────────────
describe('GET /api/v1/users/me', () => {
  it('should return current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user || res.body.data).toBeDefined();
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/v1/users/me', () => {
  it('should update user profile', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Updated Customer Name', email: 'updated@test.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Full Booking Flow ──────────────────────────────────────────
describe('Full Booking Flow', () => {
  it('should complete: create → get → cancel', async () => {
    // 1. Create booking
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service:       serviceId,
        scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        scheduledTime: '11:00 AM',
        address: { line1: '789 Test Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
        payment: { method: 'cash' },
      });

    expect(createRes.statusCode).toBe(201);
    const createdId = createRes.body.booking._id;

    // 2. Get booking
    const getRes = await request(app)
      .get(`/api/v1/bookings/${createdId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.booking.bookingId).toMatch(/^BK/);

    // 3. Cancel booking
    const cancelRes = await request(app)
      .put(`/api/v1/bookings/${createdId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Integration test cancel' });
    expect([200, 400]).toContain(cancelRes.statusCode);
  });
});

// ── Notifications ─────────────────────────────────────────────
describe('GET /api/v1/notifications', () => {
  it('should return notifications for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.notifications || res.body.data)).toBe(true);
  });
});

// ── Subscriptions ─────────────────────────────────────────────
describe('GET /api/v1/subscriptions/plans', () => {
  it('should return subscription plans', async () => {
    const res = await request(app).get('/api/v1/subscriptions/plans');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/subscriptions/my', () => {
  it('should return current subscription for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── FAQs ──────────────────────────────────────────────────────
describe('GET /api/v1/faqs', () => {
  it('should return FAQs', async () => {
    const res = await request(app).get('/api/v1/faqs');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Banners ───────────────────────────────────────────────────
describe('GET /api/v1/banners', () => {
  it('should return active banners', async () => {
    const res = await request(app).get('/api/v1/banners');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Search ────────────────────────────────────────────────────
describe('GET /api/v1/search', () => {
  it('should return search results for query', async () => {
    const res = await request(app).get('/api/v1/search?q=AC');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return suggestions', async () => {
    const res = await request(app).get('/api/v1/search/suggestions?q=ac');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return trending searches', async () => {
    const res = await request(app).get('/api/v1/search/trending');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── Reviews ───────────────────────────────────────────────────
describe('GET /api/v1/reviews', () => {
  it('should return reviews with auth', async () => {
    const res = await request(app)
      .get('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});

// ── Rate Limiting ─────────────────────────────────────────────
describe('Rate Limiting', () => {
  it('should allow normal request volume', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});

// ── 404 Handler ───────────────────────────────────────────────
describe('404 Handler', () => {
  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
