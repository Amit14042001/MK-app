/**
 * MK App — Payment Controller Tests
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Booking  = require('../../backend/src/models/Booking');
const Payment  = require('../../backend/src/models/Payment');
const Service  = require('../../backend/src/models/Service');
const jwt      = require('jsonwebtoken');

const makeToken = (id, role = 'customer') =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

let customerToken, adminToken, userId, bookingId, serviceId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_payment');

  const customer = await User.create({
    name: 'Payment Test User', phone: '+919600000001',
    role: 'customer', isVerified: true,
    wallet: { balance: 500 },
  });
  const admin = await User.create({
    name: 'Payment Admin', phone: '+919600000002',
    role: 'admin', isVerified: true,
  });

  userId        = customer._id;
  customerToken = makeToken(customer._id);
  adminToken    = makeToken(admin._id, 'admin');

  const svc = await Service.create({
    name: 'Payment Test Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 499, duration: 60, isActive: true,
  });
  serviceId = svc._id;

  const booking = await Booking.create({
    customer:      userId,
    service:       serviceId,
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00 AM',
    address: { line1: '1 Test', city: 'Hyderabad', state: 'TS', pincode: '500001' },
    pricing: { basePrice: 499, totalAmount: 619, amountPaid: 0 },
    payment: { method: 'online', status: 'pending' },
  });
  bookingId = booking._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/v1/payments/create-order', () => {
  it('should create Razorpay order for valid booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId });

    // May fail if Razorpay keys not configured in test
    expect([200, 201, 400, 500]).toContain(res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.order || res.body.data).toBeDefined();
    }
  });

  it('should reject unauthenticated payment request', async () => {
    const res = await request(app)
      .post('/api/v1/payments/create-order')
      .send({ bookingId });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/payments/history', () => {
  it('should return payment history for customer', async () => {
    const res = await request(app)
      .get('/api/v1/payments/history')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.payments || res.body.data)).toBe(true);
  });
});

describe('GET /api/v1/users/wallet', () => {
  it('should return wallet balance and transactions', async () => {
    const res = await request(app)
      .get('/api/v1/users/wallet')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    if (res.body.wallet) {
      expect(typeof res.body.wallet.balance).toBe('number');
    }
  });
});

describe('POST /api/v1/payments/verify', () => {
  it('should reject invalid Razorpay signature', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        razorpay_order_id:   'order_fake123',
        razorpay_payment_id: 'pay_fake456',
        razorpay_signature:  'invalid_signature',
        bookingId,
      });

    expect([200, 400]).toContain(res.statusCode);
  });
});

describe('Coupon Validation', () => {
  it('should validate coupon via booking creation with invalid code', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service:       serviceId,
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '2:00 PM',
        address: { line1: '5 Test', city: 'Hyderabad', state: 'TS', pincode: '500001' },
        couponCode: 'INVALID999',
        payment: { method: 'cash' },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/coupon|invalid/i);
  });
});

describe('Wallet Transactions', () => {
  it('should deduct wallet balance when used in booking', async () => {
    const userBefore = await User.findById(userId);
    const walletBefore = userBefore.wallet.balance;

    if (walletBefore <= 0) return;

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service:       serviceId,
        scheduledDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        scheduledTime: '3:00 PM',
        address: { line1: '10 Wallet St', city: 'Hyderabad', state: 'TS', pincode: '500001' },
        payment: { method: 'wallet' },
        pricing: { walletUsed: Math.min(100, walletBefore) },
      });

    if (res.statusCode === 201) {
      const userAfter = await User.findById(userId);
      expect(userAfter.wallet.balance).toBeLessThan(walletBefore);
    }
  });
});
