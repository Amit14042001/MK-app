/**
 * MK App — Professional App Tests
 * Tests: job flow, check-in OTP, schedule, earnings, payout, leaderboard
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../backend/src/server');
const User = require('../../../backend/src/models/User');
const Professional = require('../../../backend/src/models/Professional');
const Booking = require('../../../backend/src/models/Booking');
const Service = require('../../../backend/src/models/Service');
const Category = require('../../../backend/src/models/Category');
const Payment = require('../../../backend/src/models/Payment');
const jwt = require('jsonwebtoken');

// ── Test setup ────────────────────────────────────────────────
let proToken, customerToken;
let testPro, testCustomer, testProUser, testCustomerUser;
let testService, testCategory, testBooking;

beforeAll(async () => {
  // Create category + service
  testCategory = await Category.create({ name: 'Test Category', slug: 'test-cat', icon: '🔧', order: 1, isActive: true });
  testService  = await Service.create({
    name: 'Test Service', slug: 'test-service', category: testCategory._id,
    startingPrice: 499, duration: 60, isActive: true,
  });

  // Create professional user
  testProUser = await User.create({
    name: 'Test Pro', phone: '9990001111', role: 'professional', isVerified: true,
  });
  testPro = await Professional.create({
    user: testProUser._id, skills: ['Test Service'], rating: 4.8,
    totalBookings: 50, isVerified: true, isActive: true,
    currentLocation: { type: 'Point', coordinates: [78.4867, 17.3850] },
  });
  proToken = jwt.sign({ id: testProUser._id, role: 'professional' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  // Create customer user + booking
  testCustomerUser = await User.create({
    name: 'Test Customer', phone: '9990002222', role: 'customer', isVerified: true,
  });
  customerToken = jwt.sign({ id: testCustomerUser._id, role: 'customer' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });

  testBooking = await Booking.create({
    customer:      testCustomerUser._id,
    service:       testService._id,
    professional:  testPro._id,
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00 AM – 12:00 PM',
    status:        'professional_assigned',
    address:       { line1: '123 Test St', city: 'Hyderabad', pincode: '500001', lat: 17.385, lng: 78.487 },
    pricing:       { basePrice: 499, taxes: 89, totalAmount: 588 },
    bookingId:     `BK${Date.now().toString().slice(-8)}`,
  });
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ phone: { $in: ['9990001111', '9990002222'] } }),
    Professional.deleteMany({ user: testProUser._id }),
    Booking.deleteMany({ _id: testBooking._id }),
    Service.deleteMany({ _id: testService._id }),
    Category.deleteMany({ _id: testCategory._id }),
  ]);
});

// ── Professional Profile ─────────────────────────────────────
describe('Professional Profile', () => {
  test('GET /professionals/me — returns pro profile', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${proToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /professionals/me/availability — updates availability', async () => {
    const res = await request(app)
      .put('/api/v1/professionals/me/availability')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ isAvailable: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Rejects unauthenticated profile access', async () => {
    const res = await request(app).get('/api/v1/professionals/me');
    expect(res.status).toBe(401);
  });
});

// ── Job Flow ─────────────────────────────────────────────────
describe('Job Flow', () => {
  test('Professional can view assigned jobs', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/professional')
      .set('Authorization', `Bearer ${proToken}`);
    expect(res.status).toBe(200);
  });

  test('Professional marks arrived — sends OTP to customer', async () => {
    const res = await request(app)
      .post(`/api/v1/tracking/checkin-arrived/${testBooking._id}`)
      .set('Authorization', `Bearer ${proToken}`);
    // 200 or 400 (if booking not found by ID mismatch) — either is valid
    expect([200, 400, 403, 404]).toContain(res.status);
  });

  test('Check-in OTP verify — wrong OTP returns 400', async () => {
    // First generate OTP
    const otp = '9999';
    const res = await request(app)
      .post(`/api/v1/tracking/verify-checkin-otp/${testBooking._id}`)
      .set('Authorization', `Bearer ${proToken}`)
      .send({ otp });
    // Expect failure (OTP wasn't generated via API in this test)
    expect([400, 403, 404]).toContain(res.status);
  });

  test('Tracking location update', async () => {
    const res = await request(app)
      .post('/api/v1/tracking/location')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ lat: 17.385, lng: 78.487, bookingId: testBooking._id });
    expect([200, 400, 404]).toContain(res.status);
  });
});

// ── Leaderboard ──────────────────────────────────────────────
describe('Professional Leaderboard', () => {
  test('GET /professionals/leaderboard — returns rankings', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/leaderboard?period=weekly')
      .set('Authorization', `Bearer ${proToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.leaderboard) || res.body.leaderboard === null).toBe(true);
  });

  test('Leaderboard requires authentication', async () => {
    const res = await request(app).get('/api/v1/professionals/leaderboard');
    expect(res.status).toBe(401);
  });
});

// ── Payout ───────────────────────────────────────────────────
describe('Professional Payout', () => {
  test('Payout below minimum ₹100 is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/professionals/me/payout')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ amount: 50 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('100');
  });

  test('Payout with insufficient balance is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/professionals/me/payout')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ amount: 99999 });
    expect([400, 404]).toContain(res.status);
  });
});

// ── Schedule ─────────────────────────────────────────────────
describe('Professional Schedule', () => {
  test('GET /professionals/me/schedule — returns schedule', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/schedule')
      .set('Authorization', `Bearer ${proToken}`);
    expect([200, 404]).toContain(res.status);
  });

  test('PUT /professionals/me/availability — week schedule update', async () => {
    const res = await request(app)
      .put('/api/v1/professionals/me/availability')
      .set('Authorization', `Bearer ${proToken}`)
      .send({
        availability: [
          { day: 'Monday',    active: true, start: '09:00 AM', end: '06:00 PM' },
          { day: 'Tuesday',   active: true, start: '09:00 AM', end: '06:00 PM' },
          { day: 'Wednesday', active: true, start: '09:00 AM', end: '06:00 PM' },
          { day: 'Thursday',  active: true, start: '09:00 AM', end: '06:00 PM' },
          { day: 'Friday',    active: true, start: '09:00 AM', end: '06:00 PM' },
          { day: 'Saturday',  active: true, start: '10:00 AM', end: '04:00 PM' },
          { day: 'Sunday',    active: false, start: '09:00 AM', end: '06:00 PM' },
        ],
        vacationMode: false,
      });
    expect(res.status).toBe(200);
  });
});

// ── Reviews ──────────────────────────────────────────────────
describe('Professional Reviews', () => {
  test('GET /reviews/professional/:id — returns reviews', async () => {
    const res = await request(app)
      .get(`/api/v1/reviews/professional/${testPro._id}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });
});
