/**
 * MK App — Subscription Routes
 */
const express = require('express');
const router  = express.Router();
const {
  getPlans, getMySubscription, subscribe, cancelSubscription,
  renewSubscription, getSubscriptionHistory, applyPromoCode,
  upgradeSubscription, getSubscriptionBenefits, pauseSubscription, resumeSubscription,
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/plans',            getPlans);
router.get('/benefits',         getSubscriptionBenefits);

router.use(protect);

router.get('/my',               getMySubscription);
router.get('/history',          getSubscriptionHistory);
router.post('/subscribe',       subscribe);
router.post('/cancel',          cancelSubscription);
router.post('/renew',           renewSubscription);
router.post('/upgrade',         upgradeSubscription);
router.post('/apply-promo',     applyPromoCode);

// Admin
router.get('/all',              authorize('admin'), async (req, res) => {
  try {
    const Subscription = require('../models/Subscription');
    const subs = await Subscription.find().populate('user', 'name phone email').sort('-createdAt').limit(100);
    res.json({ success: true, data: subs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

// Pause subscription
router.post('/pause',  protect, pauseSubscription);
router.post('/resume', protect, resumeSubscription);

// ── Custom Bundle routes ─────────────────────────────────────
const { asyncHandler: _ah, AppError: _AE } = require('../middleware/errorHandler');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// POST /subscriptions/bundles — create custom bundle
router.post('/bundles', protect, _ah(async (req, res) => {
  const { name, services, billingCycle = 'monthly' } = req.body;
  if (!services?.length) throw new _AE('At least one service required', 400);

  // Fetch service prices
  const serviceData = await Service.find({ _id: { $in: services.map(s => s.serviceId) } })
    .select('name icon startingPrice').lean();
  if (!serviceData.length) throw new _AE('No valid services found', 404);

  const totalMonthly = serviceData.reduce((sum, svc) => {
    const item = services.find(s => s.serviceId === svc._id.toString());
    return sum + (svc.startingPrice * (item?.frequency || 1));
  }, 0);

  // 10% bundle discount
  const discount    = Math.round(totalMonthly * 0.10);
  const finalPrice  = totalMonthly - discount;

  const User = require('../models/User');
  const user = await User.findById(req.user._id);
  if (!user.customBundles) user.customBundles = [];
  const bundle = {
    id:           `BUNDLE_${Date.now()}`,
    name:         name || 'My Home Plan',
    services:     services.map(s => ({
      serviceId:  s.serviceId,
      frequency:  s.frequency || 1,
      name:       serviceData.find(sd => sd._id.toString() === s.serviceId)?.name,
      icon:       serviceData.find(sd => sd._id.toString() === s.serviceId)?.icon,
    })),
    billingCycle,
    originalPrice: totalMonthly,
    discount,
    finalPrice,
    isActive:     true,
    createdAt:    new Date(),
    nextBillingDate: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : billingCycle === 'quarterly' ? 90 : 365) * 86400000),
  };
  user.customBundles.push(bundle);
  await user.save();

  res.status(201).json({ success: true, bundle });
}));

// GET /subscriptions/bundles — user's custom bundles
router.get('/bundles', protect, _ah(async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('customBundles').lean();
  res.json({ success: true, bundles: user?.customBundles || [] });
}));

// DELETE /subscriptions/bundles/:bundleId — cancel bundle
router.delete('/bundles/:bundleId', protect, _ah(async (req, res) => {
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { customBundles: { id: req.params.bundleId } },
  });
  res.json({ success: true, message: 'Bundle cancelled' });
}));
