/**
 * Slot App — Payments Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const Payment = require('../models/Payment');
const Coupon  = require('../models/Coupon');

router.use(protect);

// Razorpay order creation & verification
router.post('/create-order',            paymentController.createOrder);
router.post('/verify',                  paymentController.verifyPayment);
router.post('/refund',                  paymentController.initiateRefund);

// Wallet
router.get('/wallet',                   paymentController.getWalletBalance);
router.post('/wallet/add',              paymentController.addToWallet);
router.post('/wallet/withdraw',         paymentController.withdrawFromWallet);
router.get('/wallet/transactions',      paymentController.getWalletTransactions);

// Coupon operations
router.get('/coupons',                  asyncHandler(async (req, res) => {
  const { city, category, userId } = req.query;
  const query = { isActive: true, $or: [{ validTill: { $gte: new Date() } }, { validTill: null }] };
  if (category) query.applicableServices = { $in: [category, 'all'] };
  const coupons = await Coupon.find(query).sort('-discount').limit(20).lean();
  res.json({ success: true, coupons });
}));
router.post('/apply-coupon',            asyncHandler(async (req, res) => {
  const { code, amount } = req.body;
  if (!code) throw new AppError('Coupon code required', 400);
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new AppError('Invalid coupon code', 400);
  const validity = coupon.isValid(req.user._id, amount || 0);
  if (!validity.valid) throw new AppError(validity.message, 400);
  const discount = coupon.calculateDiscount(amount || 0);
  res.json({ success: true, discount, coupon: { code: coupon.code, type: coupon.discountType, value: coupon.discountValue } });
}));

// Payment history
router.get('/history',                  paymentController.getPaymentHistory);
router.get('/:paymentId',               paymentController.getPaymentDetails);

// Saved payment methods
router.get('/methods',                  paymentController.getSavedMethods);
router.delete('/methods/:methodId',     paymentController.deletePaymentMethod);

// Webhook (no auth)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
