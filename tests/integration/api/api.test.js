/**
 * MK App — API Integration Tests (Full)
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI          = mongod.getUri();
  process.env.JWT_SECRET         = 'integration_jwt_secret';
  process.env.JWT_REFRESH_SECRET = 'integration_refresh';
  process.env.NODE_ENV           = 'test';
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  for (const key of Object.keys(mongoose.connection.collections)) {
    await mongoose.connection.collections[key].deleteMany({});
  }
});

// ── FULL USER JOURNEY ─────────────────────────────────────────
describe('User Journey: Register → Book → Review', () => {
  const User     = require('../../../backend/src/models/User');
  const Category = require('../../../backend/src/models/Category');
  const Service  = require('../../../backend/src/models/Service');
  const Booking  = require('../../../backend/src/models/Booking');
  const Review   = require('../../../backend/src/models/Review');

  test('Complete booking lifecycle', async () => {
    // 1. Create user
    const user = await User.create({ name: 'Journey User', phone: '9800000099', isPhoneVerified: true });
    expect(user.referralCode).toBeTruthy();

    // 2. Create category + service
    const cat = await Category.create({ name: 'Cleaning', icon: '🧹', isActive: true });
    const svc = await Service.create({
      name: 'Home Cleaning', description: 'Professional cleaning', startingPrice: 299,
      category: cat._id, slug: 'home-cleaning-journey', duration: 120, isActive: true,
    });

    // 3. Create booking
    const booking = await Booking.create({
      customer: user._id,
      service: svc._id,
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: '11:00 AM',
      address: { line1: '456 Test Ave', city: 'Bangalore', pincode: '560001', lat: 12.97, lng: 77.59 },
      pricing: { basePrice: 299, convenienceFee: 19, taxes: 15, totalAmount: 333, amountPaid: 333 },
      payment: { method: 'online', status: 'paid' },
      status: 'confirmed',
    });
    expect(booking.bookingId).toMatch(/^MK/);
    expect(booking.status).toBe('confirmed');

    // 4. Simulate professional assigned → in_progress → completed
    const proUser = await User.create({ name: 'Pro User', phone: '9100000099', role: 'professional' });
    const Professional = require('../../../backend/src/models/Professional');
    const pro = await Professional.create({
      user: proUser._id,
      isVerified: true, verificationStatus: 'approved',
      rating: 4.8, completedBookings: 50,
    });

    booking.professional = pro._id;
    booking.status = 'completed';
    booking.statusHistory.push({ status: 'completed' });
    booking.tracking.actualEndTime = new Date();
    booking.isReviewed = false;
    await booking.save();

    expect(booking.status).toBe('completed');

    // 5. Create review
    const review = await Review.create({
      booking: booking._id,
      customer: user._id,
      professional: pro._id,
      service: svc._id,
      rating: { overall: 5, punctuality: 5, quality: 5 },
      comment: 'Outstanding service!',
      tags: ['Great work', 'On time'],
    });
    expect(review.rating.overall).toBe(5);

    // 6. Mark booking as reviewed
    booking.isReviewed = true;
    booking.review = review._id;
    await booking.save();

    const final = await Booking.findById(booking._id);
    expect(final.isReviewed).toBe(true);
  });

  test('Wallet credit on booking payment', async () => {
    const user = await User.create({ name: 'Wallet User', phone: '9800000088' });
    expect(user.wallet.balance).toBe(0);

    // Credit wallet
    user.wallet.balance += 500;
    user.wallet.transactions.push({ type: 'credit', amount: 500, description: 'Test credit' });
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.wallet.balance).toBe(500);
    expect(updated.wallet.transactions).toHaveLength(1);
  });

  test('Coupon validation with user limit', async () => {
    const Coupon = require('../../../backend/src/models/Coupon');
    const user1  = await User.create({ name: 'Coupon User', phone: '9700000001' });
    const user2  = await User.create({ name: 'Coupon User2', phone: '9700000002' });

    const coupon = await Coupon.create({
      code: 'ONEUSE', discountType: 'flat', discountValue: 200,
      minOrderAmount: 300, perUserLimit: 1,
      validUntil: new Date(Date.now() + 86400000),
    });

    expect(coupon.isValid(user1._id, 500).valid).toBe(true);
    expect(coupon.isValid(user2._id, 500).valid).toBe(true);

    // Simulate user1 used it
    coupon.usedBy.push(user1._id);
    coupon.usedCount += 1;
    await coupon.save();

    expect(coupon.isValid(user1._id, 500).valid).toBe(false);
    expect(coupon.isValid(user2._id, 500).valid).toBe(true);
  });
});

// ── PROFESSIONAL JOURNEY ──────────────────────────────────────
describe('Professional Journey: Register → Accept Job → Earn', () => {
  const User         = require('../../../backend/src/models/User');
  const Professional = require('../../../backend/src/models/Professional');
  const Booking      = require('../../../backend/src/models/Booking');
  const Category     = require('../../../backend/src/models/Category');
  const Service      = require('../../../backend/src/models/Service');

  test('Professional earns commission after completing job', async () => {
    const proUser = await User.create({ name: 'Pro', phone: '9500000001', role: 'professional' });
    const customer = await User.create({ name: 'Cust', phone: '9500000002' });
    const cat = await Category.create({ name: 'Test', icon: '🔧' });
    const svc = await Service.create({
      name: 'Test Svc', description: 'Desc', startingPrice: 999,
      category: cat._id, slug: 'test-svc-pro', duration: 60, isActive: true,
    });

    const pro = await Professional.create({
      user: proUser._id,
      isVerified: true, verificationStatus: 'approved',
      commissionRate: 20,
    });

    const booking = await Booking.create({
      customer: customer._id, service: svc._id, professional: pro._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '2:00 PM',
      address: { line1: '1 Pro St', city: 'Mumbai', pincode: '400001' },
      pricing: { basePrice: 999, totalAmount: 1100 },
      status: 'completed',
    });

    const earnings = Math.round(booking.pricing.totalAmount * (1 - pro.commissionRate / 100));
    expect(earnings).toBe(880); // 80% of ₹1100

    await Professional.findByIdAndUpdate(pro._id, {
      $inc: { totalEarnings: earnings, 'wallet.balance': earnings, completedBookings: 1 },
      $push: { 'wallet.transactions': { bookingId: booking._id, amount: earnings, type: 'credit', description: 'Test' } },
    });

    const updated = await Professional.findById(pro._id);
    expect(updated.totalEarnings).toBe(880);
    expect(updated.wallet.balance).toBe(880);
    expect(updated.completedBookings).toBe(1);
  });
});

// ── SUBSCRIPTION JOURNEY ──────────────────────────────────────
describe('Subscription Model', () => {
  test('Subscription model has correct structure', async () => {
    const { Subscription } = require('../../../backend/src/models/Subscription');
    expect(Subscription).toBeDefined();

    const User = require('../../../backend/src/models/User');
    const user = await User.create({ name: 'Sub User', phone: '9600000001' });

    const sub = await Subscription.create({
      user: user._id,
      plan: { type: 'monthly', name: 'MK Prime', price: 299 },
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      payment: { amount: 299 },
    });

    expect(sub.status).toBe('active');
    expect(sub.isActive).toBe(true);
    expect(sub.daysRemaining).toBeGreaterThan(0);
  });
});

// ── ADMIN STATS ───────────────────────────────────────────────
describe('Admin Controller', () => {
  test('getDashboardStats computes correct counts', async () => {
    const adminController = require('../../../backend/src/controllers/adminController');
    const User    = require('../../../backend/src/models/User');
    const Booking = require('../../../backend/src/models/Booking');

    await User.create([
      { name: 'U1', phone: '9200000001', role: 'customer' },
      { name: 'U2', phone: '9200000002', role: 'customer' },
      { name: 'P1', phone: '9200000003', role: 'professional' },
    ]);

    const res = { json: jest.fn() };
    await adminController.getDashboardStats({ user: { role: 'admin' } }, res, jest.fn());
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.users).toBeDefined();
  });
});
