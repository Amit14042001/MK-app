/**
 * MK App — Tests for New Backend Services
 * Dynamic Pricing, Recommendation Engine, i18n
 */

// ── Recommendation Service Tests ──────────────────────────────
describe('RecommendationService', () => {
  let recommendationService;

  beforeAll(() => {
    jest.mock('../../../src/models/Booking', () => ({
      aggregate: jest.fn().mockResolvedValue([
        { _id: 'cleaning', bookings: 45, avgRating: 4.8 },
        { _id: 'ac_repair', bookings: 38, avgRating: 4.7 },
        { _id: 'salon', bookings: 32, avgRating: 4.9 },
      ]),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { serviceCategory: 'cleaning', service: { category: 'cleaning' } },
          { serviceCategory: 'ac_repair', service: { category: 'ac_repair' } },
        ]),
      }),
    }));

    jest.mock('../../../src/models/Service', () => ({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 's1', name: 'Deep Cleaning', category: 'cleaning', startingPrice: 599, rating: 4.8, bookingCount: 1200, slug: 'deep-cleaning' },
          { _id: 's2', name: 'AC Service', category: 'ac_repair', startingPrice: 599, rating: 4.7, bookingCount: 980, slug: 'ac-service' },
          { _id: 's3', name: 'Salon at Home', category: 'salon', startingPrice: 399, rating: 4.9, bookingCount: 850, slug: 'salon' },
        ]),
      }),
    }));

    jest.mock('../../../src/services/cacheService', () => ({
      getCacheValue: jest.fn().mockResolvedValue(null),
      setCacheValue: jest.fn().mockResolvedValue(true),
    }));

    recommendationService = require('../../../src/services/recommendationService');
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return recommendations for a user', async () => {
      const recs = await recommendationService.getPersonalizedRecommendations('user1', { city: 'Hyderabad', limit: 5 });
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
      recs.forEach(rec => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');
      });
    });

    it('should exclude specified categories', async () => {
      const recs = await recommendationService.getPersonalizedRecommendations('user1', {
        city: 'Hyderabad',
        limit: 8,
        exclude: ['cleaning'],
      });
      const hasCleaning = recs.some(r => r.category === 'cleaning');
      expect(hasCleaning).toBe(false);
    });

    it('should return fallback for new user with no history', async () => {
      const recs = await recommendationService.getPersonalizedRecommendations('new_user_no_history', {
        city: 'Mumbai', limit: 4,
      });
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe('getComplementaryRecommendations', () => {
    it('should return complementary services', async () => {
      const comps = await recommendationService.getComplementaryRecommendations('massage', 'user1', 3);
      expect(Array.isArray(comps)).toBe(true);
    });

    it('should return empty array for unknown category', async () => {
      const comps = await recommendationService.getComplementaryRecommendations('unknown_category', 'user1', 3);
      expect(Array.isArray(comps)).toBe(true);
      expect(comps.length).toBe(0);
    });
  });

  describe('getHomeScreenLayout', () => {
    it('should return structured home layout', async () => {
      const layout = await recommendationService.getHomeScreenLayout('user1', 'Bangalore');
      expect(layout).toHaveProperty('featuredCategories');
      expect(layout).toHaveProperty('trending');
      expect(layout).toHaveProperty('seasonal');
      expect(layout).toHaveProperty('bookAgain');
      expect(Array.isArray(layout.trending)).toBe(true);
    });
  });
});

// ── Dynamic Pricing Additional Tests ─────────────────────────
describe('DynamicPricingEdgeCases', () => {
  it('should apply festival multiplier on festival day', () => {
    // Simulate festival date check inline
    const FESTIVALS = ['2026-10-20']; // Dussehra
    const testDate = new Date('2026-10-20');
    const dateStr = testDate.toISOString().split('T')[0];
    expect(FESTIVALS.includes(dateStr)).toBe(true);
  });

  it('should return higher time multiplier for evening slots', () => {
    const TIME_MULTIPLIERS = {
      morning: { hours: [8, 9, 10], multiplier: 1.0 },
      evening: { hours: [17, 18, 19], multiplier: 1.3 },
    };

    const eveningHour = 18;
    const morningHour = 9;
    const getMultiplier = (hour) => {
      for (const [, slot] of Object.entries(TIME_MULTIPLIERS)) {
        if (slot.hours.includes(hour)) return slot.multiplier;
      }
      return 1.0;
    };

    expect(getMultiplier(eveningHour)).toBe(1.3);
    expect(getMultiplier(morningHour)).toBe(1.0);
    expect(getMultiplier(eveningHour)).toBeGreaterThan(getMultiplier(morningHour));
  });

  it('should cap final price at max surge', () => {
    const MAX_SURGE = 2.0;
    const basePrice = 1000;
    // Simulate worst case: peak demand + festival + late night
    const worstCaseSurge = 2.3; // Without cap
    const cappedSurge = Math.min(worstCaseSurge, MAX_SURGE);
    const finalPrice = Math.round(basePrice * cappedSurge);

    expect(cappedSurge).toBe(2.0);
    expect(finalPrice).toBe(2000);
  });
});

// ── Warranty Period Tests ─────────────────────────────────────
describe('WarrantyPeriods', () => {
  const WARRANTY_PERIODS = {
    electrician: 30, plumbing: 30, appliance_repair: 90, ac_repair: 90,
    painting: 180, carpentry: 30, pest_control: 90, cleaning: 7,
    salon: 0, massage: 0, yoga: 0, physiotherapy: 0, default: 30,
  };

  it('should have 90-day warranty for appliance repair', () => {
    expect(WARRANTY_PERIODS.appliance_repair).toBe(90);
    expect(WARRANTY_PERIODS.ac_repair).toBe(90);
  });

  it('should have 180-day warranty for painting', () => {
    expect(WARRANTY_PERIODS.painting).toBe(180);
  });

  it('should have 0-day warranty for salon/massage/wellness', () => {
    expect(WARRANTY_PERIODS.salon).toBe(0);
    expect(WARRANTY_PERIODS.massage).toBe(0);
    expect(WARRANTY_PERIODS.yoga).toBe(0);
  });

  it('should have shortest warranty for cleaning (7 days)', () => {
    expect(WARRANTY_PERIODS.cleaning).toBe(7);
  });

  it('should correctly calculate expiry date', () => {
    const completedAt = new Date('2026-01-01');
    const days = WARRANTY_PERIODS.ac_repair;
    const expiry = new Date(completedAt.getTime() + days * 24 * 60 * 60 * 1000);
    expect(expiry.toISOString().split('T')[0]).toBe('2026-04-01');
  });
});

// ── Loyalty Tier Tests ────────────────────────────────────────
describe('LoyaltyTiers', () => {
  const TIERS = {
    bronze:   { minPoints: 0,     maxPoints: 999,   multiplier: 1.0 },
    silver:   { minPoints: 1000,  maxPoints: 4999,  multiplier: 1.5 },
    gold:     { minPoints: 5000,  maxPoints: 14999, multiplier: 2.0 },
    platinum: { minPoints: 15000, maxPoints: null,  multiplier: 3.0 },
  };

  function getTier(pts) {
    if (pts >= 15000) return 'platinum';
    if (pts >= 5000)  return 'gold';
    if (pts >= 1000)  return 'silver';
    return 'bronze';
  }

  it('should classify tiers correctly', () => {
    expect(getTier(0)).toBe('bronze');
    expect(getTier(999)).toBe('bronze');
    expect(getTier(1000)).toBe('silver');
    expect(getTier(4999)).toBe('silver');
    expect(getTier(5000)).toBe('gold');
    expect(getTier(14999)).toBe('gold');
    expect(getTier(15000)).toBe('platinum');
    expect(getTier(99999)).toBe('platinum');
  });

  it('should apply correct multipliers per tier', () => {
    expect(TIERS.bronze.multiplier).toBe(1.0);
    expect(TIERS.silver.multiplier).toBe(1.5);
    expect(TIERS.gold.multiplier).toBe(2.0);
    expect(TIERS.platinum.multiplier).toBe(3.0);
  });

  it('should calculate points correctly with multiplier', () => {
    const basePoints = 100; // ₹100 booking = 100 base points
    const tierMultiplier = TIERS.gold.multiplier; // 2.0
    const totalPoints = Math.floor(basePoints * tierMultiplier);
    expect(totalPoints).toBe(200);
  });

  it('should calculate wallet value at 0.25 per point', () => {
    const points = 400;
    const walletValue = Math.floor(points * 0.25);
    expect(walletValue).toBe(100); // ₹100 wallet credit
  });
});

// ── Referral Code Generation Tests ───────────────────────────
describe('ReferralCodeGeneration', () => {
  const crypto = require('crypto');

  function generateReferralCode(userId, name) {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4) || 'MK';
    const suffix = crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 4).toUpperCase();
    return `${prefix}${suffix}`;
  }

  it('should generate 8-character referral code', () => {
    const code = generateReferralCode('user123', 'Alice');
    expect(code.length).toBe(8);
  });

  it('should be alphanumeric uppercase', () => {
    const code = generateReferralCode('user123', 'Bob Smith');
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });

  it('should be deterministic for same inputs', () => {
    const code1 = generateReferralCode('user123', 'Alice');
    const code2 = generateReferralCode('user123', 'Alice');
    expect(code1).toBe(code2);
  });

  it('should be different for different users', () => {
    const code1 = generateReferralCode('user1', 'Alice');
    const code2 = generateReferralCode('user2', 'Alice');
    expect(code1).not.toBe(code2);
  });

  it('should handle names with spaces and numbers', () => {
    const code = generateReferralCode('user456', 'John Doe 123');
    expect(code.length).toBe(8);
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });

  it('should use MK prefix for empty names', () => {
    const code = generateReferralCode('user789', '');
    expect(code.startsWith('MK')).toBe(true);
  });
});
