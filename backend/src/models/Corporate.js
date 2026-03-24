// ── CORPORATE MODEL ───────────────────────────────────────────
const mongoose = require('mongoose');

const corporateSchema = new mongoose.Schema({
  companyName:    { type: String, required: true, trim: true },
  gstin:          { type: String, trim: true },
  adminUser:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorizedUsers:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  contact: {
    name:  { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    designation: String,
  },

  billing: {
    address:    { type: String },
    city:       { type: String },
    state:      { type: String },
    pincode:    { type: String },
    gstAddress: { type: String },
  },

  plan: {
    type: { type: String, enum: ['starter','business','enterprise'], default: 'starter' },
    monthlyCredits:  { type: Number, default: 5000 },
    discountPercent: { type: Number, default: 10 },
    dedicatedManager: { type: Boolean, default: false },
    customInvoicing:  { type: Boolean, default: false },
    prioritySupport:  { type: Boolean, default: false },
  },

  wallet: {
    balance:       { type: Number, default: 0 },
    totalLoaded:   { type: Number, default: 0 },
    totalSpent:    { type: Number, default: 0 },
    transactions:  [{
      type:        { type: String, enum: ['credit','debit'] },
      amount:      Number,
      description: String,
      createdAt:   { type: Date, default: Date.now },
    }],
  },

  status: { type: String, enum: ['active','suspended','pending_verification'], default: 'pending_verification' },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  contractSignedAt: Date,
  notes: String,
}, { timestamps: true });

corporateSchema.virtual('employeeCount').get(function () {
  return this.authorizedUsers.length + 1;
});

const Corporate = mongoose.model('Corporate', corporateSchema);

// ── CORPORATE CONTROLLER ──────────────────────────────────────
const User      = require('../models/User');
const Booking   = require('../models/Booking');
const redis     = require('../config/redis');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// POST /corporate/enquiry — public form submission
const submitEnquiry = asyncHandler(async (req, res) => {
  const { companyName, contactName, email, phone, employeeCount, message } = req.body;

  if (!companyName || !email || !phone) {
    throw new AppError('Company name, email and phone are required', 400);
  }

  // Send notification to sales team
  const { sendEmail } = require('../utils/email');
  await sendEmail({
    to: process.env.SALES_EMAIL || 'sales@slotapp.in',
    subject: `New Corporate Enquiry: ${companyName}`,
    html: `
      <h2>New Corporate Enquiry</h2>
      <p><b>Company:</b> ${companyName}</p>
      <p><b>Contact:</b> ${contactName}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Employees:</b> ${employeeCount || 'Not specified'}</p>
      <p><b>Message:</b> ${message || 'None'}</p>
    `,
  });

  res.json({ success: true, message: 'Thank you! Our enterprise team will contact you within 24 hours.' });
});

// POST /corporate/register — admin creates corporate account
const registerCorporate = asyncHandler(async (req, res) => {
  const { companyName, gstin, contact, billing, plan } = req.body;

  // Check existing
  const existing = await Corporate.findOne({ 'contact.email': contact.email });
  if (existing) throw new AppError('Corporate account with this email already exists', 409);

  // Create admin user for the corporate
  let adminUser = await User.findOne({ phone: contact.phone });
  if (!adminUser) {
    adminUser = await User.create({
      name: contact.name, phone: contact.phone, email: contact.email,
      role: 'corporate_admin',
    });
  }

  const corporate = await Corporate.create({
    companyName, gstin, adminUser: adminUser._id, contact, billing,
    plan: plan || { type: 'starter' },
  });

  res.status(201).json({ success: true, corporate, adminUser });
});

// GET /corporate/my — get own corporate profile
const getMyCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findOne({
    $or: [
      { adminUser: req.user._id },
      { authorizedUsers: req.user._id },
    ],
  }).populate('adminUser', 'name phone email');

  if (!corporate) throw new AppError('No corporate account found', 404);

  const stats = await Booking.aggregate([
    { $match: { corporate: corporate._id } },
    { $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status','completed'] },1,0] } },
        totalSpend: { $sum: '$pricing.totalAmount' },
        thisMonthSpend: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] }, '$pricing.totalAmount', 0] } },
    }},
  ]);

  res.json({ success: true, corporate, stats: stats[0] || {} });
});

// POST /corporate/add-credits — load wallet
const addCredits = asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) throw new AppError('Invalid amount', 400);

  const corporate = await Corporate.findOneAndUpdate(
    { adminUser: req.user._id },
    {
      $inc: { 'wallet.balance': amount, 'wallet.totalLoaded': amount },
      $push: { 'wallet.transactions': { type:'credit', amount, description: description || 'Manual top-up' } },
    },
    { new: true }
  );

  if (!corporate) throw new AppError('Corporate account not found', 404);
  res.json({ success: true, balance: corporate.wallet.balance, message: `₹${amount} added to corporate wallet` });
});

// GET /corporate/bookings — all corporate bookings
const getCorporateBookings = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const { page = 1, limit = 20, status } = req.query;
  const query = { corporate: corporate._id };
  if (status) query.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(query).populate('service','name icon startingPrice').populate('customer','name phone')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
    Booking.countDocuments(query),
  ]);

  res.json({ success:true, bookings, total, pages: Math.ceil(total/limit) });
});

// GET /corporate/invoice/:month — monthly invoice
const getMonthlyInvoice = asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const startDate = new Date(year, month-1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const bookings = await Booking.find({
    corporate: corporate._id,
    status: 'completed',
    createdAt: { $gte: startDate, $lte: endDate },
  }).populate('service','name').populate('customer','name');

  const subtotal  = bookings.reduce((s, b) => s + (b.pricing?.totalAmount || 0), 0);
  const discount  = subtotal * (corporate.plan.discountPercent / 100);
  const taxes     = (subtotal - discount) * 0.18;
  const total     = subtotal - discount + taxes;

  res.json({
    success: true,
    invoice: {
      invoiceNumber: `Slot-CORP-${year}-${month}-${corporate._id.toString().slice(-4).toUpperCase()}`,
      period: { year: Number(year), month: Number(month) },
      company: corporate.companyName,
      gstin: corporate.gstin,
      bookings,
      summary: { subtotal, discount, taxes: Math.round(taxes), total: Math.round(total) },
      generatedAt: new Date(),
    },
  });
});

// ── ROUTES ────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.post('/enquiry',          submitEnquiry);
router.post('/register',         protect, authorize('admin'), registerCorporate);
router.get('/my',                protect, getMyCorporate);
router.post('/add-credits',      protect, addCredits);
router.get('/bookings',          protect, getCorporateBookings);
router.get('/invoice/:year/:month', protect, getMonthlyInvoice);

module.exports = { router, Corporate };
