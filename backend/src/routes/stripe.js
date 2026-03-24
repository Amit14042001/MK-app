/**
 * Slot App — Stripe Routes
 * International payment endpoints (non-India markets)
 */
const express    = require('express');
const router     = express.Router();
const stripe     = require('../services/stripeService');
const Booking    = require('../models/Booking');
const Payment    = require('../models/Payment');
const { StoreOrder } = require('../models/StoreModels');
const { protect }    = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Create payment intent for booking ────────────────────────
router.post('/booking-intent', protect, asyncHandler(async (req, res) => {
  const { bookingId, countryCode = 'AE' } = req.body;

  const booking = await Booking.findById(bookingId).populate('service', 'name');
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer.toString() !== req.user._id.toString()) throw new AppError('Unauthorized', 403);

  const result = await stripe.createPaymentIntent(booking, countryCode);

  // Save intent ID on payment record
  await Payment.findOneAndUpdate(
    { booking: booking._id },
    { 'stripe.paymentIntentId': result.paymentIntentId, 'stripe.currency': result.currency },
    { upsert: true }
  );

  res.json({ success: true, data: result });
}));

// ── Create payment intent for store order ────────────────────
router.post('/store-intent', protect, asyncHandler(async (req, res) => {
  const { orderId, countryCode = 'AE' } = req.body;

  const order = await StoreOrder.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user.toString() !== req.user._id.toString()) throw new AppError('Unauthorized', 403);

  const result = await stripe.createStorePaymentIntent(order, countryCode);
  res.json({ success: true, data: result });
}));

// ── Verify payment and confirm booking ───────────────────────
router.post('/confirm-booking', protect, asyncHandler(async (req, res) => {
  const { paymentIntentId, bookingId } = req.body;

  const verification = await stripe.verifyPaymentIntent(paymentIntentId);
  if (!verification.success) throw new AppError(`Payment not successful: ${verification.status}`, 400);

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  booking.payment.status        = 'paid';
  booking.payment.method        = 'stripe';
  booking.payment.paidAt        = new Date();
  booking.status                = 'confirmed';
  await booking.save();

  await Payment.findOneAndUpdate(
    { booking: booking._id },
    { status: 'completed', 'stripe.paymentIntentId': paymentIntentId, paidAt: new Date() }
  );

  res.json({ success: true, data: { booking } });
}));

// ── Confirm store order payment ───────────────────────────────
router.post('/confirm-store', protect, asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;

  const verification = await stripe.verifyPaymentIntent(paymentIntentId);
  if (!verification.success) throw new AppError(`Payment not successful: ${verification.status}`, 400);

  const order = await StoreOrder.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  order.payment.status            = 'paid';
  order.payment.paidAt            = new Date();
  order.status                    = 'confirmed';
  await order.save();

  res.json({ success: true, data: order });
}));

// ── Stripe webhook (raw body required) ───────────────────────
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    res.status(200).json({ received: true });

    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = await stripe.handleWebhook(req.body, signature);
    } catch (err) {
      console.error('[Stripe] Webhook error:', err.message);
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent   = event.data.object;
        const metadata = intent.metadata;

        if (metadata.type === 'store_order') {
          await StoreOrder.findByIdAndUpdate(metadata.orderId, {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
            status: 'confirmed',
          });
        } else if (metadata.bookingId) {
          await Booking.findByIdAndUpdate(metadata.bookingId, {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
            status: 'confirmed',
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent   = event.data.object;
        const metadata = intent.metadata;
        console.log(`[Stripe] Payment failed for booking ${metadata.bookingId || metadata.orderId}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        console.log(`[Stripe] Refund for charge ${charge.id}`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
  })
);

// ── Get supported countries ───────────────────────────────────
router.get('/countries', (req, res) => {
  res.json({ success: true, data: stripe.SUPPORTED_COUNTRIES });
});

module.exports = router;
