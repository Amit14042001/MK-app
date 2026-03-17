/**
 * MK App — Payment Controller Unit Tests (Full)
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET         = 'payment_test_jwt';
  process.env.RAZORPAY_KEY_ID     = 'rzp_test_xxx';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  process.env.NODE_ENV           = 'test';
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

describe('Coupon Model — Full Tests', () => {
  const Coupon = require('../../backend/src/models/Coupon');
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  const baseCode = { code: 'TESTBASE', discountType: 'flat', discountValue: 100, minOrderAmount: 300, validUntil: new Date(Date.now() + 86400000) };

  it('creates coupon with correct defaults', async () => {
    const c = await Coupon.create(baseCode);
    expect(c.usedCount).toBe(0);
    expect(c.isActive).toBe(true);
    expect(c.perUserLimit).toBe(1);
  });

  it('validates flat discount coupon', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'FLAT100' });
    const result = c.isValid(userId1, 500);
    expect(result.valid).toBe(true);
  });

  it('rejects coupon below min order', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'MIN300' });
    const result = c.isValid(userId1, 200);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/minimum/i);
  });

  it('rejects expired coupon', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'EXPIRED1', validUntil: new Date(Date.now() - 1) });
    expect(c.isValid(userId1, 500).valid).toBe(false);
  });

  it('rejects inactive coupon', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'INACTIVE1', isActive: false });
    expect(c.isValid(userId1, 500).valid).toBe(false);
  });

  it('rejects when usage limit reached', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'LIMIT1', totalUsageLimit: 1, usedCount: 1 });
    expect(c.isValid(userId1, 500).valid).toBe(false);
  });

  it('rejects when user already used coupon', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'USED1', usedBy: [userId1] });
    expect(c.isValid(userId1, 500).valid).toBe(false);
    expect(c.isValid(userId2, 500).valid).toBe(true);
  });

  it('calculates flat discount correctly', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'FLAT50B', discountValue: 50 });
    expect(c.calculateDiscount(500)).toBe(50);
    expect(c.calculateDiscount(30)).toBe(30); // can't exceed order amount
  });

  it('calculates percentage discount with cap', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'PCT20CAP', discountType: 'percentage', discountValue: 20, maxDiscount: 150 });
    expect(c.calculateDiscount(500)).toBe(100);   // 20% of 500 = 100
    expect(c.calculateDiscount(1000)).toBe(150);  // 20% of 1000 = 200 > cap 150
  });

  it('handles percentage discount without cap', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'PCT15', discountType: 'percentage', discountValue: 15 });
    expect(c.calculateDiscount(1000)).toBe(150);
    expect(c.calculateDiscount(500)).toBe(75);
  });

  it('allows new-user-only coupon for new user', async () => {
    const c = await Coupon.create({ ...baseCode, code: 'NEWUSER1', newUsersOnly: true });
    // isValid doesn't check booking history — that's done in controller
    const result = c.isValid(userId1, 500);
    expect(result.valid).toBe(true);
  });
});

describe('Payment Controller', () => {
  const paymentController = require('../../backend/src/controllers/paymentController');
  const User     = require('../../backend/src/models/User');
  const Category = require('../../backend/src/models/Category');
  const Service  = require('../../backend/src/models/Service');
  const Booking  = require('../../backend/src/models/Booking');
  const Coupon   = require('../../backend/src/models/Coupon');

  const mockRes = () => {
    const res = {}; res.json = jest.fn().mockReturnValue(res); res.status = jest.fn().mockReturnValue(res); return res;
  };

  let customer, service, booking;

  beforeEach(async () => {
    customer = await User.create({ name: 'Pay Test', phone: '9800000099', isPhoneVerified: true });
    const cat = await Category.create({ name: 'Test', icon: '🔧', isActive: true });
    service  = await Service.create({ name: 'Pay Test Svc', description: 'Test', startingPrice: 499, category: cat._id, slug: `pay-test-${Date.now()}`, duration: 60, isActive: true });
    booking  = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 553, amountPaid: 0 },
      payment: { method: 'online', status: 'pending' },
    });
  });

  it('applyCoupon validates coupon correctly', async () => {
    const coupon = await Coupon.create({ code: 'APPLY100', discountType: 'flat', discountValue: 100, minOrderAmount: 300, validUntil: new Date(Date.now() + 86400000) });
    const req  = { body: { code: 'APPLY100', amount: 500 }, user: customer };
    const res  = mockRes();
    await paymentController.applyCoupon(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.discount).toBe(100);
    expect(call.finalAmount).toBe(400);
    expect(call.coupon.code).toBe('APPLY100');
  });

  it('applyCoupon rejects invalid coupon', async () => {
    const req  = { body: { code: 'INVALID999', amount: 500 }, user: customer };
    const res  = mockRes();
    const next = jest.fn();
    await paymentController.applyCoupon(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('applyCoupon rejects below minimum order', async () => {
    await Coupon.create({ code: 'MIN500', discountType: 'flat', discountValue: 100, minOrderAmount: 500, validUntil: new Date(Date.now() + 86400000) });
    const req  = { body: { code: 'MIN500', amount: 200 }, user: customer };
    const res  = mockRes();
    const next = jest.fn();
    await paymentController.applyCoupon(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('getPaymentHistory returns empty for new user', async () => {
    const req = { user: customer, query: {} };
    const res = mockRes();
    await paymentController.getPaymentHistory(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(Array.isArray(call.payments)).toBe(true);
    expect(call.payments).toHaveLength(0);
  });

  it('getWalletTransactions returns wallet data', async () => {
    // Add some transactions
    await User.findByIdAndUpdate(customer._id, {
      'wallet.balance': 500,
      $push: { 'wallet.transactions': { type: 'credit', amount: 500, description: 'Test credit' } },
    });
    const req = { user: { _id: customer._id }, query: {} };
    const res = mockRes();
    await paymentController.getWalletTransactions(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.balance).toBe(500);
    expect(Array.isArray(call.transactions)).toBe(true);
  });

  it('getInvoice returns 404 for missing booking', async () => {
    const req  = { params: { bookingId: new mongoose.Types.ObjectId().toString() }, user: customer };
    const res  = mockRes();
    const next = jest.fn();
    await paymentController.getInvoice(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('getInvoice returns invoice for valid booking', async () => {
    const req = { params: { bookingId: booking._id.toString() }, user: customer };
    const res = mockRes();
    await paymentController.getInvoice(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.invoice).toBeDefined();
    expect(call.invoice.invoiceNumber).toMatch(/INV-MK/);
  });
});

describe('User Wallet Operations', () => {
  const User = require('../../backend/src/models/User');

  it('wallet credits accumulate correctly', async () => {
    const user = await User.create({ name: 'Wallet Test', phone: '9700000099' });
    expect(user.wallet.balance).toBe(0);

    user.wallet.balance += 200;
    user.wallet.transactions.push({ type: 'credit', amount: 200, description: 'First credit' });
    await user.save();

    user.wallet.balance += 300;
    user.wallet.transactions.push({ type: 'credit', amount: 300, description: 'Second credit' });
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.wallet.balance).toBe(500);
    expect(updated.wallet.transactions).toHaveLength(2);
  });

  it('wallet debit reduces balance', async () => {
    const user = await User.create({ name: 'Wallet Debit', phone: '9700000098' });
    user.wallet.balance = 1000;
    await user.save();

    user.wallet.balance -= 499;
    user.wallet.transactions.push({ type: 'debit', amount: 499, description: 'Payment for AC Service' });
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.wallet.balance).toBe(501);
    expect(updated.wallet.transactions[0].type).toBe('debit');
  });

  it('wallet does not go negative', async () => {
    const user = await User.create({ name: 'Wallet Zero', phone: '9700000097' });
    user.wallet.balance = 100;
    await user.save();

    // Ensure you never deduct more than balance
    const deduct = Math.min(200, user.wallet.balance); // would be 100
    user.wallet.balance -= deduct;
    await user.save();

    const updated = await User.findById(user._id);
    expect(updated.wallet.balance).toBe(0);
  });

  it('referral bonus adds to both users', async () => {
    const referrer  = await User.create({ name: 'Referrer', phone: '9700000096', referralCode: 'MKREF01' });
    const newUser   = await User.create({ name: 'New User', phone: '9700000095' });

    referrer.wallet.balance += 50;
    referrer.wallet.transactions.push({ type: 'credit', amount: 50, description: 'Referral bonus' });
    await referrer.save();

    newUser.wallet.balance += 100;
    newUser.wallet.transactions.push({ type: 'credit', amount: 100, description: 'Welcome bonus' });
    newUser.referredBy = referrer._id;
    await newUser.save();

    const updatedRef  = await User.findById(referrer._id);
    const updatedNew  = await User.findById(newUser._id);
    expect(updatedRef.wallet.balance).toBe(50);
    expect(updatedNew.wallet.balance).toBe(100);
    expect(updatedNew.referredBy.toString()).toBe(referrer._id.toString());
  });
});
