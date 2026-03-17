/**
 * MK App — Video Call Controller (Full)
 * Agora RTC token generation, call lifecycle, recording, quality metrics
 */
const { VideoCall } = require('../models/SupportModels');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendNotificationToUser } = require('../services/notificationService');

// ── Agora real token generation ──────────────────────────────
function generateAgoraToken(channelName, uid) {
  const appId          = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (appId && appCertificate) {
    try {
      const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
      const expireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      return RtcTokenBuilder.buildTokenWithUid(
        appId, appCertificate, channelName,
        typeof uid === 'number' ? uid : 0,
        RtcRole.PUBLISHER, expireTime
      );
    } catch (e) {
      console.warn('[Agora] Token generation failed, using fallback:', e.message);
    }
  }
  // Fallback for dev/test (no certificate needed for testing mode)
  return `${appId || 'demo_app_id'}_${channelName}_${uid}_${Date.now()}`;
}

// @desc    Initiate video or audio call
// @route   POST /api/video-calls/initiate
// @access  Private
exports.initiateCall = asyncHandler(async (req, res) => {
  const { bookingId, callType = 'video' } = req.body;
  if (!bookingId) throw new AppError('bookingId is required', 400);

  const booking = await Booking.findById(bookingId)
    .populate('customer', 'name phone fcmToken')
    .populate('professional', 'name phone fcmToken');
  if (!booking) throw new AppError('Booking not found', 404);

  const isCustomer = booking.customer._id.toString() === req.user._id.toString();
  const isProfessional = booking.professional?._id?.toString() === req.user._id.toString();
  if (!isCustomer && !isProfessional) throw new AppError('Not authorized for this call', 403);

  // Return existing active call if present
  const existing = await VideoCall.findOne({
    booking: bookingId,
    status: { $in: ['initiated', 'ringing', 'connected'] },
  });
  if (existing) return res.json({ success: true, data: existing, message: 'Rejoining existing call' });

  const channelName = `mk_${bookingId}_${Date.now()}`;
  const callerUid = Math.floor(Math.random() * 100000) + 1;
  const receiverUid = callerUid + 1;

  const callerToken = generateAgoraToken(channelName, callerUid);
  const receiverToken = generateAgoraToken(channelName, receiverUid);

  const videoCall = await VideoCall.create({
    booking: bookingId,
    caller: req.user._id,
    receiver: isCustomer ? booking.professional._id : booking.customer._id,
    callType,
    channelName,
    callerToken,
    receiverToken,
    callerUid,
    receiverUid,
    status: 'ringing',
    initiatedAt: new Date(),
    ringedAt: new Date(),
  });

  // Push notification to other party
  const otherParty = isCustomer ? booking.professional : booking.customer;
  const callerName = isCustomer ? booking.customer.name : booking.professional.name;
  await sendNotificationToUser(otherParty._id, {
    title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
    body: `${callerName} is calling you`,
    data: {
      type: 'incoming_call',
      callId: videoCall._id.toString(),
      channelName,
      token: receiverToken,
      uid: String(receiverUid),
      callerName,
      callType,
      bookingId,
    },
    priority: 'high',
  });

  res.status(201).json({
    success: true,
    data: {
      callId: videoCall._id,
      channelName,
      token: callerToken,
      uid: callerUid,
      agoraAppId: process.env.AGORA_APP_ID,
      callType,
      status: 'ringing',
    },
  });
});

// @desc    Accept incoming call
// @route   POST /api/video-calls/:callId/accept
// @access  Private
exports.acceptCall = asyncHandler(async (req, res) => {
  const call = await VideoCall.findById(req.params.callId)
    .populate('caller', 'name')
    .populate('receiver', 'name');
  if (!call) throw new AppError('Call not found', 404);
  if (call.receiver._id.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);
  if (!['initiated', 'ringing'].includes(call.status)) throw new AppError(`Cannot accept call in status: ${call.status}`, 400);

  call.status = 'connected';
  call.connectedAt = new Date();
  await call.save();

  await sendNotificationToUser(call.caller._id, {
    title: 'Call Accepted',
    body: `${call.receiver.name} joined the call`,
    data: { type: 'call_accepted', callId: call._id.toString() },
  });

  res.json({
    success: true,
    data: {
      callId: call._id,
      channelName: call.channelName,
      token: call.receiverToken,
      uid: call.receiverUid,
      agoraAppId: process.env.AGORA_APP_ID,
      status: 'connected',
    },
  });
});

// @desc    Reject / decline call
// @route   POST /api/video-calls/:callId/reject
// @access  Private
exports.rejectCall = asyncHandler(async (req, res) => {
  const { reason = 'declined' } = req.body;
  const call = await VideoCall.findById(req.params.callId).populate('caller', 'name').populate('receiver', 'name');
  if (!call) throw new AppError('Call not found', 404);
  if (call.receiver._id.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

  call.status = 'rejected';
  call.endedAt = new Date();
  call.endReason = reason;
  await call.save();

  await sendNotificationToUser(call.caller._id, {
    title: 'Call Declined',
    body: `${call.receiver.name} is unavailable`,
    data: { type: 'call_rejected', callId: call._id.toString(), reason },
  });

  res.json({ success: true, message: 'Call rejected' });
});

// @desc    End call
// @route   POST /api/video-calls/:callId/end
// @access  Private
exports.endCall = asyncHandler(async (req, res) => {
  const { endReason = 'ended' } = req.body;
  const call = await VideoCall.findById(req.params.callId);
  if (!call) throw new AppError('Call not found', 404);

  const isParticipant = [call.caller.toString(), call.receiver.toString()].includes(req.user._id.toString());
  if (!isParticipant) throw new AppError('Not authorized', 403);

  const durationSecs = call.connectedAt
    ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
    : 0;

  call.status = 'ended';
  call.endedAt = new Date();
  call.endReason = endReason;
  call.durationSeconds = durationSecs;
  await call.save();

  // Notify the other party
  const otherPartyId = call.caller.toString() === req.user._id.toString() ? call.receiver : call.caller;
  await sendNotificationToUser(otherPartyId, {
    title: 'Call Ended',
    body: `Call duration: ${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`,
    data: { type: 'call_ended', callId: call._id.toString(), durationSeconds: String(durationSecs) },
  });

  res.json({
    success: true,
    data: {
      callId: call._id,
      durationSeconds: durationSecs,
      durationFormatted: `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`,
    },
  });
});

// @desc    Get call details
// @route   GET /api/video-calls/:callId
// @access  Private
exports.getCallDetails = asyncHandler(async (req, res) => {
  const call = await VideoCall.findById(req.params.callId)
    .populate('caller', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('booking', 'service scheduledAt');
  if (!call) throw new AppError('Call not found', 404);

  const isParticipant = [call.caller._id.toString(), call.receiver._id.toString()].includes(req.user._id.toString());
  if (!isParticipant) throw new AppError('Not authorized', 403);

  res.json({ success: true, data: call });
});

// @desc    Get call history for user
// @route   GET /api/video-calls/history
// @access  Private
exports.getCallHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const calls = await VideoCall.find({
    $or: [{ caller: req.user._id }, { receiver: req.user._id }],
  })
    .populate('caller', 'name')
    .populate('receiver', 'name')
    .populate('booking', 'service')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await VideoCall.countDocuments({
    $or: [{ caller: req.user._id }, { receiver: req.user._id }],
  });

  res.json({
    success: true,
    data: calls,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// @desc    Update call quality metrics (called periodically from client)
// @route   POST /api/video-calls/:callId/metrics
// @access  Private
exports.updateCallMetrics = asyncHandler(async (req, res) => {
  const { networkQuality, videoResolution, audioBitrate, packetLoss } = req.body;
  const call = await VideoCall.findById(req.params.callId);
  if (!call) throw new AppError('Call not found', 404);

  if (!call.qualityMetrics) call.qualityMetrics = [];
  call.qualityMetrics.push({ timestamp: new Date(), networkQuality, videoResolution, audioBitrate, packetLoss });
  // Keep only last 30 metrics entries
  if (call.qualityMetrics.length > 30) call.qualityMetrics = call.qualityMetrics.slice(-30);
  await call.save();

  res.json({ success: true });
});

// @desc    Submit post-call review
// @route   POST /api/video-calls/:callId/review
// @access  Private
exports.submitCallReview = asyncHandler(async (req, res) => {
  const { rating, tags, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

  const call = await VideoCall.findById(req.params.callId);
  if (!call) throw new AppError('Call not found', 404);
  if (call.caller.toString() !== req.user._id.toString() && call.receiver.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  const isCallerReview = call.caller.toString() === req.user._id.toString();
  if (isCallerReview) {
    call.callerReview = { rating, tags, comment, submittedAt: new Date() };
  } else {
    call.receiverReview = { rating, tags, comment, submittedAt: new Date() };
  }
  await call.save();

  res.json({ success: true, message: 'Review submitted. Thank you for your feedback!' });
});

// @desc    Get missed calls
// @route   GET /api/video-calls/missed
// @access  Private
exports.getMissedCalls = asyncHandler(async (req, res) => {
  const missedCalls = await VideoCall.find({
    receiver: req.user._id,
    status: { $in: ['missed', 'rejected'] },
  })
    .populate('caller', 'name avatar')
    .populate('booking', 'service')
    .sort({ createdAt: -1 })
    .limit(20);

  // Mark as seen
  await VideoCall.updateMany(
    { receiver: req.user._id, status: 'missed', seenAt: null },
    { seenAt: new Date() }
  );

  res.json({ success: true, data: missedCalls, count: missedCalls.length });
});
