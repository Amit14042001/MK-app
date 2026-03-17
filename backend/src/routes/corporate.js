/**
 * MK App — Corporate Routes
 */
const express = require('express');
const router  = express.Router();
const { Corporate } = require('../models/Corporate');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Public ────────────────────────────────────────────────────
// POST /corporate/enquiry
router.post('/enquiry', asyncHandler(async (req, res) => {
  const { companyName, contactName, contactEmail, contactPhone, employeeCount, message } = req.body;
  if (!companyName || !contactEmail || !contactPhone)
    throw new AppError('Company name, email and phone are required', 400);

  // Save enquiry to DB for tracking
  const CorporateEnquiry = require('../models/AllModels').CorporateEnquiry
    || { create: async (d) => d }; // fallback if model not seeded
  await CorporateEnquiry.create?.({
    companyName, contactName, contactEmail, contactPhone,
    employeeCount, message, status: 'new', createdAt: new Date(),
  }).catch(() => {}); // non-fatal

  // Email to sales team
  try {
    const { sendEmail } = require('../utils/email');
    await sendEmail({
      to:      process.env.SALES_EMAIL || 'sales@mkapp.in',
      subject: `New Corporate Enquiry — ${companyName}`,
      html: `<h2>New Corporate Enquiry</h2>
             <p><b>Company:</b> ${companyName}</p>
             <p><b>Contact:</b> ${contactName} — ${contactPhone}</p>
             <p><b>Email:</b> ${contactEmail}</p>
             <p><b>Employees:</b> ${employeeCount || 'Not specified'}</p>
             <p><b>Message:</b> ${message || 'No message'}</p>`,
    });
    // Also send acknowledgement to enquirer
    await sendEmail({
      to:      contactEmail,
      subject: 'MK App — We received your enquiry',
      html: `<h2>Thank you, ${contactName || contactEmail}!</h2>
             <p>We've received your corporate services enquiry for <b>${companyName}</b>.</p>
             <p>Our corporate team will contact you within 24 hours.</p>
             <p>— MK App Team</p>`,
    });
  } catch (emailErr) {
    console.warn('[Corporate] Email failed (non-fatal):', emailErr.message);
  }

  res.status(201).json({
    success: true,
    message: 'Enquiry received! Our corporate team will contact you within 24 hours.',
    data: { companyName, contactEmail },
  });
}));

// ── Protected ─────────────────────────────────────────────────
router.use(protect);

// GET /corporate/my
router.get('/my', asyncHandler(async (req, res) => {
  const corp = await Corporate.findOne({
    $or: [{ adminUser: req.user._id }, { authorizedUsers: req.user._id }],
  }).populate('adminUser', 'name email phone');
  if (!corp) throw new AppError('No corporate account found', 404);
  res.json({ success: true, data: corp });
}));

// GET /corporate/plans
router.get('/plans', asyncHandler(async (req, res) => {
  const PLANS = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyCredits: 5000,
      discountPercent: 10,
      maxUsers: 10,
      dedicatedManager: false,
      customInvoicing: false,
      price: 2999,
      description: 'Perfect for small businesses',
    },
    {
      id: 'business',
      name: 'Business',
      monthlyCredits: 20000,
      discountPercent: 15,
      maxUsers: 50,
      dedicatedManager: true,
      customInvoicing: true,
      price: 9999,
      description: 'For growing companies',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyCredits: -1,
      discountPercent: 20,
      maxUsers: -1,
      dedicatedManager: true,
      customInvoicing: true,
      price: null,
      description: 'Custom pricing for large enterprises',
    },
  ];
  res.json({ success: true, data: PLANS });
}));

// POST /corporate/register  (admin only)
router.post('/register', authorize('admin'), asyncHandler(async (req, res) => {
  const existing = await Corporate.findOne({ 'contact.email': req.body.contact?.email });
  if (existing) throw new AppError('Corporate account with this email already exists', 400);
  const corp = await Corporate.create({ ...req.body, adminUser: req.user._id });
  res.status(201).json({ success: true, data: corp });
}));

// POST /corporate/add-credits
router.post('/add-credits', asyncHandler(async (req, res) => {
  const { amount, paymentId } = req.body;
  if (!amount || amount < 100) throw new AppError('Minimum credit top-up is ₹100', 400);
  const corp = await Corporate.findOneAndUpdate(
    { adminUser: req.user._id },
    { $inc: { 'wallet.balance': amount } },
    { new: true }
  );
  if (!corp) throw new AppError('Corporate account not found', 404);
  res.json({ success: true, message: `₹${amount} credits added`, data: { balance: corp.wallet.balance } });
}));

// POST /corporate/add-user
router.post('/add-user', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const corp = await Corporate.findOneAndUpdate(
    { adminUser: req.user._id },
    { $addToSet: { authorizedUsers: userId } },
    { new: true }
  );
  if (!corp) throw new AppError('Corporate account not found', 404);
  res.json({ success: true, message: 'User added to corporate account', data: corp });
}));

// DELETE /corporate/remove-user/:userId
router.delete('/remove-user/:userId', asyncHandler(async (req, res) => {
  const corp = await Corporate.findOneAndUpdate(
    { adminUser: req.user._id },
    { $pull: { authorizedUsers: req.params.userId } },
    { new: true }
  );
  if (!corp) throw new AppError('Corporate account not found', 404);
  res.json({ success: true, message: 'User removed from corporate account' });
}));

// GET /corporate/bookings
router.get('/bookings', asyncHandler(async (req, res) => {
  const Booking = require('../models/Booking');
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;
  const corp = await Corporate.findOne({ adminUser: req.user._id });
  if (!corp) throw new AppError('Corporate account not found', 404);

  const query = { corporate: corp._id };
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate)   query.createdAt.$lte = new Date(endDate);
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('service', 'name category')
      .populate('customer', 'name phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({ success: true, data: bookings, total, pages: Math.ceil(total / limit) });
}));

// GET /corporate/invoice/:year/:month
router.get('/invoice/:year/:month', asyncHandler(async (req, res) => {
  const Booking = require('../models/Booking');
  const { year, month } = req.params;
  const corp = await Corporate.findOne({ adminUser: req.user._id });
  if (!corp) throw new AppError('Corporate account not found', 404);

  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const bookings = await Booking.find({
    corporate: corp._id,
    status: 'completed',
    createdAt: { $gte: startDate, $lte: endDate },
  }).populate('service', 'name').populate('customer', 'name');

  const subtotal = bookings.reduce((s, b) => s + (b.pricing?.totalAmount || 0), 0);
  const discount = subtotal * (corp.plan.discountPercent / 100);
  const taxes    = (subtotal - discount) * 0.18;
  const total    = subtotal - discount + taxes;

  res.json({
    success: true,
    data: {
      invoiceNumber: `MK-CORP-${year}-${String(month).padStart(2,'0')}-${corp._id.toString().slice(-4).toUpperCase()}`,
      period: { year: Number(year), month: Number(month) },
      company: corp.companyName,
      gstin: corp.gstin,
      bookings,
      summary: { subtotal, discount: Math.round(discount), taxes: Math.round(taxes), total: Math.round(total) },
      generatedAt: new Date(),
    },
  });
}));

// ── Admin routes ─────────────────────────────────────────────
router.get('/all', authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [corps, total] = await Promise.all([
    Corporate.find().populate('adminUser', 'name email').sort('-createdAt').skip((page-1)*limit).limit(Number(limit)),
    Corporate.countDocuments(),
  ]);
  res.json({ success: true, data: corps, total, pages: Math.ceil(total / limit) });
}));

router.patch('/:id/plan', authorize('admin'), asyncHandler(async (req, res) => {
  const corp = await Corporate.findByIdAndUpdate(req.params.id, { plan: req.body }, { new: true });
  if (!corp) throw new AppError('Corporate not found', 404);
  res.json({ success: true, data: corp });
}));

module.exports = router;
