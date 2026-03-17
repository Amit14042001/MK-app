/**
 * MK App — Banner Model + Controller + Routes
 * Home screen banners, promotional banners, category banners
 */
const mongoose = require('mongoose');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

// ── BANNER MODEL ───────────────────────────────────────────────
const bannerSchema = new mongoose.Schema({
  title:       { type:String, required:true, trim:true },
  subtitle:    { type:String, trim:true },
  imageUrl:    { type:String, required:true },
  linkType:    { type:String, enum:['service','category','external','screen'], default:'screen' },
  linkValue:   { type:String },              // serviceId / categorySlug / URL / screenName
  placement:   { type:String, enum:['home_hero','home_mid','category','popup'], default:'home_hero' },
  position:    { type:Number, default:0 },
  isActive:    { type:Boolean, default:true, index:true },
  startDate:   { type:Date },
  endDate:     { type:Date },
  targetAudience: { type:String, enum:['all','prime','new_users','inactive'], default:'all' },
  cities:      [{ type:String }],
  cta:         { type:String, default:'Book Now' },
  bgColor:     { type:String, default:'#1A1A2E' },
  textColor:   { type:String, default:'#FFFFFF' },
  clickCount:  { type:Number, default:0 },
  impressions: { type:Number, default:0 },
}, { timestamps:true });

const Banner = mongoose.model('Banner', bannerSchema);

// ── BANNER CONTROLLER ──────────────────────────────────────────
const getBanners = asyncHandler(async (req, res) => {
  const { placement = 'home_hero', city } = req.query;
  const cacheKey = `banners:${placement}:${city||'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success:true, banners:cached });

  const now = new Date();
  const query = {
    placement, isActive:true,
    $or:[{startDate:{$lte:now}},{startDate:{$exists:false}}],
    $and:[{$or:[{endDate:{$gte:now}},{endDate:{$exists:false}}]}],
    $or2:[{cities:{$size:0}},{cities:city||{$exists:true}}],
  };

  const banners = await Banner.find({ placement, isActive:true })
    .sort({ position:1 }).limit(10).lean();

  await redis.set(cacheKey, banners, 300);
  res.json({ success:true, banners });
});

const trackBannerClick = asyncHandler(async (req, res) => {
  await Banner.findByIdAndUpdate(req.params.id, { $inc:{ clickCount:1 } });
  res.json({ success:true });
});

const adminCreateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  await redis.delPattern('banners:*');
  res.status(201).json({ success:true, banner });
});

const adminUpdateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new:true });
  if (!banner) throw new AppError('Banner not found', 404);
  await redis.delPattern('banners:*');
  res.json({ success:true, banner });
});

const adminDeleteBanner = asyncHandler(async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  await redis.delPattern('banners:*');
  res.json({ success:true, message:'Banner deleted' });
});

// ── BANNER ROUTES ──────────────────────────────────────────────
const bannerRouter = require('express').Router();
const { protect, authorize } = require('../middleware/auth');

bannerRouter.get('/', getBanners);
bannerRouter.post('/:id/click', trackBannerClick);
bannerRouter.post('/',      protect, authorize('admin'), adminCreateBanner);
bannerRouter.put('/:id',   protect, authorize('admin'), adminUpdateBanner);
bannerRouter.delete('/:id',protect, authorize('admin'), adminDeleteBanner);

module.exports.Banner = Banner;
module.exports.bannerRouter = bannerRouter;
