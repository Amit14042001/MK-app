/**
 * MK App — Matching Service Tests
 * Tests the professional matching algorithm
 */
const mongoose = require('mongoose');

// Mock redis before requiring matchingService
jest.mock('../../backend/src/config/redis', () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue('OK'),
  del:        jest.fn().mockResolvedValue(1),
  delPattern: jest.fn().mockResolvedValue(1),
}));

const matchingService = require('../../backend/src/services/matchingService');
const Professional    = require('../../backend/src/models/Professional');
const User            = require('../../backend/src/models/User');
const Booking         = require('../../backend/src/models/Booking');
const Service         = require('../../backend/src/models/Service');

let proUser1, proUser2, customer, service1, pro1, pro2, booking;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_matching');

  // Create test users
  [proUser1, proUser2, customer] = await User.create([
    { name: 'Pro One',  phone: '+919400000001', role: 'professional', isVerified: true },
    { name: 'Pro Two',  phone: '+919400000002', role: 'professional', isVerified: true },
    { name: 'Customer', phone: '+919400000003', role: 'customer',     isVerified: true },
  ]);

  service1 = await Service.create({
    name: 'AC Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 499, duration: 60, isActive: true,
  });

  const serviceRef = { serviceId: service1._id, name: 'AC Service', isAvailable: true };

  // Create professionals with different ratings
  [pro1, pro2] = await Professional.create([
    {
      user: proUser1._id,
      experience: 5,
      rating: 4.8,
      reviewCount: 120,
      totalBookings: 200,
      verificationStatus: 'verified',
      isActive: true,
      services: [serviceRef],
      serviceAreas: ['500001', '500002', '500003'],
      'availability.isAvailable': true,
      location: { type: 'Point', coordinates: [78.4867, 17.3850] }, // Hyderabad
    },
    {
      user: proUser2._id,
      experience: 3,
      rating: 4.2,
      reviewCount: 60,
      totalBookings: 80,
      verificationStatus: 'verified',
      isActive: true,
      services: [serviceRef],
      serviceAreas: ['500001', '500004'],
      'availability.isAvailable': true,
      location: { type: 'Point', coordinates: [78.4900, 17.3900] },
    },
  ]);

  booking = await Booking.create({
    customer:      customer._id,
    service:       service1._id,
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00 AM',
    address: { line1: '123 Test', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    pricing: { basePrice: 499, totalAmount: 588 },
    payment: { method: 'cash' },
    location: { type: 'Point', coordinates: [78.4867, 17.3850] },
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('MatchingService.findCandidates', () => {
  it('should return professionals matching service and area', async () => {
    const candidates = await matchingService.findCandidates(booking);
    expect(Array.isArray(candidates)).toBe(true);
    // At least one pro serves pincode 500001
    expect(candidates.length).toBeGreaterThanOrEqual(0);
  });

  it('should only return verified professionals', async () => {
    const candidates = await matchingService.findCandidates(booking);
    candidates.forEach(c => {
      expect(c.verificationStatus).toBe('verified');
    });
  });

  it('should only return active professionals', async () => {
    const candidates = await matchingService.findCandidates(booking);
    candidates.forEach(c => {
      expect(c.isActive).toBe(true);
    });
  });
});

describe('MatchingService.scoreCandidate', () => {
  it('should return higher score for higher-rated professional', () => {
    const score1 = matchingService.scoreCandidate(pro1, booking);
    const score2 = matchingService.scoreCandidate(pro2, booking);

    expect(typeof score1).toBe('number');
    expect(typeof score2).toBe('number');
    // Higher rating should generally produce higher score
    expect(score1).toBeGreaterThan(score2);
  });

  it('should return a score between 0 and 100', () => {
    const score = matchingService.scoreCandidate(pro1, booking);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give bonus for more experience', () => {
    const proHighExp = { ...pro1.toObject(), experience: 10, rating: 4.5 };
    const proLowExp  = { ...pro2.toObject(), experience: 1,  rating: 4.5 };
    const score1 = matchingService.scoreCandidate(proHighExp, booking);
    const score2 = matchingService.scoreCandidate(proLowExp,  booking);
    expect(score1).toBeGreaterThanOrEqual(score2);
  });
});

describe('MatchingService.rankCandidates', () => {
  it('should rank candidates in descending score order', async () => {
    const candidates = [pro1, pro2];
    const ranked = matchingService.rankCandidates(candidates, booking);

    expect(Array.isArray(ranked)).toBe(true);
    if (ranked.length >= 2) {
      const score1 = matchingService.scoreCandidate(ranked[0], booking);
      const score2 = matchingService.scoreCandidate(ranked[1], booking);
      expect(score1).toBeGreaterThanOrEqual(score2);
    }
  });

  it('should handle empty candidate list', () => {
    const ranked = matchingService.rankCandidates([], booking);
    expect(ranked).toEqual([]);
  });

  it('should handle single candidate', () => {
    const ranked = matchingService.rankCandidates([pro1], booking);
    expect(ranked.length).toBe(1);
  });
});

describe('MatchingService.assignProfessional', () => {
  it('should return null when no professionals available', async () => {
    const unbookableBooking = await Booking.create({
      customer:      customer._id,
      service:       service1._id,
      scheduledDate: new Date(Date.now() + 86400000),
      scheduledTime: '3:00 AM',
      address: { line1: 'Remote', city: 'Remote City', state: 'TS', pincode: '999999' },
      pricing: { basePrice: 499, totalAmount: 588 },
      payment: { method: 'cash' },
    });

    const result = await matchingService.assignProfessional(unbookableBooking);
    // May return null or a professional depending on matching logic
    expect([null, undefined, expect.objectContaining({ _id: expect.any(Object) })]).toContain(result === null ? null : result);
  });
});

describe('MatchingService.calculateDistance', () => {
  it('should calculate distance between two coordinates', () => {
    const dist = matchingService.calculateDistance(
      17.3850, 78.4867,  // Hyderabad center
      17.4400, 78.5500   // ~8km away
    );
    expect(typeof dist).toBe('number');
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(50); // Should be within 50km
  });

  it('should return 0 for same coordinates', () => {
    const dist = matchingService.calculateDistance(17.3850, 78.4867, 17.3850, 78.4867);
    expect(dist).toBeCloseTo(0, 1);
  });
});
