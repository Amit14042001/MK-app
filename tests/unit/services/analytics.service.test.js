/**
 * MK App — Analytics Service Tests
 */
const mongoose = require('mongoose');

jest.mock('../../backend/src/config/redis', () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue('OK'),
  del:        jest.fn().mockResolvedValue(1),
  delPattern: jest.fn().mockResolvedValue(1),
  incr:       jest.fn().mockResolvedValue(1),
  expire:     jest.fn().mockResolvedValue(1),
}));

const analyticsService = require('../../backend/src/services/analyticsService');
const Booking  = require('../../backend/src/models/Booking');
const User     = require('../../backend/src/models/User');
const Payment  = require('../../backend/src/models/Payment');
const Service  = require('../../backend/src/models/Service');
const Category = require('../../backend/src/models/Category');

let customerId1, customerId2, serviceId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_analytics');

  const [u1, u2] = await User.create([
    { name: 'Analytics User 1', phone: '+919200000001', role: 'customer', isVerified: true },
    { name: 'Analytics User 2', phone: '+919200000002', role: 'customer', isVerified: true },
  ]);
  customerId1 = u1._id;
  customerId2 = u2._id;

  const cat = await Category.create({ name: 'Analytics Cat', icon: '📊', isActive: true });
  const svc = await Service.create({
    name: 'Analytics Service', category: cat._id,
    startingPrice: 499, duration: 60, isActive: true,
  });
  serviceId = svc._id;

  // Create some bookings and payments for analytics
  const bookings = await Booking.create([
    {
      customer: customerId1, service: serviceId,
      scheduledDate: new Date(), scheduledTime: '10 AM',
      status: 'completed',
      address: { line1: '1 Test', city: 'Hyderabad', state: 'TS', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 619, amountPaid: 619 },
      payment: { method: 'online', status: 'paid' },
    },
    {
      customer: customerId2, service: serviceId,
      scheduledDate: new Date(), scheduledTime: '2 PM',
      status: 'completed',
      address: { line1: '2 Test', city: 'Mumbai', state: 'MH', pincode: '400001' },
      pricing: { basePrice: 499, totalAmount: 619, amountPaid: 619 },
      payment: { method: 'upi', status: 'paid' },
    },
    {
      customer: customerId1, service: serviceId,
      scheduledDate: new Date(), scheduledTime: '4 PM',
      status: 'cancelled',
      address: { line1: '3 Test', city: 'Hyderabad', state: 'TS', pincode: '500001' },
      pricing: { basePrice: 499, totalAmount: 619, amountPaid: 0 },
      payment: { method: 'cash', status: 'pending' },
    },
  ]);

  await Payment.create([
    { user: customerId1, booking: bookings[0]._id, amount: 619, type: 'booking', status: 'completed', gateway: 'razorpay' },
    { user: customerId2, booking: bookings[1]._id, amount: 619, type: 'booking', status: 'completed', gateway: 'upi' },
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('AnalyticsService.getDashboardOverview', () => {
  it('should return overview object with required fields', async () => {
    const overview = await analyticsService.getDashboardOverview('month');

    expect(overview).toBeDefined();
    expect(overview.period).toBe('month');
    expect(overview.bookings).toBeDefined();
    expect(typeof overview.bookings.total).toBe('number');
    expect(typeof overview.bookings.completed).toBe('number');
    expect(typeof overview.bookings.cancelled).toBe('number');
    expect(overview.revenue).toBeDefined();
    expect(overview.users).toBeDefined();
  });

  it('should calculate completion rate correctly', async () => {
    const overview = await analyticsService.getDashboardOverview('month');
    const { total, completed, completionRate } = overview.bookings;
    if (total > 0) {
      const expected = Math.round((completed / total) * 100);
      expect(completionRate).toBe(expected);
    }
  });

  it('should work for different periods', async () => {
    for (const period of ['today', 'week', 'month', 'year']) {
      const data = await analyticsService.getDashboardOverview(period);
      expect(data.period).toBe(period);
      expect(data.bookings).toBeDefined();
    }
  });
});

describe('AnalyticsService.getRevenueBreakdown', () => {
  it('should return revenue breakdown', async () => {
    const data = await analyticsService.getRevenueBreakdown('month');
    expect(data).toBeDefined();
    expect(data.period).toBe('month');
    expect(Array.isArray(data.dailyRevenue)).toBe(true);
    expect(Array.isArray(data.byCategory)).toBe(true);
    expect(Array.isArray(data.byMethod)).toBe(true);
  });
});

describe('AnalyticsService.getUserAnalytics', () => {
  it('should return user analytics', async () => {
    const data = await analyticsService.getUserAnalytics('month');
    expect(data).toBeDefined();
    expect(typeof data.totalUsers).toBe('number');
    expect(typeof data.activeUsers).toBe('number');
    expect(Array.isArray(data.dailyRegistrations)).toBe(true);
    expect(Array.isArray(data.topCities)).toBe(true);
  });
});

describe('AnalyticsService.getServicePerformance', () => {
  it('should return service performance data', async () => {
    const data = await analyticsService.getServicePerformance('month');
    expect(data).toBeDefined();
    expect(Array.isArray(data.topServices)).toBe(true);
  });

  it('should include completion rate for each service', async () => {
    const data = await analyticsService.getServicePerformance('month');
    data.topServices.forEach(svc => {
      expect(typeof svc.bookings).toBe('number');
      expect(svc.completionRate).toBeDefined();
    });
  });
});

describe('AnalyticsService.getRealtimeStats', () => {
  it('should return realtime statistics', async () => {
    const data = await analyticsService.getRealtimeStats();
    expect(data).toBeDefined();
    expect(typeof data.bookingsToday).toBe('number');
    expect(typeof data.activeBookings).toBe('number');
    expect(data.timestamp).toBeDefined();
  });
});

describe('AnalyticsService.getDateRange', () => {
  it('should return correct date range for today', () => {
    const { start, end } = analyticsService.getDateRange('today');
    const now = new Date();
    expect(start.getDate()).toBe(now.getDate());
    expect(end.getTime()).toBeLessThanOrEqual(now.getTime() + 1000);
  });

  it('should return start before end for all periods', () => {
    for (const period of ['today', 'week', 'month', 'quarter', 'year']) {
      const { start, end } = analyticsService.getDateRange(period);
      expect(start.getTime()).toBeLessThan(end.getTime());
    }
  });
});
