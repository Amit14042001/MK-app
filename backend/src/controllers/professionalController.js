/**
 * Professional Registration & Onboarding Controller
 * Handles sign-up, skill selection, document upload, background check
 */
const Professional = require('../models/Professional');
const User         = require('../models/User');
const redis        = require('../config/redis');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendSMS }  = require('../utils/sms');
const { sendEmail } = require('../utils/email');
const { sendPushToAdmin } = require('../utils/notifications');

// ── POST /professionals/register ─────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const {
    name, phone, email, skills, yearsExperience,
    city, serviceAreas, aadhaarNumber,
  } = req.body;

  if (!name || !phone || !skills?.length) {
    throw new AppError('Name, phone and at least one skill are required', 400);
  }

  // Check if already registered
  let user = await User.findOne({ phone });
  if (user && user.role === 'professional') {
    throw new AppError('A professional account already exists for this phone number', 409);
  }

  // Create user if doesn't exist
  if (!user) {
    user = await User.create({ name, phone, email, role: 'professional' });
  } else {
    user.role = 'professional';
    user.name = name;
    if (email) user.email = email;
    await user.save();
  }

  // Create professional profile
  const professional = await Professional.create({
    user: user._id,
    skills,
    yearsExperience: yearsExperience || 0,
    city,
    serviceAreas: serviceAreas || [],
    isVerified: false,
    isActive: false,
    registrationStep: 'basic_info',
    documents: {
      aadhaar: { number: aadhaarNumber, verified: false },
    },
  });

  // Send welcome SMS
  await sendSMS(phone, `Welcome to Slot Pro! Your registration is received. Complete verification at slotapp.in/pro. Support: 1800-123-4567`).catch(() => {});

  // Alert admin
  await sendPushToAdmin({ title: 'New Pro Registration', body: `${name} registered as professional in ${city}` }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Registration successful! Complete verification to start receiving jobs.',
    professional: { _id: professional._id, status: 'pending_verification' },
    user: { _id: user._id, phone: user.phone },
  });
});

// ── PUT /professionals/me/skills ──────────────────────────────
exports.updateSkills = asyncHandler(async (req, res) => {
  const { skills, certifications } = req.body;
  if (!skills?.length) throw new AppError('At least one skill required', 400);

  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    { skills, certifications: certifications || [], registrationStep: 'skills' },
    { new: true }
  );
  if (!pro) throw new AppError('Professional profile not found', 404);

  await redis.del(redis.KEYS.PROFESSIONAL_PROFILE(pro._id));
  res.json({ success: true, professional: pro });
});

// ── PUT /professionals/me/availability ───────────────────────
exports.updateAvailability = asyncHandler(async (req, res) => {
  const { isAvailable, availability, serviceRadius } = req.body;

  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    {
      ...(typeof isAvailable === 'boolean' && { isAvailable }),
      ...(availability && { availability }),
      ...(serviceRadius && { serviceRadius }),
    },
    { new: true }
  );
  if (!pro) throw new AppError('Professional profile not found', 404);

  // Update socket presence
  const { getSocketIO } = require('../config/socket');
  const io = getSocketIO();
  if (io) {
    io.to(`professional_${pro._id}`).emit('availability_update', { isAvailable: pro.isAvailable });
  }

  await redis.del(redis.KEYS.PROFESSIONAL_PROFILE(pro._id));
  res.json({ success: true, isAvailable: pro.isAvailable });
});

// ── POST /professionals/me/documents ─────────────────────────
exports.uploadDocument = asyncHandler(async (req, res) => {
  const { documentType, documentNumber } = req.body;

  const VALID_DOCS = ['aadhaar','pan','address_proof','police_clearance','skill_certificate'];
  if (!VALID_DOCS.includes(documentType)) throw new AppError('Invalid document type', 400);

  const update = {};
  update[`documents.${documentType}`] = {
    number: documentNumber || '',
    verified: false,
    uploadedAt: new Date(),
    status: 'pending_review',
  };

  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    { $set: update },
    { new: true }
  );
  if (!pro) throw new AppError('Professional profile not found', 404);

  // Auto-verify Aadhaar in dev (real impl calls UIDAI API)
  if (documentType === 'aadhaar' && process.env.NODE_ENV !== 'production') {
    pro.documents.aadhaar.verified = true;
    pro.documents.aadhaar.verifiedAt = new Date();
    await pro.save();
  }

  res.json({ success: true, message: `${documentType} uploaded. Under review.`, documents: pro.documents });
});

// ── GET /professionals/me ─────────────────────────────────────
exports.getMyProfile = asyncHandler(async (req, res) => {
  const cacheKey = `pro_profile_${req.user._id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, professional: cached });

  const pro = await Professional.findOne({ user: req.user._id })
    .populate('user', 'name phone email')
    .lean();

  if (!pro) throw new AppError('Professional profile not found', 404);

  await redis.set(cacheKey, pro, 300);
  res.json({ success: true, professional: pro });
});

// ── PUT /professionals/me ─────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['bio','yearsExperience','city','languages','profilePhoto'];
  const updates = {};
  allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const pro = await Professional.findOneAndUpdate(
    { user: req.user._id },
    updates,
    { new: true }
  ).populate('user', 'name phone email');

  if (!pro) throw new AppError('Professional not found', 404);

  // Update user name if provided
  if (req.body.name) {
    await User.findByIdAndUpdate(req.user._id, { name: req.body.name });
  }

  await redis.del(`pro_profile_${req.user._id}`);
  res.json({ success: true, professional: pro });
});

// ── GET /professionals/me/stats ───────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const pro = await Professional.findOne({ user: req.user._id }).lean();
  if (!pro) throw new AppError('Professional not found', 404);

  const Booking = require('../models/Booking');
  const today   = new Date();
  const weekAgo = new Date(today.getTime() - 7  * 24 * 3600 * 1000);
  const monthAgo= new Date(today.getTime() - 30 * 24 * 3600 * 1000);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [todayStats, weekStats, monthStats, totalStats] = await Promise.all([
    Booking.aggregate([
      { $match: { professional: pro._id, status:'completed', completedAt: { $gte: todayStart } } },
      { $group: { _id:null, jobs:{$sum:1}, earnings:{$sum:'$pricing.proEarnings'} } },
    ]),
    Booking.aggregate([
      { $match: { professional: pro._id, status:'completed', completedAt: { $gte: weekAgo } } },
      { $group: { _id:null, jobs:{$sum:1}, earnings:{$sum:'$pricing.proEarnings'} } },
    ]),
    Booking.aggregate([
      { $match: { professional: pro._id, status:'completed', completedAt: { $gte: monthAgo } } },
      { $group: { _id:null, jobs:{$sum:1}, earnings:{$sum:'$pricing.proEarnings'} } },
    ]),
    Booking.aggregate([
      { $match: { professional: pro._id, status:'completed' } },
      { $group: { _id:null, jobs:{$sum:1}, earnings:{$sum:'$pricing.proEarnings'} } },
    ]),
  ]);

  res.json({
    success: true,
    stats: {
      todayJobs:     todayStats[0]?.jobs     || 0,
      todayEarnings: todayStats[0]?.earnings || 0,
      weeklyJobs:    weekStats[0]?.jobs      || 0,
      weeklyEarnings:weekStats[0]?.earnings  || 0,
      monthlyJobs:   monthStats[0]?.jobs     || 0,
      monthlyEarnings:monthStats[0]?.earnings|| 0,
      totalJobs:     totalStats[0]?.jobs     || pro.totalBookings || 0,
      totalEarnings: totalStats[0]?.earnings || pro.totalEarnings  || 0,
      rating:        pro.rating    || 0,
      responseRate:  pro.responseRate || 100,
      onTimeRate:    pro.onTimeRate   || 100,
    },
  });
});

// ── GET /professionals/nearby ─────────────────────────────────
exports.getNearby = asyncHandler(async (req, res) => {
  const { lat, lng, category, limit = 10 } = req.query;
  if (!lat || !lng) throw new AppError('lat and lng are required', 400);

  const { getNearbyProfessionals } = require('../services/matchingService');
  const nearby = await getNearbyProfessionals(parseFloat(lat), parseFloat(lng), category, parseInt(limit));

  res.json({ success: true, professionals: nearby, count: nearby.length });
});

// ── PUT /professionals/me/bank-details ────────────────────────
exports.updateBankDetails = asyncHandler(async (req, res) => {
  const { accountNumber, ifsc, bankName, accountHolder, upiId } = req.body;
  if (!accountNumber || !ifsc) throw new AppError('Account number and IFSC are required', 400);

  await Professional.findOneAndUpdate(
    { user: req.user._id },
    { bankDetails: { accountNumber, ifsc, bankName, accountHolder, upiId, isVerified: false } }
  );

  res.json({ success: true, message: 'Bank details saved. Will be verified within 24 hours.' });
});

// ── POST /professionals/me/fcm-token ─────────────────────────
exports.saveFCMToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Token required', 400);

  await User.findByIdAndUpdate(req.user._id, { fcmToken: token });
  res.json({ success: true });
});

// ── Admin: GET /admin/professionals ───────────────────────────
exports.adminGetAll = asyncHandler(async (req, res) => {
  const { page=1, limit=20, status, city, skill } = req.query;
  const query = {};
  if (status === 'verified')   query.isVerified = true;
  if (status === 'unverified') query.isVerified = false;
  if (status === 'active')     query.isActive   = true;
  if (city)  query.city  = { $regex: city,  $options: 'i' };
  if (skill) query.skills= { $elemMatch: { $regex: skill, $options: 'i' } };

  const [pros, total] = await Promise.all([
    Professional.find(query)
      .populate('user', 'name phone email createdAt')
      .sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(Number(limit)),
    Professional.countDocuments(query),
  ]);

  res.json({ success:true, professionals:pros, total, pages:Math.ceil(total/limit) });
});

// ── Admin: PUT /admin/professionals/:id/verify ────────────────
exports.adminVerify = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body; // action: 'approve' | 'reject'

  const pro = await Professional.findByIdAndUpdate(
    id,
    {
      isVerified: action === 'approve',
      isActive:   action === 'approve',
      verifiedAt: action === 'approve' ? new Date() : undefined,
      rejectionReason: action === 'reject' ? reason : undefined,
    },
    { new: true }
  ).populate('user', 'name phone');

  if (!pro) throw new AppError('Professional not found', 404);

  // Notify professional
  const msg = action === 'approve'
    ? `Congratulations ${pro.user.name}! Your Slot Pro account is verified. You can now receive jobs. Welcome aboard!`
    : `Hi ${pro.user.name}, your verification was unsuccessful. Reason: ${reason}. Contact support@slotapp.in for help.`;

  await sendSMS(pro.user.phone, msg).catch(() => {});

  res.json({ success:true, message:`Professional ${action}d`, professional:pro });
});

// ── Routes export ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Public
router.post('/register', exports.register);
router.get('/nearby',    exports.getNearby);

// Professional (authenticated)
router.use(protect);
router.get('/me',             exports.getMyProfile);
router.put('/me',             exports.updateProfile);
router.put('/me/skills',      exports.updateSkills);
router.put('/me/availability',exports.updateAvailability);
router.put('/me/bank-details',exports.updateBankDetails);
router.post('/me/documents',  exports.uploadDocument);
router.get('/me/stats',       exports.getStats);
router.post('/me/fcm-token',  exports.saveFCMToken);

// Admin
router.get('/',          authorize('admin'), exports.adminGetAll);
router.put('/:id/verify',authorize('admin'), exports.adminVerify);

module.exports = router;
