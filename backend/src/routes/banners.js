/**
 * MK App — Banners Routes
 */
const express = require('express');
const router  = express.Router();
const Banner  = require('../models/Banner');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /banners — active banners for customers
router.get('/', asyncHandler(async (req, res) => {
  const { placement = 'home', audience } = req.query;
  const now = new Date();
  const filter = {
    isActive: true,
    $or: [{ startDate: null }, { startDate: { $lte: now } }],
    $or: [{ endDate: null },   { endDate:   { $gte: now } }],
  };
  if (placement) filter.placement = placement;
  if (audience)  filter.audience  = { $in: [audience, 'all'] };

  const banners = await Banner.find(filter)
    .sort('-priority createdAt')
    .limit(10)
    .lean();

  res.json({ success: true, data: banners, count: banners.length });
}));

// POST /banners/:id/click — track click
router.post('/:id/click', asyncHandler(async (req, res) => {
  await Banner.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
  res.json({ success: true });
}));

// POST /banners/:id/impression — track impression
router.post('/:id/impression', asyncHandler(async (req, res) => {
  await Banner.findByIdAndUpdate(req.params.id, { $inc: { impressions: 1 } });
  res.json({ success: true });
}));

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/all', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, placement, isActive } = req.query;
  const q = {};
  if (placement !== undefined) q.placement = placement;
  if (isActive  !== undefined) q.isActive  = isActive === 'true';

  const [banners, total] = await Promise.all([
    Banner.find(q).sort('-priority createdAt').skip((page-1)*limit).limit(Number(limit)),
    Banner.countDocuments(q),
  ]);
  res.json({ success: true, data: banners, total, pages: Math.ceil(total / limit) });
}));

router.post('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, data: banner });
}));

router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!banner) throw new AppError('Banner not found', 404);
  res.json({ success: true, data: banner });
}));

router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new AppError('Banner not found', 404);
  res.json({ success: true, message: 'Banner deleted' });
}));

// PATCH /banners/:id/toggle
router.patch('/:id/toggle', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError('Banner not found', 404);
  banner.isActive = !banner.isActive;
  await banner.save();
  res.json({ success: true, data: banner, message: `Banner ${banner.isActive ? 'activated' : 'deactivated'}` });
}));

module.exports = router;
