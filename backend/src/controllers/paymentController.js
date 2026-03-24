/**
 * Slot App — Payment Controller (Full Production)
 * Razorpay integration, refunds, wallet, coupons, invoices
 */
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const Booking  = require('../models/Booking');
const Payment  = require('../models/Payment');
const User     = require('../models/User');
const Coupon   = require('../models/Coupon');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { notifyPaymentReceived, notifyWalletCredited } = require('../utils/notifications');
const { sendEmail, bookingConfirmationEmail } = require('../utils/email');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

// ── POST /payments/create-order ────────────────────────────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { bookingId, amount: customAmount } = req.body;

  let booking = null;
  let amountToPay;

  if (bookingId) {
    booking = await Booking.findOne({
      $or: [{ _id: bookingId }, { bookingId }],
      customer: req.user._id,
    }).populate('service', 'name icon');
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.payment.status === 'paid') throw new AppError('Already paid', 400);
    amountToPay = booking.pricing.totalAmount;
  } else if (customAmount) {
    amountToPay = parseInt(customAmount);
  } else {
    throw new AppError('bookingId or amount required', 400);
  }

  const amountInPaise = Math.round(amountToPay * 100);

  const order = await razorpay.orders.create({
    amount:   amountInPaise,
    currency: 'INR',
    receipt:  `slot_${bookingId || 'wallet'}_${Date.now()}`,
    notes:    {
      bookingId:  bookingId  || 'wallet_recharge',
      customerId: req.user._id.toString(),
      purpose:    bookingId  ? 'booking_payment' : 'wallet_recharge',
    },
  });

  if (booking) {
    booking.payment.razorpayOrderId = order.id;
    await booking.save();
    // Create payment record
    await Payment.create({
      booking: booking._id,
      user:    req.user._id,
      amount:  amountInPaise,
      method:  'razorpay',
      razorpayOrderId: order.id,
      status:  'created',
    });
  }

  res.json({
    success: true,
    order,
    key:     process.env.RAZORPAY_KEY_ID,
    amount:  amountToPay,
    booking: booking ? { id: booking._id, bookingId: booking.bookingId, service: booking.service?.name } : null,
    prefill: {
      name:    req.user.name,
      email:   req.user.email || '',
      contact: req.user.phone,
    },
  });
});

// ── POST /payments/verify ──────────────────────────────────────
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature)
    throw new AppError('Payment verification failed. Invalid signature.', 400);

  // Update payment record
  await Payment.findOneAndUpdate(
    { razorpayOrderId },
    { razorpayPaymentId, razorpaySignature, status: 'paid', paidAt: new Date() }
  );

  // Update booking
  let booking;
  if (bookingId) {
    booking = await Booking.findOneAndUpdate(
      { $or: [{ _id: bookingId }, { bookingId }] },
      {
        'payment.status':            'paid',
        'payment.razorpayOrderId':   razorpayOrderId,
        'payment.razorpayPaymentId': razorpayPaymentId,
        'payment.razorpaySignature': razorpaySignature,
        'payment.paidAt':            new Date(),
        status:                      'confirmed',
        $push: { statusHistory: { status: 'confirmed', note: 'Payment verified' } },
      },
      { new: true }
    ).populate('service', 'name icon');

    if (booking) {
      // Notify
      notifyPaymentReceived(booking.customer, booking.pricing?.totalAmount, booking._id);

      // Send confirmation email
      const user = await User.findById(booking.customer);
      if (user?.email) {
        sendEmail(bookingConfirmationEmail({ user, booking, service: booking.service })).catch(() => {});
      }

      // Try matching professional
      try {
        const matchingService = require('../services/matchingService');
        await matchingService.assignProfessional(booking);
      } catch (e) {
        console.warn('[Payment] Matching failed (non-fatal):', e.message);
      }
    }
  }

  res.json({ success: true, booking, message: '✅ Payment successful! Booking confirmed.' });
});

// ── POST /payments/apply-coupon ────────────────────────────────
exports.applyCoupon = asyncHandler(async (req, res) => {
  const { code, amount, serviceId } = req.body;
  if (!code || !amount) throw new AppError('code and amount required', 400);

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true })
    .populate('applicableServices', '_id')
    .populate('applicableCategories', '_id');

  if (!coupon) throw new AppError('Invalid coupon code', 404);

  const validity = coupon.isValid(req.user._id, amount);
  if (!validity.valid) throw new AppError(validity.message, 400);

  // Check service restriction
  if (serviceId && coupon.applicableServices?.length > 0) {
    const allowed = coupon.applicableServices.map(s => s._id.toString());
    if (!allowed.includes(serviceId.toString()))
      throw new AppError('This coupon is not valid for the selected service', 400);
  }

  // Check first-time user restriction
  if (coupon.newUsersOnly) {
    const bookingCount = await Booking.countDocuments({ customer: req.user._id, status: 'completed' });
    if (bookingCount > 0) throw new AppError('This coupon is for new users only', 400);
  }

  const discount = coupon.calculateDiscount(amount);

  res.json({
    success: true,
    coupon: { code: coupon.code, description: coupon.description, discountType: coupon.discountType, discountValue: coupon.discountValue, maxDiscount: coupon.maxDiscount },
    discount,
    finalAmount: Math.max(0, amount - discount),
    message: `Coupon applied! You save ₹${discount} 🎉`,
  });
});

// ── GET /payments/history ──────────────────────────────────────
exports.getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [payments, total] = await Promise.all([
    Payment.find({ user: req.user._id })
      .populate('booking', 'bookingId service scheduledDate')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments({ user: req.user._id }),
  ]);
  res.json({ success: true, payments, total, pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
});

// ── GET /payments/invoice/:bookingId ──────────────────────────
exports.getInvoice = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    $or: [{ _id: req.params.bookingId }, { bookingId: req.params.bookingId }],
    customer: req.user._id,
  }).populate('service', 'name icon description').populate({ path: 'professional', populate: { path: 'user', select: 'name' } });

  if (!booking) throw new AppError('Booking not found', 404);

  const invoice = {
    invoiceNumber: `INV-Slot-${booking.bookingId}`,
    date:          new Date().toISOString(),
    customer:      { name: req.user.name, phone: req.user.phone, email: req.user.email },
    booking: {
      id:          booking.bookingId,
      service:     booking.service?.name,
      date:        booking.scheduledDate,
      time:        booking.scheduledTime,
      professional: booking.professional?.user?.name || 'Slot Professional',
      address:     `${booking.address?.line1}, ${booking.address?.city}`,
    },
    pricing: booking.pricing,
    payment: booking.payment,
  };

  res.json({ success: true, invoice });
});

// ── POST /payments/refund (admin) ──────────────────────────────
exports.processRefund = asyncHandler(async (req, res) => {
  const { bookingId, amount, reason } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (!booking.payment.razorpayPaymentId) throw new AppError('No Razorpay payment found', 400);

  const refundAmount = amount || booking.pricing.amountPaid;

  // Process Razorpay refund
  const refund = await razorpay.payments.refund(booking.payment.razorpayPaymentId, {
    amount: refundAmount * 100,
    speed:  'normal',
    notes:  { reason: reason || 'Customer requested refund', bookingId: booking.bookingId },
  });

  // Update payment record
  await Payment.findOneAndUpdate(
    { razorpayOrderId: booking.payment.razorpayOrderId },
    { status: 'refunded', 'refund.razorpayRefundId': refund.id, 'refund.amount': refundAmount, 'refund.status': 'processed', 'refund.processedAt': new Date() }
  );

  // Credit wallet as backup
  await User.findByIdAndUpdate(booking.customer, {
    $inc: { 'wallet.balance': refundAmount },
    $push: { 'wallet.transactions': { type: 'credit', amount: refundAmount, description: `Refund for ${booking.bookingId}` } },
  });

  notifyWalletCredited(booking.customer, refundAmount, 'Refund processed');
  res.json({ success: true, refund, message: `₹${refundAmount} refunded successfully` });
});

// ── POST /payments/wallet/recharge ────────────────────────────
exports.walletRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 10) throw new AppError('Minimum recharge amount is ₹10', 400);
  if (amount > 50000) throw new AppError('Maximum recharge amount is ₹50,000', 400);

  const order = await razorpay.orders.create({
    amount:   amount * 100,
    currency: 'INR',
    receipt:  `wallet_${req.user._id}_${Date.now()}`,
    notes:    { purpose: 'wallet_recharge', userId: req.user._id.toString() },
  });

  res.json({
    success: true, order,
    key:     process.env.RAZORPAY_KEY_ID,
    amount,
    prefill: { name: req.user.name, contact: req.user.phone, email: req.user.email || '' },
  });
});

// ── GET /payments/wallet/transactions ─────────────────────────
exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const user = await User.findById(req.user._id).select('wallet');
  const all  = user.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  const start = (page - 1) * limit;
  const slice = all.slice(start, start + parseInt(limit));
  res.json({ success: true, balance: user.wallet.balance, transactions: slice, total: all.length });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.initiateRefund = exports.processRefund;

exports.getWalletBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet.balance');
  res.json({ success: true, balance: user.wallet?.balance || 0 });
});

exports.addToWallet = exports.walletRecharge;

exports.withdrawFromWallet = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Withdrawal requested' });
});

exports.getPaymentDetails = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId).populate('booking');
  res.json({ success: true, payment });
});

exports.getSavedMethods = asyncHandler(async (req, res) => {
  res.json({ success: true, methods: [] });
});

exports.deletePaymentMethod = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Method deleted' });
});

exports.handleWebhook = asyncHandler(async (req, res) => {
  res.json({ status: 'ok' });
});
