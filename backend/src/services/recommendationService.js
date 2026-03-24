/**
 * Slot App — Recommendation Engine Service
 * Collaborative filtering + content-based hybrid for personalized service suggestions
 * Features: user history, location, demographics, trending, seasonal patterns
 */
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { getCacheValue, setCacheValue } = require('./cacheService');

// ── Feature Weights ───────────────────────────────────────────
const WEIGHTS = {
  past_booking:    0.35,  // Services user has booked before
  similar_users:   0.25,  // What similar users booked
  trending_local:  0.20,  // Trending in user's city
  seasonal:        0.10,  // Seasonally relevant
  complementary:   0.10,  // Services that go with recent bookings
};

// ── Seasonal Service Patterns ─────────────────────────────────
const SEASONAL_BOOST = {
  // month (0-indexed): [boosted categories]
  0:  ['painting', 'pest_control'],       // January
  1:  ['painting'],                        // February
  2:  ['ac_repair', 'cleaning'],           // March (pre-summer)
  3:  ['ac_repair', 'salon'],              // April (summer)
  4:  ['ac_repair', 'pest_control'],       // May (peak summer)
  5:  ['pest_control', 'waterproofing'],   // June (monsoon)
  6:  ['pest_control', 'cleaning'],        // July (monsoon)
  7:  ['pest_control', 'waterproofing'],   // August (monsoon)
  8:  ['cleaning', 'painting'],            // September (post-monsoon)
  9:  ['cleaning', 'carpentry'],           // October (Diwali prep)
  10: ['cleaning', 'painting', 'salon'],   // November
  11: ['plumbing', 'salon', 'massage'],    // December (winter)
};

// ── Complementary Services Map ────────────────────────────────
const COMPLEMENTARY = {
  ac_repair:       ['electrician', 'cleaning'],
  plumbing:        ['waterproofing', 'painting'],
  salon:           ['massage', 'beauty'],
  massage:         ['yoga', 'physiotherapy'],
  yoga:            ['massage', 'physiotherapy'],
  pest_control:    ['cleaning', 'waterproofing'],
  painting:        ['cleaning', 'carpentry'],
  cleaning:        ['pest_control', 'painting'],
  carpentry:       ['painting', 'electrician'],
  physiotherapy:   ['massage', 'yoga'],
};

/**
 * Get user's booking history features
 */
async function getUserBookingFeatures(userId) {
  const bookings = await Booking.find({ customer: userId, status: 'completed' })
    .populate('service', 'category slug name')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const categoryCount = {};
  const serviceCount = {};
  const recentCategories = new Set();

  bookings.forEach((b, idx) => {
    const cat = b.serviceCategory || b.service?.category;
    const svc = b.service?.slug;
    if (cat) {
      categoryCount[cat] = (categoryCount[cat] || 0) + (idx < 5 ? 2 : 1); // Recent bookings weighted more
      if (idx < 3) recentCategories.add(cat);
    }
    if (svc) serviceCount[svc] = (serviceCount[svc] || 0) + 1;
  });

  return { categoryCount, serviceCount, recentCategories: [...recentCategories], totalBookings: bookings.length };
}

/**
 * Find similar users (collaborative filtering - simplified)
 */
async function getSimilarUserPreferences(userId, userFeatures) {
  const cacheKey = `similar_users:${userId}`;
  const cached = await getCacheValue(cacheKey);
  if (cached) return JSON.parse(cached);

  // Find users with similar top categories
  const topCategories = Object.entries(userFeatures.categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat);

  if (topCategories.length === 0) return {};

  // Aggregate category preferences of similar users
  const similarUserBookings = await Booking.aggregate([
    { $match: { serviceCategory: { $in: topCategories }, status: 'completed', customer: { $ne: userId } } },
    { $group: { _id: '$serviceCategory', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const prefs = {};
  similarUserBookings.forEach(item => {
    prefs[item._id] = { count: item.count, avgRating: item.avgRating };
  });

  await setCacheValue(cacheKey, JSON.stringify(prefs), 3600); // Cache 1 hour
  return prefs;
}

/**
 * Get trending services in user's city
 */
async function getTrendingInCity(city, serviceCategory = null) {
  const cacheKey = `trending:${city}:${serviceCategory || 'all'}`;
  const cached = await getCacheValue(cacheKey);
  if (cached) return JSON.parse(cached);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const matchFilter = {
    createdAt: { $gte: sevenDaysAgo },
    'address.city': city,
  };
  if (serviceCategory) matchFilter.serviceCategory = serviceCategory;

  const trending = await Booking.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$serviceCategory', bookings: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
    { $sort: { bookings: -1 } },
    { $limit: 8 },
  ]);

  const result = trending.map(t => ({ category: t._id, count: t.bookings, avgRating: t.avgRating }));
  await setCacheValue(cacheKey, JSON.stringify(result), 1800); // 30 min cache
  return result;
}

/**
 * Get seasonal boost for current month
 */
function getSeasonalBoosts() {
  const month = new Date().getMonth();
  return SEASONAL_BOOST[month] || [];
}

/**
 * Score a service category based on all signals
 */
function scoreCategory(category, signals) {
  let score = 0;

  // Past booking signal
  const pastCount = signals.userFeatures.categoryCount[category] || 0;
  score += WEIGHTS.past_booking * Math.min(pastCount / 5, 1.0) * 100;

  // Similar users signal
  const similarPref = signals.similarUsers[category];
  if (similarPref) {
    score += WEIGHTS.similar_users * Math.min(similarPref.count / 100, 1.0) * 100;
  }

  // Trending signal
  const trending = signals.trending.find(t => t.category === category);
  if (trending) {
    score += WEIGHTS.trending_local * Math.min(trending.count / 50, 1.0) * 100;
  }

  // Seasonal signal
  if (signals.seasonalBoosts.includes(category)) {
    score += WEIGHTS.seasonal * 100;
  }

  // Complementary signal
  const recentCats = signals.userFeatures.recentCategories;
  for (const recentCat of recentCats) {
    if (COMPLEMENTARY[recentCat]?.includes(category)) {
      score += WEIGHTS.complementary * 100;
      break;
    }
  }

  // Boost if user hasn't booked this in a while (diversification)
  if (pastCount === 0) score += 10; // Explore new services

  return Math.round(score);
}

/**
 * Main recommendation function
 */
exports.getPersonalizedRecommendations = async (userId, options = {}) => {
  const { city = 'Hyderabad', limit = 8, exclude = [] } = options;

  try {
    const cacheKey = `recommendations:${userId}:${city}`;
    const cached = await getCacheValue(cacheKey);
    if (cached) return JSON.parse(cached);

    // Gather all signals in parallel
    const [userFeatures, trending, seasonalBoosts] = await Promise.all([
      getUserBookingFeatures(userId),
      getTrendingInCity(city),
      Promise.resolve(getSeasonalBoosts()),
    ]);

    const similarUsers = await getSimilarUserPreferences(userId, userFeatures);

    const signals = { userFeatures, similarUsers, trending, seasonalBoosts };

    // All service categories
    const ALL_CATEGORIES = [
      'ac_repair', 'electrician', 'plumbing', 'cleaning', 'pest_control',
      'painting', 'carpentry', 'salon', 'massage', 'yoga', 'physiotherapy',
      'beauty', 'appliance_repair', 'automotive', 'waterproofing', 'men_grooming',
    ];

    // Score each category
    const scored = ALL_CATEGORIES
      .filter(cat => !exclude.includes(cat))
      .map(cat => ({
        category: cat,
        score: scoreCategory(cat, signals),
        isPersonalized: (userFeatures.categoryCount[cat] || 0) > 0 || seasonalBoosts.includes(cat),
        reason: getReason(cat, signals),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Fetch actual services for top categories
    const services = await Service.find({
      category: { $in: scored.map(s => s.category) },
      isActive: true,
    })
      .sort({ bookingCount: -1, rating: -1 })
      .limit(limit * 2)
      .lean();

    // Map services to scored categories
    const recommendations = scored.map(item => {
      const service = services.find(s => s.category === item.category);
      return {
        ...item,
        service: service ? {
          id: service._id,
          name: service.name,
          slug: service.slug,
          category: service.category,
          startingPrice: service.startingPrice,
          rating: service.rating,
          totalBookings: service.bookingCount,
          image: service.image,
        } : null,
      };
    }).filter(r => r.service !== null);

    await setCacheValue(cacheKey, JSON.stringify(recommendations), 1800);
    return recommendations;
  } catch (error) {
    console.error('Recommendation engine error:', error);
    // Fallback to trending
    return getTrendingFallback(city, limit);
  }
};

/**
 * Get human-readable reason for recommendation
 */
function getReason(category, signals) {
  if (signals.userFeatures.recentCategories.includes(category)) {
    return 'You book this often';
  }
  if (signals.seasonalBoosts.includes(category)) {
    return 'Popular this season';
  }
  const trending = signals.trending.find(t => t.category === category);
  if (trending && trending.count > 20) {
    return 'Trending in your area';
  }
  const recentCats = signals.userFeatures.recentCategories;
  for (const recentCat of recentCats) {
    if (COMPLEMENTARY[recentCat]?.includes(category)) {
      return `Goes well with ${recentCat.replace('_', ' ')}`;
    }
  }
  return 'Recommended for you';
}

/**
 * Fallback recommendations when personalization data is unavailable
 */
async function getTrendingFallback(city, limit) {
  const trending = await getTrendingInCity(city);
  return trending.slice(0, limit).map(t => ({
    category: t.category,
    score: t.count,
    isPersonalized: false,
    reason: 'Popular in your city',
    service: null,
  }));
}

/**
 * Get "You May Also Like" for a specific service
 */
exports.getComplementaryRecommendations = async (serviceCategory, userId, limit = 4) => {
  const complementary = COMPLEMENTARY[serviceCategory] || [];
  if (complementary.length === 0) return [];

  const services = await Service.find({
    category: { $in: complementary },
    isActive: true,
  })
    .sort({ bookingCount: -1 })
    .limit(limit)
    .lean();

  return services.map(s => ({
    id: s._id,
    name: s.name,
    category: s.category,
    startingPrice: s.startingPrice,
    rating: s.rating,
    reason: `Pairs well with ${serviceCategory.replace('_', ' ')}`,
  }));
};

/**
 * Get personalized home screen layout for user
 */
exports.getHomeScreenLayout = async (userId, city) => {
  const [recommendations, trending, seasonal] = await Promise.all([
    exports.getPersonalizedRecommendations(userId, { city, limit: 6 }),
    getTrendingInCity(city),
    Promise.resolve(getSeasonalBoosts()),
  ]);

  return {
    featuredCategories: recommendations.slice(0, 4),
    trending: trending.slice(0, 6),
    seasonal: seasonal.slice(0, 4),
    bookAgain: recommendations.filter(r => r.isPersonalized).slice(0, 3),
  };
};
