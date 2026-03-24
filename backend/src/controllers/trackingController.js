/**
 * Slot App — Tracking Controller (Full)
 * Real-time location updates, booking lifecycle tracking
 */
const Booking      = require('../models/Booking');
const Professional = require('../models/Professional');
const User         = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

// POST /tracking/location — Professional updates location
exports.updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, bookingId } = req.body;
  if (!lat || !lng) throw new AppError('lat and lng are required', 400);

  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro) throw new AppError('Professional profile not found', 404);

  // Update professional's location
  pro.currentLocation = { lat, lng, updatedAt: new Date() };
  await pro.save();

  // If there's an active booking, update booking tracking
  if (bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking && booking.professional?.toString() === pro._id.toString()) {
      booking.tracking.professionalLat = lat;
      booking.tracking.professionalLng = lng;

      // Calculate estimated arrival (simplified)
      if (booking.address?.lat && booking.address?.lng) {
        const dist = calculateDistance(lat, lng, booking.address.lat, booking.address.lng);
        booking.tracking.distanceToCustomer = Math.round(dist * 10) / 10;
        const etaMins = Math.max(5, Math.round((dist / 25) * 60)); // ~25 km/h avg
        booking.tracking.estimatedArrival = new Date(Date.now() + etaMins * 60 * 1000);
      }

      await booking.save();

      // ── "Pro is arriving" push notification (when ETA < 10 min) ──
      if (booking.tracking.estimatedArrival && booking.status === 'professional_assigned') {
        const etaMs   = new Date(booking.tracking.estimatedArrival) - Date.now();
        const etaMins = Math.floor(etaMs / 60000);
        const alreadySent = await redis.get(`arriving_notif:${bookingId}`);

        if (etaMins <= 10 && etaMins >= 0 && !alreadySent) {
          // Set status to professional_arriving
          booking.status = 'professional_arriving';
          booking.statusHistory.push({ status: 'professional_arriving', note: `ETA ${etaMins} min` });
          await booking.save();

          // Push notification to customer
          const { sendPushNotification } = require('../utils/notifications');
          const customer = await User.findById(booking.customer);
          if (customer?.fcmToken) {
            sendPushNotification(customer.fcmToken, {
              title: `🚗 Your professional is ${etaMins <= 2 ? 'almost there' : `${etaMins} mins away`}!`,
              body: `${pro.user?.name || 'Your professional'} is on the way. Please be ready.`,
              data: { bookingId: booking._id.toString(), type: 'professional_arriving' },
            }).catch(() => {});
          }

          // Socket emit
          global.io?.to(`booking:${bookingId}`).emit('status_update', {
            status: 'professional_arriving', etaMins,
          });

          // Mark notification sent (don't spam — 30 min cooldown)
          await redis.set(`arriving_notif:${bookingId}`, '1', 1800);
        }
      }

      // Push to Redis for real-time polling
      await redis.set(
        `tracking:${bookingId}`,
        { lat, lng, updatedAt: new Date(), estimatedArrival: booking.tracking.estimatedArrival,
          distanceToCustomer: booking.tracking.distanceToCustomer },
        300
      );

      // Emit via Socket.IO if available
      const io = global.io;
      if (io) {
        io.to(`booking:${bookingId}`).emit('professional_location', {
          lat, lng, bookingId,
          distanceToCustomer: booking.tracking.distanceToCustomer,
          estimatedArrival: booking.tracking.estimatedArrival,
        });
      }
    }
  }

  res.json({ success: true, message: 'Location updated' });
});

// GET /tracking/booking/:bookingId — Get live tracking data
exports.getBookingTracking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar phone' } })
    .populate('service', 'name icon')
    .select('status tracking professional customer address scheduledDate scheduledTime bookingId pricing service');

  if (!booking) throw new AppError('Booking not found', 404);

  // Access check: customer or professional
  const isCustomer = booking.customer.toString() === req.user._id.toString();
  const isAdmin    = req.user.role === 'admin';
  let isPro = false;
  if (booking.professional) {
    const pro = await Professional.findById(booking.professional._id);
    isPro = pro?.user.toString() === req.user._id.toString();
  }
  if (!isCustomer && !isPro && !isAdmin) throw new AppError('Access denied', 403);

  // Merge live Redis data
  const liveData = await redis.get(`tracking:${req.params.bookingId}`);

  const response = {
    bookingId: booking.bookingId,
    status: booking.status,
    service: booking.service,
    address: booking.address,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    tracking: { ...booking.tracking, ...(liveData || {}) },
    professional: booking.professional ? {
      _id: booking.professional._id,
      name: booking.professional.user?.name,
      avatar: booking.professional.user?.avatar,
      phone: booking.professional.user?.phone,
      rating: booking.professional.rating,
    } : null,
    pricing: booking.pricing,
  };

  res.json({ success: true, tracking: response });
});

// POST /tracking/arrived/:bookingId — Professional marks arrived
exports.markArrived = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro || booking.professional?.toString() !== pro._id.toString()) {
    throw new AppError('Unauthorized', 403);
  }

  booking.status = 'professional_arrived';
  booking.statusHistory.push({ status: 'professional_arrived', updatedBy: req.user._id });
  booking.tracking.actualStartTime = new Date();
  await booking.save();

  // Notify customer
  const { sendPushNotification } = require('../utils/notifications');
  const User = require('../models/User');
  const customer = await User.findById(booking.customer).select('fcmToken name');
  if (customer?.fcmToken) {
    await sendPushNotification(customer.fcmToken, {
      title: '🔔 Professional Has Arrived!',
      body: `Your ${pro.user?.name || 'professional'} is at your door. Please let them in.`,
      data: { bookingId: booking._id.toString(), screen: 'Tracking' },
    });
  }

  global.io?.to(`booking:${booking._id}`).emit('status_update', { status: 'professional_arrived' });
  res.json({ success: true, message: 'Marked as arrived', booking });
});

// POST /tracking/started/:bookingId — Professional starts the job
exports.markStarted = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro || booking.professional?.toString() !== pro._id.toString()) {
    throw new AppError('Unauthorized', 403);
  }

  booking.status = 'in_progress';
  booking.statusHistory.push({ status: 'in_progress', updatedBy: req.user._id });
  booking.tracking.actualStartTime = booking.tracking.actualStartTime || new Date();
  await booking.save();

  global.io?.to(`booking:${booking._id}`).emit('status_update', { status: 'in_progress' });
  res.json({ success: true, message: 'Job started', booking });
});

// POST /tracking/completed/:bookingId — Professional marks job done
exports.markCompleted = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro || booking.professional?.toString() !== pro._id.toString()) {
    throw new AppError('Unauthorized', 403);
  }

  booking.status = 'completed';
  booking.statusHistory.push({ status: 'completed', updatedBy: req.user._id });
  booking.tracking.actualEndTime = new Date();
  await booking.save();

  // Update professional stats
  await Professional.findByIdAndUpdate(pro._id, {
    $inc: { completedBookings: 1 },
    activeBooking: null,
  });

  // Update user stats
  const User = require('../models/User');
  const customer = await User.findById(booking.customer);
  if (customer) {
    customer.totalBookings += 1;
    customer.totalSpent   += (booking.pricing?.totalAmount || 0);
    customer.updateMembershipTier();
    await customer.save();
  }

  // Earn professional their cut
  const professionalEarnings = Math.round((booking.pricing?.totalAmount || 0) * (1 - pro.commissionRate / 100));
  await Professional.findByIdAndUpdate(pro._id, {
    $inc: { totalEarnings: professionalEarnings, 'wallet.balance': professionalEarnings },
    $push: { 'wallet.transactions': {
      bookingId: booking._id,
      amount:    professionalEarnings,
      type:      'credit',
      description: `Booking ${booking.bookingId} completed`,
    }},
  });

  // Send review reminder to customer (after 30 min)
  setTimeout(async () => {
    try {
      if (customer?.fcmToken) {
        const { sendPushNotification } = require('../utils/notifications');
        await sendPushNotification(customer.fcmToken, {
          title: '⭐ How was your experience?',
          body: 'Rate your recent booking and help us improve.',
          data: { bookingId: booking._id.toString(), screen: 'Review' },
        });
      }
    } catch {}
  }, 30 * 60 * 1000);

  global.io?.to(`booking:${booking._id}`).emit('status_update', { status: 'completed' });
  res.json({ success: true, message: 'Job marked as completed!', booking });
});

// GET /tracking/history/:bookingId — Historical route (future feature)
exports.getHistoricalRoute = asyncHandler(async (req, res) => {
  const tracking = await redis.get(`route:${req.params.bookingId}`);
  res.json({ success: true, route: tracking || [] });
});

// ── Haversine distance formula ────────────────────────────────
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
