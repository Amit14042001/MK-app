/**
 * Slot App — Search Routes
 * Full-text search across services, professionals, categories
 */
const express     = require('express');
const router      = express.Router();
const Service     = require('../models/Service');
const Professional = require('../models/Professional');
const Category    = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /search?q=&type=all|service|professional|category&lat=&lng=&limit=
router.get('/', asyncHandler(async (req, res) => {
  const { q = '', type = 'all', lat, lng, limit = 10, page = 1 } = req.query;
  if (!q.trim()) return res.json({ success: true, data: { services: [], professionals: [], categories: [] } });

  // Track trending searches in Redis (non-blocking)
  try {
    const redis = require('../config/redis');
    redis.zincrby('search:trending', 1, q.trim().toLowerCase()).catch(() => {});
    redis.expire('search:trending', 7 * 24 * 3600).catch(() => {}); // 7-day TTL
  } catch {}

  const regex   = new RegExp(q.trim(), 'i');
  const skip    = (page - 1) * limit;
  const results = {};

  // Services
  if (type === 'all' || type === 'service') {
    const services = await Service.find({
      isActive: true,
      $or: [
        { name: regex },
        { description: regex },
        { tags: { $elemMatch: { $regex: q, $options: 'i' } } },
      ],
    })
      .populate('category', 'name icon')
      .select('name description price discountedPrice rating reviewCount images category')
      .sort('-rating -bookingCount')
      .skip(skip)
      .limit(Number(limit))
      .lean();
    results.services = services;
  }

  // Professionals
  if (type === 'all' || type === 'professional') {
    const proFilter = {
      isActive: true,
      verificationStatus: 'verified',
      $or: [
        { 'user.name': regex },
        { bio: regex },
        { 'services.name': regex },
      ],
    };

    // Location-based if lat/lng provided
    if (lat && lng) {
      proFilter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 20000, // 20km
        },
      };
    }

    const professionals = await Professional.find(proFilter)
      .populate('user', 'name avatar')
      .select('user bio services rating reviewCount totalBookings experience')
      .limit(Number(limit))
      .lean();
    results.professionals = professionals;
  }

  // Categories
  if (type === 'all' || type === 'category') {
    const categories = await Category.find({
      isActive: true,
      $or: [{ name: regex }, { description: regex }],
    })
      .select('name icon description serviceCount')
      .limit(5)
      .lean();
    results.categories = categories;
  }

  // Recent searches tracking (anonymous, no PII)
  const total = (results.services?.length || 0) +
                (results.professionals?.length || 0) +
                (results.categories?.length || 0);

  res.json({
    success: true,
    query:   q,
    total,
    data:    results,
  });
}));

// GET /search/suggestions?q= — autocomplete
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.trim().length < 2) return res.json({ success: true, data: [] });

  const regex = new RegExp('^' + q.trim(), 'i');
  const [services, categories] = await Promise.all([
    Service.find({ isActive: true, name: regex }).select('name').limit(5).lean(),
    Category.find({ isActive: true, name: regex }).select('name icon').limit(3).lean(),
  ]);

  const suggestions = [
    ...categories.map(c => ({ text: c.name, icon: c.icon, type: 'category' })),
    ...services.map(s => ({ text: s.name, icon: '🔧', type: 'service' })),
  ].slice(0, 8);

  res.json({ success: true, data: suggestions });
}));

// GET /search/trending — trending searches
router.get('/trending', asyncHandler(async (req, res) => {
  const STATIC_TRENDING = [
    { text: 'AC Service',       icon: '❄️', count: 8420 },
    { text: 'Home Cleaning',    icon: '🧹', count: 6210 },
    { text: 'Electrician',      icon: '⚡', count: 5180 },
    { text: 'Plumber',          icon: '🔧', count: 4960 },
    { text: 'Pest Control',     icon: '🐛', count: 3840 },
    { text: 'Salon at Home',    icon: '💇', count: 3720 },
    { text: 'Painting',         icon: '🖌️', count: 2910 },
    { text: 'Car Wash',         icon: '🚗', count: 2640 },
  ];

  try {
    const redis = require('../config/redis');
    // Pull top 8 from Redis sorted set 'search:trending' (score = search count)
    const raw = await redis.zrevrange('search:trending', 0, 7, 'WITHSCORES');
    if (raw && raw.length >= 2) {
      const trending = [];
      for (let i = 0; i < raw.length; i += 2) {
        const text  = raw[i];
        const count = parseInt(raw[i + 1], 10);
        const match = STATIC_TRENDING.find(s => s.text.toLowerCase() === text.toLowerCase());
        trending.push({ text, icon: match?.icon || '🔍', count });
      }
      return res.json({ success: true, data: trending });
    }
  } catch { /* Redis not available — use static */ }

  res.json({ success: true, data: STATIC_TRENDING });
}));

// GET /search/nearby-professionals?lat=&lng=&serviceId=
router.get('/nearby-professionals', asyncHandler(async (req, res) => {
  const { lat, lng, serviceId, radius = 10 } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

  const filter = {
    isActive: true,
    verificationStatus: 'verified',
    'availability.isAvailable': true,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) * 1000,
      },
    },
  };

  if (serviceId) filter['services.serviceId'] = serviceId;

  const professionals = await Professional.find(filter)
    .populate('user', 'name avatar')
    .select('user rating reviewCount totalBookings location experience services')
    .limit(20)
    .lean();

  res.json({ success: true, data: professionals, count: professionals.length });
}));

module.exports = router;
