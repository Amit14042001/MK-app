/**
 * Slot App — Auth Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const {
  sendOTP, verifyOTP, refreshToken, logout, getMe,
  googleLogin, updatePassword, forgotPassword, resetPassword, socialLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const redis = require('../config/redis');

// OTP Rate limiter: max 5 OTPs per phone per 15 mins
const otpRateLimit = redis.rateLimiter(
  (req) => `otp:${req.body.phone}`,
  5, 900
);

router.post('/send-otp',       otpRateLimit, sendOTP);
router.post('/verify-otp',     verifyOTP);
router.post('/refresh-token',  refreshToken);
router.post('/logout',         protect, logout);
router.get('/me',              protect, getMe);
router.post('/google',         googleLogin);
router.put('/update-password', protect, updatePassword);
router.post('/forgot-password',forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;

// Social login (Google / Apple)
router.post('/social-login', socialLogin);
