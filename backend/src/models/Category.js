/**
 * Slot App — Category Model + Controller + Routes
 */
const mongoose = require('mongoose');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String },
  shortDesc:   { type: String },
  icon:        { type: String, default: '🔧' },
  emoji:       { type: String, default: '🔧' },
  image:       { type: String },
  bannerImage: { type: String },
  color:       { type: String, default: '#1A1A2E' },    // hex for UI theming
  gradientColors: [String],
  parent:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  isNew:       { type: Boolean, default: false },

  // SEO
  metaTitle:       String,
  metaDescription: String,

  // Stats (denormalized for perf)
  serviceCount:    { type: Number, default: 0 },
  totalBookings:   { type: Number, default: 0 },
  avgRating:       { type: Number, default: 0 },

  // Availability
  availableCities: [String],
  startingPrice:   { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1, isFeatured: 1 });

const Category = mongoose.model('Category', categorySchema);

// ── CATEGORY CONTROLLER ────────────────────────────────────────

const getCategories = asyncHandler(async (req, res) => {
  const cacheKey = `categories:active:${req.query.city||'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, categories: cached });

  const cats = await Category.find({ isActive: true, parent: null })
    .sort({ order: 1 }).lean();

  await redis.set(cacheKey, cats, 600);
  res.json({ success: true, categories: cats });
});

const getFeaturedCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find({ isActive: true, isFeatured: true })
    .sort({ order: 1 }).limit(8).lean();
  res.json({ success: true, categories: cats });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const cat = await Category.findOne({ slug: req.params.slug, isActive: true })
    .populate('parent', 'name slug');
  if (!cat) throw new AppError('Category not found', 404);

  // Get subcategories
  const subcategories = await Category.find({ parent: cat._id, isActive: true }).sort('order').lean();

  // Get services
  const Service = require('./Service');
  const services = await Service.find({ category: cat._id, isActive: true })
    .sort('-isFeatured -totalBookings').limit(20).lean();

  res.json({ success: true, category: cat, subcategories, services });
});

const searchCategories = asyncHandler(async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ success: true, categories: [] });

  const cats = await Category.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean();

  res.json({ success: true, categories: cats });
});

const createCategory = asyncHandler(async (req, res) => {
  const cat = await Category.create(req.body);
  await redis.delPattern('categories:*');
  res.status(201).json({ success: true, category: cat });
});

const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) throw new AppError('Category not found', 404);
  await redis.delPattern('categories:*');
  res.json({ success: true, category: cat });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cat) throw new AppError('Category not found', 404);
  await redis.delPattern('categories:*');
  res.json({ success: true, message: 'Category deactivated' });
});

// ── CATEGORY ROUTES ────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.get('/',           getCategories);
router.get('/featured',   getFeaturedCategories);
router.get('/search',     searchCategories);
router.get('/:slug',      getCategoryBySlug);
router.post('/',          protect, authorize('admin'), createCategory);
router.put('/:id',        protect, authorize('admin'), updateCategory);
router.delete('/:id',     protect, authorize('admin'), deleteCategory);

module.exports = Category;
