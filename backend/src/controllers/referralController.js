/**
 * MK App — Referral Controller (Full)
 * Referral code generation, tracking, reward distribution
 */
const User = require('../models/User');
const { Referral } = require('../models/SupportModels');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendSMS } = require('../utils/sms');
const { sendNotificationToUser } = require('../services/notificationService');
const crypto = require('crypto');

const REFERRAL_REWARD = {
  REFERRER_WALLET_CREDIT: 200,   // Referrer gets ₹200 after friend's first booking
  REFEREE_DISCOUNT: 150,          // New user gets ₹150 off first booking
  REFERRER_BONUS_5_FRIENDS: 500,  // Extra ₹500 after referring 5 friends
  MAX_WALLET_CREDIT_PER_MONTH: 2000,
};

// Generate unique referral code for user
function generateReferralCode(userId, name) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4) || 'MK';
  const suffix = crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 4).toUpperCase();
  return `${prefix}${suffix}`;
}

// @desc    Get user's referral code and stats
// @route   GET /api/referrals/my-code
// @access  Private
exports.getMyReferralCode = asyncHandler(async (req, res) => {
  let user = await User.findById(req.user._id).select('referralCode referralStats name');

  // Generate referral code if doesn't exist
  if (!user.referralCode) {
    user.referralCode = generateReferralCode(user._id, user.name);
    await user.save();
  }

  const referrals = await Referral.find({ referrer: req.user._id })
    .populate('referee', 'name createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

  const stats = await Referral.aggregate([
    { $match: { referrer: req.user._id } },
    {
      $group: {
        _id: null,
        totalReferred: { $sum: 1 },
        successfulReferrals: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } },
        totalEarned: { $sum: '$referrerReward' },
        pendingRewards: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$referrerReward', 0] } },
      },
    },
  ]);

  const shareMessage = `Hey! I've been using MK App for all my home services — AC repair, cleaning, salons and more. Use my code ${user.referralCode} and get ₹${REFERRAL_REWARD.REFEREE_DISCOUNT} off your first booking! Download: https://mkapp.in/download`;

  res.json({
    success: true,
    data: {
      referralCode: user.referralCode,
      referralLink: `https://mkapp.in/join?ref=${user.referralCode}`,
      shareMessage,
      rewards: REFERRAL_REWARD,
      stats: stats[0] || { totalReferred: 0, successfulReferrals: 0, totalEarned: 0, pendingRewards: 0 },
      recentReferrals: referrals,
    },
  });
});

// @desc    Apply referral code (during registration or first booking)
// @route   POST /api/referrals/apply
// @access  Private
exports.applyReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new AppError('Referral code is required', 400);

  // Check if user already applied a referral code
  if (req.user.referredBy) {
    throw new AppError('You have already used a referral code', 400);
  }

  // Find referrer
  const referrer = await User.findOne({ referralCode: code.toUpperCase() });
  if (!referrer) throw new AppError('Invalid referral code', 404);
  if (referrer._id.toString() === req.user._id.toString()) {
    throw new AppError('You cannot use your own referral code', 400);
  }

  // Create referral record
  const referral = await Referral.create({
    referrer: referrer._id,
    referee: req.user._id,
    code: code.toUpperCase(),
    status: 'applied',
    refereeDiscount: REFERRAL_REWARD.REFEREE_DISCOUNT,
    referrerReward: REFERRAL_REWARD.REFERRER_WALLET_CREDIT,
    appliedAt: new Date(),
  });

  // Mark user as referred
  await User.findByIdAndUpdate(req.user._id, {
    referredBy: referrer._id,
    referralCode_used: code.toUpperCase(),
    walletBonus: (req.user.walletBonus || 0) + REFERRAL_REWARD.REFEREE_DISCOUNT,
  });

  res.json({
    success: true,
    message: `Referral code applied! You get ₹${REFERRAL_REWARD.REFEREE_DISCOUNT} off your first booking.`,
    data: {
      referralId: referral._id,
      discount: REFERRAL_REWARD.REFEREE_DISCOUNT,
      referrerName: referrer.name,
    },
  });
});

// @desc    Process referral reward after first successful booking
// @route   POST /api/referrals/process-reward
// @access  Internal (called from booking controller)
exports.processReferralReward = asyncHandler(async (req, res) => {
  const { userId, bookingId } = req.body;

  const referral = await Referral.findOne({ referee: userId, status: 'applied' });
  if (!referral) return res.json({ success: true, message: 'No pending referral reward' });

  // Check this is truly their first completed booking
  const Booking = require('../models/Booking');
  const completedBookings = await Booking.countDocuments({ customer: userId, status: 'completed' });
  if (completedBookings !== 1) return res.json({ success: true, message: 'Not first booking' });

  // Credit referrer's wallet
  await User.findByIdAndUpdate(referral.referrer, {
    $inc: { 'wallet.balance': REFERRAL_REWARD.REFERRER_WALLET_CREDIT },
    $push: {
      'wallet.transactions': {
        type: 'credit',
        amount: REFERRAL_REWARD.REFERRER_WALLET_CREDIT,
        description: 'Referral reward — your friend completed their first booking!',
        reference: bookingId,
        createdAt: new Date(),
      },
    },
  });

  // Update referral status
  referral.status = 'rewarded';
  referral.rewardedAt = new Date();
  referral.bookingId = bookingId;
  await referral.save();

  // Check milestone — 5 successful referrals bonus
  const successfulCount = await Referral.countDocuments({ referrer: referral.referrer, status: 'rewarded' });
  if (successfulCount === 5) {
    await User.findByIdAndUpdate(referral.referrer, {
      $inc: { 'wallet.balance': REFERRAL_REWARD.REFERRER_BONUS_5_FRIENDS },
      $push: {
        'wallet.transactions': {
          type: 'credit',
          amount: REFERRAL_REWARD.REFERRER_BONUS_5_FRIENDS,
          description: '🎉 Milestone bonus — you referred 5 friends!',
          createdAt: new Date(),
        },
      },
    });
    await sendNotificationToUser(referral.referrer, {
      title: '🎉 Milestone Bonus!',
      body: `You've referred 5 friends! ₹${REFERRAL_REWARD.REFERRER_BONUS_5_FRIENDS} bonus added to your wallet.`,
      data: { type: 'referral_milestone' },
    });
  }

  // Notify referrer
  const referee = await User.findById(userId).select('name');
  await sendNotificationToUser(referral.referrer, {
    title: '💰 Referral Reward Earned!',
    body: `${referee.name} just completed their first booking. ₹${REFERRAL_REWARD.REFERRER_WALLET_CREDIT} added to your wallet!`,
    data: { type: 'referral_reward', amount: String(REFERRAL_REWARD.REFERRER_WALLET_CREDIT) },
  });

  res.json({
    success: true,
    message: `Referral reward of ₹${REFERRAL_REWARD.REFERRER_WALLET_CREDIT} credited to referrer`,
    data: { referralId: referral._id, rewardAmount: REFERRAL_REWARD.REFERRER_WALLET_CREDIT },
  });
});

// @desc    Get referral leaderboard
// @route   GET /api/referrals/leaderboard
// @access  Private
exports.getReferralLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await Referral.aggregate([
    { $match: { status: 'rewarded' } },
    { $group: { _id: '$referrer', totalReferrals: { $sum: 1 }, totalEarned: { $sum: '$referrerReward' } } },
    { $sort: { totalReferrals: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { name: '$user.name', totalReferrals: 1, totalEarned: 1 } },
  ]);

  // Find current user's rank
  const myStats = await Referral.aggregate([
    { $match: { referrer: req.user._id, status: 'rewarded' } },
    { $group: { _id: null, count: { $sum: 1 }, earned: { $sum: '$referrerReward' } } },
  ]);
  const myCount = myStats[0]?.count || 0;
  const higherRanked = await Referral.aggregate([
    { $match: { status: 'rewarded' } },
    { $group: { _id: '$referrer', count: { $sum: 1 } } },
    { $match: { count: { $gt: myCount } } },
    { $count: 'total' },
  ]);
  const myRank = (higherRanked[0]?.total || 0) + 1;

  res.json({
    success: true,
    data: {
      leaderboard,
      myStats: myStats[0] || { count: 0, earned: 0 },
      myRank,
    },
  });
});

// @desc    Share referral via SMS/WhatsApp
// @route   POST /api/referrals/share
// @access  Private
exports.shareReferral = asyncHandler(async (req, res) => {
  const { phones, channel = 'sms' } = req.body;
  if (!phones || !Array.isArray(phones) || phones.length === 0) {
    throw new AppError('Phone numbers are required', 400);
  }
  if (phones.length > 10) throw new AppError('Maximum 10 contacts at once', 400);

  const user = await User.findById(req.user._id).select('referralCode name');
  if (!user.referralCode) {
    user.referralCode = generateReferralCode(user._id, user.name);
    await user.save();
  }

  const message = `${user.name} is inviting you to try MK App! Get ₹${REFERRAL_REWARD.REFEREE_DISCOUNT} off your first home service booking. Use code: ${user.referralCode} — https://mkapp.in/join?ref=${user.referralCode}`;

  const results = [];
  for (const phone of phones) {
    try {
      await sendSMS(phone, message);
      results.push({ phone, status: 'sent' });
    } catch {
      results.push({ phone, status: 'failed' });
    }
  }

  const sent = results.filter(r => r.status === 'sent').length;
  res.json({
    success: true,
    message: `Referral sent to ${sent} of ${phones.length} contacts`,
    data: results,
  });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.getReferralStats = asyncHandler(async (req, res) => {
  const stats = await Referral.aggregate([
    { $match: { referrer: req.user._id } },
    { $group: { _id: null, total: { $sum: 1 }, successful: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } } } },
  ]);
  res.json({ success: true, stats: stats[0] || { total: 0, successful: 0 } });
});

exports.getReferralHistory = asyncHandler(async (req, res) => {
  const history = await Referral.find({ referrer: req.user._id }).populate('referee', 'name avatar').sort('-createdAt');
  res.json({ success: true, history });
});

exports.generateShareLink = exports.shareReferral;

exports.getProReferrals = asyncHandler(async (req, res) => {
  res.json({ success: true, referrals: [] });
});

exports.referProfessional = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Professional referral submitted' });
});
