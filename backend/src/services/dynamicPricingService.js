/**
 * Slot App — Dynamic Pricing Service
 * Surge pricing based on demand, time of day, professional availability, and weather
 */
const Professional = require('../models/Professional');
const Booking = require('../models/Booking');
const { getCacheValue, setCacheValue } = require('./cacheService');

// ── Config ────────────────────────────────────────────────────
const SURGE_CONFIG = {
  // Max surge multiplier
  MAX_SURGE: 2.0,
  MIN_SURGE: 1.0,

  // Demand thresholds (bookings per hour in area)
  DEMAND: {
    low:    { threshold: 0,  multiplier: 1.0 },
    medium: { threshold: 5,  multiplier: 1.2 },
    high:   { threshold: 10, multiplier: 1.4 },
    surge:  { threshold: 20, multiplier: 1.7 },
    peak:   { threshold: 30, multiplier: 2.0 },
  },

  // Time-based multipliers (IST)
  TIME_SLOTS: {
    earlyMorning: { hours: [5, 6, 7],     multiplier: 1.1 },
    morning:      { hours: [8, 9, 10],    multiplier: 1.0 },
    midMorning:   { hours: [11],          multiplier: 1.0 },
    earlyAfternoon:{ hours: [12, 13, 14], multiplier: 1.15 },
    lateAfternoon: { hours: [15, 16],     multiplier: 1.0 },
    evening:      { hours: [17, 18, 19],  multiplier: 1.3 },
    night:        { hours: [20, 21],      multiplier: 1.2 },
    lateNight:    { hours: [22, 23, 0, 1, 2, 3, 4], multiplier: 1.5 },
  },

  // Day-based multipliers
  DAY_MULTIPLIERS: {
    0: 1.3,  // Sunday
    1: 1.0,  // Monday
    2: 1.0,  // Tuesday
    3: 1.0,  // Wednesday
    4: 1.05, // Thursday
    5: 1.2,  // Friday
    6: 1.4,  // Saturday
  },

  // Festival/holiday multiplier (set dynamically)
  FESTIVAL_MULTIPLIER: 1.3,

  // Low availability penalty (fewer than X pros available)
  LOW_AVAILABILITY_THRESHOLD: 3,
  LOW_AVAILABILITY_MULTIPLIER: 1.4,
};

/**
 * Get current demand level for a service category in a location
 */
async function getDemandLevel(serviceCategory, lat, lng, radiusKm = 5) {
  const cacheKey = `demand:${serviceCategory}:${Math.round(lat * 10)}:${Math.round(lng * 10)}`;
  const cached = await getCacheValue(cacheKey);
  if (cached) return JSON.parse(cached);

  // Count active/recent bookings in area for this category (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentBookings = await Booking.countDocuments({
    serviceCategory,
    status: { $in: ['confirmed', 'assigned', 'on_the_way', 'in_progress'] },
    createdAt: { $gte: oneHourAgo },
    'address.location': {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).catch(() => 0); // Fallback if geo query fails

  const { DEMAND } = SURGE_CONFIG;
  let level = 'low';
  if (recentBookings >= DEMAND.peak.threshold) level = 'peak';
  else if (recentBookings >= DEMAND.surge.threshold) level = 'surge';
  else if (recentBookings >= DEMAND.high.threshold) level = 'high';
  else if (recentBookings >= DEMAND.medium.threshold) level = 'medium';

  const result = { level, bookingCount: recentBookings, multiplier: DEMAND[level].multiplier };
  await setCacheValue(cacheKey, JSON.stringify(result), 300); // Cache for 5 min
  return result;
}

/**
 * Get available professional count for service in area
 */
async function getAvailabilityLevel(serviceCategory, lat, lng, scheduledAt) {
  const cacheKey = `avail:${serviceCategory}:${Math.round(lat * 10)}:${Math.round(lng * 10)}:${scheduledAt.getHours()}`;
  const cached = await getCacheValue(cacheKey);
  if (cached) return JSON.parse(cached);

  const availCount = await Professional.countDocuments({
    categories: serviceCategory,
    isAvailable: true,
    isVerified: true,
    isActive: true,
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 10000, // 10km radius
      },
    },
  }).catch(() => 5); // Default to 5 if query fails

  const result = {
    count: availCount,
    isLow: availCount < SURGE_CONFIG.LOW_AVAILABILITY_THRESHOLD,
    multiplier: availCount < SURGE_CONFIG.LOW_AVAILABILITY_THRESHOLD
      ? SURGE_CONFIG.LOW_AVAILABILITY_MULTIPLIER
      : 1.0,
  };

  await setCacheValue(cacheKey, JSON.stringify(result), 600);
  return result;
}

/**
 * Get time-based multiplier
 */
function getTimeMultiplier(scheduledAt) {
  const hour = scheduledAt.getHours();
  const day = scheduledAt.getDay();

  let timeMultiplier = 1.0;
  for (const [, slot] of Object.entries(SURGE_CONFIG.TIME_SLOTS)) {
    if (slot.hours.includes(hour)) {
      timeMultiplier = slot.multiplier;
      break;
    }
  }

  const dayMultiplier = SURGE_CONFIG.DAY_MULTIPLIERS[day] || 1.0;
  return { timeMultiplier, dayMultiplier, combined: timeMultiplier * dayMultiplier };
}

/**
 * Check if date is a festival/holiday
 */
function isFestivalDay(date) {
  const FESTIVALS_2026 = [
    '2026-01-14', // Makar Sankranti
    '2026-01-26', // Republic Day
    '2026-03-08', // Holi
    '2026-04-06', // Ram Navami
    '2026-04-14', // Tamil New Year / Baisakhi
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-10-20', // Dussehra (approx)
    '2026-11-12', // Diwali (approx)
    '2026-12-25', // Christmas
  ];
  const dateStr = date.toISOString().split('T')[0];
  return FESTIVALS_2026.includes(dateStr);
}

/**
 * Calculate dynamic price for a booking
 */
exports.calculateDynamicPrice = async ({
  basePrice,
  serviceCategory,
  lat,
  lng,
  scheduledAt,
  userId,
}) => {
  try {
    const scheduledDate = new Date(scheduledAt);

    // Run all multiplier calculations in parallel
    const [demandData, availabilityData] = await Promise.all([
      getDemandLevel(serviceCategory, lat, lng),
      getAvailabilityLevel(serviceCategory, lat, lng, scheduledDate),
    ]);

    const timingData = getTimeMultiplier(scheduledDate);
    const isFestival = isFestivalDay(scheduledDate);

    // Calculate combined surge
    let surge = 1.0;
    surge *= demandData.multiplier;
    surge *= timingData.combined;
    surge *= availabilityData.multiplier;
    if (isFestival) surge *= SURGE_CONFIG.FESTIVAL_MULTIPLIER;

    // Cap surge
    surge = Math.min(surge, SURGE_CONFIG.MAX_SURGE);
    surge = Math.max(surge, SURGE_CONFIG.MIN_SURGE);

    // Round to 2 decimal places
    surge = Math.round(surge * 100) / 100;

    const finalPrice = Math.round(basePrice * surge);
    const surgeAmount = finalPrice - basePrice;

    const breakdown = {
      basePrice,
      finalPrice,
      surgeMultiplier: surge,
      surgeAmount,
      isSurge: surge > 1.05,

      // Breakdown for transparency
      factors: {
        demand: {
          level: demandData.level,
          multiplier: demandData.multiplier,
          description: demandData.level === 'low' ? 'Normal demand' :
            demandData.level === 'surge' ? 'High demand in your area' :
            `${demandData.level.charAt(0).toUpperCase() + demandData.level.slice(1)} demand`,
        },
        timing: {
          timeMultiplier: timingData.timeMultiplier,
          dayMultiplier: timingData.dayMultiplier,
          description: timingData.combined > 1.2 ? 'Peak time pricing' : 'Standard timing',
        },
        availability: {
          count: availabilityData.count,
          multiplier: availabilityData.multiplier,
          description: availabilityData.isLow ? 'Limited professionals available' : 'Good availability',
        },
        festival: isFestival ? { multiplier: SURGE_CONFIG.FESTIVAL_MULTIPLIER, description: 'Festival day pricing' } : null,
      },

      // User-friendly message
      surgeMessage: surge >= 1.5 ? '⚡ High demand right now. Prices are higher than usual.' :
        surge >= 1.2 ? '📈 Slightly higher price due to demand.' : null,
    };

    return breakdown;
  } catch (error) {
    console.error('Dynamic pricing error:', error);
    // Fallback to base price on error
    return {
      basePrice,
      finalPrice: basePrice,
      surgeMultiplier: 1.0,
      surgeAmount: 0,
      isSurge: false,
      factors: {},
      surgeMessage: null,
    };
  }
};

/**
 * Get surge status for display on service listing page
 */
exports.getSurgeStatus = async (serviceCategory, lat, lng) => {
  try {
    const now = new Date();
    const [demandData, timingData] = await Promise.all([
      getDemandLevel(serviceCategory, lat, lng),
      Promise.resolve(getTimeMultiplier(now)),
    ]);

    const combinedSurge = demandData.multiplier * timingData.combined;
    const isSurge = combinedSurge > 1.15;

    return {
      isSurge,
      surgeLevel: combinedSurge >= 1.7 ? 'very_high' : combinedSurge >= 1.4 ? 'high' : combinedSurge >= 1.2 ? 'moderate' : 'normal',
      multiplier: Math.min(combinedSurge, SURGE_CONFIG.MAX_SURGE),
      demandLevel: demandData.level,
      message: isSurge ? (combinedSurge >= 1.5 ? '⚡ Surge pricing active' : '📈 Slightly busy') : null,
    };
  } catch {
    return { isSurge: false, surgeLevel: 'normal', multiplier: 1.0, demandLevel: 'low', message: null };
  }
};

/**
 * Get estimated wait time based on availability
 */
exports.getEstimatedWaitTime = async (serviceCategory, lat, lng) => {
  try {
    const availability = await getAvailabilityLevel(serviceCategory, lat, lng, new Date());
    if (availability.count === 0) return { minutes: 90, label: '60-90 min', available: false };
    if (availability.count < 3) return { minutes: 45, label: '30-45 min', available: true };
    if (availability.count < 6) return { minutes: 30, label: '20-30 min', available: true };
    return { minutes: 15, label: '15-20 min', available: true };
  } catch {
    return { minutes: 30, label: '20-30 min', available: true };
  }
};
