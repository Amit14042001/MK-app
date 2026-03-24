/**
 * Slot App — FAQ, SupportTicket, VideoCall Models + Controllers
 */
const mongoose = require('mongoose');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

// ══════════════════════════════════════════════════════════════
// FAQ MODEL
// ══════════════════════════════════════════════════════════════
const faqSchema = new mongoose.Schema({
  question:   { type:String, required:true, trim:true },
  answer:     { type:String, required:true },
  category:   { type:String, enum:['general','booking','payment','professional','account','safety'], default:'general' },
  tags:       [String],
  isActive:   { type:Boolean, default:true },
  order:      { type:Number, default:0 },
  helpfulYes: { type:Number, default:0 },
  helpfulNo:  { type:Number, default:0 },
  audience:   { type:String, enum:['customer','professional','both'], default:'both' },
}, { timestamps:true });

const FAQ = mongoose.model('FAQ', faqSchema);

// FAQ Controller
const getFAQs = asyncHandler(async (req, res) => {
  const { category, audience = 'customer', q } = req.query;
  const cacheKey = `faqs:${category||'all'}:${audience}:${q||''}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success:true, faqs:cached });

  const query = { isActive:true, audience:{ $in:[audience,'both'] } };
  if (category) query.category = category;
  if (q) query.$text = { $search: q };

  const faqs = await FAQ.find(query).sort({ order:1 }).lean();
  await redis.set(cacheKey, faqs, 600);
  res.json({ success:true, faqs });
});

const voteFAQ = asyncHandler(async (req, res) => {
  const { helpful } = req.body;
  const field = helpful ? 'helpfulYes' : 'helpfulNo';
  await FAQ.findByIdAndUpdate(req.params.id, { $inc:{ [field]:1 } });
  res.json({ success:true });
});

// ══════════════════════════════════════════════════════════════
// SUPPORT TICKET MODEL
// ══════════════════════════════════════════════════════════════
const ticketSchema = new mongoose.Schema({
  ticketId:   { type:String, unique:true },
  user:       { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  userType:   { type:String, enum:['customer','professional'], default:'customer' },
  booking:    { type:mongoose.Schema.Types.ObjectId, ref:'Booking' },
  category:   { type:String, enum:['payment','booking','professional','app_issue','safety','other'], required:true },
  priority:   { type:String, enum:['low','medium','high','urgent'], default:'medium' },
  subject:    { type:String, required:true, trim:true },
  description:{ type:String, required:true },
  status:     { type:String, enum:['open','in_progress','resolved','closed','escalated'], default:'open', index:true },
  assignedTo: { type:String },
  messages:   [{
    sender:    { type:String, enum:['user','agent','system'] },
    message:   { type:String, required:true },
    timestamp: { type:Date, default:Date.now },
    isRead:    { type:Boolean, default:false },
  }],
  attachments:[{ url:String, type:String }],
  resolvedAt: Date,
  satisfactionScore: { type:Number, min:1, max:5 },
  tags:      [String],
}, { timestamps:true });

ticketSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await SupportTicket.countDocuments();
    this.ticketId = 'MKT' + String(count + 1).padStart(6, '0');
  }
  next();
});

const SupportTicket = mongoose.model('SupportTicket', ticketSchema);

// Support Ticket Controller
const createTicket = asyncHandler(async (req, res) => {
  const { category, subject, description, bookingId, priority } = req.body;
  if (!category || !subject || !description) throw new AppError('Category, subject and description required', 400);

  const ticket = await SupportTicket.create({
    user: req.user._id,
    userType: req.user.role === 'professional' ? 'professional' : 'customer',
    category, subject, description, priority: priority || 'medium',
    booking: bookingId,
    messages: [{ sender:'user', message:description }],
  });

  // Auto-response
  ticket.messages.push({ sender:'system', message:`Thank you! Your ticket #${ticket.ticketId} has been created. Our team will respond within 4 hours.` });
  await ticket.save();

  res.status(201).json({ success:true, ticket, message:`Ticket #${ticket.ticketId} created` });
});

const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user:req.user._id })
    .sort({ createdAt:-1 }).populate('booking','bookingId service').lean();
  res.json({ success:true, tickets });
});

const addTicketMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) throw new AppError('Message required', 400);

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id:req.params.id, user:req.user._id },
    { $push:{ messages:{ sender:'user', message } }, status:'in_progress' },
    { new:true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success:true, ticket });
});

const closeTicket = asyncHandler(async (req, res) => {
  const { satisfactionScore } = req.body;
  const ticket = await SupportTicket.findOneAndUpdate(
    { _id:req.params.id, user:req.user._id },
    { status:'closed', resolvedAt:new Date(), satisfactionScore },
    { new:true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success:true, message:'Ticket closed. Thank you for your feedback!' });
});

// ══════════════════════════════════════════════════════════════
// VIDEO CALL MODEL
// ══════════════════════════════════════════════════════════════
const videoCallSchema = new mongoose.Schema({
  booking:      { type:mongoose.Schema.Types.ObjectId, ref:'Booking', required:true },
  customer:     { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
  professional: { type:mongoose.Schema.Types.ObjectId, ref:'Professional', required:true },
  roomId:       { type:String, required:true, unique:true },
  status:       { type:String, enum:['initiated','ringing','active','ended','missed','declined'], default:'initiated' },
  startedAt:    Date,
  endedAt:      Date,
  durationSeconds: { type:Number, default:0 },
  provider:     { type:String, enum:['agora','twilio','jitsi'], default:'agora' },
  recording:    { type:Boolean, default:false },
  recordingUrl: String,
  quality:      { type:String, enum:['poor','fair','good','excellent'] },
}, { timestamps:true });

const VideoCall = mongoose.model('VideoCall', videoCallSchema);

// Video Call Controller
const initiateCall = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const Booking = require('../models/Booking');
  const booking = await Booking.findById(bookingId).populate('professional').lean();
  if (!booking) throw new AppError('Booking not found', 404);

  if (!['professional_assigned','professional_arriving','professional_arrived','in_progress'].includes(booking.status)) {
    throw new AppError('Video call only available during active bookings', 400);
  }

  const roomId = `mk-call-${bookingId}-${Date.now()}`;

  // Generate Agora token (placeholder — real impl uses AgoraService)
  const token = process.env.AGORA_APP_CERTIFICATE
    ? generateAgoraToken(roomId, req.user._id.toString())
    : 'dev-token-' + Math.random().toString(36).slice(2);

  const call = await VideoCall.create({
    booking: bookingId,
    customer: req.user._id,
    professional: booking.professional._id,
    roomId, provider: 'agora',
  });

  // Notify professional via socket
  const { getSocketIO } = require('../config/socket');
  const io = getSocketIO();
  if (io) {
    io.to(`professional_${booking.professional._id}`).emit('incoming_call', {
      callId: call._id,
      roomId,
      customer: req.user.name,
      bookingId,
    });
  }

  res.json({ success:true, call, token, roomId, appId: process.env.AGORA_APP_ID || 'dev-app-id' });
});

const endCall = asyncHandler(async (req, res) => {
  const { duration, quality } = req.body;
  const call = await VideoCall.findByIdAndUpdate(
    req.params.id,
    { status:'ended', endedAt:new Date(), durationSeconds:duration||0, quality },
    { new:true }
  );
  if (!call) throw new AppError('Call not found', 404);
  res.json({ success:true, call });
});

const getCallHistory = asyncHandler(async (req, res) => {
  const calls = await VideoCall.find({ customer:req.user._id })
    .populate('booking','bookingId')
    .sort({ createdAt:-1 }).limit(20).lean();
  res.json({ success:true, calls });
});

// Placeholder — real impl uses Agora RTC Token Builder
function generateAgoraToken(channel, uid) {
  return Buffer.from(`${process.env.AGORA_APP_ID||''}:${channel}:${uid}:${Date.now()}`).toString('base64');
}

// ── ROUTES ─────────────────────────────────────────────────────
const express = require('express');
const { protect, authorize } = require('../middleware/auth');

// FAQ routes
const faqRouter = express.Router();
faqRouter.get('/', getFAQs);
faqRouter.post('/:id/vote', protect, voteFAQ);
faqRouter.post('/',      protect, authorize('admin'), asyncHandler(async(req,res) => { const faq = await FAQ.create(req.body); await redis.delPattern('faqs:*'); res.status(201).json({success:true,faq}); }));
faqRouter.put('/:id',   protect, authorize('admin'), asyncHandler(async(req,res) => { const faq = await FAQ.findByIdAndUpdate(req.params.id,req.body,{new:true}); await redis.delPattern('faqs:*'); res.json({success:true,faq}); }));
faqRouter.delete('/:id',protect, authorize('admin'), asyncHandler(async(req,res) => { await FAQ.findByIdAndDelete(req.params.id); await redis.delPattern('faqs:*'); res.json({success:true}); }));

// Support ticket routes
const ticketRouter = express.Router();
ticketRouter.use(protect);
ticketRouter.post('/',          createTicket);
ticketRouter.get('/',           getMyTickets);
ticketRouter.post('/:id/reply', addTicketMessage);
ticketRouter.put('/:id/close',  closeTicket);
ticketRouter.get('/admin/all',  authorize('admin'), asyncHandler(async(req,res) => {
  const { status, priority, page=1, limit=20 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (priority) q.priority = priority;
  const [tickets, total] = await Promise.all([
    SupportTicket.find(q).populate('user','name phone').populate('booking','bookingId').sort({createdAt:-1}).skip((page-1)*limit).limit(Number(limit)),
    SupportTicket.countDocuments(q),
  ]);
  res.json({success:true,tickets,total});
}));

// Video call routes
const videoRouter = express.Router();
videoRouter.use(protect);
videoRouter.post('/initiate',  initiateCall);
videoRouter.put('/:id/end',    endCall);
videoRouter.get('/history',    getCallHistory);

module.exports = {
  FAQ, SupportTicket, VideoCall,
  faqRouter, ticketRouter, videoRouter,
};
