/**
 * MK App — Video Calls Routes
 * Agora-based video consultation between customer and professional
 */
const express = require('express');
const router  = express.Router();
const { VideoCall } = require('../models/SupportModels');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const Booking = require('../models/Booking');

router.use(protect);

// POST /video-calls/initiate
router.post('/initiate', asyncHandler(async (req, res) => {
  const { bookingId, callType = 'video' } = req.body;
  if (!bookingId) throw new AppError('Booking ID is required', 400);

  const booking = await Booking.findOne({ _id: bookingId })
    .populate('customer', 'name phone')
    .populate('professional', 'name phone');
  if (!booking) throw new AppError('Booking not found', 404);

  // Verify caller is part of booking
  const isCustomer     = booking.customer._id.toString() === req.user._id.toString();
  const isProfessional = booking.professional?._id?.toString() === req.user._id.toString();
  if (!isCustomer && !isProfessional)
    throw new AppError('You are not authorized for this call', 403);

  const channelName = `mk_${bookingId}_${Date.now()}`;
  const agoraToken  = generateAgoraToken(channelName, req.user._id.toString());

  const call = await VideoCall.create({
    booking:      bookingId,
    customer:     booking.customer._id,
    professional: booking.professional?._id,
    initiatedBy:  req.user._id,
    callType,
    channelName,
    agoraToken,
    status: 'initiated',
  });

  // Emit socket event to other party
  const io = req.app.get('io');
  if (io) {
    const targetId = isCustomer
      ? booking.professional?._id?.toString()
      : booking.customer._id.toString();
    if (targetId) {
      io.to(targetId).emit('incoming_call', {
        callId:      call._id,
        channelName,
        agoraToken,
        callType,
        caller: { name: req.user.name, id: req.user._id },
        bookingId,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Call initiated',
    data: {
      callId:      call._id,
      channelName,
      agoraToken,
      callType,
      appId: process.env.AGORA_APP_ID || '',
    },
  });
}));

// PUT /video-calls/:id/accept
router.put('/:id/accept', asyncHandler(async (req, res) => {
  const call = await VideoCall.findByIdAndUpdate(
    req.params.id,
    { status: 'connected', connectedAt: new Date() },
    { new: true }
  );
  if (!call) throw new AppError('Call not found', 404);

  const io = req.app.get('io');
  if (io) io.to(call.initiatedBy.toString()).emit('call_accepted', { callId: call._id });

  res.json({ success: true, data: call });
}));

// PUT /video-calls/:id/reject
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const call = await VideoCall.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected', endedAt: new Date(), notes: reason },
    { new: true }
  );
  if (!call) throw new AppError('Call not found', 404);

  const io = req.app.get('io');
  if (io) io.to(call.initiatedBy.toString()).emit('call_rejected', { callId: call._id, reason });

  res.json({ success: true, data: call });
}));

// PUT /video-calls/:id/end
router.put('/:id/end', asyncHandler(async (req, res) => {
  const call = await VideoCall.findById(req.params.id);
  if (!call) throw new AppError('Call not found', 404);

  const duration = call.connectedAt
    ? Math.round((Date.now() - call.connectedAt.getTime()) / 1000)
    : 0;

  call.status   = 'ended';
  call.endedAt  = new Date();
  call.duration = duration;
  await call.save();

  const io = req.app.get('io');
  if (io) {
    [call.customer, call.professional].filter(Boolean).forEach(uid => {
      io.to(uid.toString()).emit('call_ended', { callId: call._id, duration });
    });
  }

  res.json({ success: true, data: { callId: call._id, duration } });
}));

// GET /video-calls/history
router.get('/history', asyncHandler(async (req, res) => {
  const query = {
    $or: [{ customer: req.user._id }, { professional: req.user._id }],
  };
  const calls = await VideoCall.find(query)
    .populate('booking', 'bookingId')
    .populate('customer', 'name')
    .populate('professional', 'name')
    .sort('-createdAt')
    .limit(30)
    .lean();

  res.json({ success: true, data: calls, count: calls.length });
}));

// GET /video-calls/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const call = await VideoCall.findById(req.params.id)
    .populate('booking', 'bookingId service')
    .populate('customer', 'name phone')
    .populate('professional', 'name phone');
  if (!call) throw new AppError('Call not found', 404);
  res.json({ success: true, data: call });
}));

// ── Admin: all calls ──────────────────────────────────────────
router.get('/admin/all', authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const q = status ? { status } : {};
  const [calls, total] = await Promise.all([
    VideoCall.find(q)
      .populate('customer', 'name phone')
      .populate('professional', 'name phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    VideoCall.countDocuments(q),
  ]);
  res.json({ success: true, data: calls, total, pages: Math.ceil(total / limit) });
}));

// ── Agora token generator ─────────────────────────────────────
function generateAgoraToken(channel, uid) {
  // Production: use agora-access-token package
  // RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, expireTime)
  const appId  = process.env.AGORA_APP_ID || 'AGORA_APP_ID_HERE';
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  return Buffer.from(`${appId}:${channel}:${uid}:${expiry}`).toString('base64');
}

module.exports = router;
