/**
 * Slot App — Subscription Controller (Full)
 * Plans, subscribe, cancel, renew, upgrade, promo codes
 */
const Subscription = require('../models/Subscription');
const User         = require('../models/User');
const Coupon       = require('../models/Coupon');
const Payment      = require('../models/Payment');

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    color: '#888BA0',
    description: 'Basic access to all services',
    benefits: [
      'Book any service',
      'Standard pricing',
      'Email support',
    ],
    bookingsPerMonth: 5,
    discount: 0,
    prioritySupport: false,
    freeRescheduling: false,
    dedicatedManager: false,
    popular: false,
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 199,
    period: 'month',
    color: '#9B9B9B',
    description: 'Great for occasional users',
    benefits: [
      '5% discount on all services',
      'Free rescheduling (2x/month)',
      'Priority customer support',
      'Exclusive Silver offers',
    ],
    bookingsPerMonth: 15,
    discount: 5,
    prioritySupport: true,
    freeRescheduling: true,
    dedicatedManager: false,
    popular: false,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 499,
    period: 'month',
    color: '#F5A623',
    description: 'Our most popular plan',
    benefits: [
      '10% discount on all services',
      'Unlimited free rescheduling',
      '24/7 priority support',
      'Dedicated account manager',
      'Exclusive Gold offers & early access',
      'Free cancellation anytime',
    ],
    bookingsPerMonth: -1, // unlimited
    discount: 10,
    prioritySupport: true,
    freeRescheduling: true,
    dedicatedManager: true,
    popular: true,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 999,
    period: 'month',
    color: '#5B2C6F',
    description: 'Ultimate premium experience',
    benefits: [
      '15% discount on all services',
      'Unlimited free rescheduling',
      'Dedicated personal manager',
      'Concierge booking service',
      '2 free services/month (up to ₹500 each)',
      'Priority professional assignment',
      'Platinum-only exclusive events',
    ],
    bookingsPerMonth: -1,
    discount: 15,
    prioritySupport: true,
    freeRescheduling: true,
    dedicatedManager: true,
    freeServices: 2,
    popular: false,
  },
];

// @desc  Get all subscription plans
// @route GET /api/v1/subscriptions/plans
// @access Public
exports.getPlans = async (req, res) => {
  try {
    res.json({ success: true, data: PLANS });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Get subscription benefits
// @route GET /api/v1/subscriptions/benefits
// @access Public
exports.getSubscriptionBenefits = async (req, res) => {
  try {
    const benefits = {
      silver:   PLANS.find(p => p.id === 'silver')?.benefits || [],
      gold:     PLANS.find(p => p.id === 'gold')?.benefits || [],
      platinum: PLANS.find(p => p.id === 'platinum')?.benefits || [],
    };
    res.json({ success: true, data: benefits });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Get current user's subscription
// @route GET /api/v1/subscriptions/my
// @access Private
exports.getMySubscription = async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user.id, status: { $in: ['active', 'cancelled'] } })
      .sort('-createdAt');

    if (!sub) {
      return res.json({ success: true, data: { plan: 'free', status: 'none' } });
    }

    const plan = PLANS.find(p => p.id === sub.plan) || PLANS[0];
    res.json({ success: true, data: { ...sub.toObject(), planDetails: plan } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Get subscription history
// @route GET /api/v1/subscriptions/history
// @access Private
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const history = await Subscription.find({ user: req.user.id })
      .sort('-createdAt')
      .limit(20);
    res.json({ success: true, data: history, count: history.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Subscribe to a plan
// @route POST /api/v1/subscriptions/subscribe
// @access Private
exports.subscribe = async (req, res) => {
  try {
    const { planId, paymentMethod, promoCode, autoRenew = true } = req.body;

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });
    if (plan.price === 0) return res.status(400).json({ success: false, message: 'Cannot subscribe to free plan' });

    // Check for existing active subscription
    const existing = await Subscription.findOne({ user: req.user.id, status: 'active' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please upgrade or cancel first.',
      });
    }

    let finalPrice = plan.price;
    let discountApplied = 0;
    let promoDetails = null;

    // Apply promo code
    if (promoCode) {
      const coupon = await Coupon.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
        validTill: { $gte: new Date() },
        $or: [{ usageLimit: -1 }, { usedCount: { $lt: '$usageLimit' } }],
      });

      if (coupon) {
        if (coupon.discountType === 'percentage') {
          discountApplied = Math.round((finalPrice * coupon.discountValue) / 100);
        } else {
          discountApplied = Math.min(coupon.discountValue, finalPrice);
        }
        finalPrice = Math.max(0, finalPrice - discountApplied);
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        promoDetails = { code: promoCode, discount: discountApplied };
      }
    }

    const now     = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    // Create subscription
    const sub = await Subscription.create({
      user:           req.user.id,
      plan:           planId,
      status:         'active',
      startDate:      now,
      endDate:        endDate,
      price:          plan.price,
      finalPrice:     finalPrice,
      discountApplied,
      promoCode:      promoDetails?.code,
      paymentMethod:  paymentMethod || 'razorpay',
      autoRenew,
    });

    // Update user subscription tier
    await User.findByIdAndUpdate(req.user.id, {
      'subscription.plan':    planId,
      'subscription.status':  'active',
      'subscription.endDate': endDate,
    });

    // Log payment
    if (finalPrice > 0) {
      await Payment.create({
        user:    req.user.id,
        amount:  finalPrice,
        type:    'subscription',
        status:  'completed',
        description: `${plan.name} plan subscription`,
        reference: sub._id,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully subscribed to ${plan.name} plan!`,
      data: { subscription: sub, planDetails: plan, promoDetails },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Cancel subscription
// @route POST /api/v1/subscriptions/cancel
// @access Private
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const sub = await Subscription.findOne({ user: req.user.id, status: 'active' });
    if (!sub) return res.status(404).json({ success: false, message: 'No active subscription found' });

    sub.status       = 'cancelled';
    sub.cancelledAt  = new Date();
    sub.cancelReason = reason || 'User requested cancellation';
    sub.autoRenew    = false;
    await sub.save();

    await User.findByIdAndUpdate(req.user.id, {
      'subscription.status': 'cancelled',
    });

    res.json({ success: true, message: 'Subscription cancelled. Benefits valid until ' + sub.endDate.toDateString() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Renew subscription
// @route POST /api/v1/subscriptions/renew
// @access Private
exports.renewSubscription = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const sub = await Subscription.findOne({ user: req.user.id }).sort('-createdAt');
    if (!sub) return res.status(404).json({ success: false, message: 'No subscription to renew' });

    const plan = PLANS.find(p => p.id === sub.plan);
    if (!plan) return res.status(400).json({ success: false, message: 'Plan not found' });

    const now     = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const newSub = await Subscription.create({
      user:          req.user.id,
      plan:          sub.plan,
      status:        'active',
      startDate:     now,
      endDate,
      price:         plan.price,
      finalPrice:    plan.price,
      paymentMethod: paymentMethod || sub.paymentMethod,
      autoRenew:     true,
      renewedFrom:   sub._id,
    });

    await User.findByIdAndUpdate(req.user.id, {
      'subscription.status':  'active',
      'subscription.endDate': endDate,
    });

    res.json({ success: true, message: `${plan.name} plan renewed successfully!`, data: newSub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Upgrade subscription
// @route POST /api/v1/subscriptions/upgrade
// @access Private
exports.upgradeSubscription = async (req, res) => {
  try {
    const { newPlanId, paymentMethod } = req.body;

    const newPlan = PLANS.find(p => p.id === newPlanId);
    if (!newPlan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const currentSub = await Subscription.findOne({ user: req.user.id, status: 'active' });
    if (currentSub) {
      currentSub.status = 'upgraded';
      await currentSub.save();
    }

    const now     = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const newSub = await Subscription.create({
      user:          req.user.id,
      plan:          newPlanId,
      status:        'active',
      startDate:     now,
      endDate,
      price:         newPlan.price,
      finalPrice:    newPlan.price,
      paymentMethod: paymentMethod || 'razorpay',
      autoRenew:     true,
      upgradedFrom:  currentSub?._id,
    });

    await User.findByIdAndUpdate(req.user.id, {
      'subscription.plan':    newPlanId,
      'subscription.status':  'active',
      'subscription.endDate': endDate,
    });

    if (newPlan.price > 0) {
      await Payment.create({
        user:   req.user.id,
        amount: newPlan.price,
        type:   'subscription',
        status: 'completed',
        description: `Upgrade to ${newPlan.name} plan`,
      });
    }

    res.json({ success: true, message: `Upgraded to ${newPlan.name} plan!`, data: newSub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// @desc  Apply promo code (validate only, don't consume)
// @route POST /api/v1/subscriptions/apply-promo
// @access Private
exports.applyPromoCode = async (req, res) => {
  try {
    const { code, planId } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Promo code is required' });

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      validTill: { $gte: new Date() },
    });

    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or expired promo code' });

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round((plan.price * coupon.discountValue) / 100);
    } else {
      discount = Math.min(coupon.discountValue, plan.price);
    }

    res.json({
      success: true,
      message: `Promo code applied! You save ₹${discount}`,
      data: {
        code: coupon.code,
        discount,
        finalPrice: Math.max(0, plan.price - discount),
        description: coupon.description,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Pause subscription ────────────────────────────────────────
exports.pauseSubscription = async (req, res, next) => {
  try {
    const { pauseMonths = 1 } = req.body;
    if (pauseMonths < 1 || pauseMonths > 3) {
      return res.status(400).json({ success: false, message: 'Can pause for 1–3 months only' });
    }

    const sub = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!sub) return res.status(404).json({ success: false, message: 'No active subscription found' });

    const pauseUntil = new Date();
    pauseUntil.setMonth(pauseUntil.getMonth() + pauseMonths);

    // Extend end date by the pause duration
    sub.endDate.setMonth(sub.endDate.getMonth() + pauseMonths);
    sub.status           = 'paused';
    sub.pausedAt         = new Date();
    sub.pauseUntil       = pauseUntil;
    sub.pauseMonths      = pauseMonths;
    await sub.save();

    res.json({
      success: true,
      message: `Subscription paused for ${pauseMonths} month${pauseMonths > 1 ? 's' : ''}. Your end date has been extended.`,
      subscription: sub,
    });
  } catch (e) { next(e); }
};

// ── Resume subscription ───────────────────────────────────────
exports.resumeSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ user: req.user._id, status: 'paused' });
    if (!sub) return res.status(404).json({ success: false, message: 'No paused subscription found' });

    sub.status     = 'active';
    sub.pausedAt   = undefined;
    sub.pauseUntil = undefined;
    await sub.save();

    res.json({ success: true, message: 'Subscription resumed successfully.', subscription: sub });
  } catch (e) { next(e); }
};
