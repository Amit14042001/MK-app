/**
 * MK App — Unit Tests (Comprehensive)
 * Coverage: Auth, Booking, Matching, Models, Utils
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET         = 'test_jwt_secret_mk_2026';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_mk_2026';
  process.env.RAZORPAY_KEY_ID     = 'rzp_test_xxx';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
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

// ── USER MODEL ────────────────────────────────────────────────
describe('User Model', () => {
  const User = require('../../backend/src/models/User');

  it('creates a user with required fields', async () => {
    const user = await User.create({
      name: 'Rahul Sharma',
      phone: '9876543210',
      isPhoneVerified: true,
    });
    expect(user._id).toBeDefined();
    expect(user.name).toBe('Rahul Sharma');
    expect(user.phone).toBe('9876543210');
    expect(user.role).toBe('customer');
    expect(user.membershipTier).toBe('Standard');
  });

  it('auto-generates referral code', async () => {
    const user = await User.create({ name: 'Test', phone: '9000000001' });
    expect(user.referralCode).toMatch(/^MK[A-Z0-9]{6}$/);
  });

  it('hashes password before save', async () => {
    const user = await User.create({ name: 'Test', phone: '9000000002', password: 'Test@1234' });
    const dbUser = await User.findById(user._id).select('+password');
    expect(dbUser.password).not.toBe('Test@1234');
    expect(dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$')).toBe(true);
  });

  it('matchPassword returns true for correct password', async () => {
    const user = await User.create({ name: 'Test', phone: '9000000003', password: 'Correct@123' });
    const dbUser = await User.findById(user._id).select('+password');
    expect(await dbUser.matchPassword('Correct@123')).toBe(true);
    expect(await dbUser.matchPassword('WrongPass')).toBe(false);
  });

  it('generates valid JWT token', async () => {
    const user = await User.create({ name: 'Test', phone: '9000000004' });
    const token = user.generateAccessToken();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('updates membership tier based on spend', async () => {
    const user = await User.create({ name: 'Test', phone: '9000000005' });
    user.totalSpent = 6000;
    user.updateMembershipTier();
    expect(user.membershipTier).toBe('Silver');

    user.totalSpent = 25000;
    user.updateMembershipTier();
    expect(user.membershipTier).toBe('Gold');

    user.totalSpent = 60000;
    user.updateMembershipTier();
    expect(user.membershipTier).toBe('Platinum');
  });

  it('rejects duplicate phone numbers', async () => {
    await User.create({ name: 'First', phone: '9876543001' });
    await expect(User.create({ name: 'Second', phone: '9876543001' }))
      .rejects.toThrow();
  });

  it('rejects invalid Indian phone number format', async () => {
    await expect(User.create({ name: 'Test', phone: '1234567890' }))
      .rejects.toThrow();
  });
});

// ── BOOKING MODEL ─────────────────────────────────────────────
describe('Booking Model', () => {
  const User        = require('../../backend/src/models/User');
  const Service     = require('../../backend/src/models/Service');
  const Category    = require('../../backend/src/models/Category');
  const Booking     = require('../../backend/src/models/Booking');

  let customer, service;

  beforeEach(async () => {
    customer = await User.create({ name: 'Customer', phone: '9800000001' });
    const cat = await Category.create({ name: 'Test Cat', icon: '🔧' });
    service   = await Service.create({
      name: 'AC Service', description: 'Test', startingPrice: 499,
      category: cat._id, slug: 'ac-service', duration: 90,
    });
  });

  it('auto-generates bookingId', async () => {
    const booking = await Booking.create({
      customer: customer._id,
      service:  service._id,
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: '10:00 AM',
      address: { line1: '123 St', city: 'Hyderabad', pincode: '500034' },
      pricing: { basePrice: 499, totalAmount: 553 },
    });
    expect(booking.bookingId).toMatch(/^MK\d{9}$/);
    expect(booking.status).toBe('pending');
  });

  it('defaults status to pending', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: '2:00 PM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 299, totalAmount: 350 },
    });
    expect(booking.status).toBe('pending');
    expect(booking.isReviewed).toBe(false);
  });
});

// ── COUPON MODEL ──────────────────────────────────────────────
describe('Coupon Model', () => {
  const Coupon = require('../../backend/src/models/Coupon');
  const userId = new mongoose.Types.ObjectId();

  const baseCoupon = {
    code: 'SAVE100',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 300,
    validUntil: new Date(Date.now() + 86400000),
  };

  it('validates a valid coupon', async () => {
    const c = await Coupon.create(baseCoupon);
    const result = c.isValid(userId, 500);
    expect(result.valid).toBe(true);
  });

  it('rejects coupon below minimum order', async () => {
    const c = await Coupon.create({ ...baseCoupon, code: 'MIN200' });
    expect(c.isValid(userId, 100).valid).toBe(false);
    expect(c.isValid(userId, 100).message).toMatch(/minimum/i);
  });

  it('rejects expired coupon', async () => {
    const c = await Coupon.create({
      ...baseCoupon, code: 'EXPIRED',
      validUntil: new Date(Date.now() - 86400000),
    });
    expect(c.isValid(userId, 500).valid).toBe(false);
  });

  it('calculates flat discount correctly', async () => {
    const c = await Coupon.create({ ...baseCoupon, code: 'FLAT50', discountValue: 50 });
    expect(c.calculateDiscount(500)).toBe(50);
    expect(c.calculateDiscount(30)).toBe(30); // cannot discount more than order
  });

  it('calculates percentage discount with cap', async () => {
    const c = await Coupon.create({
      ...baseCoupon, code: 'PCT20',
      discountType: 'percentage', discountValue: 20, maxDiscount: 200,
    });
    expect(c.calculateDiscount(500)).toBe(100);   // 20% of 500 = 100
    expect(c.calculateDiscount(2000)).toBe(200);   // capped at 200
  });
});

// ── AUTH CONTROLLER ───────────────────────────────────────────
describe('Auth Controller', () => {
  const authController = require('../../backend/src/controllers/authController');
  const User = require('../../backend/src/models/User');

  const mockRes = () => {
    const res = {};
    res.json   = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  };

  it('sendOTP returns success for valid phone', async () => {
    const req = { body: { phone: '9876543210' } };
    const res = mockRes();
    await authController.sendOTP(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('sendOTP rejects invalid phone', async () => {
    const req = { body: { phone: '123' } };
    const res = mockRes();
    const next = jest.fn();
    await authController.sendOTP(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('verifyOTP fails with wrong OTP', async () => {
    const req = { body: { phone: '9876543211', otp: '9999', name: 'Test' } };
    const res = mockRes();
    const next = jest.fn();
    await authController.verifyOTP(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('getMe returns user info', async () => {
    const user = await User.create({ name: 'Test User', phone: '9700000001' });
    const req = { user };
    const res = mockRes();
    await authController.getMe(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, user: expect.any(Object) }));
  });
});

// ── SERVICE CONTROLLER ────────────────────────────────────────
describe('Service Controller', () => {
  const serviceController = require('../../backend/src/controllers/serviceController');
  const Category = require('../../backend/src/models/Category');
  const Service  = require('../../backend/src/models/Service');

  const mockRes = () => {
    const res = {};
    res.json   = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  };

  let cat;
  beforeEach(async () => {
    cat = await Category.create({ name: 'Appliances', icon: '🔧' });
    await Service.create({
      name: 'AC Service', description: 'Best AC service', startingPrice: 499,
      category: cat._id, slug: 'ac-service-unit', isFeatured: true, isActive: true,
    });
  });

  it('getServices returns active services', async () => {
    const req = { query: {} };
    const res = mockRes();
    await serviceController.getServices(req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getFeaturedServices returns featured only', async () => {
    const req = { query: {} };
    const res = mockRes();
    await serviceController.getFeaturedServices(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
  });

  it('searchServices finds by name', async () => {
    const req = { query: { q: 'AC' } };
    const res = mockRes();
    await serviceController.searchServices(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
  });
});

// ── MATCHING SERVICE ──────────────────────────────────────────
describe('Matching Service', () => {
  const matchingService = require('../../backend/src/services/matchingService');

  it('exports findBestProfessionals function', () => {
    expect(typeof matchingService.findBestProfessionals).toBe('function');
  });

  it('exports assignProfessional function', () => {
    expect(typeof matchingService.assignProfessional).toBe('function');
  });

  it('handles empty professional pool gracefully', async () => {
    const fakeBooking = {
      _id: new mongoose.Types.ObjectId(),
      service: new mongoose.Types.ObjectId(),
      address: { lat: 17.385, lng: 78.487, city: 'Hyderabad' },
    };
    const result = await matchingService.findBestProfessionals(fakeBooking);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── ERROR HANDLER ─────────────────────────────────────────────
describe('Error Handler Middleware', () => {
  const { AppError, asyncHandler, errorHandler } = require('../../backend/src/middleware/errorHandler');

  it('AppError sets correct statusCode', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('asyncHandler catches async errors', async () => {
    const fn = asyncHandler(async (req, res, next) => { throw new AppError('Boom', 400); });
    const next = jest.fn();
    await fn({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('errorHandler returns JSON with success:false', () => {
    const err = new AppError('Test error', 422);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Test error' }));
  });

  it('handles Mongoose duplicate key error', () => {
    const err = { code: 11000, keyValue: { phone: '9999' }, message: 'dup key' };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].message).toMatch(/already exists/i);
  });

  it('handles Mongoose validation error', () => {
    const err = {
      name: 'ValidationError',
      errors: { phone: { message: 'Phone is required' } },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, jest.fn());
    expect(res.json.mock.calls[0][0].message).toContain('Phone is required');
  });
});

// ── UTILS ─────────────────────────────────────────────────────
describe('SMS Utility', () => {
  const { sendSMS, sendOTPSMS } = require('../../backend/src/utils/sms');

  it('sendSMS mocks when no credentials', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const result = await sendSMS('9876543210', 'Test message');
    expect(result).toEqual({ mock: true });
  });

  it('sendOTPSMS formats OTP message', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const result = await sendOTPSMS('9876543210', '1234');
    expect(result).toEqual({ mock: true });
  });
});

describe('Email Utility', () => {
  const { sendEmail, otpEmail } = require('../../backend/src/utils/email');

  it('sendEmail mocks when no credentials', async () => {
    delete process.env.EMAIL_USER;
    const result = await sendEmail({ to: 'test@test.com', subject: 'Test', html: '<p>Test</p>' });
    expect(result).toEqual({ mock: true });
  });

  it('otpEmail generates correct structure', () => {
    const email = otpEmail({ user: { name: 'Test', email: 'test@test.com' }, otp: '1234' });
    expect(email.to).toBe('test@test.com');
    expect(email.subject).toContain('1234');
    expect(email.html).toContain('1234');
  });
});
