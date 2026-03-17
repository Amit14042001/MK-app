/**
 * MK App — Booking Controller Unit Tests (Full)
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.JWT_SECRET         = 'booking_test_jwt';
  process.env.JWT_REFRESH_SECRET = 'booking_test_refresh';
  process.env.NODE_ENV           = 'test';
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

// ── Booking Model Tests ────────────────────────────────────────
describe('Booking Model', () => {
  const User        = require('../../backend/src/models/User');
  const Category    = require('../../backend/src/models/Category');
  const Service     = require('../../backend/src/models/Service');
  const Booking     = require('../../backend/src/models/Booking');
  const Professional= require('../../backend/src/models/Professional');

  let customer, service, cat;

  beforeEach(async () => {
    customer = await User.create({ name: 'Test Customer', phone: '9800000001', isPhoneVerified: true });
    cat      = await Category.create({ name: 'Test Cat', icon: '🔧', isActive: true });
    service  = await Service.create({
      name: 'Test Service', description: 'Test', startingPrice: 499,
      category: cat._id, slug: `test-svc-${Date.now()}`, duration: 60, isActive: true,
    });
  });

  it('auto-generates booking ID with MK prefix', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM',
      address: { line1: '123 Test St', city: 'Hyderabad', pincode: '500034' },
      pricing: { basePrice: 499, totalAmount: 553 },
    });
    expect(booking.bookingId).toMatch(/^MK\d{9}$/);
  });

  it('defaults status to pending', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '11:00 AM',
      address: { line1: '123 Test', city: 'Bangalore', pincode: '560001' },
      pricing: { basePrice: 499, totalAmount: 553 },
    });
    expect(booking.status).toBe('pending');
    expect(booking.isReviewed).toBe(false);
    expect(booking.reminderSent).toBe(false);
  });

  it('stores address correctly', async () => {
    const address = { line1: 'Flat 301', area: 'Banjara Hills', city: 'Hyderabad', pincode: '500034', lat: 17.385, lng: 78.487 };
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '2:00 PM',
      address, pricing: { basePrice: 499, totalAmount: 553 },
    });
    expect(booking.address.city).toBe('Hyderabad');
    expect(booking.address.pincode).toBe('500034');
    expect(booking.address.lat).toBe(17.385);
  });

  it('status transitions work correctly', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '3:00 PM',
      address: { line1: '1 Test', city: 'Mumbai', pincode: '400001' },
      pricing: { basePrice: 999, totalAmount: 1100 },
    });

    const validStatuses = ['confirmed', 'professional_assigned', 'in_progress', 'completed'];
    for (const status of validStatuses) {
      booking.status = status;
      booking.statusHistory.push({ status });
      await booking.save();
      const updated = await Booking.findById(booking._id);
      expect(updated.status).toBe(status);
    }
  });

  it('cancellation stores refund info', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '4:00 PM',
      address: { line1: '1 Test', city: 'Chennai', pincode: '600001' },
      pricing: { basePrice: 299, totalAmount: 350, amountPaid: 350 },
    });

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: 'customer',
      reason: 'Change of plans',
      cancelledAt: new Date(),
      refundAmount: 350,
      refundStatus: 'pending',
    };
    await booking.save();

    const updated = await Booking.findById(booking._id);
    expect(updated.cancellation.refundAmount).toBe(350);
    expect(updated.cancellation.refundStatus).toBe('pending');
    expect(updated.cancellation.cancelledBy).toBe('customer');
  });

  it('stores pricing breakdown correctly', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '9:00 AM',
      address: { line1: '1 Test', city: 'Delhi', pincode: '110001' },
      pricing: { basePrice: 499, couponDiscount: 50, convenienceFee: 29, taxes: 81, walletUsed: 100, totalAmount: 459 },
    });
    expect(booking.pricing.basePrice).toBe(499);
    expect(booking.pricing.couponDiscount).toBe(50);
    expect(booking.pricing.walletUsed).toBe(100);
    expect(booking.pricing.totalAmount).toBe(459);
  });

  it('reschedule updates date and time', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 299, totalAmount: 340 },
    });

    const newDate = new Date(Date.now() + 172800000); // 2 days from now
    booking.scheduledDate  = newDate;
    booking.scheduledTime  = '3:00 PM';
    booking.status         = 'rescheduled';
    booking.isRescheduled  = true;
    await booking.save();

    const updated = await Booking.findById(booking._id);
    expect(updated.scheduledTime).toBe('3:00 PM');
    expect(updated.isRescheduled).toBe(true);
    expect(updated.status).toBe('rescheduled');
  });

  it('professional assignment updates booking', async () => {
    const proUser = await User.create({ name: 'Pro User', phone: '9500000099', role: 'professional' });
    const pro     = await Professional.create({ user: proUser._id, isVerified: true, verificationStatus: 'approved' });

    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '12:00 PM',
      address: { line1: '1 Test', city: 'Pune', pincode: '411001' },
      pricing: { basePrice: 599, totalAmount: 680 },
    });

    booking.professional = pro._id;
    booking.status = 'professional_assigned';
    await booking.save();

    const updated = await Booking.findById(booking._id).populate('professional');
    expect(updated.professional._id.toString()).toBe(pro._id.toString());
    expect(updated.status).toBe('professional_assigned');
  });

  it('tracking fields update on completion', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '8:00 AM',
      address: { line1: '1 Test', city: 'Kolkata', pincode: '700001' },
      pricing: { basePrice: 799, totalAmount: 900 },
    });

    const startTime = new Date();
    const endTime   = new Date(startTime.getTime() + 90 * 60000);

    booking.tracking.actualStartTime = startTime;
    booking.tracking.actualEndTime   = endTime;
    booking.status = 'completed';
    await booking.save();

    const updated = await Booking.findById(booking._id);
    expect(updated.tracking.actualStartTime).toBeTruthy();
    expect(updated.tracking.actualEndTime).toBeTruthy();
    expect(updated.status).toBe('completed');
  });
});

// ── Booking Controller Tests ───────────────────────────────────
describe('Booking Controller', () => {
  const bookingController = require('../../backend/src/controllers/bookingController');
  const User     = require('../../backend/src/models/User');
  const Service  = require('../../backend/src/models/Service');
  const Category = require('../../backend/src/models/Category');
  const Booking  = require('../../backend/src/models/Booking');

  const mockRes = () => {
    const res = {};
    res.json   = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  };

  let customer, service, cat;

  beforeEach(async () => {
    customer = await User.create({ name: 'Controller Test', phone: '9700000001', isPhoneVerified: true });
    cat      = await Category.create({ name: 'AC Services', icon: '❄️', isActive: true });
    service  = await Service.create({
      name: 'AC Service', description: 'Expert AC service', startingPrice: 499,
      category: cat._id, slug: `ac-ctrl-${Date.now()}`, duration: 90, isActive: true,
    });
  });

  it('createBooking validates required fields', async () => {
    const req  = { body: {}, user: customer };
    const res  = mockRes();
    const next = jest.fn();
    await bookingController.createBooking(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('createBooking rejects invalid service', async () => {
    const req = {
      body: {
        service: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '10:00 AM',
        address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      },
      user: customer,
    };
    const res  = mockRes();
    const next = jest.fn();
    await bookingController.createBooking(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('getBookings returns empty array for new user', async () => {
    const req = { user: customer, query: {} };
    const res = mockRes();
    await bookingController.getBookings(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(Array.isArray(call.bookings)).toBe(true);
    expect(call.bookings).toHaveLength(0);
  });

  it('getBooking rejects unauthorized access', async () => {
    const otherUser = await User.create({ name: 'Other', phone: '9600000001' });
    const booking   = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 553 },
    });

    const req  = { params: { id: booking._id.toString() }, user: otherUser };
    const res  = mockRes();
    const next = jest.fn();
    await bookingController.getBooking(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('cancelBooking returns refund info', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 172800000), scheduledTime: '10:00 AM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 553, amountPaid: 553 },
      payment: { method: 'online', status: 'paid' },
      status: 'confirmed',
    });

    const req  = { params: { id: booking._id.toString() }, body: { cancellationReason: 'Test cancel' }, user: customer };
    const res  = mockRes();
    await bookingController.cancelBooking(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.booking.status).toBe('cancelled');
    expect(typeof call.refundAmount).toBe('number');
  });

  it('getBookingStats returns correct counts', async () => {
    await Booking.create([
      { customer: customer._id, service: service._id, scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM', address: { line1: '1', city: 'HYD', pincode: '500001' }, pricing: { basePrice: 499, totalAmount: 553 }, status: 'completed' },
      { customer: customer._id, service: service._id, scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '11:00 AM', address: { line1: '1', city: 'HYD', pincode: '500001' }, pricing: { basePrice: 499, totalAmount: 553 }, status: 'cancelled' },
      { customer: customer._id, service: service._id, scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '12:00 PM', address: { line1: '1', city: 'HYD', pincode: '500001' }, pricing: { basePrice: 499, totalAmount: 553 }, status: 'confirmed' },
    ]);

    const req = { user: customer };
    const res = mockRes();
    await bookingController.getBookingStats(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.stats.total).toBe(3);
    expect(call.stats.completed).toBe(1);
    expect(call.stats.cancelled).toBe(1);
    expect(call.stats.upcoming).toBe(1);
  });

  it('rescheduleBooking updates date and time', async () => {
    const booking = await Booking.create({
      customer: customer._id, service: service._id,
      scheduledDate: new Date(Date.now() + 86400000), scheduledTime: '10:00 AM',
      address: { line1: '1 Test', city: 'Hyderabad', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 553 }, status: 'confirmed',
    });

    const newDate = new Date(Date.now() + 172800000).toISOString().split('T')[0];
    const req  = { params: { id: booking._id.toString() }, body: { scheduledDate: newDate, scheduledTime: '3:00 PM', reason: 'Test' }, user: customer };
    const res  = mockRes();
    await bookingController.rescheduleBooking(req, res, jest.fn());
    const call = res.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.booking.scheduledTime).toBe('3:00 PM');
    expect(call.booking.status).toBe('rescheduled');
  });
});
