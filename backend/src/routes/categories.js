/**
 * Slot App — Categories Routes (Full)
 */
const express  = require('express');
const router   = express.Router();
const Category = require('../models/Category');
const Service  = require('../models/Service');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { protect, authorize }     = require('../middleware/auth');
const redis = require('../config/redis');

// GET /categories — all active categories
router.get('/', asyncHandler(async (req, res) => {
  const cached = await redis.get('categories:all');
  if (cached) return res.json({ success: true, categories: cached, cached: true });

  const categories = await Category.find({ isActive: true })
    .sort('order').select('name slug icon color description isFeatured order').lean();

  await redis.set('categories:all', categories, 300);
  res.json({ success: true, categories, count: categories.length });
}));

// GET /categories/featured
router.get('/featured', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true, isFeatured: true })
    .sort('order').select('name slug icon color').lean();
  res.json({ success: true, categories });
}));

// GET /categories/:slug — single category + its services
router.get('/:slug', asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    $or: [{ slug: req.params.slug }, { _id: req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? req.params.slug : null }],
    isActive: true,
  }).lean();
  if (!category) throw new AppError('Category not found', 404);

  const services = await Service.find({ category: category._id, isActive: true })
    .select('name slug icon startingPrice rating totalRatings isPopular isNew tags')
    .sort('-totalBookings').lean();

  res.json({ success: true, category, services, serviceCount: services.length });
}));

// POST /categories — admin only
router.post('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  await redis.del('categories:all');
  res.status(201).json({ success: true, category });
}));

// PUT /categories/:id — admin only
router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  await redis.del('categories:all');
  res.json({ success: true, category });
}));

// DELETE /categories/:id — admin only (soft delete)
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  await redis.del('categories:all');
  res.json({ success: true, message: 'Category deactivated' });
}));

module.exports = router;
