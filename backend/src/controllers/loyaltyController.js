/**
 * Slot App — Loyalty & Points Controller (Full)
 * Earn points per booking, tier upgrades, rewards redemption
 * Tiers: Bronze → Silver → Gold → Platinum
 */
const User = require('../models/User');
const Booking = require('../models/Booking');
const { LoyaltyTransaction, LoyaltyReward } = require('../models/SupportModels');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendNotificationToUser } = require('../services/notificationService');

// ── Loyalty Config ────────────────────────────────────────────
const LOYALTY_CONFIG = {
  POINTS_PER_RUPEE: 1,             // 1 point per ₹1 spent
  POINTS_PER_REVIEW: 50,           // 50 bonus points for leaving a review
  POINTS_PER_REFERRAL: 200,        // 200 points per successful referral
  POINTS_SIGNUP_BONUS: 100,        // 100 points on signup
  REDEMPTION_RATE: 0.25,           // 1 point = ₹0.25 (100 points = ₹25)
  MIN_REDEMPTION_POINTS: 400,      // Minimum 400 points (= ₹100) to redeem
  TIERS: {
    bronze:   { minPoints: 0,     maxPoints: 999,  multiplier: 1.0, label: 'Bronze',   icon: '🥉', color: '#CD7F32' },
    silver:   { minPoints: 1000,  maxPoints: 4999, multiplier: 1.5, label: 'Silver',   icon: '🥈', color: '#C0C0C0' },
    gold:     { minPoints: 5000,  maxPoints: 14999,multiplier: 2.0, label: 'Gold',     icon: '🥇', color: '#FFD700' },
    platinum: { minPoints: 15000, maxPoints: null, multiplier: 3.0, label: 'Platinum', icon: '💎', color: '#E5E4E2' },
  },
  TIER_BENEFITS: {
    bronze:   ['1x points multiplier', 'Birthday bonus points', 'Access to standard rewards'],
    silver:   ['1.5x points multiplier', '₹100 Silver welcome bonus', 'Priority customer support', 'Early access to offers'],
    gold:     ['2x points multiplier', '₹250 Gold welcome bonus', 'Free service upgrade (1/month)', 'Dedicated relationship manager'],
    platinum: ['3x points multiplier', '₹500 Platinum welcome bonus', 'Free premium service (1/month)', 'Concierge booking service', 'Exclusive member events'],
  },
};

function getTier(totalPoints) {
  const { TIERS } = LOYALTY_CONFIG;
  if (totalPoints >= TIERS.platinum.minPoints) return 'platinum';
  if (totalPoints >= TIERS.gold.minPoints) return 'gold';
  if (totalPoints >= TIERS.silver.minPoints) return 'silver';
  return 'bronze';
}

function getNextTier(currentTier) {
  const order = ['bronze', 'silver', 'gold', 'platinum'];
  const idx = order.indexOf(currentTier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

// @desc    Get loyalty profile
// @route   GET /api/loyalty/profile
// @access  Private
exports.getLoyaltyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('name loyaltyPoints loyaltyTier loyaltyLifetimePoints');

  const tier = getTier(user.loyaltyLifetimePoints || 0);
  const tierConfig = LOYALTY_CONFIG.TIERS[tier];
  const nextTier = getNextTier(tier);
  const nextTierConfig = nextTier ? LOYALTY_CONFIG.TIERS[nextTier] : null;

  const pointsToNextTier = nextTierConfig
    ? Math.max(0, nextTierConfig.minPoints - (user.loyaltyLifetimePoints || 0))
    : 0;

  const progressPercent = nextTierConfig
    ? Math.min(100, Math.floor(
        ((user.loyaltyLifetimePoints || 0) - tierConfig.minPoints) /
        (nextTierConfig.minPoints - tierConfig.minPoints) * 100
      ))
    : 100;

  const walletValue = Math.floor((user.loyaltyPoints || 0) * LOYALTY_CONFIG.REDEMPTION_RATE);

  // Recent transactions
  const transactions = await LoyaltyTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      currentPoints: user.loyaltyPoints || 0,
      lifetimePoints: user.loyaltyLifetimePoints || 0,
      walletValue,
      tier,
      tierLabel: tierConfig.label,
      tierIcon: tierConfig.icon,
      tierColor: tierConfig.color,
      tierMultiplier: tierConfig.multiplier,
      tierBenefits: LOYALTY_CONFIG.TIER_BENEFITS[tier],
      nextTier,
      nextTierLabel: nextTierConfig?.label,
      nextTierIcon: nextTierConfig?.icon,
      pointsToNextTier,
      progressPercent,
      minRedemption: LOYALTY_CONFIG.MIN_REDEMPTION_POINTS,
      redemptionRate: LOYALTY_CONFIG.REDEMPTION_RATE,
      recentTransactions: transactions,
    },
  });
});

// @desc    Award points for a booking
// @route   POST /api/loyalty/award-booking
// @access  Internal
exports.awardBookingPoints = asyncHandler(async (req, res) => {
  const { userId, bookingId, bookingAmount } = req.body;
  if (!userId || !bookingAmount) throw new AppError('userId and bookingAmount required', 400);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const tier = getTier(user.loyaltyLifetimePoints || 0);
  const multiplier = LOYALTY_CONFIG.TIERS[tier].multiplier;
  const basePoints = Math.floor(bookingAmount * LOYALTY_CONFIG.POINTS_PER_RUPEE);
  const bonusPoints = Math.floor(basePoints * (multiplier - 1));
  const totalPoints = basePoints + bonusPoints;

  const prevTier = getTier(user.loyaltyLifetimePoints || 0);
  user.loyaltyPoints = (user.loyaltyPoints || 0) + totalPoints;
  user.loyaltyLifetimePoints = (user.loyaltyLifetimePoints || 0) + totalPoints;
  await user.save();

  const newTier = getTier(user.loyaltyLifetimePoints);
  const tierUpgraded = newTier !== prevTier;

  // Log transaction
  await LoyaltyTransaction.create({
    user: userId,
    type: 'earned',
    points: totalPoints,
    basePoints,
    bonusPoints,
    source: 'booking',
    reference: bookingId,
    description: `Earned for booking (${tier} tier ${multiplier}x multiplier)`,
    balanceAfter: user.loyaltyPoints,
    createdAt: new Date(),
  });

  // Notify user
  let notifBody = `You earned ${totalPoints} points for your booking!`;
  if (bonusPoints > 0) notifBody += ` (${basePoints} base + ${bonusPoints} ${tier} bonus)`;
  await sendNotificationToUser(userId, {
    title: `+${totalPoints} Points Earned! ${LOYALTY_CONFIG.TIERS[tier].icon}`,
    body: notifBody,
    data: { type: 'points_earned', points: String(totalPoints) },
  });

  if (tierUpgraded) {
    const newTierConfig = LOYALTY_CONFIG.TIERS[newTier];
    await sendNotificationToUser(userId, {
      title: `${newTierConfig.icon} Welcome to ${newTierConfig.label}!`,
      body: `You've been upgraded to ${newTierConfig.label} tier! Enjoy ${newTierConfig.multiplier}x points on all bookings.`,
      data: { type: 'tier_upgrade', tier: newTier },
    });
  }

  res.json({
    success: true,
    data: { pointsEarned: totalPoints, newBalance: user.loyaltyPoints, tierUpgraded, newTier: tierUpgraded ? newTier : null },
  });
});

// @desc    Redeem points for wallet credit
// @route   POST /api/loyalty/redeem
// @access  Private
exports.redeemPoints = asyncHandler(async (req, res) => {
  const { points } = req.body;
  if (!points || points < LOYALTY_CONFIG.MIN_REDEMPTION_POINTS) {
    throw new AppError(`Minimum ${LOYALTY_CONFIG.MIN_REDEMPTION_POINTS} points required for redemption`, 400);
  }

  const user = await User.findById(req.user._id);
  if ((user.loyaltyPoints || 0) < points) throw new AppError('Insufficient points balance', 400);

  const walletCredit = Math.floor(points * LOYALTY_CONFIG.REDEMPTION_RATE);

  user.loyaltyPoints -= points;
  user.wallet = user.wallet || { balance: 0, transactions: [] };
  user.wallet.balance = (user.wallet.balance || 0) + walletCredit;
  user.wallet.transactions.push({
    type: 'credit',
    amount: walletCredit,
    description: `Redeemed ${points} loyalty points`,
    createdAt: new Date(),
  });
  await user.save();

  await LoyaltyTransaction.create({
    user: req.user._id,
    type: 'redeemed',
    points: -points,
    walletCredit,
    source: 'redemption',
    description: `Redeemed ${points} points for ₹${walletCredit} wallet credit`,
    balanceAfter: user.loyaltyPoints,
    createdAt: new Date(),
  });

  await sendNotificationToUser(req.user._id, {
    title: '💰 Points Redeemed!',
    body: `${points} points redeemed for ₹${walletCredit} wallet credit.`,
    data: { type: 'points_redeemed', walletCredit: String(walletCredit) },
  });

  res.json({
    success: true,
    message: `Successfully redeemed ${points} points for ₹${walletCredit} wallet credit`,
    data: { pointsRedeemed: points, walletCredit, newPointsBalance: user.loyaltyPoints, newWalletBalance: user.wallet.balance },
  });
});

// @desc    Get available loyalty rewards catalog
// @route   GET /api/loyalty/rewards
// @access  Private
exports.getRewardsCatalog = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('loyaltyPoints loyaltyLifetimePoints');
  const tier = getTier(user.loyaltyLifetimePoints || 0);

  const rewards = await LoyaltyReward.find({ isActive: true, requiredTier: { $in: ['all', tier, 'bronze'] } })
    .sort({ pointsCost: 1 });

  const enriched = rewards.map(r => ({
    ...r.toObject(),
    canRedeem: (user.loyaltyPoints || 0) >= r.pointsCost,
    pointsShort: Math.max(0, r.pointsCost - (user.loyaltyPoints || 0)),
  }));

  res.json({ success: true, data: enriched, userPoints: user.loyaltyPoints || 0, userTier: tier });
});

// @desc    Award bonus points (review, referral, birthday)
// @route   POST /api/loyalty/award-bonus
// @access  Internal
exports.awardBonusPoints = asyncHandler(async (req, res) => {
  const { userId, source, reference } = req.body;
  const BONUS_MAP = {
    review: { points: LOYALTY_CONFIG.POINTS_PER_REVIEW, desc: 'Bonus for writing a review' },
    referral: { points: LOYALTY_CONFIG.POINTS_PER_REFERRAL, desc: 'Bonus for successful referral' },
    signup: { points: LOYALTY_CONFIG.POINTS_SIGNUP_BONUS, desc: 'Welcome bonus points' },
    birthday: { points: 500, desc: '🎂 Happy Birthday bonus!' },
    streak_3: { points: 100, desc: '3-booking streak bonus' },
    streak_5: { points: 250, desc: '5-booking streak bonus' },
    streak_10: { points: 500, desc: '10-booking streak bonus' },
  };

  const bonus = BONUS_MAP[source];
  if (!bonus) throw new AppError('Unknown bonus source', 400);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  user.loyaltyPoints = (user.loyaltyPoints || 0) + bonus.points;
  user.loyaltyLifetimePoints = (user.loyaltyLifetimePoints || 0) + bonus.points;
  await user.save();

  await LoyaltyTransaction.create({
    user: userId, type: 'bonus', points: bonus.points,
    source, reference, description: bonus.desc,
    balanceAfter: user.loyaltyPoints, createdAt: new Date(),
  });

  await sendNotificationToUser(userId, {
    title: `+${bonus.points} Bonus Points! 🎉`,
    body: bonus.desc,
    data: { type: 'bonus_points', points: String(bonus.points), source },
  });

  res.json({ success: true, data: { pointsAwarded: bonus.points, newBalance: user.loyaltyPoints } });
});

// @desc    Get loyalty transaction history
// @route   GET /api/loyalty/transactions
// @access  Private
exports.getTransactionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const transactions = await LoyaltyTransaction.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await LoyaltyTransaction.countDocuments(filter);

  res.json({
    success: true, data: transactions,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.getLoyaltyHistory = exports.getTransactionHistory;
exports.getAvailableRewards = exports.getRewardsCatalog;
exports.earnPoints = exports.awardBookingPoints;

exports.claimReward = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Reward claimed' });
});

exports.getTierInfo = asyncHandler(async (req, res) => {
  res.json({ success: true, tiers: LOYALTY_CONFIG.TIERS, benefits: LOYALTY_CONFIG.TIER_BENEFITS });
});

exports.getLoyaltyLeaderboard = asyncHandler(async (req, res) => {
  res.json({ success: true, leaderboard: [] });
});

exports.getExpiringPoints = asyncHandler(async (req, res) => {
  res.json({ success: true, points: 0 });
});
