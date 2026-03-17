/**
 * MK App — Model Unit Tests
 * Tests for User, Booking, Professional, Service, Subscription models
 */
const mongoose = require('mongoose');
const User         = require('../../backend/src/models/User');
const Booking      = require('../../backend/src/models/Booking');
const Professional = require('../../backend/src/models/Professional');
const Service      = require('../../backend/src/models/Service');
const Subscription = require('../../backend/src/models/Subscription');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_models');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── USER MODEL ─────────────────────────────────────────────────
describe('User Model', () => {
  let userId;

  it('should create a valid user', async () => {
    const user = await User.create({
      name:       'Rahul Sharma',
      phone:      '+919876543210',
      role:       'customer',
      isVerified: true,
    });
    expect(user.name).toBe('Rahul Sharma');
    expect(user.role).toBe('customer');
    expect(user.wallet.balance).toBe(0);
    userId = user._id;
  });

  it('should enforce unique phone numbers', async () => {
    await expect(User.create({
      name: 'Duplicate', phone: '+919876543210', role: 'customer',
    })).rejects.toThrow();
  });

  it('should default wallet balance to 0', async () => {
    const user = await User.findById(userId);
    expect(user.wallet.balance).toBe(0);
  });

  it('should have subscription field', async () => {
    const user = await User.findById(userId);
    expect(user.subscription).toBeDefined();
  });

  it('should validate role enum', async () => {
    await expect(User.create({
      name: 'Bad Role', phone: '+919000000099', role: 'superadmin',
    })).rejects.toThrow();
  });

  it('should update wallet balance', async () => {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { 'wallet.balance': 500 } },
      { new: true }
    );
    expect(user.wallet.balance).toBe(500);
  });
});

// ── SERVICE MODEL ──────────────────────────────────────────────
describe('Service Model', () => {
  let serviceId;
  const catId = new mongoose.Types.ObjectId();

  it('should create a valid service', async () => {
    const svc = await Service.create({
      name:          'AC Service',
      category:      catId,
      startingPrice: 499,
      duration:      60,
      description:   'Complete AC maintenance and service',
      isActive:      true,
    });
    expect(svc.name).toBe('AC Service');
    expect(svc.startingPrice).toBe(499);
    serviceId = svc._id;
  });

  it('should default isActive to true', async () => {
    const svc = await Service.findById(serviceId);
    expect(svc.isActive).toBe(true);
  });

  it('should reject negative price', async () => {
    await expect(Service.create({
      name: 'Free Service', category: catId, startingPrice: -10, duration: 30,
    })).rejects.toThrow();
  });

  it('should track booking count', async () => {
    await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });
    const svc = await Service.findById(serviceId);
    expect(svc.totalBookings).toBe(1);
  });
});

// ── BOOKING MODEL ──────────────────────────────────────────────
describe('Booking Model', () => {
  let userId, serviceId, bookingId;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Booking Test User', phone: '+919111111111', role: 'customer', isVerified: true,
    });
    const svc  = await Service.create({
      name: 'Test Service', category: new mongoose.Types.ObjectId(),
      startingPrice: 299, duration: 45, isActive: true,
    });
    userId    = user._id;
    serviceId = svc._id;
  });

  it('should create a booking with auto bookingId', async () => {
    const booking = await Booking.create({
      customer:      userId,
      service:       serviceId,
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: '10:00 AM - 11:00 AM',
      address: { line1: '123 Main St', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
      pricing: { basePrice: 299, totalAmount: 352, amountPaid: 352 },
      payment: { method: 'online', status: 'pending' },
    });

    expect(booking.bookingId).toMatch(/^BK/);
    expect(booking.status).toBe('pending');
    bookingId = booking._id;
  });

  it('should default status to pending', async () => {
    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('pending');
  });

  it('should track status history on update', async () => {
    const booking = await Booking.findById(bookingId);
    booking.status = 'confirmed';
    booking.statusHistory.push({ status: 'confirmed', note: 'Test update' });
    await booking.save();

    const updated = await Booking.findById(bookingId);
    expect(updated.status).toBe('confirmed');
    expect(updated.statusHistory.length).toBeGreaterThan(0);
  });

  it('should populate service details', async () => {
    const booking = await Booking.findById(bookingId).populate('service', 'name startingPrice');
    expect(booking.service.name).toBe('Test Service');
  });

  it('should reject booking without address', async () => {
    await expect(Booking.create({
      customer: userId, service: serviceId,
      scheduledDate: new Date(), scheduledTime: '10 AM',
      pricing: { basePrice: 299, totalAmount: 299 },
    })).rejects.toThrow();
  });
});

// ── PROFESSIONAL MODEL ─────────────────────────────────────────
describe('Professional Model', () => {
  let proUserId;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Pro Test', phone: '+919222222222', role: 'professional', isVerified: true,
    });
    proUserId = user._id;
  });

  it('should create a professional profile', async () => {
    const pro = await Professional.create({
      user:       proUserId,
      experience: 5,
      bio:        'Expert AC technician with 5 years experience',
      services: [{
        serviceId:    new mongoose.Types.ObjectId(),
        name:         'AC Service',
        isAvailable:  true,
        priceOverride: null,
      }],
    });
    expect(pro.user.toString()).toBe(proUserId.toString());
    expect(pro.experience).toBe(5);
    expect(pro.rating).toBe(0);
  });

  it('should default rating to 0', async () => {
    const pro = await Professional.findOne({ user: proUserId });
    expect(pro.rating).toBe(0);
  });

  it('should update rating correctly', async () => {
    const pro = await Professional.findOneAndUpdate(
      { user: proUserId },
      { rating: 4.5, reviewCount: 10 },
      { new: true }
    );
    expect(pro.rating).toBe(4.5);
  });
});

// ── SUBSCRIPTION MODEL ─────────────────────────────────────────
describe('Subscription Model', () => {
  let subUserId;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Sub Test', phone: '+919333333333', role: 'customer', isVerified: true,
    });
    subUserId = user._id;
  });

  it('should create a subscription', async () => {
    const sub = await Subscription.create({
      user:       subUserId,
      plan:       'gold',
      status:     'active',
      startDate:  new Date(),
      endDate:    new Date(Date.now() + 30 * 86400000),
      price:      499,
      finalPrice: 449,
      autoRenew:  true,
    });
    expect(sub.plan).toBe('gold');
    expect(sub.status).toBe('active');
  });

  it('should validate plan enum', async () => {
    await expect(Subscription.create({
      user: subUserId, plan: 'diamond', status: 'active',
      startDate: new Date(), endDate: new Date(), price: 999,
    })).rejects.toThrow();
  });
});
