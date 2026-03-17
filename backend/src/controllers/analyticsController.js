const Booking      = require('../models/Booking');
const User         = require('../models/User');
const Professional = require('../models/Professional');
const Payment      = require('../models/Payment');
const Service      = require('../models/Service');
const Review       = require('../models/Review');
const redis        = require('../config/redis');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Helper: date range ────────────────────────────────────────
const dateRange = (period) => {
  const now = new Date();
  const ranges = {
    today:   new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week:    new Date(now.getTime() - 7  * 24 * 3600 * 1000),
    month:   new Date(now.getTime() - 30 * 24 * 3600 * 1000),
    quarter: new Date(now.getTime() - 90 * 24 * 3600 * 1000),
    year:    new Date(now.getTime() - 365* 24 * 3600 * 1000),
  };
  return ranges[period] || ranges.month;
};

// ── GET /analytics/overview ───────────────────────────────────
exports.getOverview = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const since = dateRange(period);
  const cacheKey = `analytics:overview:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, ...cached });

  const [
    totalUsers,
    newUsers,
    totalBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue,
    periodRevenue,
    avgOrderValue,
    activePros,
    totalPros,
    avgRating,
    topServices,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: since } }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    Payment.aggregate([{ $match: { status: 'captured' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([
      { $match: { status: 'captured', createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$pricing.totalAmount' } } },
    ]),
    Professional.countDocuments({ isActive: true, isAvailable: true }),
    Professional.countDocuments(),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    Booking.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: since } } },
      { $group: { _id: '$service', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $project: { name: '$service.name', icon: '$service.icon', count: 1, revenue: 1 } },
    ]),
  ]);

  const data = {
    users: {
      total: totalUsers,
      new: newUsers,
      growth: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
    },
    bookings: {
      total: totalBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      completionRate: totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) + '%' : '0%',
      cancellationRate: totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) + '%' : '0%',
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      period: periodRevenue[0]?.total || 0,
      avgOrderValue: Math.round(avgOrderValue[0]?.avg || 0),
    },
    professionals: {
      total: totalPros,
      active: activePros,
      utilizationRate: totalPros > 0 ? ((activePros / totalPros) * 100).toFixed(1) + '%' : '0%',
    },
    ratings: { average: (avgRating[0]?.avg || 0).toFixed(2) },
    topServices,
  };

  await redis.set(cacheKey, data, 120); // 2 min cache
  res.json({ success: true, period, ...data });
});

// ── GET /analytics/revenue ────────────────────────────────────
exports.getRevenue = asyncHandler(async (req, res) => {
  const { period = 'month', groupBy = 'day' } = req.query;
  const since = dateRange(period);
  const cacheKey = `analytics:revenue:${period}:${groupBy}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const groupFormats = {
    hour:  { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' }, hour: { $hour: '$createdAt' } },
    day:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
    week:  { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
    month: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
  };

  const data = await Payment.aggregate([
    { $match: { status: 'captured', createdAt: { $gte: since } } },
    {
      $group: {
        _id: groupFormats[groupBy] || groupFormats.day,
        revenue:       { $sum: '$amount' },
        transactions:  { $sum: 1 },
        avgValue:      { $avg: '$amount' },
        platformFee:   { $sum: '$platformFee' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    {
      $project: {
        _id: 0,
        date: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromParts: '$_id' } } },
        revenue: { $round: ['$revenue', 2] },
        transactions: 1,
        avgValue: { $round: ['$avgValue', 2] },
        platformFee: { $round: ['$platformFee', 2] },
      },
    },
  ]);

  await redis.set(cacheKey, data, 300);
  res.json({ success: true, period, groupBy, data });
});

// ── GET /analytics/bookings ───────────────────────────────────
exports.getBookingAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const since = dateRange(period);
  const cacheKey = `analytics:bookings:${period}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, ...cached });

  const [
    byStatus,
    byCategory,
    byHour,
    byDayOfWeek,
    avgCompletionTime,
    repeatBookings,
  ] = await Promise.all([
    // By status
    Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // By category
    Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
      { $unwind: '$svc' },
      { $lookup: { from: 'categories', localField: 'svc.category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $group: { _id: '$cat.name', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } },
    ]),

    // By hour of day (peak hours)
    Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]),

    // By day of week
    Booking.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]),

    // Average completion time (scheduled → completed)
    Booking.aggregate([
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      { $project: { duration: { $subtract: ['$completedAt', '$createdAt'] } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]),

    // Repeat bookings rate
    Booking.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 } } },
      { $group: { _id: null, repeat: { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } }, total: { $sum: 1 } } },
    ]),
  ]);

  const DAYS = ['','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const data = {
    byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    byCategory,
    peakHours: byHour.map(h => ({ hour: h._id, label: `${h._id}:00`, count: h.count })),
    byDayOfWeek: byDayOfWeek.map(d => ({ day: DAYS[d._id], count: d.count })),
    avgCompletionHours: avgCompletionTime[0]?.avg ? (avgCompletionTime[0].avg / 3600000).toFixed(1) : 'N/A',
    repeatRate: repeatBookings[0]?.total > 0
      ? ((repeatBookings[0].repeat / repeatBookings[0].total) * 100).toFixed(1) + '%'
      : '0%',
  };

  await redis.set(cacheKey, data, 300);
  res.json({ success: true, period, ...data });
});

// ── GET /analytics/professionals ─────────────────────────────
exports.getProfessionalAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const since = dateRange(period);

  const [topPros, prosByRating, earningsDistribution] = await Promise.all([
    // Top performing professionals
    Booking.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: since } } },
      { $group: { _id: '$professional', jobs: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' }, avgRating: { $avg: '$proRating' } } },
      { $sort: { jobs: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'professionals', localField: '_id', foreignField: '_id', as: 'pro' } },
      { $unwind: '$pro' },
      { $lookup: { from: 'users', localField: 'pro.user', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', jobs: 1, revenue: 1, avgRating: { $round: ['$avgRating', 1] }, phone: '$user.phone' } },
    ]),

    // Pros by rating band
    Professional.aggregate([
      { $bucket: { groupBy: '$rating', boundaries: [0, 2, 3, 4, 4.5, 5.01], default: 'Other',
          output: { count: { $sum: 1 } } } },
    ]),

    // Earnings distribution
    Professional.aggregate([
      { $project: { earningsBand: {
        $switch: {
          branches: [
            { case: { $lt: ['$totalEarnings', 10000] },  then: '<₹10K' },
            { case: { $lt: ['$totalEarnings', 50000] },  then: '₹10K–50K' },
            { case: { $lt: ['$totalEarnings', 100000] }, then: '₹50K–1L' },
            { case: { $lt: ['$totalEarnings', 500000] }, then: '₹1L–5L' },
          ],
          default: '₹5L+',
        },
      }}},
      { $group: { _id: '$earningsBand', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({ success: true, period, topPros, prosByRating, earningsDistribution });
});

// ── GET /analytics/users ──────────────────────────────────────
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const since = dateRange(period);

  const [growth, byCity, retention, ltv] = await Promise.all([
    // Daily signups
    User.aggregate([
      { $match: { createdAt: { $gte: since }, role: 'customer' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // By city
    User.aggregate([
      { $match: { role: 'customer' } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Retention: % users who booked >1 time
    User.aggregate([
      { $lookup: { from: 'bookings', localField: '_id', foreignField: 'customer', as: 'bookings' } },
      { $project: { bookingCount: { $size: '$bookings' }, role: 1 } },
      { $match: { role: 'customer' } },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          oneTime: { $sum: { $cond: [{ $eq: ['$bookingCount', 1] }, 1, 0] } },
          repeat:  { $sum: { $cond: [{ $gt: ['$bookingCount', 1] }, 1, 0] } },
          power:   { $sum: { $cond: [{ $gte: ['$bookingCount', 5] }, 1, 0] } },
      }},
    ]),

    // LTV: average lifetime spend per user
    Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$customer', totalSpend: { $sum: '$pricing.totalAmount' } } },
      { $group: { _id: null, avgLTV: { $avg: '$totalSpend' }, maxLTV: { $max: '$totalSpend' } } },
    ]),
  ]);

  res.json({
    success: true, period,
    growth,
    byCity,
    retention: retention[0] || {},
    ltv: { avg: Math.round(ltv[0]?.avgLTV || 0), max: Math.round(ltv[0]?.maxLTV || 0) },
  });
});

// ── GET /analytics/realtime ───────────────────────────────────
exports.getRealtime = asyncHandler(async (req, res) => {
  const now  = new Date();
  const hour = new Date(now.getTime() - 3600 * 1000);

  const [activeBookings, newBookingsLastHour, onlinePros, revenueToday] = await Promise.all([
    Booking.countDocuments({ status: { $in: ['in_progress', 'professional_arriving', 'professional_arrived'] } }),
    Booking.countDocuments({ createdAt: { $gte: hour } }),
    Professional.countDocuments({ isActive: true, isAvailable: true }),
    Payment.aggregate([
      { $match: { status: 'captured', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    realtime: {
      activeBookings,
      newBookingsLastHour,
      onlineProfessionals: onlinePros,
      revenueToday: revenueToday[0]?.total || 0,
      timestamp: now.toISOString(),
    },
  });
});

// ── GET /analytics/heatmap ────────────────────────────────────
exports.getHeatmap = asyncHandler(async (req, res) => {
  const { period = 'month', city = 'Hyderabad' } = req.query;
  const since = dateRange(period);

  const bookingLocations = await Booking.find({
    'address.city': { $regex: city, $options: 'i' },
    createdAt: { $gte: since },
    'address.coordinates': { $exists: true },
  })
    .select('address.coordinates address.area')
    .limit(1000)
    .lean();

  const heatmap = bookingLocations.map(b => ({
    lat: b.address?.coordinates?.lat,
    lng: b.address?.coordinates?.lng,
    area: b.address?.area,
  })).filter(p => p.lat && p.lng);

  res.json({ success: true, city, points: heatmap });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.getDashboard = exports.getOverview;
exports.getRevenueAnalytics = exports.getRevenue;
exports.getCustomerAnalytics = exports.getUserAnalytics;
exports.getRealtimeMetrics = exports.getRealtime;

exports.getPopularServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true }).sort('-totalBookings').limit(10).select('name totalBookings');
  res.json({ success: true, services });
});

exports.exportBookings = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Export not implemented' });
});

exports.exportRevenue = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Export not implemented' });
});

exports.getMyPerformance = asyncHandler(async (req, res) => {
  res.json({ success: true, performance: { jobs: 0, rating: 5, earnings: 0 } });
});

exports.getCityAnalytics = asyncHandler(async (req, res) => {
  res.json({ success: true, city: req.params.city, stats: {} });
});

exports.getFunnelAnalytics = asyncHandler(async (req, res) => {
  res.json({ success: true, funnel: { views: 0, addedToCart: 0, booked: 0 } });
});
