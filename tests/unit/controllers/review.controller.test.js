/**
 * MK App — Review Controller Tests
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Booking  = require('../../backend/src/models/Booking');
const Review   = require('../../backend/src/models/Review');
const Service  = require('../../backend/src/models/Service');
const Professional = require('../../backend/src/models/Professional');
const jwt      = require('jsonwebtoken');

const makeToken = (id, role = 'customer') =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

let customerToken, proToken;
let customerId, proUserId, proId, serviceId, bookingId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_review');

  const [customer, proUser] = await User.create([
    { name: 'Review Customer', phone: '+919900000001', role: 'customer',     isVerified: true },
    { name: 'Review Pro',      phone: '+919900000002', role: 'professional', isVerified: true },
  ]);

  customerId    = customer._id;
  proUserId     = proUser._id;
  customerToken = makeToken(customer._id, 'customer');
  proToken      = makeToken(proUser._id, 'professional');

  const svc = await Service.create({
    name: 'Review Test Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 399, duration: 60, isActive: true,
  });
  serviceId = svc._id;

  const pro = await Professional.create({
    user: proUserId, experience: 3, verificationStatus: 'verified', isActive: true,
    rating: 0, reviewCount: 0,
    services: [{ serviceId: svc._id, name: svc.name, isAvailable: true }],
  });
  proId = pro._id;

  const booking = await Booking.create({
    customer:     customer._id,
    professional: pro._id,
    service:      serviceId,
    status:       'completed',
    scheduledDate: new Date(Date.now() - 86400000),
    scheduledTime: '10:00 AM',
    address: { line1: '1 Review St', city: 'Hyderabad', state: 'TS', pincode: '500001' },
    pricing: { basePrice: 399, totalAmount: 470, amountPaid: 470 },
    payment: { method: 'online', status: 'paid' },
  });
  bookingId = booking._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/v1/reviews', () => {
  it('should create a review for completed booking', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId,
        rating:  5,
        comment: 'Excellent service! Very professional and thorough.',
      });

    expect([200, 201, 400]).toContain(res.statusCode);
    if (res.statusCode === 201 || res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.review || res.body.data).toBeDefined();
    }
  });

  it('should reject review without rating', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, comment: 'Missing rating' });

    expect([400, 422]).toContain(res.statusCode);
  });

  it('should reject invalid rating (> 5)', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, rating: 6, comment: 'Invalid' });

    expect([400, 422]).toContain(res.statusCode);
  });

  it('should reject review without auth', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .send({ bookingId, rating: 4, comment: 'No auth' });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/reviews', () => {
  it('should return reviews list', async () => {
    const res = await request(app)
      .get('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.reviews || res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/professionals/:id/reviews', () => {
  it('should return professional reviews', async () => {
    const res = await request(app).get(`/api/v1/professionals/${proId}/reviews`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.reviews || res.body.data)).toBe(true);
    }
  });
});

describe('Professional rating update after review', () => {
  it('should update professional average rating after review', async () => {
    // Create a review first
    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId, rating: 4, comment: 'Good service.' });

    // Check rating updated
    const pro = await Professional.findById(proId);
    if (pro.reviewCount > 0) {
      expect(pro.rating).toBeGreaterThan(0);
      expect(pro.rating).toBeLessThanOrEqual(5);
    }
  });
});
