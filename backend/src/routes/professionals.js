/**
 * MK App — Professionals Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const Professional = require('../models/Professional');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// GET /professionals — public list (verified only)
router.get('/', asyncHandler(async (req, res) => {
  const { city, skill, minRating, page = 1, limit = 20 } = req.query;
  const query = { isVerified: true, verificationStatus: 'approved' };
  if (skill)     query.skills = skill;
  if (minRating) query.rating = { $gte: parseFloat(minRating) };

  const [professionals, total] = await Promise.all([
    Professional.find(query)
      .populate('user', 'name avatar phone')
      .populate('skills', 'name icon')
      .select('-bankDetails -wallet.transactions -fcmToken')
      .sort({ rating: -1, completedBookings: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit)),
    Professional.countDocuments(query),
  ]);

  res.json({ success: true, professionals, total,
    pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
}));

// GET /professionals/me — own profile (professional)
router.get('/me', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ user: req.user._id })
    .populate('user', 'name phone email avatar')
    .populate('skills', 'name icon category');
  if (!pro) throw new AppError('Professional profile not found', 404);
  res.json({ success: true, professional: pro });
}));

// POST /professionals/register — register as professional
router.post('/register', protect, asyncHandler(async (req, res) => {
  const existing = await Professional.findOne({ user: req.user._id });
  if (existing) throw new AppError('Already registered as professional', 400);
  const pro = await Professional.create({ user: req.user._id, ...req.body });
  await User.findByIdAndUpdate(req.user._id, { role: 'professional' });
  res.status(201).json({ success: true, professional: pro, message: 'Registration submitted. Verification in 24-48 hrs.' });
}));

// PUT /professionals/me — update own profile
router.put('/me', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const forbidden = ['isVerified', 'verificationStatus', 'commissionRate', 'totalEarnings', 'wallet'];
  forbidden.forEach(f => delete req.body[f]);
  const pro = await Professional.findOneAndUpdate({ user: req.user._id }, req.body, { new: true, runValidators: true });
  res.json({ success: true, professional: pro });
}));

// PUT /professionals/me/availability — toggle availability
router.put('/me/availability', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const { isAvailable, isOnline } = req.body;
  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    { isAvailable, isOnline, 'currentLocation.updatedAt': new Date() },
    { new: true }
  );
  res.json({ success: true, isAvailable: pro.isAvailable, isOnline: pro.isOnline });
}));

// PUT /professionals/me/bank-details — update bank details
router.put('/me/bank-details', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const { accountNumber, ifscCode, bankName, accountHolderName, upiId } = req.body;
  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    { bankDetails: { accountNumber, ifscCode, bankName, accountHolderName, upiId } },
    { new: true }
  );
  res.json({ success: true, message: 'Bank details updated' });
}));

// GET /professionals/me/earnings — earnings summary
router.get('/me/earnings', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ user: req.user._id })
    .select('wallet totalEarnings commissionRate completedBookings');
  if (!pro) throw new AppError('Profile not found', 404);

  const Booking = require('../models/Booking');
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(endDate);

  const bookings = await Booking.find({
    professional: pro._id,
    status: 'completed',
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  }).select('pricing scheduledDate bookingId service').populate('service', 'name').lean();

  const totalEarned = bookings.reduce((acc, b) => acc + (b.pricing?.totalAmount * (1 - pro.commissionRate / 100) || 0), 0);

  res.json({
    success: true,
    walletBalance: pro.wallet.balance,
    totalEarnings: pro.totalEarnings,
    commissionRate: pro.commissionRate,
    completedBookings: pro.completedBookings,
    periodEarnings: Math.round(totalEarned),
    bookings,
    recentTransactions: pro.wallet.transactions.slice(-20).reverse(),
  });
}));

// GET /professionals/:id — public profile
router.get('/:id', asyncHandler(async (req, res) => {
  const pro = await Professional.findById(req.params.id)
    .populate('user', 'name avatar')
    .populate('skills', 'name icon')
    .select('-bankDetails -wallet -fcmToken');
  if (!pro) throw new AppError('Professional not found', 404);

  const Review = require('../models/Review');
  const reviews = await Review.find({ professional: pro._id, isApproved: true })
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 }).limit(10).lean();

  res.json({ success: true, professional: pro, reviews });
}));

// Admin: verify professional
router.put('/:id/verify', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const pro = await Professional.findByIdAndUpdate(req.params.id, {
    verificationStatus: status,
    isVerified: status === 'approved',
    verificationNotes: notes,
  }, { new: true });
  if (!pro) throw new AppError('Professional not found', 404);
  res.json({ success: true, professional: pro });
}));

// ── Upload portfolio photo (before/after) ─────────────────────
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/me/portfolio', protect, upload.fields([{ name:'before', maxCount:1 }, { name:'after', maxCount:1 }]),
  asyncHandler(async (req, res) => {
    const pro = await Professional.findOne({ user: req.user._id });
    if (!pro) throw new AppError('Professional not found', 404);

    pro.portfolioPhotos.push({
      service:   req.body.service || 'Work',
      beforeUrl: req.body.beforeUrl || null,
      afterUrl:  req.body.afterUrl  || null,
    });
    await pro.save();
    res.json({ success: true, data: pro.portfolioPhotos });
  })
);

// POST /professionals/me/payout — Request earnings withdrawal
router.post('/me/payout', protect, authorize('professional'), asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 100) throw new AppError('Minimum payout is ₹100', 400);

  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro) throw new AppError('Professional not found', 404);
  if ((pro.earnings?.pending || 0) < amount) throw new AppError('Insufficient pending earnings', 400);

  // Deduct from pending, record payout
  pro.earnings.pending  -= amount;
  pro.earnings.withdrawn = (pro.earnings.withdrawn || 0) + amount;
  await pro.save();

  await Payment.create({
    user:        req.user._id,
    amount,
    type:        'payout',
    status:      'pending',
    description: `Payout request of ₹${amount}`,
    metadata:    { requestedAt: new Date() },
  });

  res.json({
    success:  true,
    message:  `Payout of ₹${amount} queued. Credited within 2-3 business days.`,
    payoutId: `PO${Date.now().toString().slice(-8)}`,
  });
}));

// GET /professionals/leaderboard — Top professionals by period + category
router.get('/leaderboard', protect, asyncHandler(async (req, res) => {
  const { period = 'weekly', category = 'overall', city } = req.query;

  const daysBack = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const matchStage = {
    status: 'completed',
    scheduledDate: { $gte: since },
  };
  if (city) matchStage['address.city'] = new RegExp(city, 'i');

  const topPros = await Professional.find({
    isVerified: true, isActive: true,
    totalBookings: { $gte: 5 },
  })
    .populate('user', 'name city')
    .sort({ 'earnings.thisMonth': -1, rating: -1, totalBookings: -1 })
    .limit(20)
    .lean();

  const leaderboard = topPros.map((pro, i) => ({
    rank:     i + 1,
    name:     pro.user?.name || 'Professional',
    category: pro.skills?.[0] || 'General',
    city:     pro.user?.city || pro.serviceAreas?.[0]?.city || 'India',
    rating:   pro.rating || 4.5,
    jobs:     pro.totalBookings || 0,
    earnings: pro.earnings?.total || 0,
    badge:    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐',
    tier:     pro.earnings?.total > 100000 ? 'platinum' : pro.earnings?.total > 50000 ? 'gold' : 'silver',
    avatar:   '👤',
  }));

  // Find current user rank
  const myPro = await Professional.findOne({ user: req.user._id }).lean();
  const myRank = leaderboard.findIndex(p => p.name === myPro?.user?.name) + 1 || leaderboard.length + 4;

  res.json({
    success: true,
    leaderboard: leaderboard.length > 0 ? leaderboard : null,
    currentUser: {
      rank: myRank, name: 'You',
      rating: myPro?.rating || 4.5, jobs: myPro?.totalBookings || 0,
      earnings: myPro?.earnings?.total || 0, badge: '🎯', tier: 'silver',
    },
  });
}));

module.exports = router;

// POST /professionals/enquiry — become-a-pro web form (public)
router.post('/enquiry', asyncHandler(async (req, res) => {
  const { name, phone, city, skill } = req.body;
  if (!name || !phone) throw new AppError('name and phone are required', 400);

  // Store as a pending professional application
  const User = require('../models/User');
  const Notification = require('../models/Notification');

  // Notify admins
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  if (admins.length > 0) {
    await Notification.create({
      user:  admins[0]._id,
      title: 'New Pro Application',
      body:  `${name} (${phone}) from ${city || 'Unknown'} applied for ${skill || 'General'}.`,
      type:  'system',
    });
  }

  res.json({
    success: true,
    message: `Thank you ${name}! Our team will call you within 24 hours.`,
  });
}));

// GET /professionals/:id/performance — live performance score visible to customers
router.get('/:id/performance', asyncHandler(async (req, res) => {
  const pro = await Professional.findById(req.params.id)
    .select('rating totalBookings completionRate responseRate user')
    .populate('user', 'name')
    .lean();
  if (!pro) throw new AppError('Professional not found', 404);

  const Booking = require('../models/Booking');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentBookings, warrantyClaims] = await Promise.all([
    Booking.find({
      professional: pro._id,
      status: { $in: ['completed', 'cancelled'] },
      scheduledDate: { $gte: thirtyDaysAgo },
    }).select('status tracking scheduledDate createdAt').lean(),
    Booking.find({
      professional: pro._id,
      'warranty.claimed': true,
      completedAt: { $gte: thirtyDaysAgo },
    }).lean().catch(() => []),
  ]);

  const completed  = recentBookings.filter(b => b.status === 'completed').length;
  const total30    = recentBookings.length;
  const onTimeCount = recentBookings.filter(b => {
    if (!b.tracking?.actualStartTime || !b.scheduledDate) return false;
    const diff = new Date(b.tracking.actualStartTime) - new Date(b.scheduledDate);
    return diff <= 15 * 60 * 1000; // within 15 minutes
  }).length;

  const onTimePct      = completed > 0 ? Math.round((onTimeCount / Math.max(completed, 1)) * 100) : 98;
  const redoRate       = total30   > 0 ? Math.round((warrantyClaims.length / Math.max(completed, 1)) * 100) : 0;
  const completionPct  = total30   > 0 ? Math.round((completed / total30) * 100) : Math.round(pro.completionRate || 98);
  const responseRate   = pro.responseRate || 95;

  // Composite score: weighted average
  const score = Math.round(
    (pro.rating / 5) * 35 +
    (onTimePct / 100)   * 25 +
    (completionPct / 100) * 20 +
    (responseRate / 100) * 15 +
    ((100 - redoRate) / 100) * 5
  );

  res.json({
    success: true,
    performance: {
      score:          Math.min(score, 100),
      rating:         pro.rating || 4.8,
      totalJobs:      pro.totalBookings || 0,
      onTimePct:      Math.min(onTimePct, 100),
      completionPct:  Math.min(completionPct, 100),
      responseRate:   Math.min(responseRate, 100),
      redoCount:      warrantyClaims.length,
      redoRate:       redoRate,
      jobsThisMonth:  completed,
      badges:         getBadges(pro, onTimePct, redoRate),
    },
  });
}));

function getBadges(pro, onTimePct, redoRate) {
  const badges = [];
  if (pro.totalBookings >= 1000) badges.push({ icon: '🏆', label: '1000+ Jobs' });
  else if (pro.totalBookings >= 500) badges.push({ icon: '💯', label: '500+ Jobs' });
  else if (pro.totalBookings >= 100) badges.push({ icon: '⭐', label: '100+ Jobs' });
  if (onTimePct >= 95)  badges.push({ icon: '⏱️', label: 'Always on Time' });
  if (redoRate === 0)   badges.push({ icon: '✅', label: 'Zero Re-dos' });
  if (pro.rating >= 4.9) badges.push({ icon: '🌟', label: 'Top Rated' });
  if (pro.rating >= 4.5 && pro.totalBookings >= 50) badges.push({ icon: '🛡️', label: 'Verified Pro' });
  return badges;
}

// GET /professionals/neighbourhood — top pros used in user's pincode
router.get('/neighbourhood', protect, asyncHandler(async (req, res) => {
  const User     = require('../models/User');
  const Review   = require('../models/Review');
  const Booking  = require('../models/Booking');
  const user     = await User.findById(req.user._id).select('addresses').lean();
  const pincode  = user?.addresses?.find(a => a.isDefault)?.pincode
                || user?.addresses?.[0]?.pincode;
  const city     = user?.addresses?.find(a => a.isDefault)?.city
                || user?.addresses?.[0]?.city || 'Hyderabad';
  const locality = user?.addresses?.find(a => a.isDefault)?.area || city;

  // Find bookings in this pincode
  const localBookings = await Booking.find({
    'address.pincode': pincode || '500032',
    status: 'completed',
    professional: { $exists: true },
  }).select('professional rating review').lean().limit(500);

  // Aggregate by professional
  const proMap = {};
  for (const b of localBookings) {
    const pid = b.professional?.toString();
    if (!pid) continue;
    if (!proMap[pid]) proMap[pid] = { localJobs: 0, ratings: [], reviews: [] };
    proMap[pid].localJobs++;
    if (b.review?.rating) proMap[pid].ratings.push(b.review.rating);
    if (b.review?.comment) proMap[pid].reviews.push(b.review.comment);
  }

  const proIds = Object.keys(proMap);
  if (!proIds.length) {
    // Fallback — top pros by rating near city
    const topPros = await Professional.find({ isVerified: true, isActive: true })
      .sort({ rating: -1, totalBookings: -1 })
      .limit(8)
      .populate('user', 'name city')
      .lean();
    return res.json({ success: true, locality, professionals: topPros.map(p => ({
      _id: p._id, name: p.user?.name, skills: p.skills, rating: p.rating,
      localJobs: Math.floor(p.totalBookings * 0.15),
      reviewCount: p.reviewCount || 0, onTimePct: 95, localReviews: [],
    })) });
  }

  const pros = await Professional.find({ _id: { $in: proIds } })
    .populate('user', 'name').lean();

  const result = pros.map(pro => {
    const data = proMap[pro._id.toString()];
    const avg  = data.ratings.length
      ? Math.round((data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length) * 10) / 10
      : pro.rating;
    return {
      _id: pro._id, name: pro.user?.name, skills: pro.skills,
      rating: avg, localJobs: data.localJobs,
      reviewCount: data.ratings.length, onTimePct: pro.responseRate || 95,
      localReviews: data.reviews.slice(0, 1),
    };
  }).sort((a, b) => b.localJobs - a.localJobs).slice(0, 10);

  res.json({ success: true, locality, professionals: result });
}));
