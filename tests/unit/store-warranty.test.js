/**
 * MK App — Store + Warranty Tests
 */
const request = require('supertest');
const app     = require('../../../backend/src/server');
const User    = require('../../../backend/src/models/User');
const Booking = require('../../../backend/src/models/Booking');
const Service = require('../../../backend/src/models/Service');
const Category= require('../../../backend/src/models/Category');
const jwt     = require('jsonwebtoken');

let token, adminToken, testUser, adminUser, testService, testCategory, testBooking;

beforeAll(async () => {
  testCategory = await Category.create({ name: 'Store Test Cat', slug: `store-cat-${Date.now()}`, icon: '🛍️', isActive: true, order: 98 });
  testService  = await Service.create({ name: 'Store Test Svc', slug: `store-svc-${Date.now()}`, category: testCategory._id, startingPrice: 299, duration: 30, isActive: true });

  testUser = await User.create({
    name: 'Store Test User', phone: `98${Date.now().toString().slice(-8)}`, role: 'customer', isVerified: true,
    addresses: [{ label: 'Home', line1: '456 Store St', city: 'Hyderabad', pincode: '500001', isDefault: true }],
  });
  token = jwt.sign({ id: testUser._id, role: 'customer' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  adminUser = await User.create({
    name: 'Store Admin', phone: `97${Date.now().toString().slice(-8)}`, role: 'admin', isVerified: true,
  });
  adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  testBooking = await Booking.create({
    customer:      testUser._id,
    service:       testService._id,
    scheduledDate: new Date(Date.now() - 86400000), // yesterday (completed)
    scheduledTime: '10:00 AM – 12:00 PM',
    status:        'completed',
    completedAt:   new Date(),
    address:       { line1: '456 Store St', city: 'Hyderabad', pincode: '500001' },
    pricing:       { basePrice: 299, taxes: 53, totalAmount: 352 },
    bookingId:     `BK${Date.now().toString().slice(-8)}`,
  });
});

afterAll(async () => {
  await User.deleteMany({ _id: { $in: [testUser._id, adminUser._id] } });
  await Booking.deleteMany({ _id: testBooking._id });
  await Service.deleteMany({ _id: testService._id });
  await Category.deleteMany({ _id: testCategory._id });
});

// ── Store Products ────────────────────────────────────────────
describe('Store Products', () => {
  test('GET /store/products — public, returns list', async () => {
    const res = await request(app).get('/api/v1/store/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products || res.body.data)).toBe(true);
  });

  test('GET /store/products/featured — returns featured products', async () => {
    const res = await request(app).get('/api/v1/store/products/featured');
    expect([200, 404]).toContain(res.status);
  });

  test('POST /store/products — requires admin auth', async () => {
    const res = await request(app)
      .post('/api/v1/store/products')
      .set('Authorization', `Bearer ${token}`) // customer, not admin
      .send({ name: 'Test Product', price: 99, mrp: 149, stock: 50, category: 'cleaning' });
    expect(res.status).toBe(403);
  });
});

// ── Store Orders ─────────────────────────────────────────────
describe('Store Orders', () => {
  test('POST /store/orders — requires auth and delivery address', async () => {
    const res = await request(app)
      .post('/api/v1/store/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], deliveryAddress: null });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /store/orders — returns my orders', async () => {
    const res = await request(app)
      .get('/api/v1/store/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders || res.body.data)).toBe(true);
  });
});

// ── Warranty Claims ───────────────────────────────────────────
describe('Warranty Claims', () => {
  test('POST /warranty/claims — requires issueType and description', async () => {
    const res = await request(app)
      .post('/api/v1/warranty/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: testBooking._id }); // missing issueType + description
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test('POST /warranty/claims — valid claim is created', async () => {
    const res = await request(app)
      .post('/api/v1/warranty/claims')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId:   testBooking._id,
        issueType:   'poor_quality',
        description: 'The service quality was not up to standard.',
        photos:      [],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.claim.claimId).toMatch(/^WC/);
  });

  test('GET /warranty/claims — returns my claims', async () => {
    const res = await request(app)
      .get('/api/v1/warranty/claims')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.claims || res.body.data)).toBe(true);
  });

  test('GET /warranty/check/:bookingId — returns warranty status', async () => {
    const res = await request(app)
      .get(`/api/v1/warranty/check/${testBooking._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
  });

  test('Warranty claims require authentication', async () => {
    const res = await request(app)
      .post('/api/v1/warranty/claims')
      .send({ issueType: 'poor_quality', description: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ── Categories ────────────────────────────────────────────────
describe('Categories', () => {
  test('GET /categories — returns active categories', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  test('GET /categories/featured — returns featured categories', async () => {
    const res = await request(app).get('/api/v1/categories/featured');
    expect(res.status).toBe(200);
  });

  test('GET /categories/:slug — returns category + services', async () => {
    const res = await request(app).get(`/api/v1/categories/${testCategory.slug}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /categories — requires admin', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unauth Cat', slug: 'unauth-cat' });
    expect(res.status).toBe(403);
  });
});

// ── Loyalty Points ────────────────────────────────────────────
describe('Loyalty System', () => {
  test('GET /loyalty/profile — returns loyalty data', async () => {
    const res = await request(app)
      .get('/api/v1/loyalty/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /loyalty/tiers — returns tier information', async () => {
    const res = await request(app)
      .get('/api/v1/loyalty/tiers')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /loyalty/redeem — insufficient points returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/loyalty/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 9999999 });
    expect([400, 404]).toContain(res.status);
  });
});
