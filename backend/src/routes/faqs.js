/**
 * MK App — FAQ Routes
 */
const express = require('express');
const router  = express.Router();
const { FAQ }  = require('../models/SupportModels');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /faqs
router.get('/', asyncHandler(async (req, res) => {
  const { category, audience = 'customer', q } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (audience !== 'all') filter.audience = { $in: [audience, 'both'] };
  if (q) filter.$text = { $search: q };

  const faqs = await FAQ.find(filter).sort('order -helpfulYes').lean();
  res.json({ success: true, data: faqs, count: faqs.length });
}));

// GET /faqs/categories
router.get('/categories', asyncHandler(async (req, res) => {
  const cats = await FAQ.distinct('category', { isActive: true });
  res.json({ success: true, data: cats });
}));

// GET /faqs/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) throw new AppError('FAQ not found', 404);
  res.json({ success: true, data: faq });
}));

// POST /faqs/:id/vote
router.post('/:id/vote', protect, asyncHandler(async (req, res) => {
  const { helpful } = req.body; // true/false
  const field = helpful ? 'helpfulYes' : 'helpfulNo';
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    { $inc: { [field]: 1 } },
    { new: true }
  );
  if (!faq) throw new AppError('FAQ not found', 404);
  res.json({ success: true, message: 'Vote recorded', data: { helpfulYes: faq.helpfulYes, helpfulNo: faq.helpfulNo } });
}));

// ── Admin CRUD ────────────────────────────────────────────────
router.post('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const faq = await FAQ.create(req.body);
  res.status(201).json({ success: true, data: faq });
}));

router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!faq) throw new AppError('FAQ not found', 404);
  res.json({ success: true, data: faq });
}));

router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const faq = await FAQ.findByIdAndDelete(req.params.id);
  if (!faq) throw new AppError('FAQ not found', 404);
  res.json({ success: true, message: 'FAQ deleted' });
}));

// POST /faqs/bulk — seed multiple FAQs
router.post('/bulk', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { faqs } = req.body;
  if (!Array.isArray(faqs)) throw new AppError('faqs must be an array', 400);
  const created = await FAQ.insertMany(faqs, { ordered: false });
  res.status(201).json({ success: true, data: created, count: created.length });
}));

module.exports = router;
