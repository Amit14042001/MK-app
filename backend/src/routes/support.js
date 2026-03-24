/**
 * Slot App — Support Tickets Routes
 */
const express = require('express');
const router  = express.Router();
const { SupportTicket } = require('../models/SupportModels');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

router.use(protect);

// POST /support — create ticket
router.post('/', asyncHandler(async (req, res) => {
  const { subject, description, category, priority, bookingId } = req.body;
  if (!subject || !description) throw new AppError('Subject and description are required', 400);

  const ticket = await SupportTicket.create({
    user:        req.user._id,
    subject,
    description,
    category:    category || 'general',
    priority:    priority || 'medium',
    booking:     bookingId || null,
    status:      'open',
    messages:    [{ sender: req.user._id, senderRole: req.user.role, text: description, timestamp: new Date() }],
  });

  res.status(201).json({
    success: true,
    message: 'Support ticket created. We\'ll respond within 2-4 hours.',
    data: ticket,
  });
}));

// GET /support — my tickets
router.get('/', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .populate('booking', 'bookingId')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    SupportTicket.countDocuments(query),
  ]);

  res.json({ success: true, data: tickets, total, pages: Math.ceil(total / limit) });
}));

// GET /support/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id })
    .populate('booking', 'bookingId service')
    .populate('messages.sender', 'name role');
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success: true, data: ticket });
}));

// POST /support/:id/reply
router.post('/:id/reply', asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('Reply text is required', 400);

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      $push: { messages: { sender: req.user._id, senderRole: req.user.role, text, timestamp: new Date() } },
      $set:  { status: 'open', updatedAt: new Date() },
    },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);

  res.json({ success: true, data: ticket });
}));

// PUT /support/:id/close
router.put('/:id/close', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { status: 'closed', closedAt: new Date() },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success: true, message: 'Ticket closed', data: ticket });
}));

// PUT /support/:id/reopen
router.put('/:id/reopen', asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { status: 'open', $unset: { closedAt: 1 } },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success: true, message: 'Ticket reopened', data: ticket });
}));

// ── Admin routes ─────────────────────────────────────────────
router.get('/admin/all', authorize('admin'), asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;
  const q = {};
  if (status)   q.status   = status;
  if (priority) q.priority = priority;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(q)
      .populate('user', 'name phone email')
      .populate('booking', 'bookingId')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    SupportTicket.countDocuments(q),
  ]);

  res.json({ success: true, data: tickets, total, pages: Math.ceil(total / limit) });
}));

router.post('/admin/:id/reply', authorize('admin'), asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('Reply text is required', 400);

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    {
      $push: { messages: { sender: req.user._id, senderRole: 'admin', text, timestamp: new Date() } },
      $set:  { status: 'in_progress', assignedTo: req.user._id },
    },
    { new: true }
  ).populate('user', 'name phone');

  if (!ticket) throw new AppError('Ticket not found', 404);

  // Notify user
  const io = req.app.get('io');
  if (io) {
    io.to(ticket.user._id.toString()).emit('support_reply', {
      ticketId: ticket._id,
      message:  'Support team has replied to your ticket',
    });
  }

  res.json({ success: true, data: ticket });
}));

router.patch('/admin/:id/status', authorize('admin'), asyncHandler(async (req, res) => {
  const { status, assignedTo } = req.body;
  const update = { status };
  if (assignedTo) update.assignedTo = assignedTo;
  if (status === 'resolved') update.resolvedAt = new Date();

  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success: true, data: ticket });
}));

module.exports = router;
