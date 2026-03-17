/**
 * MK App — Search Controller
 * Full-text search across services, professionals, categories with autocomplete
 */
const Service      = require('../models/Service');
const Professional = require('../models/Professional');
const Category     = require('../models/Category');
const Booking      = require('../models/Booking');
const redis        = require('../config/redis');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose     = require('mongoose');

// ── GET /search?q=AC&type=all&city=Hyderabad ──────────────────
exports.globalSearch = asyncHandler(async (req, res) => {
  const { q, type = 'all', city, lat, lng, limit = 10, minPrice, maxPrice, minRating, sortBy = 'relevance' } = req.query;

  if (!q || q.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const query = q.trim();
  const cacheKey = `search:${query}:${type}:${city||''}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success:true, ...cached, cached:true });

  const results = {};

  // Search services
  if (type === 'all' || type === 'services') {
    const serviceFilter = {
      isActive: true,
      $or: [
        { name:        { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags:        { $elemMatch: { $regex: query, $options: 'i' } } },
        { 'subServices.name': { $regex: query, $options: 'i' } },
      ],
    };
    if (minPrice) serviceFilter.startingPrice = { ...serviceFilter.startingPrice, $gte: Number(minPrice) };
    if (maxPrice) serviceFilter.startingPrice = { ...serviceFilter.startingPrice, $lte: Number(maxPrice) };
    if (minRating) serviceFilter.rating = { $gte: Number(minRating) };
    if (city) serviceFilter.availableCities = { $in: [city, 'All'] };

    const sortMap = {
      relevance: { totalBookings: -1 },
      price_asc: { startingPrice: 1 },
      price_desc: { startingPrice: -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 },
    };

    results.services = await Service.find(serviceFilter)
      .select('name icon slug startingPrice rating totalRatings category isPopular isNew')
      .populate('category', 'name slug')
      .sort(sortMap[sortBy] || sortMap.relevance)
      .limit(Number(limit))
      .lean();
  }

  // Search categories
  if (type === 'all' || type === 'categories') {
    results.categories = await Category.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    }).select('name slug icon order').limit(5).lean();
  }

  // Search professionals (by skill/name, only if location provided)
  if ((type === 'all' || type === 'professionals') && lat && lng) {
    results.professionals = await Professional.find({
      isVerified: true,
      isActive: true,
      $or: [
        { skills: { $elemMatch: { $regex: query, $options: 'i' } } },
      ],
      currentLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 25000,
        },
      },
    })
      .select('user rating totalBookings skills currentLocation')
      .populate('user', 'name')
      .limit(5)
      .lean();
  }

  const response = {
    query,
    services:      results.services      || [],
    categories:    results.categories    || [],
    professionals: results.professionals || [],
    total: (results.services?.length || 0) + (results.categories?.length || 0),
  };

  await redis.set(cacheKey, response, 120); // 2 min cache
  res.json({ success:true, ...response });
});

// ── GET /search/autocomplete?q=AC ────────────────────────────
exports.autocomplete = asyncHandler(async (req, res) => {
  const { q, limit = 8 } = req.query;
  if (!q || q.length < 1) return res.json({ success:true, suggestions:[] });

  const cacheKey = `autocomplete:${q.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success:true, suggestions:cached });

  // Combine service names + category names as suggestions
  const [services, categories] = await Promise.all([
    Service.find({ isActive:true, name:{ $regex:'^'+q, $options:'i' } }).select('name icon slug').limit(6).lean(),
    Category.find({ isActive:true, name:{ $regex:q, $options:'i' } }).select('name slug icon').limit(3).lean(),
  ]);

  const suggestions = [
    ...services.map(s  => ({ text:s.name,     icon:s.icon, type:'service',  slug:s.slug })),
    ...categories.map(c=> ({ text:c.name,     icon:c.icon, type:'category', slug:c.slug })),
  ].slice(0, Number(limit));

  await redis.set(cacheKey, suggestions, 300);
  res.json({ success:true, suggestions });
});

// ── GET /search/trending ──────────────────────────────────────
exports.getTrending = asyncHandler(async (req, res) => {
  const cacheKey = 'search:trending';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success:true, trending:cached });

  // Get most searched/booked services in last 7 days
  const trending = await Booking.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*3600*1000) } } },
    { $group: { _id:'$service', count:{ $sum:1 } } },
    { $sort: { count:-1 } },
    { $limit: 8 },
    { $lookup: { from:'services', localField:'_id', foreignField:'_id', as:'service' } },
    { $unwind:'$service' },
    { $project: { name:'$service.name', icon:'$service.icon', slug:'$service.slug', count:1 } },
  ]);

  const result = trending.length > 0 ? trending : [
    { name:'AC Service', icon:'❄️', slug:'ac-service', count:250 },
    { name:'Salon at Home', icon:'💄', slug:'salon-at-home', count:180 },
    { name:'Car Jump Start', icon:'🚗', slug:'car-jump-start', count:120 },
    { name:'Deep Cleaning', icon:'🧹', slug:'deep-cleaning', count:95 },
    { name:'Electrician', icon:'⚡', slug:'electrician', count:85 },
    { name:'Plumber', icon:'🪛', slug:'plumber', count:78 },
    { name:'Pest Control', icon:'🦟', slug:'pest-control', count:65 },
    { name:'Yoga at Home', icon:'🧘', slug:'yoga-at-home', count:60 },
  ];

  await redis.set(cacheKey, result, 3600); // 1 hour
  res.json({ success:true, trending:result });
});

// ══════════════════════════════════════════════════════════════
// ZONE / SERVICE AREA MODEL
// ══════════════════════════════════════════════════════════════
const zoneSchema = new mongoose.Schema({
  name:         { type:String, required:true, trim:true },
  slug:         { type:String, required:true, unique:true },
  city:         { type:String, required:true, index:true },
  state:        { type:String, required:true },
  pincodesServed:[{ type:String }],
  isActive:     { type:Boolean, default:true, index:true },
  boundary:     {
    type: { type:String, enum:['Polygon'], default:'Polygon' },
    coordinates: [[[Number]]],
  },
  surgeMultiplier: { type:Number, default:1.0 },
  availableCategories: [{ type:mongoose.Schema.Types.ObjectId, ref:'Category' }],
  launchDate:   Date,
  managerId:    { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  stats: {
    totalProfessionals: { type:Number, default:0 },
    activeBookings:     { type:Number, default:0 },
    avgResponseTime:    { type:Number, default:30 }, // minutes
  },
}, { timestamps:true });

zoneSchema.index({ boundary:'2dsphere' });
const Zone = mongoose.model('Zone', zoneSchema);

// Zone Controller
exports.getZonesForCity = asyncHandler(async (req, res) => {
  const { city } = req.params;
  const zones = await Zone.find({ city:{ $regex:city, $options:'i' }, isActive:true })
    .select('name slug pincodesServed surgeMultiplier stats').lean();
  res.json({ success:true, zones });
});

exports.checkServiceability = asyncHandler(async (req, res) => {
  const { pincode, city } = req.query;
  if (!pincode && !city) throw new AppError('pincode or city required', 400);

  const query = { isActive:true };
  if (pincode) query.pincodesServed = pincode;
  if (city)    query.city = { $regex:city, $options:'i' };

  const zone = await Zone.findOne(query).lean();

  res.json({
    success: true,
    serviceable: !!zone,
    zone: zone || null,
    message: zone
      ? `Great news! We serve ${city || pincode}. ${zone.stats?.totalProfessionals || 20}+ professionals available.`
      : `We're not in ${city || pincode} yet. Drop your email and we'll notify you!`,
  });
});

// ── Search Routes ─────────────────────────────────────────────
const express = require('express');
const { protect } = require('../middleware/auth');
const searchRouter = express.Router();

searchRouter.get('/',              exports.globalSearch);
searchRouter.get('/autocomplete',  exports.autocomplete);
searchRouter.get('/trending',      exports.getTrending);

const zoneRouter = express.Router();
zoneRouter.get('/city/:city',      exports.getZonesForCity);
zoneRouter.get('/check',           exports.checkServiceability);

module.exports = { searchRouter, zoneRouter, Zone };
