/**
 * Slot App — Payment Service
 * Razorpay integration: orders, verification, refunds, payouts
 */
const crypto  = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User    = require('../models/User');

// ── Razorpay Instance ─────────────────────────────────────────
let razorpay = null;

function getRazorpay() {
  if (razorpay) return razorpay;
  if (!process.env.RAZORPAY_KEY_ID || process.env.NODE_ENV === 'test') {
    // Mock for test/dev
    return {
      orders: {
        create: async (opts) => ({
          id:       `order_mock_${Date.now()}`,
          amount:   opts.amount,
          currency: opts.currency,
          status:   'created',
        }),
      },
      payments: {
        fetch:  async (id) => ({ id, status: 'captured', amount: 0 }),
        refund: async (id, opts) => ({ id: `refund_mock_${Date.now()}`, payment_id: id, amount: opts.amount }),
      },
      transfers: {
        create: async (opts) => ({ id: `transfer_mock_${Date.now()}` }),
      },
    };
  }
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

// ── Create Razorpay Order ─────────────────────────────────────
exports.createOrder = async (booking) => {
  const rp = getRazorpay();
  const amountPaise = Math.round(booking.pricing.totalAmount * 100); // Convert to paise

  const order = await rp.orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  booking.bookingId,
    notes: {
      bookingId:   booking._id.toString(),
      customerId:  booking.customer.toString(),
      serviceName: booking.service?.name || '',
    },
  });

  // Store pending payment record
  await Payment.create({
    user:          booking.customer,
    booking:       booking._id,
    amount:        booking.pricing.totalAmount,
    currency:      'INR',
    type:          'booking',
    status:        'pending',
    gateway:       'razorpay',
    gatewayOrderId: order.id,
    description:   `Payment for booking ${booking.bookingId}`,
  });

  return order;
};

// ── Verify Payment Signature ──────────────────────────────────
exports.verifySignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
  const body   = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
};

// ── Capture & Confirm Payment ─────────────────────────────────
exports.confirmPayment = async (bookingId, orderId, paymentId, signature) => {
  // Verify signature
  const valid = exports.verifySignature(orderId, paymentId, signature);
  if (!valid) throw new Error('Payment signature verification failed');

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  // Update booking payment status
  booking.payment.status    = 'paid';
  booking.payment.gatewayId = paymentId;
  booking.status            = booking.status === 'pending' ? 'confirmed' : booking.status;
  booking.statusHistory.push({ status: booking.status, note: 'Payment confirmed' });
  await booking.save();

  // Update payment record
  await Payment.findOneAndUpdate(
    { gatewayOrderId: orderId },
    {
      status:          'completed',
      gatewayPaymentId: paymentId,
      gatewaySignature: signature,
      completedAt:     new Date(),
    }
  );

  return booking;
};

// ── Process Refund ────────────────────────────────────────────
exports.processRefund = async (bookingId, amount, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const payment = await Payment.findOne({ booking: bookingId, status: 'completed' });

  if (payment?.gatewayPaymentId && process.env.RAZORPAY_KEY_ID) {
    // Real Razorpay refund
    const rp = getRazorpay();
    const refund = await rp.payments.refund(payment.gatewayPaymentId, {
      amount: Math.round(amount * 100),
      notes:  { reason, bookingId: bookingId.toString() },
    });

    await Payment.create({
      user:        booking.customer,
      booking:     bookingId,
      amount:      -amount,
      type:        'refund',
      status:      'completed',
      gateway:     'razorpay',
      gatewayPaymentId: refund.id,
      description: `Refund for booking ${booking.bookingId}: ${reason}`,
    });
  } else {
    // Wallet refund
    await User.findByIdAndUpdate(booking.customer, {
      $inc: { 'wallet.balance': amount },
      $push: {
        'wallet.transactions': {
          type:        'credit',
          amount,
          description: `Refund for cancelled booking ${booking.bookingId}`,
          createdAt:   new Date(),
        },
      },
    });

    await Payment.create({
      user:        booking.customer,
      booking:     bookingId,
      amount:      -amount,
      type:        'refund',
      status:      'completed',
      gateway:     'wallet',
      description: `Wallet refund for booking ${booking.bookingId}`,
    });
  }

  return { refunded: amount, method: payment?.gatewayPaymentId ? 'razorpay' : 'wallet' };
};

// ── Process Professional Payout ───────────────────────────────
exports.processPayout = async (professionalId, amount, bookingId) => {
  const Professional = require('../models/Professional');
  const pro          = await Professional.findById(professionalId).populate('user', 'name');
  if (!pro) throw new Error('Professional not found');

  // Platform fee: 20%
  const platformFee    = Math.round(amount * 0.20);
  const proAmount      = amount - platformFee;
  const gstOnFee       = Math.round(platformFee * 0.18);
  const netPayout      = proAmount - gstOnFee;

  // Update professional earnings
  await Professional.findByIdAndUpdate(professionalId, {
    $inc: {
      'earnings.total':    netPayout,
      'earnings.pending':  netPayout,
      'earnings.thisMonth': netPayout,
    },
  });

  // Payment record
  await Payment.create({
    user:        pro.user._id,
    booking:     bookingId,
    amount:      netPayout,
    type:        'payout',
    status:      'pending',
    description: `Earnings for booking ${bookingId} (after 20% platform fee)`,
    metadata: { grossAmount: amount, platformFee, gstOnFee, netPayout },
  });

  return { grossAmount: amount, platformFee, gstOnFee, netPayout };
};

// ── Razorpay Webhook Verification ────────────────────────────
exports.verifyWebhookSignature = (body, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
};

// ── Handle Razorpay Webhook Events ────────────────────────────
exports.handleWebhookEvent = async (event, payload) => {
  switch (event) {
    case 'payment.captured': {
      const orderId   = payload.payment?.entity?.order_id;
      const paymentId = payload.payment?.entity?.id;
      if (orderId) {
        await Payment.findOneAndUpdate(
          { gatewayOrderId: orderId },
          { status: 'completed', gatewayPaymentId: paymentId, completedAt: new Date() }
        );
      }
      break;
    }
    case 'payment.failed': {
      const orderId = payload.payment?.entity?.order_id;
      if (orderId) {
        await Payment.findOneAndUpdate(
          { gatewayOrderId: orderId },
          { status: 'failed', failedAt: new Date(), failReason: payload.payment?.entity?.error_description }
        );
      }
      break;
    }
    case 'refund.processed': {
      const refundId = payload.refund?.entity?.id;
      if (refundId) {
        await Payment.findOneAndUpdate(
          { gatewayPaymentId: refundId },
          { status: 'completed' }
        );
      }
      break;
    }
    default:
      console.log(`[PaymentService] Unhandled webhook event: ${event}`);
  }
};

// ── Get Payment Summary for User ──────────────────────────────
exports.getUserPaymentSummary = async (userId, period = 'month') => {
  const now   = new Date();
  let startDate;
  if (period === 'week')  { startDate = new Date(now - 7 * 86400000); }
  else if (period === 'year') { startDate = new Date(now.getFullYear(), 0, 1); }
  else                    { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }

  const [stats] = await Payment.aggregate([
    { $match: { user: userId, status: 'completed', createdAt: { $gte: startDate }, amount: { $gt: 0 } } },
    {
      $group: {
        _id:   null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avg:   { $avg: '$amount' },
        types: { $addToSet: '$type' },
      },
    },
  ]);

  return stats || { total: 0, count: 0, avg: 0, types: [] };
};
