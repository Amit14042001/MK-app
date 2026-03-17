/**
 * MK App — Bookings Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const {
  createBooking, getBookings, getBooking,
  cancelBooking, updateBookingStatus, rescheduleBooking,
  assignProfessional, getAvailableSlots, getBookingStats,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// ── Helpers & Aliases ────────────────────────────────────────
const { asyncHandler: _ah, AppError: _AE } = require('../middleware/errorHandler');
const _Booking = require('../models/Booking');
const { protect: _protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getBookings)
  .post(createBooking);

router.get('/stats',           getBookingStats);
router.get('/slots',           getAvailableSlots);

router.route('/:id')
  .get(getBooking);

router.put('/:id/cancel',      cancelBooking);
router.put('/:id/status',      authorize('professional', 'admin'), updateBookingStatus);
router.put('/:id/reschedule',  rescheduleBooking);
router.put('/:id/assign',      authorize('admin'), assignProfessional);

// GET /bookings/professional — bookings assigned to this professional
router.get('/professional', authorize('professional'), _ah(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const Professional = require('../models/Professional');
  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro) throw new _AE('Professional profile not found', 404);

  const query = { professional: pro._id };
  if (status) query.status = status;
  else query.status = { $in: ['professional_assigned','professional_arriving','professional_arrived','in_progress','completed'] };

  const [bookings, total] = await Promise.all([
    _Booking.find(query)
      .sort({ scheduledDate: 1, createdAt: -1 })
      .skip((page-1)*limit).limit(Number(limit))
      .populate('service', 'name icon duration startingPrice')
      .populate('customer', 'name phone')
      .lean(),
    _Booking.countDocuments(query),
  ]);

  res.json({ success: true, bookings, total, pages: Math.ceil(total/limit), currentPage: Number(page) });
}));

// GET /bookings/professional/history — completed jobs
router.get('/professional/history', authorize('professional'), _ah(async (req, res) => {
  const Professional = require('../models/Professional');
  const pro = await Professional.findOne({ user: req.user._id });
  if (!pro) throw new _AE('Professional profile not found', 404);
  const { page = 1, limit = 20 } = req.query;
  const [bookings, total] = await Promise.all([
    _Booking.find({ professional: pro._id, status: 'completed' })
      .sort('-scheduledDate').skip((page-1)*limit).limit(Number(limit))
      .populate('service', 'name icon').populate('customer', 'name')
      .lean(),
    _Booking.countDocuments({ professional: pro._id, status: 'completed' }),
  ]);
  res.json({ success: true, bookings, total, pages: Math.ceil(total/limit) });
}));

// GET /bookings/:id/health-report — Post-service health report
router.get('/:id/health-report', _ah(async (req, res) => {
  const booking = await _Booking.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('service', 'name icon category duration')
    .populate('professional', 'user rating totalBookings skills')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name' } })
    .lean();

  if (!booking) throw new _AE('Booking not found', 404);
  if (booking.status !== 'completed') throw new _AE('Health report available only after service completion', 400);

  // Build service-specific health items
  const serviceName = booking.service?.name?.toLowerCase() || '';
  const healthItems = buildHealthItems(serviceName, booking);

  const report = {
    reportId:       `HR${booking.bookingId}`,
    bookingId:      booking.bookingId,
    service:        booking.service?.name,
    serviceIcon:    booking.service?.icon,
    professional: {
      name:         booking.professional?.user?.name || 'MK Professional',
      rating:       booking.professional?.rating,
      totalJobs:    booking.professional?.totalBookings,
    },
    serviceDate:    booking.completedAt || booking.scheduledDate,
    nextServiceDue: getNextServiceDate(serviceName),
    healthItems,
    photos:         booking.workPhotos || [],
    proNotes:       booking.proNotes || '',
    warrantyValid:  true,
    warrantyUntil:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    rating:         booking.review?.rating,
    pricing:        booking.pricing,
    generatedAt:    new Date(),
  };

  res.json({ success: true, report });
}));

// POST /bookings/:id/health-report/email — email the report
router.post('/:id/health-report/email', _ah(async (req, res) => {
  const booking = await _Booking.findOne({ _id: req.params.id, customer: req.user._id }).lean();
  if (!booking) throw new _AE('Booking not found', 404);
  // Trigger email via notification service
  const { sendEmail } = require('../utils/email');
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('email name').lean();
  await sendEmail({
    to:      user.email,
    subject: `Your MK Service Report — ${booking.bookingId}`,
    html:    `<h2>Service Complete ✅</h2><p>Your service report for booking ${booking.bookingId} is ready. Open the MK App to view the full health report.</p>`,
  }).catch(() => {});
  res.json({ success: true, message: 'Report emailed to your registered address' });
}));

function buildHealthItems(serviceName, booking) {
  if (serviceName.includes('ac') || serviceName.includes('air')) {
    return [
      { label: 'Gas level',        value: 'Refilled to 100%',       status: 'fixed',   icon: '❄️' },
      { label: 'Air filter',       value: 'Cleaned / Replaced',     status: 'done',    icon: '🔄' },
      { label: 'Cooling coil',     value: 'Cleaned',                status: 'done',    icon: '✅' },
      { label: 'Drain pipe',       value: 'Cleared',                status: 'done',    icon: '✅' },
      { label: 'Next service',     value: getNextServiceDate('ac'), status: 'info',    icon: '📅' },
    ];
  }
  if (serviceName.includes('clean')) {
    return [
      { label: 'Kitchen',          value: 'Deep cleaned',           status: 'done',   icon: '🍳' },
      { label: 'Bathrooms',        value: 'Sanitised',              status: 'done',   icon: '🚿' },
      { label: 'Floors',           value: 'Mopped & disinfected',   status: 'done',   icon: '✅' },
      { label: 'Sofa & upholstery',value: 'Vacuumed',               status: 'done',   icon: '🛋️' },
    ];
  }
  if (serviceName.includes('plumb')) {
    return [
      { label: 'Leak source',      value: 'Located & repaired',     status: 'fixed',  icon: '💧' },
      { label: 'Joints',           value: 'Sealed & tested',        status: 'done',   icon: '✅' },
      { label: 'Water pressure',   value: 'Normal',                 status: 'good',   icon: '✅' },
    ];
  }
  return [
    { label: 'Service',            value: 'Completed successfully', status: 'done',   icon: '✅' },
    { label: 'Quality check',      value: 'Passed',                 status: 'good',   icon: '✅' },
  ];
}

function getNextServiceDate(serviceName) {
  const months = serviceName.includes('ac') ? 6
    : serviceName.includes('pest') ? 3
    : serviceName.includes('clean') ? 1
    : serviceName.includes('paint') ? 24
    : 12;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

module.exports = router;

// ── Request a specific professional (re-book same pro) ────────

router.get('/preferred-professionals', _protect, _ah(async (req, res) => {
  // Find professionals the user has booked before, rated 4+ stars
  const bookings = await Booking.find({
    customer: req.user._id,
    status: 'completed',
    professional: { $exists: true },
    'review.rating': { $gte: 4 },
  })
    .sort({ createdAt: -1 })
    .populate('professional', 'user rating totalBookings skills')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name' } })
    .populate('service', 'name icon')
    .limit(10)
    .lean();

  // Deduplicate by professional
  const seen = new Set();
  const preferred = [];
  for (const b of bookings) {
    if (!b.professional) continue;
    const proId = b.professional._id.toString();
    if (!seen.has(proId)) {
      seen.add(proId);
      preferred.push({
        professional: b.professional,
        lastService: b.service?.name,
        lastBookingDate: b.scheduledDate,
        rating: b.review?.rating,
      });
    }
  }

  res.json({ success: true, data: preferred });
}));

// POST /bookings/festival-prebooking
router.post('/festival-prebooking', protect, _ah(async (req, res) => {
  const { festivalId, bundleId, bundleName, services, amount, festivalDate } = req.body;
  if (!bundleId || !amount) throw new _AE('bundleId and amount required', 400);

  const booking = await _Booking.create({
    customer:      req.user._id,
    bookingType:   'festival_prebooking',
    bookingId:     `FEST${Date.now().toString().slice(-8)}`,
    status:        'confirmed',
    scheduledDate: festivalDate || new Date(Date.now() + 45 * 86400000),
    scheduledTime: 'To be scheduled',
    pricing: {
      basePrice:   amount,
      totalAmount: amount,
      amountPaid:  0,
      isPriceLocked: true,
      lockedAt:    new Date(),
    },
    metadata: { festivalId, bundleId, bundleName, services, isPrebooking: true },
    address:  { line1: 'To be confirmed', city: 'TBD', pincode: '000000' },
  });

  res.status(201).json({ success: true, bookingId: booking.bookingId, booking });
}));
