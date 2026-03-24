/**
 * Slot App — Tracking Routes
 */
const express = require('express');
const router = express.Router();
const {
  updateLocation, getBookingTracking,
  markArrived, markStarted, markCompleted,
  getHistoricalRoute,
} = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');


router.use(protect);
router.post('/location', authorize('professional'), updateLocation);
router.get('/booking/:bookingId', getBookingTracking);
router.post('/arrived/:bookingId', authorize('professional'), markArrived);
router.post('/started/:bookingId', authorize('professional'), markStarted);
router.post('/completed/:bookingId', authorize('professional'), markCompleted);
router.get('/history/:bookingId', getHistoricalRoute);
// Professional marks arrival + generates OTP for customer
router.post('/checkin-arrived/:bookingId', protect, authorize('professional'),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('customer', 'name phone fcmToken');
    if (!booking) throw new AppError('Booking not found', 404);

    // Generate 4-digit OTP
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    booking.checkInOtp = { code: otp, expiresAt, verified: false };
    booking.status = 'professional_arrived';
    booking.statusHistory.push({ status: 'professional_arrived', note: 'OTP generated' });
    await booking.save();

    // Send OTP via SMS to customer
    const { sendSMS } = require('../utils/sms');
    await sendSMS(booking.customer.phone,
      `Your Slot App check-in OTP is ${otp}. Share with your professional to start the service. Valid 10 min.`
    ).catch(() => { });

    // Push notification to customer
    const { sendPushNotification } = require('../utils/notifications');
    if (booking.customer.fcmToken) {
      sendPushNotification(booking.customer.fcmToken, {
        title: '🔔 Professional Has Arrived!',
        body: `Your OTP is ${otp}. Share it to start service.`,
        data: { bookingId: booking._id.toString(), type: 'check_in_otp' },
      }).catch(() => { });
    }

    res.json({ success: true, message: 'OTP sent to customer' });
  })
);

// Professional verifies customer OTP to start service
router.post('/verify-checkin-otp/:bookingId', protect, authorize('professional'),
  asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp) throw new AppError('OTP required', 400);

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) throw new AppError('Booking not found', 404);

    const stored = booking.checkInOtp;
    if (!stored?.code) throw new AppError('No OTP found. Please trigger arrival first.', 400);
    if (new Date() > stored.expiresAt) throw new AppError('OTP has expired. Request a new one.', 400);
    if (stored.code !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP', attemptsLeft: 3 });
    }

    booking.checkInOtp.verified = true;
    booking.status = 'in_progress';
    booking.tracking.actualStartTime = new Date();
    booking.statusHistory.push({ status: 'in_progress', note: 'OTP verified' });
    await booking.save();

    global.io?.to(`booking:${booking._id}`).emit('status_update', { status: 'in_progress' });
    res.json({ success: true, message: 'Check-in verified. Service started!' });
  })
);

module.exports = router;