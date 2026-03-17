/**
 * MK App — Analytics Service
 * Business intelligence: revenue, bookings, professionals, retention
 */
const mongoose = require('mongoose');
const redis    = require('../config/redis');
const Booking  = require('../models/Booking');
const User     = require('../models/User');
const Payment  = require('../models/Payment');
const Professional = require('../models/Professional');
const Service  = require('../models/Service');

const CACHE_TTL = {
  realtime:  60,       // 1 min
  hourly:    3600,     // 1 hour
  daily:     86400,    // 24 hours
  weekly:    604800,   // 7 days
};

// ── Helper: date range ────────────────────────────────────────
function getDateRange(period) {
  const now = new Date();
  let start, end = now, prev;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prev  = new Date(start - 86400000);
      break;
    case 'week':
      start = new Date(now - 7 * 86400000);
      prev  = new Date(now - 14 * 86400000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case 'quarter':
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      prev  = new Date(start.getFullYear(), start.getMonth() - 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      prev  = new Date(now.getFullYear() - 1, 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  return { start, end, prev };
}

// ── Dashboard Overview ────────────────────────────────────────
exports.getDashboardOverview = async (period = 'month') => {
  const cacheKey = `analytics:overview:${period}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const { start, end, prev } = getDateRange(period);

  const [
    totalBookings, prevBookings,
    completedBookings,
    cancelledBookings,
    revenueData, prevRevenue,
    newUsers, prevUsers,
    activeProCount,
    avgRating,
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Booking.countDocuments({ createdAt: { $gte: prev, $lte: start } }),
    Booking.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'completed' }),
    Booking.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'cancelled' }),
    Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed', type: 'booking' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: prev, $lte: start }, status: 'completed', type: 'booking' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ createdAt: { $gte: start, $lte: end }, role: 'customer' }),
    User.countDocuments({ createdAt: { $gte: prev, $lte: start }, role: 'customer' }),
    Professional.countDocuments({ isActive: true, 'availability.isAvailable': true }),
    Booking.aggregate([
      { $match: { createdAt: { $gte: start }, status: 'completed', 'review': { $exists: true } } },
      { $lookup: { from: 'reviews', localField: 'review', foreignField: '_id', as: 'reviewData' } },
      { $unwind: '$reviewData' },
      { $group: { _id: null, avg: { $avg: '$reviewData.rating' } } },
    ]),
  ]);

  const revenue     = revenueData[0]?.total  || 0;
  const prevRev     = prevRevenue[0]?.total   || 0;
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  const pctChange = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

  const overview = {
    period,
    bookings: {
      total:       totalBookings,
      completed:   completedBookings,
      cancelled:   cancelledBookings,
      pending:     totalBookings - completedBookings - cancelledBookings,
      completionRate,
      change:      pctChange(totalBookings, prevBookings),
    },
    revenue: {
      total:       Math.round(revenue),
      avgPerBooking: revenueData[0]?.avg ? Math.round(revenueData[0].avg) : 0,
      change:      pctChange(revenue, prevRev),
    },
    users: {
      new:    newUsers,
      change: pctChange(newUsers, prevUsers),
    },
    professionals: {
      active: activeProCount,
    },
    rating: {
      avg: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
    },
    generatedAt: new Date(),
  };

  await redis.set(cacheKey, overview, CACHE_TTL.hourly);
  return overview;
};

// ── Revenue Breakdown ─────────────────────────────────────────
exports.getRevenueBreakdown = async (period = 'month') => {
  const cacheKey = `analytics:revenue:${period}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const { start, end } = getDateRange(period);

  // Daily revenue trend
  const dailyRevenue = await Payment.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed', type: 'booking' } },
    {
      $group: {
        _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count:   { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Revenue by service category
  const byCategory = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed' } },
    { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
    { $unwind: '$svc' },
    { $lookup: { from: 'categories', localField: 'svc.category', foreignField: '_id', as: 'cat' } },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id:      { catId: '$cat._id', catName: '$cat.name' },
        revenue:  { $sum: '$pricing.totalAmount' },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  // Payment method breakdown
  const byMethod = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, 'payment.status': 'paid' } },
    { $group: { _id: '$payment.method', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
    { $sort: { revenue: -1 } },
  ]);

  const data = {
    period, dailyRevenue, byCategory, byMethod,
    generatedAt: new Date(),
  };

  await redis.set(cacheKey, data, CACHE_TTL.hourly);
  return data;
};

// ── User Analytics ────────────────────────────────────────────
exports.getUserAnalytics = async (period = 'month') => {
  const cacheKey = `analytics:users:${period}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const { start, end } = getDateRange(period);

  // Daily new user registrations
  const dailyRegistrations = await User.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, role: 'customer' } },
    {
      $group: {
        _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // User retention (returning vs new)
  const returningUsers = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id:   '$customer',
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id:   null,
        newUsers:       { $sum: { $cond: [{ $eq: ['$count', 1] }, 1, 0] } },
        returning:      { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } },
        total:          { $sum: 1 },
      },
    },
  ]);

  // Top cities
  const topCities = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$address.city', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Subscription breakdown
  const subscriptionBreakdown = await User.aggregate([
    { $match: { role: 'customer' } },
    { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const totalUsers  = await User.countDocuments({ role: 'customer' });
  const activeUsers = await User.countDocuments({ role: 'customer', lastActive: { $gte: start } });

  const data = {
    period, totalUsers, activeUsers,
    dailyRegistrations, returningUsers: returningUsers[0] || {},
    topCities, subscriptionBreakdown,
    retentionRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    generatedAt: new Date(),
  };

  await redis.set(cacheKey, data, CACHE_TTL.hourly);
  return data;
};

// ── Professional Analytics ────────────────────────────────────
exports.getProfessionalAnalytics = async (period = 'month') => {
  const cacheKey = `analytics:professionals:${period}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const { start, end } = getDateRange(period);

  // Top performers
  const topPerformers = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed', professional: { $exists: true } } },
    {
      $group: {
        _id:      '$professional',
        bookings: { $sum: 1 },
        revenue:  { $sum: '$pricing.totalAmount' },
      },
    },
    { $sort: { bookings: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from:         'professionals',
        localField:   '_id',
        foreignField: '_id',
        as:           'pro',
      },
    },
    { $unwind: '$pro' },
    {
      $lookup: {
        from:         'users',
        localField:   'pro.user',
        foreignField: '_id',
        as:           'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        name:     '$user.name',
        phone:    '$user.phone',
        bookings: 1,
        revenue:  1,
        rating:   '$pro.rating',
        experience: '$pro.experience',
      },
    },
  ]);

  // Availability stats
  const availStats = await Professional.aggregate([
    {
      $group: {
        _id:         null,
        total:       { $sum: 1 },
        available:   { $sum: { $cond: ['$availability.isAvailable', 1, 0] } },
        verified:    { $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] } },
        pending:     { $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] } },
      },
    },
  ]);

  // Avg response time (booking created to first status change)
  const data = {
    period,
    topPerformers,
    availability:   availStats[0] || {},
    generatedAt:    new Date(),
  };

  await redis.set(cacheKey, data, CACHE_TTL.hourly);
  return data;
};

// ── Service Performance ───────────────────────────────────────
exports.getServicePerformance = async (period = 'month') => {
  const cacheKey = `analytics:services:${period}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const { start, end } = getDateRange(period);

  const topServices = await Booking.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id:       '$service',
        bookings:  { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        revenue:   { $sum: '$pricing.totalAmount' },
      },
    },
    { $sort: { bookings: -1 } },
    { $limit: 15 },
    { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    {
      $project: {
        name:           '$service.name',
        bookings:       1,
        completed:      1,
        cancelled:      1,
        revenue:        1,
        completionRate: { $round: [{ $multiply: [{ $divide: ['$completed', '$bookings'] }, 100] }, 1] },
      },
    },
  ]);

  const data = { period, topServices, generatedAt: new Date() };
  await redis.set(cacheKey, data, CACHE_TTL.hourly);
  return data;
};

// ── Real-time Stats ───────────────────────────────────────────
exports.getRealtimeStats = async () => {
  const cacheKey = 'analytics:realtime';
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    bookingsToday,
    activeBookings,
    onlinePros,
    revenueToday,
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: today } }),
    Booking.countDocuments({ status: { $in: ['confirmed', 'professional_assigned', 'professional_arriving', 'in_progress'] } }),
    Professional.countDocuments({ isActive: true, 'availability.isAvailable': true }),
    Payment.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'completed', type: 'booking' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const data = {
    bookingsToday,
    activeBookings,
    onlinePros,
    revenueToday: revenueToday[0]?.total || 0,
    timestamp:    now,
  };

  await redis.set(cacheKey, data, CACHE_TTL.realtime);
  return data;
};

// ── Export all methods ────────────────────────────────────────
exports.getDateRange      = getDateRange;
exports.CACHE_TTL         = CACHE_TTL;
