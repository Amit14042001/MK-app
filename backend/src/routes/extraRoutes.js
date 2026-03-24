/**
 * Slot App — Service Areas / Pincode Routes
 */
const express = require('express');
const router = express.Router();
const { ServiceArea } = require('../models/AllModels');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

// Check if pincode is serviceable
router.get('/check/:pincode', asyncHandler(async (req, res) => {
  const { pincode } = req.params;
  if (!/^\d{6}$/.test(pincode)) throw new AppError('Invalid pincode format', 400);

  const area = await ServiceArea.findOne({ pincode, isActive: true });
  res.json({
    success: true,
    data: {
      pincode,
      available: !!area,
      city: area?.city || null,
      area: area?.area || null,
      categories: area?.categories || [],
      proCount: area?.proCount || 0,
      message: area ? `Services available in ${area.area}, ${area.city}!` : 'Service not yet available in this area.',
    },
  });
}));

// Get all serviceable pincodes for a city
router.get('/city/:city', asyncHandler(async (req, res) => {
  const areas = await ServiceArea.find({ city: new RegExp(req.params.city, 'i'), isActive: true }).select('pincode area categories proCount');
  res.json({ success: true, data: areas, count: areas.length });
}));

// Get nearby areas (geolocation-based)
router.get('/nearby', asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10000 } = req.query;
  if (!lat || !lng) throw new AppError('lat and lng required', 400);
  const areas = await ServiceArea.find({
    location: { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: Number(radius) } },
    isActive: true,
  }).limit(10);
  res.json({ success: true, data: areas });
}));

module.exports = router;


/**
 * Slot App — App Version Routes
 */
const versionRouter = express.Router();
const { AppVersion } = require('../models/AllModels');

// Check app version (called on app launch)
versionRouter.get('/', asyncHandler(async (req, res) => {
  const { platform = 'android', appType = 'customer', currentVersion } = req.query;
  const versionInfo = await AppVersion.findOne({ platform, appType, isActive: true });

  if (!versionInfo) return res.json({ success: true, data: { forceUpdate: false, updateAvailable: false } });

  const needsForceUpdate = currentVersion && compareVersions(currentVersion, versionInfo.minVersion) < 0;
  const updateAvailable = currentVersion && compareVersions(currentVersion, versionInfo.latestVersion) < 0;

  res.json({
    success: true,
    data: {
      forceUpdate: needsForceUpdate,
      updateAvailable,
      latestVersion: versionInfo.latestVersion,
      minVersion: versionInfo.minVersion,
      storeUrl: versionInfo.storeUrl,
      updateMessage: versionInfo.updateMessage || 'A new version is available with improvements and bug fixes.',
      releaseNotes: versionInfo.releaseNotes,
    },
  });
}));

function compareVersions(v1, v2) {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const diff = (p1[i] || 0) - (p2[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

module.exports.versionRouter = versionRouter;


/**
 * Slot App — Remote Config Routes
 */
const configRouter = express.Router();
const { RemoteConfig } = require('../models/AllModels');

// Get all active config (called on app launch)
configRouter.get('/', asyncHandler(async (req, res) => {
  const { platform = 'all', city } = req.query;
  const configs = await RemoteConfig.find({
    isActive: true,
    platform: { $in: [platform, 'all'] },
    $or: [{ cities: { $size: 0 } }, { cities: { $exists: false } }, { cities: city }],
  }).select('key value');

  const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));

  // Defaults if no DB entries
  const defaults = {
    show_flash_sale: true,
    show_bundle_booking: true,
    show_video_call: true,
    show_instant_booking: true,
    show_gift_cards: true,
    min_booking_amount: 199,
    max_coupon_discount: 500,
    surge_enabled: true,
    maintenance_mode: false,
    new_user_discount: 150,
    ...configMap,
  };

  res.json({ success: true, data: defaults });
}));

module.exports.configRouter = configRouter;


/**
 * Slot App — Flash Sales Routes
 */
const flashRouter = express.Router();
const { FlashSale } = require('../models/AllModels');

// Get active flash sales
flashRouter.get('/active', asyncHandler(async (req, res) => {
  const now = new Date();
  const { city } = req.query;
  const filter = { isActive: true, startTime: { $lte: now }, endTime: { $gte: now } };
  if (city) filter.$or = [{ cities: { $size: 0 } }, { cities: city }];
  const sales = await FlashSale.find(filter).sort({ discount: -1 }).limit(5);
  res.json({ success: true, data: sales });
}));

// Get upcoming flash sales (next 24 hours)
flashRouter.get('/upcoming', asyncHandler(async (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sales = await FlashSale.find({ isActive: true, startTime: { $gt: now, $lt: tomorrow } }).sort({ startTime: 1 });
  res.json({ success: true, data: sales });
}));

module.exports.flashRouter = flashRouter;


/**
 * Slot App — Instant Booking Routes
 */
const instantRouter = express.Router();
const Professional = require('../models/Professional');
const Booking = require('../models/Booking');

// Check instant booking availability
instantRouter.get('/available', protect, asyncHandler(async (req, res) => {
  const { category, lat, lng } = req.query;
  if (!category || !lat || !lng) throw new AppError('category, lat, lng required', 400);

  const availablePros = await Professional.find({
    categories: category,
    isAvailable: true,
    isVerified: true,
    isActive: true,
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: 10000,
      },
    },
  }).limit(5).select('name rating totalBookings currentLocation avatar');

  res.json({
    success: true,
    data: {
      available: availablePros.length > 0,
      professionalCount: availablePros.length,
      estimatedArrival: availablePros.length > 0 ? '20-40 minutes' : null,
      professionals: availablePros,
      message: availablePros.length > 0
        ? `${availablePros.length} professional${availablePros.length > 1 ? 's' : ''} available now!`
        : 'No professionals available right now. Try scheduling for later.',
    },
  });
}));

// Create instant booking (skip time slot selection)
instantRouter.post('/', protect, asyncHandler(async (req, res) => {
  const { serviceId, category, addressId, lat, lng, paymentMethod } = req.body;

  // Find nearest available pro
  const pro = await Professional.findOne({
    categories: category,
    isAvailable: true, isVerified: true, isActive: true,
    currentLocation: { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: 15000 } },
  });

  if (!pro) throw new AppError('No professionals available right now. Please try in a few minutes or schedule a booking.', 404);

  const booking = await Booking.create({
    customer: req.user._id,
    professional: pro._id,
    service: serviceId,
    serviceCategory: category,
    type: 'instant',
    scheduledAt: new Date(Date.now() + 40 * 60 * 1000), // 40 min from now
    address: addressId,
    status: 'confirmed',
    paymentMethod: paymentMethod || 'online',
  });

  res.status(201).json({ success: true, data: booking, estimatedArrival: '30-40 minutes' });
}));

module.exports.instantRouter = instantRouter;


/**
 * Slot App — Pro Bids Routes
 */
const bidsRouter = express.Router();
const { ProBid } = require('../models/AllModels');

// Professional submits a bid on a custom job
bidsRouter.post('/', protect, asyncHandler(async (req, res) => {
  const { bookingId, bidAmount, timeline, message } = req.body;
  if (!bookingId || !bidAmount) throw new AppError('bookingId and bidAmount required', 400);

  const existingBid = await ProBid.findOne({ booking: bookingId, professional: req.user._id, status: 'pending' });
  if (existingBid) throw new AppError('You already have an active bid on this job', 400);

  const bid = await ProBid.create({
    booking: bookingId,
    professional: req.user._id,
    bidAmount: Number(bidAmount),
    timeline, message,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  res.status(201).json({ success: true, data: bid });
}));

// Customer sees bids for their booking
bidsRouter.get('/booking/:bookingId', protect, asyncHandler(async (req, res) => {
  const bids = await ProBid.find({ booking: req.params.bookingId, status: 'pending' })
    .populate('professional', 'name rating totalBookings avatar city')
    .sort({ bidAmount: 1 });
  res.json({ success: true, data: bids });
}));

// Customer accepts a bid
bidsRouter.post('/:bidId/accept', protect, asyncHandler(async (req, res) => {
  const bid = await ProBid.findById(req.params.bidId);
  if (!bid) throw new AppError('Bid not found', 404);
  bid.status = 'accepted';
  bid.acceptedAt = new Date();
  await bid.save();
  // Reject all other bids for this booking
  await ProBid.updateMany({ booking: bid.booking, _id: { $ne: bid._id }, status: 'pending' }, { status: 'rejected' });
  res.json({ success: true, message: 'Bid accepted. Professional assigned.' });
}));

module.exports.bidsRouter = bidsRouter;
