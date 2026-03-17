/**
 * MK App — User Controller (Full)
 * Profile management, addresses, wallet, saved services, stats
 */
const User    = require('../models/User');
const Booking = require('../models/Booking');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

// GET /users/profile
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -otp -refreshTokens')
    .populate('savedServices', 'name icon startingPrice images rating');
  res.json({ success: true, user });
});

// PUT /users/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'avatar', 'notifications'];
  const updates = {};
  allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true,
  }).select('-password -otp -refreshTokens');

  res.json({ success: true, user, message: 'Profile updated' });
});

// PUT /users/profile/fcm-token
exports.updateFCMToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) throw new AppError('fcmToken is required', 400);
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  res.json({ success: true });
});

// GET /users/wallet
exports.getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet name');
  const page  = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const transactions = user.wallet.transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    balance: user.wallet.balance,
    transactions,
    pagination: {
      page, limit,
      total: user.wallet.transactions.length,
      pages: Math.ceil(user.wallet.transactions.length / limit),
    },
  });
});

// POST /users/wallet/add — Add money to wallet (after Razorpay payment)
exports.addWalletMoney = asyncHandler(async (req, res) => {
  const { amount, razorpayPaymentId, razorpayOrderId, razorpaySignature, description } = req.body;
  if (!amount || amount < 1) throw new AppError('Invalid amount', 400);
  if (!razorpayPaymentId)    throw new AppError('Payment ID required', 400);

  // Verify Razorpay signature when orderId + signature are present
  if (razorpayOrderId && razorpaySignature) {
    const { verifySignature } = require('../services/paymentService');
    const valid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) throw new AppError('Payment verification failed — invalid signature', 400);
  } else {
    // Fallback: verify directly with Razorpay API
    try {
      const Razorpay = require('razorpay');
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const instance = new Razorpay({
          key_id:     process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const payment = await instance.payments.fetch(razorpayPaymentId);
        if (payment.status !== 'captured') throw new AppError('Payment not captured', 400);
        if (payment.amount !== amount * 100) throw new AppError('Payment amount mismatch', 400);
      }
    } catch (verifyErr) {
      if (verifyErr.statusCode) throw verifyErr; // re-throw AppErrors
      // Razorpay SDK not available in dev — allow through
      console.warn('[Wallet] Razorpay verify skipped in dev:', verifyErr.message);
    }
  }

  const user = await User.findById(req.user._id);
  user.wallet.balance += amount;
  user.wallet.transactions.push({
    type:        'credit',
    amount,
    description: description || `Wallet recharge ₹${amount}`,
    razorpayPaymentId,
    date:        new Date(),
  });
  await user.save();

  res.json({
    success: true,
    balance: user.wallet.balance,
    message: `₹${amount} added to your MK Wallet!`,
  });
});

// GET /users/stats
exports.getUserStats = asyncHandler(async (req, res) => {
  const cacheKey = `user:stats:${req.user._id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, stats: cached });

  const [user, bookings] = await Promise.all([
    User.findById(req.user._id).select('totalBookings totalSpent membershipTier wallet referralCode createdAt'),
    Booking.find({ customer: req.user._id }).select('status pricing createdAt').lean(),
  ]);

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const totalSpent = completedBookings.reduce((acc, b) => acc + (b.pricing?.totalAmount || 0), 0);

  const stats = {
    totalBookings:    bookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: cancelledBookings.length,
    totalSpent,
    walletBalance:    user.wallet.balance,
    membershipTier:   user.membershipTier,
    referralCode:     user.referralCode,
    memberSince:      user.createdAt,
    savingsThisYear:  Math.round(totalSpent * 0.05), // 5% loyalty savings
  };

  await redis.set(cacheKey, stats, 600);
  res.json({ success: true, stats });
});

// POST /users/addresses
exports.addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, area, city, state, pincode, landmark, lat, lng, isDefault } = req.body;
  if (!line1 || !city || !pincode) throw new AppError('line1, city, pincode required', 400);

  const user = await User.findById(req.user._id);
  if (isDefault) user.addresses.forEach(a => { a.isDefault = false; });
  const setDefault = isDefault || user.addresses.length === 0;
  user.addresses.push({ label: label || 'Home', line1, line2, area, city, state, pincode, landmark, lat, lng, isDefault: setDefault });
  await user.save();

  res.status(201).json({ success: true, address: user.addresses[user.addresses.length - 1] });
});

// PUT /users/addresses/:addressId
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found', 404);
  Object.assign(address, req.body);
  if (req.body.isDefault) user.addresses.forEach(a => { a.isDefault = a._id.equals(address._id); });
  await user.save();
  res.json({ success: true, address });
});

// DELETE /users/addresses/:addressId
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found', 404);
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
  await user.save();
  res.json({ success: true, message: 'Address removed' });
});

// POST /users/saved-services/:serviceId — Toggle saved service
exports.toggleSavedService = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const serviceId = req.params.serviceId;
  const idx = user.savedServices.findIndex(id => id.toString() === serviceId);
  let saved;
  if (idx === -1) {
    user.savedServices.push(serviceId);
    saved = true;
  } else {
    user.savedServices.splice(idx, 1);
    saved = false;
  }
  await user.save();
  res.json({ success: true, saved, message: saved ? 'Service saved' : 'Service unsaved' });
});

// GET /users/saved-services
exports.getSavedServices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('savedServices', 'name icon startingPrice images rating category');
  res.json({ success: true, savedServices: user.savedServices });
});

// POST /users/apply-referral — Apply a referral code
exports.applyReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) throw new AppError('Referral code required', 400);

  const currentUser = await User.findById(req.user._id);
  if (currentUser.referredBy) throw new AppError('You have already used a referral code', 400);
  if (currentUser.totalBookings > 0) throw new AppError('Referral can only be applied before your first booking', 400);

  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (!referrer) throw new AppError('Invalid referral code', 404);
  if (referrer._id.toString() === req.user._id.toString()) throw new AppError('Cannot use your own referral code', 400);

  // Apply bonus — ₹100 to new user, ₹50 to referrer
  currentUser.referredBy = referrer._id;
  currentUser.wallet.balance += 100;
  currentUser.wallet.transactions.push({ type: 'credit', amount: 100, description: 'Referral welcome bonus' });
  await currentUser.save();

  referrer.wallet.balance += 50;
  referrer.wallet.transactions.push({ type: 'credit', amount: 50, description: `Referral bonus: ${currentUser.name} joined` });
  await referrer.save();

  // Send push to referrer
  if (referrer.fcmToken) {
    try {
      const { sendPushNotification } = require('../utils/notifications');
      await sendPushNotification(referrer.fcmToken, {
        title: '🎉 Referral Bonus!',
        body: `${currentUser.name} joined using your code! ₹50 added to your wallet.`,
      });
    } catch {}
  }

  res.json({ success: true, message: '₹100 referral bonus added to your wallet!', bonusAmount: 100 });
});

// DELETE /users/account — Soft delete account
exports.deleteAccount = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    isActive: false,
    name: 'Deleted User',
    phone: `DELETED_${req.user._id}`,
    email: null,
    fcmToken: null,
    refreshTokens: [],
  });
  res.json({ success: true, message: 'Account deleted. We are sorry to see you go.' });
});
