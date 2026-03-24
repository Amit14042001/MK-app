/**
 * Slot App — Cache Service
 * Full Redis caching layer: read-through, write-through, invalidation strategies
 */
const redis = require('../config/redis');

const DEFAULT_TTL = {
  services:      3600,    // 1 hour — changes rarely
  categories:    86400,   // 24 hours — changes very rarely
  userProfile:   300,     // 5 minutes — changes often
  bookings:      120,     // 2 minutes — changes frequently
  professionals: 600,     // 10 minutes
  analytics:     900,     // 15 minutes
  search:        180,     // 3 minutes
  banners:       1800,    // 30 minutes
  faqs:          86400,   // 24 hours
  slots:         300,     // 5 minutes
};

// ── Generic Cache Wrapper ─────────────────────────────────────
/**
 * Read-through cache: fetches from cache, calls fn on miss
 */
async function withCache(key, fn, ttl = 300) {
  try {
    const cached = await redis.get(key);
    if (cached !== null && cached !== undefined) return cached;

    const data = await fn();
    if (data !== null && data !== undefined) {
      await redis.set(key, data, ttl);
    }
    return data;
  } catch (e) {
    // Cache failure should not break app — fallback to fn
    console.error(`[CacheService] Cache error for ${key}:`, e.message);
    return fn();
  }
}

// ── Service Cache ─────────────────────────────────────────────
exports.getService = (id) =>
  withCache(`service:${id}`, () => require('../models/Service').findById(id).populate('category').lean(), DEFAULT_TTL.services);

exports.getServices = (filter = {}) => {
  const key = `services:${JSON.stringify(filter)}`;
  return withCache(key, () => require('../models/Service').find(filter).populate('category').lean(), DEFAULT_TTL.services);
};

exports.invalidateService = async (id) => {
  await redis.del(`service:${id}`);
  await redis.delPattern('services:*');
};

// ── Category Cache ────────────────────────────────────────────
exports.getCategories = () =>
  withCache('categories:all', () => require('../models/Category').find({ isActive: true }).lean(), DEFAULT_TTL.categories);

exports.invalidateCategories = async () => {
  await redis.delPattern('categories:*');
};

// ── User Profile Cache ────────────────────────────────────────
exports.getUserProfile = (userId) =>
  withCache(`user:${userId}`, async () => {
    const User = require('../models/User');
    return User.findById(userId)
      .select('-password -__v')
      .lean();
  }, DEFAULT_TTL.userProfile);

exports.invalidateUserProfile = async (userId) => {
  await redis.del(`user:${userId}`);
  await redis.del(`notif_prefs:${userId}`);
};

// ── Bookings Cache ────────────────────────────────────────────
exports.getUserBookings = (userId, filters = {}) => {
  const key = `bookings:user:${userId}:${JSON.stringify(filters)}`;
  return withCache(key, async () => {
    const Booking = require('../models/Booking');
    return Booking.find({ customer: userId, ...filters })
      .populate('service', 'name icon')
      .sort('-createdAt')
      .limit(20)
      .lean();
  }, DEFAULT_TTL.bookings);
};

exports.getBooking = (bookingId) =>
  withCache(`booking:${bookingId}`, async () => {
    const Booking = require('../models/Booking');
    return Booking.findById(bookingId)
      .populate('service', 'name icon images')
      .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar phone' } })
      .lean();
  }, DEFAULT_TTL.bookings);

exports.invalidateBookingCache = async (userId, bookingId) => {
  const tasks = [redis.delPattern(`bookings:user:${userId}:*`)];
  if (bookingId) tasks.push(redis.del(`booking:${bookingId}`));
  await Promise.allSettled(tasks);
};

// ── Professional Cache ────────────────────────────────────────
exports.getProfessional = (proId) =>
  withCache(`professional:${proId}`, async () => {
    const Professional = require('../models/Professional');
    return Professional.findById(proId).populate('user', 'name avatar phone').lean();
  }, DEFAULT_TTL.professionals);

exports.invalidateProfessional = async (proId) => {
  await redis.del(`professional:${proId}`);
  await redis.delPattern('pros:*');
};

// ── Search Cache ──────────────────────────────────────────────
exports.getSearchResults = (query, filters = {}) => {
  const key = `search:${query}:${JSON.stringify(filters)}`;
  return withCache(key, null, DEFAULT_TTL.search); // search results fetched externally
};

exports.setSearchResults = async (query, filters, data) => {
  const key = `search:${query}:${JSON.stringify(filters)}`;
  await redis.set(key, data, DEFAULT_TTL.search);
};

// ── Available Slots Cache ─────────────────────────────────────
exports.getAvailableSlots = (serviceId, date) =>
  withCache(`slots:${serviceId}:${date}`, null, DEFAULT_TTL.slots);

exports.setAvailableSlots = async (serviceId, date, slots) => {
  await redis.set(`slots:${serviceId}:${date}`, slots, DEFAULT_TTL.slots);
};

exports.invalidateSlots = async (serviceId, date) => {
  if (date) {
    await redis.del(`slots:${serviceId}:${date}`);
  } else {
    await redis.delPattern(`slots:${serviceId}:*`);
  }
};

// ── Analytics Cache ───────────────────────────────────────────
exports.getAnalytics = (type, period) =>
  withCache(`analytics:${type}:${period}`, null, DEFAULT_TTL.analytics);

exports.setAnalytics = async (type, period, data) => {
  await redis.set(`analytics:${type}:${period}`, data, DEFAULT_TTL.analytics);
};

exports.invalidateAnalytics = async () => {
  await redis.delPattern('analytics:*');
};

// ── OTP Cache ─────────────────────────────────────────────────
exports.setOTP = async (phone, otp, ttl = 600) => {
  await redis.set(`otp:${phone}`, otp, ttl);
};

exports.getOTP = async (phone) => {
  return redis.get(`otp:${phone}`);
};

exports.deleteOTP = async (phone) => {
  await redis.del(`otp:${phone}`);
};

// ── Rate Limit Cache ──────────────────────────────────────────
exports.incrementRateLimit = async (key, window = 60) => {
  const fullKey = `ratelimit:${key}`;
  const count   = await redis.incr(fullKey);
  if (count === 1) await redis.expire(fullKey, window);
  return count;
};

exports.getRateLimitCount = async (key) => {
  const count = await redis.get(`ratelimit:${key}`);
  return parseInt(count) || 0;
};

// ── Session Cache ─────────────────────────────────────────────
exports.setSession = async (sessionId, data, ttl = 86400) => {
  await redis.set(`session:${sessionId}`, data, ttl);
};

exports.getSession = async (sessionId) => {
  return redis.get(`session:${sessionId}`);
};

exports.deleteSession = async (sessionId) => {
  await redis.del(`session:${sessionId}`);
};

// ── Refresh Token Cache ───────────────────────────────────────
exports.setRefreshToken = async (userId, token, ttl = 7 * 86400) => {
  await redis.set(`refresh:${userId}`, token, ttl);
};

exports.getRefreshToken = async (userId) => {
  return redis.get(`refresh:${userId}`);
};

exports.deleteRefreshToken = async (userId) => {
  await redis.del(`refresh:${userId}`);
};

// ── Socket State ──────────────────────────────────────────────
exports.setUserOnline = async (userId, socketId) => {
  await redis.set(`online:${userId}`, socketId, 300); // 5 min TTL, renewed on heartbeat
};

exports.getUserSocketId = async (userId) => {
  return redis.get(`online:${userId}`);
};

exports.setUserOffline = async (userId) => {
  await redis.del(`online:${userId}`);
};

// ── Full Cache Flush (admin only) ────────────────────────────
exports.flushAll = async () => {
  const patterns = [
    'service:*', 'services:*', 'categories:*',
    'user:*', 'bookings:*', 'booking:*',
    'professional:*', 'pros:*',
    'analytics:*', 'search:*', 'slots:*',
    'banners:*', 'faqs:*',
  ];
  await Promise.allSettled(patterns.map(p => redis.delPattern(p)));
  console.log('[CacheService] Full cache flush completed');
};

exports.withCache = withCache;
exports.DEFAULT_TTL = DEFAULT_TTL;
