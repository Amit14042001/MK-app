const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSMS } = require('../utils/sms');
const { sendEmail } = require('../utils/email');

// Generate OTP
const generateOTP = () => {
  const hasSMSKeys = process.env.TWILIO_ACCOUNT_SID || process.env.MSG91_AUTH_KEY;
  if (process.env.NODE_ENV === 'development' && !hasSMSKeys) return process.env.OTP_STATIC || '1234';
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// @desc    Send OTP to phone
// @route   POST /api/v1/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

  let user = await User.findOne({ phone });
  if (!user) {
    user = new User({ phone, name: 'User', otp: { code: otp, expiresAt, attempts: 0 } });
  } else {
    user.otp = { code: otp, expiresAt, attempts: 0 };
  }
  await user.save();

  // Send SMS
  const hasSMSKeys = process.env.TWILIO_ACCOUNT_SID || process.env.MSG91_AUTH_KEY;
  if (hasSMSKeys) {
    await sendSMS(phone, `Your Slot App OTP is ${otp}. Valid for ${process.env.OTP_EXPIRY || 10} mins. Do not share with anyone.`);
  }

  res.json({
    success: true,
    message: `OTP sent to +91 ${phone}`,
    isNewUser: !user.isPhoneVerified,
    ...(process.env.NODE_ENV === 'development' && !hasSMSKeys && { otp }), // expose OTP in dev only if no real SMS
  });
};

// @desc    Verify OTP & login/register
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  const { phone, otp, name, email } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  const user = await User.findOne({ phone }).select('+otp +refreshTokens');
  if (!user) return res.status(400).json({ success: false, message: 'No OTP request found. Please request OTP again.' });

  if (user.otp.attempts >= 5) {
    return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
  }
  if (new Date() > user.otp.expiresAt) {
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }
  if (user.otp.code !== otp) {
    // Dev: Allow 1234 for test number 9876543210
    if (process.env.NODE_ENV === 'development' && phone === '9876543210' && otp === '1234') {
      // Allow
    } else {
      user.otp.attempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: `Invalid OTP. ${5 - user.otp.attempts} attempts remaining.` });
    }
  }

  // OTP valid — update user
  user.isPhoneVerified = true;
  user.lastLogin = new Date();
  if (name && !user.name) user.name = name;
  if (email && !user.email) user.email = email;
  user.otp = { code: null, expiresAt: null, attempts: 0 };

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens.shift(); // max 5 devices
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      membershipTier: user.membershipTier,
      wallet: { balance: user.wallet.balance },
      referralCode: user.referralCode,
    },
  });
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    return res.status(401).json({ success: false, message: 'Refresh token not recognized' });
  }

  const newAccessToken = user.generateAccessToken();
  res.json({ success: true, accessToken: newAccessToken });
};

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  const user = await User.findById(req.user._id).select('+refreshTokens');
  if (user && refreshToken) {
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    await user.save();
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('savedServices', 'name icon slug startingPrice');
  res.json({ success: true, user });
};

// ── Google OAuth login ────────────────────────────────────────
exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'Google idToken required' });

    // Verify with Firebase Admin
    const { initFirebaseAdmin } = require('../config/firebase');
    const admin = require('firebase-admin');
    initFirebaseAdmin();

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const { email, name, picture, phone_number: phone } = decoded;

    let user = email ? await User.findOne({ email }) : null;
    const isNew = !user;

    if (!user) {
      const tempPhone = phone || `GOOGLE_${Date.now()}`;
      user = await User.create({
        name:             name || 'Google User',
        email,
        phone:            tempPhone,
        avatar:           picture,
        isEmailVerified:  true,
        isPhoneVerified:  !!phone,
      });
    }

    if (user.isBanned) return res.status(403).json({ success: false, message: 'Account banned' });

    const accessToken  = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    user.lastLogin = new Date();
    await user.save();

    res.json({ success: true, isNew, accessToken, refreshToken, user });
  } catch (err) { next(err); }
};

// ── Update password ───────────────────────────────────────────
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id).select('+password');
    if (user.password && !await user.matchPassword(currentPassword))
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

// ── Forgot password (email OTP) ───────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: 'If email exists, reset instructions sent' });

    const crypto = require('crypto');
    const token  = crypto.randomBytes(32).toString('hex');
    const hash   = crypto.createHash('sha256').update(token).digest('hex');

    user.otp = { code: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 };
    await user.save();

    const { sendEmail } = require('../utils/email');
    await sendEmail({
      to: email,
      subject: 'Slot App — Password Reset',
      html: `<p>Click <a href="${process.env.FRONTEND_URL}/reset-password/${token}">here</a> to reset your password. Valid for 10 minutes.</p>`,
    });

    res.json({ success: true, message: 'Password reset instructions sent to your email' });
  } catch (err) { next(err); }
};

// ── Reset password ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const crypto = require('crypto');
    const hash   = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ 'otp.code': hash, 'otp.expiresAt': { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, message: 'Reset token invalid or expired' });

    user.password = newPassword;
    user.otp      = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (err) { next(err); }
};

// ── Social Login (Google / Apple) ────────────────────────────
exports.socialLogin = async (req, res, next) => {
  try {
    const { provider, idToken, authorizationCode, email, name } = req.body;
    if (!provider || (!idToken && !authorizationCode)) {
      return res.status(400).json({ success: false, message: 'provider and token required' });
    }

    let verifiedEmail = email;
    let verifiedName  = name;
    let verifiedPhone = '';

    // ── Firebase (Google/Facebook/Phone) ──
    if (['google', 'facebook', 'firebase'].includes(provider) && idToken) {
      const admin = require('firebase-admin');
      const { initFirebaseAdmin } = require('../config/firebase');
      initFirebaseAdmin();
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        verifiedEmail = decodedToken.email || '';
        verifiedPhone = decodedToken.phone_number ? decodedToken.phone_number.replace('+91', '') : '';
        verifiedName  = decodedToken.name || name || 'User';
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token: ' + err.message });
      }
    }

    // Apple: in production verify authorizationCode with Apple's token endpoint
    // For now, trust the email passed (Apple only sends email on first login)

    if (!verifiedEmail && !verifiedPhone) {
      return res.status(400).json({ success: false, message: 'Could not retrieve email or phone from provider' });
    }

    // Find or create user
    let user = null;
    if (verifiedEmail) user = await User.findOne({ email: verifiedEmail });
    if (!user && verifiedPhone) user = await User.findOne({ phone: verifiedPhone });

    if (!user) {
      user = await User.create({
        name:          verifiedName || 'User',
        email:         verifiedEmail,
        phone:         verifiedPhone,
        authProvider:  provider,
        isVerified:    true,
        isActive:      true,
        isPhoneVerified: !!verifiedPhone,
        isEmailVerified: !!verifiedEmail,
      });
    }

    // Update auth provider if not set
    if (!user.authProvider) { user.authProvider = provider; await user.save(); }

    // Generate tokens
    const accessToken  = user.generateAccessToken?.() || require('jsonwebtoken').sign(
      { id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
    const refreshToken = user.generateRefreshToken?.() || require('jsonwebtoken').sign(
      { id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '90d' }
    );

    res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }, accessToken, refreshToken });
  } catch (e) {
    next(e);
  }
};
