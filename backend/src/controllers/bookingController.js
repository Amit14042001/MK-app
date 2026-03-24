/**
 * Slot App — Booking Controller (Full Production)
 */
const Booking      = require('../models/Booking');
const Service      = require('../models/Service');
const User         = require('../models/User');
const Professional = require('../models/Professional');
const Payment      = require('../models/Payment');
const Coupon       = require('../models/Coupon');
const Subscription = require('../models/Subscription');
const { asyncHandler, AppError }     = require('../middleware/errorHandler');
const matchingService                = require('../services/matchingService');
const slotCapacity                   = require('../services/slotCapacityService');
const redis                          = require('../config/redis');
const { sendEmail, bookingConfirmationEmail, bookingCancelledEmail } = require('../utils/email');
const { sendSMS, sendBookingConfirmationSMS, sendBookingCancelledSMS } = require('../utils/sms');
const {
  notifyBookingConfirmed, notifyProfessionalAssigned,
  notifyBookingCancelled, notifyProfessionalNewBooking,
} = require('../utils/notifications');

// ── POST /bookings ─────────────────────────────────────────────
exports.createBooking = asyncHandler(async (req, res) => {
  const {
    service: serviceId, subServiceName, scheduledDate, scheduledTime,
    address, specialInstructions, couponCode, pricing,
    payment: paymentInfo,
  } = req.body;

  if (!serviceId || !scheduledDate || !scheduledTime || !address)
    throw new AppError('service, scheduledDate, scheduledTime, and address are required', 400);
  if (!address.line1 || !address.city || !address.pincode)
    throw new AppError('address.line1, city, and pincode are required', 400);

  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) throw new AppError('Service not found or unavailable', 404);

  // Resolve sub-service pricing
  let subService  = null;
  let basePrice   = service.startingPrice;
  if (subServiceName) {
    subService = service.subServices.find(s => s.name === subServiceName && s.isActive);
    if (subService) basePrice = subService.price;
  }

  // Apply coupon
  let couponDiscount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) throw new AppError('Invalid coupon code', 400);
    const validity = coupon.isValid(req.user._id, basePrice);
    if (!validity.valid) throw new AppError(validity.message, 400);
    couponDiscount = coupon.calculateDiscount(basePrice);
  }

  // Build pricing — Prime subscribers get convenience fee waived
  const activeSub = await Subscription.findOne({
    user: req.user._id,
    status: { $in: ['active', 'grace_period'] },
    endDate: { $gt: new Date() },
  }).lean();
  const hasPrime   = !!activeSub;
  const convenienceFee = (hasPrime || basePrice >= 500) ? 0 : 29;
  const tipAmount      = Number(pricing?.tip) || 0;
  const gst            = Math.round((basePrice - couponDiscount) * 0.18);
  const walletUsed     = pricing?.walletUsed || 0;
  const totalAmount    = Math.max(0, basePrice - couponDiscount + convenienceFee + gst + tipAmount - walletUsed);

  // Deduct wallet if used
  if (walletUsed > 0) {
    const user = await User.findById(req.user._id);
    if (user.wallet.balance < walletUsed) throw new AppError('Insufficient wallet balance', 400);
    user.wallet.balance -= walletUsed;
    user.wallet.transactions.push({ type: 'debit', amount: walletUsed, description: `Booking payment for ${service.name}` });
    await user.save();
  }

  // Check slot availability before booking
  if (req.body.professionalId) {
    const slotFree = await slotCapacity.isSlotAvailable(
      req.body.professionalId, scheduledDate, scheduledTime
    ).catch(() => true); // non-fatal if service unavailable
    if (!slotFree) throw new AppError('This time slot is no longer available. Please choose another.', 409);
  }

  // Create booking
  const booking = await Booking.create({
    customer:    req.user._id,
    service:     serviceId,
    subService:  subService ? { name: subService.name, price: subService.price, duration: subService.duration } : undefined,
    scheduledDate:   new Date(scheduledDate),
    scheduledTime,
    duration:    subService?.duration || service.duration,
    address,
    specialInstructions,
    couponCode,
    status:      paymentInfo?.method === 'cash' ? 'confirmed' : 'pending',
    payment: {
      method: paymentInfo?.method || 'online',
      status: paymentInfo?.method === 'cash' ? 'pending' : 'pending',
    },
    pricing: {
      basePrice,
      discount:        0,
      couponDiscount,
      convenienceFee,
      taxes:           gst,
      walletUsed,
      totalAmount,
      amountPaid:      paymentInfo?.method === 'cash' ? 0 : totalAmount,
    },
  });

  // Reserve slot if professional pre-selected
  if (req.body.professionalId) {
    slotCapacity.reserveSlot(req.body.professionalId, scheduledDate, scheduledTime, booking._id)
      .catch(e => console.warn('[Booking] Slot reserve failed:', e.message));
  }

  // Mark coupon used
  if (coupon) {
    coupon.usedCount += 1;
    coupon.usedBy.push(req.user._id);
    await coupon.save();
  }

  // Update service booking count
  await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });

  // Auto-match professional
  let assignedPro = null;
  try {
    assignedPro = await matchingService.assignProfessional(booking);
    if (assignedPro) {
      booking.professional = assignedPro._id;
      booking.status       = 'professional_assigned';
      booking.statusHistory.push({ status: 'professional_assigned', note: 'Auto-assigned' });
      await booking.save();
    }
  } catch (e) {
    console.error('[Booking] Matching failed (non-fatal):', e.message);
  }

  // Notifications (non-blocking)
  const populatedBooking = await Booking.findById(booking._id).populate('service', 'name icon');
  Promise.allSettled([
    notifyBookingConfirmed(booking),
    assignedPro ? notifyProfessionalNewBooking(assignedPro.user, populatedBooking) : null,
    sendSMS(req.user.phone, `Booking ${booking.bookingId} confirmed for ${scheduledDate} at ${scheduledTime}. -Slot Services`),
  ]);

  global.io?.to(`user_${req.user._id}`).emit('booking_created', { bookingId: booking._id });

  res.status(201).json({
    success: true,
    booking: populatedBooking,
    razorpayRequired: paymentInfo?.method !== 'cash' && paymentInfo?.method !== 'wallet',
    message: 'Booking confirmed! ✅',
  });
});

// ── GET /bookings ──────────────────────────────────────────────
exports.getBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const query = { customer: req.user._id };

  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    query.status   = { $in: statuses };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('service', 'name icon images rating category')
      .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar phone' } })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Booking.countDocuments(query),
  ]);

  res.json({
    success: true, bookings, total,
    pagination: { page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
});

// ── GET /bookings/stats ────────────────────────────────────────
exports.getBookingStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [total, completed, cancelled, upcoming] = await Promise.all([
    Booking.countDocuments({ customer: userId }),
    Booking.countDocuments({ customer: userId, status: 'completed' }),
    Booking.countDocuments({ customer: userId, status: 'cancelled' }),
    Booking.countDocuments({ customer: userId, status: { $in: ['pending','confirmed','professional_assigned','in_progress'] } }),
  ]);
  const spent = await Booking.aggregate([
    { $match: { customer: userId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } },
  ]);
  res.json({ success: true, stats: { total, completed, cancelled, upcoming, totalSpent: spent[0]?.total || 0 } });
});

// ── GET /bookings/slots ────────────────────────────────────────
exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) throw new AppError('date and serviceId required', 400);
  const { data } = await require('./serviceController').getTimeSlots
    ? require('./serviceController').getTimeSlots({ params: { id: serviceId }, query: { date } }, res, () => {})
    : { data: null };
  if (!res.headersSent) res.json({ success: true, slots: [] });
});

// ── GET /bookings/:id ──────────────────────────────────────────
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('service', 'name icon images description inclusions exclusions howItWorks warranty')
    .populate('review')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar phone' } });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Access denied', 403);

  res.json({ success: true, booking });
});

// ── PUT /bookings/:id/cancel ───────────────────────────────────
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('service', 'name');
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Access denied', 403);

  const nonCancellable = ['completed', 'cancelled', 'no_show'];
  if (nonCancellable.includes(booking.status))
    throw new AppError(`Cannot cancel a ${booking.status} booking`, 400);

  // Refund policy
  const hoursUntil = (new Date(booking.scheduledDate) - new Date()) / 3600000;
  let refundAmount = 0;
  if (hoursUntil > 24)       refundAmount = booking.pricing.amountPaid;
  else if (hoursUntil > 4)   refundAmount = Math.round(booking.pricing.amountPaid * 0.5);
  else                       refundAmount = 0;

  booking.status = 'cancelled';
  booking.statusHistory.push({ status: 'cancelled', note: cancellationReason, updatedBy: req.user._id });
  booking.cancellation = {
    cancelledBy: req.user.role === 'admin' ? 'admin' : 'customer',
    reason:      cancellationReason,
    cancelledAt: new Date(),
    refundAmount,
    refundStatus: refundAmount > 0 ? 'pending' : 'processed',
  };
  await booking.save();

  // Refund to wallet
  if (refundAmount > 0 && booking.payment.status === 'paid') {
    await User.findByIdAndUpdate(booking.customer, {
      $inc: { 'wallet.balance': refundAmount },
      $push: { 'wallet.transactions': { type: 'credit', amount: refundAmount, description: `Refund for booking ${booking.bookingId}` } },
    });
  }

  // Free up professional
  if (booking.professional) {
    await Professional.findByIdAndUpdate(booking.professional, { activeBooking: null });
  }

  notifyBookingCancelled(booking, 'customer');

  res.json({ success: true, booking, refundAmount, message: refundAmount > 0 ? `₹${refundAmount} will be refunded to your wallet.` : 'Booking cancelled.' });
});

// ── PUT /bookings/:id/status ───────────────────────────────────
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const VALID = ['confirmed','professional_assigned','professional_arriving','professional_arrived','in_progress','completed','no_show'];
  if (!VALID.includes(status)) throw new AppError('Invalid status', 400);

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);

  booking.status = status;
  booking.statusHistory.push({ status, note, updatedBy: req.user._id });
  if (status === 'in_progress') booking.tracking.actualStartTime = new Date();
  if (status === 'completed')   booking.tracking.actualEndTime   = new Date();
  await booking.save();

  global.io?.to(`booking:${booking._id}`).emit('status_update', { status, bookingId: booking._id });
  res.json({ success: true, booking });
});

// ── PUT /bookings/:id/reschedule ───────────────────────────────
exports.rescheduleBooking = asyncHandler(async (req, res) => {
  const { scheduledDate, scheduledTime, reason } = req.body;
  if (!scheduledDate || !scheduledTime) throw new AppError('Date and time required', 400);

  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Access denied', 403);
  if (['completed','cancelled','no_show'].includes(booking.status))
    throw new AppError('Cannot reschedule this booking', 400);

  const newDate = new Date(scheduledDate);
  if (newDate <= new Date()) throw new AppError('Cannot reschedule to a past date', 400);

  booking.originalBookingId = booking._id;
  booking.scheduledDate     = newDate;
  booking.scheduledTime     = scheduledTime;
  booking.status            = 'rescheduled';
  booking.isRescheduled     = true;
  booking.statusHistory.push({ status: 'rescheduled', note: reason || 'Rescheduled by customer', updatedBy: req.user._id });
  await booking.save();

  res.json({ success: true, booking, message: 'Booking rescheduled successfully!' });
});

// ── PUT /bookings/:id/assign ───────────────────────────────────
exports.assignProfessional = asyncHandler(async (req, res) => {
  const { professionalId } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);

  const pro = await Professional.findById(professionalId);
  if (!pro) throw new AppError('Professional not found', 404);

  booking.professional = professionalId;
  booking.status       = 'professional_assigned';
  booking.statusHistory.push({ status: 'professional_assigned', note: 'Manually assigned by admin' });
  await booking.save();
  await Professional.findByIdAndUpdate(professionalId, { activeBooking: booking._id });

  res.json({ success: true, booking, message: `Professional assigned to booking ${booking.bookingId}` });
});

// ── Event wiring helpers (called at key booking lifecycle points) ──

/**
 * Called when booking status changes to 'completed'
 * Wires: loyalty points, referral reward, WhatsApp notification, warranty creation
 */
async function onBookingCompleted(booking) {
  const userId = booking.customer._id || booking.customer;
  const bookingAmount = booking.amount || 0;
  const serviceCategory = booking.serviceCategory || 'default';

  try {
    // 1. Award loyalty points
    const { awardBookingPoints } = require('./loyaltyController');
    await awardBookingPoints({ body: { userId, bookingId: booking._id, bookingAmount } }, { json: () => {} }).catch(() => {});

    // 2. Process referral reward (only matters for first booking)
    const { processReferralReward } = require('./referralController');
    await processReferralReward({ body: { userId, bookingId: booking._id } }, { json: () => {} }).catch(() => {});

    // 3. Send WhatsApp job-completed notification
    const { whatsappOutbound } = require('../utils/whatsapp');
    const User = require('../models/User');
    const customer = await User.findById(userId).select('phone name').lean();
    if (customer?.phone) {
      await whatsappOutbound.sendJobCompleted(customer.phone, {
        customerName: customer.name,
        serviceName: booking.service || serviceCategory,
        bookingId: booking._id.toString(),
      }).catch(() => {});
    }

    // 4. Create streak bonus if applicable
    const Booking = require('../models/Booking');
    const completedCount = await Booking.countDocuments({ customer: userId, status: 'completed' });
    const streakBonuses = { 3: 'streak_3', 5: 'streak_5', 10: 'streak_10' };
    if (streakBonuses[completedCount]) {
      const { awardBonusPoints } = require('./loyaltyController');
      await awardBonusPoints({ body: { userId, source: streakBonuses[completedCount], reference: booking._id } }, { json: () => {} }).catch(() => {});
    }

  } catch (err) {
    console.error('[onBookingCompleted] Event wiring error:', err.message);
  }
}

/**
 * Called when booking is confirmed
 * Wires: WhatsApp confirmation notification
 */
async function onBookingConfirmed(booking) {
  try {
    const { whatsappOutbound } = require('../utils/whatsapp');
    const User = require('../models/User');
    const customer = await User.findById(booking.customer).select('phone name').lean();
    if (customer?.phone) {
      const date = booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Scheduled';
      await whatsappOutbound.sendBookingConfirmed(customer.phone, {
        customerName: customer.name,
        serviceName: booking.service || booking.serviceCategory,
        date,
        bookingId: booking._id.toString(),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[onBookingConfirmed] WhatsApp error:', err.message);
  }
}

/**
 * Called during booking creation to get dynamic price
 */
async function getDynamicPrice(basePrice, serviceCategory, lat, lng, scheduledAt) {
  try {
    const dynamicPricingService = require('../services/dynamicPricingService');
    return await dynamicPricingService.calculateDynamicPrice({
      basePrice, serviceCategory, lat, lng, scheduledAt, userId: null,
    });
  } catch {
    return { finalPrice: basePrice, surgeMultiplier: 1.0, isSurge: false };
  }
}

module.exports.onBookingCompleted = onBookingCompleted;
module.exports.onBookingConfirmed = onBookingConfirmed;
module.exports.getDynamicPrice = getDynamicPrice;
