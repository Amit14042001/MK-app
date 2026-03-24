// ── MODEL ───────────────────────────────────────────────────
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: {
    type: { type: String, enum: ['monthly', 'quarterly', 'annual'], required: true },
    name: { type: String, default: 'Slot Prime' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    discount: { type: Number, default: 15 }, // % discount on all bookings
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'grace_period', 'pending'],
    default: 'pending',
    index: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true, index: true },
  renewalDate: { type: Date },
  autoRenew: { type: Boolean, default: true },
  payment: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySubscriptionId: String,
    amount: Number,
  },
  benefits: {
    discountPercent: { type: Number, default: 15 },
    freeServicesLeft: { type: Number, default: 1 },
    prioritySupport: { type: Boolean, default: true },
    extendedWarranty: { type: Boolean, default: true },
  },
  cancelledAt: Date,
  cancelReason: String,
  gracePeriodEnd: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

subscriptionSchema.virtual('isActive').get(function () {
  return ['active', 'grace_period'].includes(this.status) && this.endDate > new Date();
});

subscriptionSchema.virtual('daysRemaining').get(function () {
  return Math.max(0, Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24)));
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// ── CONTROLLER ─────────────────────────────────────────────
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const User = require('./User');  // will be required from models

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_CONFIG = {
  monthly: { months: 1, price: 299, originalPrice: 399 },
  quarterly: { months: 3, price: 699, originalPrice: 1197 },
  annual: { months: 12, price: 1999, originalPrice: 4788 },
};

// GET /subscriptions/plans
const getPlans = asyncHandler(async (req, res) => {
  const plans = Object.entries(PLAN_CONFIG).map(([id, cfg]) => ({
    id, ...cfg,
    savings: cfg.originalPrice - cfg.price,
    savingsPct: Math.round((1 - cfg.price / cfg.originalPrice) * 100),
  }));
  res.json({ success: true, plans });
});

// GET /subscriptions/my
const getMySubscription = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: { $in: ['active', 'grace_period'] } })
    .sort({ createdAt: -1 });
  res.json({ success: true, subscription: sub || null, isActive: sub?.isActive || false });
});

// POST /subscriptions/create-order
const createOrder = asyncHandler(async (req, res) => {
  const { planType } = req.body;
  const plan = PLAN_CONFIG[planType];
  if (!plan) throw new AppError('Invalid plan', 400);

  const order = await razorpay.orders.create({
    amount: plan.price * 100,
    currency: 'INR',
    receipt: `sub_${req.user._id}_${planType}_${Date.now()}`,
    notes: { userId: req.user._id.toString(), planType },
  });

  res.json({
    success: true,
    order,
    key: process.env.RAZORPAY_KEY_ID,
    plan: { ...plan, type: planType },
    prefill: { name: req.user.name, contact: req.user.phone, email: req.user.email },
  });
});

// POST /subscriptions/activate
const activateSubscription = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planType } = req.body;

  // Verify signature
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) throw new AppError('Payment verification failed', 400);

  const plan = PLAN_CONFIG[planType];
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + plan.months);

  // Cancel any existing active subscription
  await Subscription.updateMany(
    { user: req.user._id, status: 'active' },
    { $set: { status: 'cancelled', cancelledAt: now, cancelReason: 'Upgraded to new plan' } }
  );

  const sub = await Subscription.create({
    user: req.user._id,
    plan: { type: planType, name: 'Slot Prime', price: plan.price },
    status: 'active',
    startDate: now,
    endDate,
    renewalDate: endDate,
    payment: { razorpayOrderId, razorpayPaymentId, amount: plan.price },
    benefits: { discountPercent: 15, freeServicesLeft: 1, prioritySupport: true, extendedWarranty: true },
  });

  // Update user's membership tier
  await require('../models/User').findByIdAndUpdate(req.user._id, {
    membershipTier: 'Prime',
    primeSubscription: sub._id,
  });

  res.json({ success: true, message: 'Welcome to Slot Prime! 👑', subscription: sub });
});

// PUT /subscriptions/cancel
const cancelSubscription = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const sub = await Subscription.findOne({ user: req.user._id, status: 'active' });
  if (!sub) throw new AppError('No active subscription found', 404);

  // Set grace period (1 week)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  sub.cancelReason = reason;
  sub.autoRenew = false;
  sub.gracePeriodEnd = gracePeriodEnd;
  await sub.save();

  await require('../models/User').findByIdAndUpdate(req.user._id, { membershipTier: 'Standard' });

  res.json({ success: true, message: 'Subscription cancelled. You have access until ' + sub.endDate.toDateString() });
});

// ── ROUTES ──────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/plans', getPlans);
router.get('/my', protect, getMySubscription);
router.post('/create-order', protect, createOrder);
router.post('/activate', protect, activateSubscription);
router.put('/cancel', protect, cancelSubscription);

module.exports = { router, Subscription };
