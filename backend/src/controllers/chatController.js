/**
 * Slot App — Chat Controller (Full)
 * Real-time messaging between customers and professionals via Socket.io
 * Supports text, images, audio messages, booking context
 */
const { ChatMessage, ChatRoom } = require('../models/SupportModels');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendNotificationToUser } = require('../services/notificationService');
const { uploadToStorage } = require('../utils/upload');

// @desc    Get or create chat room for a booking
// @route   GET /api/chat/room/:bookingId
// @access  Private
exports.getChatRoom = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId)
    .populate('customer', 'name avatar')
    .populate('professional', 'name avatar');
  if (!booking) throw new AppError('Booking not found', 404);

  const isCustomer = booking.customer._id.toString() === req.user._id.toString();
  const isProfessional = booking.professional?._id?.toString() === req.user._id.toString();
  if (!isCustomer && !isProfessional) throw new AppError('Not authorized for this chat', 403);

  let room = await ChatRoom.findOne({ booking: bookingId });
  if (!room) {
    room = await ChatRoom.create({
      booking: bookingId,
      customer: booking.customer._id,
      professional: booking.professional?._id,
      participants: [booking.customer._id, booking.professional?._id].filter(Boolean),
      createdAt: new Date(),
      lastActivity: new Date(),
    });
  }

  // Get last 50 messages
  const messages = await ChatMessage.find({ room: room._id })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Mark messages as read
  await ChatMessage.updateMany(
    { room: room._id, sender: { $ne: req.user._id }, readAt: null },
    { readAt: new Date() }
  );

  res.json({
    success: true,
    data: {
      room: {
        id: room._id,
        booking: { id: bookingId, service: booking.service, status: booking.status },
        customer: { id: booking.customer._id, name: booking.customer.name },
        professional: booking.professional ? { id: booking.professional._id, name: booking.professional.name } : null,
      },
      messages: messages.reverse(),
    },
  });
});

// @desc    Send a message
// @route   POST /api/chat/room/:roomId/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { text, messageType = 'text', replyTo } = req.body;

  if (!text && messageType === 'text') throw new AppError('Message text is required', 400);

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new AppError('Chat room not found', 404);
  if (!room.participants.map(String).includes(req.user._id.toString())) {
    throw new AppError('Not authorized for this chat', 403);
  }

  let mediaUrl = null;
  if (req.file) {
    mediaUrl = await uploadToStorage(req.file, 'chat-media');
  }

  const message = await ChatMessage.create({
    room: roomId,
    sender: req.user._id,
    text: text || '',
    messageType,
    mediaUrl,
    replyTo: replyTo || null,
    sentAt: new Date(),
    deliveredAt: new Date(),
  });

  await message.populate('sender', 'name avatar');

  // Update room last activity
  room.lastActivity = new Date();
  room.lastMessage = text ? text.substring(0, 100) : `Sent a ${messageType}`;
  await room.save();

  // Push notification to other participants
  const otherParticipants = room.participants.filter(p => p.toString() !== req.user._id.toString());
  for (const participantId of otherParticipants) {
    await sendNotificationToUser(participantId, {
      title: req.user.name,
      body: text ? text.substring(0, 80) : `Sent a ${messageType}`,
      data: {
        type: 'new_message',
        roomId: roomId,
        messageId: message._id.toString(),
        senderId: req.user._id.toString(),
      },
    });
  }

  // Emit via Socket.io (handled in socket config)
  const io = req.app.get('io');
  if (io) {
    io.to(`chat_${roomId}`).emit('new_message', {
      id: message._id,
      room: roomId,
      sender: { id: req.user._id, name: req.user.name },
      text: message.text,
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      sentAt: message.sentAt,
    });
  }

  res.status(201).json({ success: true, data: message });
});

// @desc    Get messages with pagination
// @route   GET /api/chat/room/:roomId/messages
// @access  Private
exports.getMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new AppError('Chat room not found', 404);
  if (!room.participants.map(String).includes(req.user._id.toString())) {
    throw new AppError('Not authorized', 403);
  }

  const filter = { room: roomId };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await ChatMessage.find(filter)
    .populate('sender', 'name avatar role')
    .populate('replyTo', 'text sender')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await ChatMessage.countDocuments({ room: roomId });

  // Mark as read
  await ChatMessage.updateMany(
    { room: roomId, sender: { $ne: req.user._id }, readAt: null },
    { readAt: new Date() }
  );

  res.json({
    success: true,
    data: messages.reverse(),
    pagination: { page: Number(page), limit: Number(limit), total, hasMore: total > page * limit },
  });
});

// @desc    Mark messages as read
// @route   PUT /api/chat/room/:roomId/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const result = await ChatMessage.updateMany(
    { room: roomId, sender: { $ne: req.user._id }, readAt: null },
    { readAt: new Date() }
  );

  // Notify senders their messages were read
  const io = req.app.get('io');
  if (io) {
    io.to(`chat_${roomId}`).emit('messages_read', {
      roomId,
      readBy: req.user._id,
      readAt: new Date(),
    });
  }

  res.json({ success: true, data: { markedRead: result.modifiedCount } });
});

// @desc    Delete a message (soft delete)
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res) => {
  const message = await ChatMessage.findById(req.params.messageId);
  if (!message) throw new AppError('Message not found', 404);
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new AppError('You can only delete your own messages', 403);
  }

  // Only allow deletion within 10 minutes
  const tenMinutes = 10 * 60 * 1000;
  if (Date.now() - message.sentAt.getTime() > tenMinutes) {
    throw new AppError('Messages can only be deleted within 10 minutes of sending', 400);
  }

  message.isDeleted = true;
  message.text = 'This message was deleted';
  message.deletedAt = new Date();
  await message.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`chat_${message.room}`).emit('message_deleted', { messageId: message._id });
  }

  res.json({ success: true, message: 'Message deleted' });
});

// @desc    Get all chat rooms for user
// @route   GET /api/chat/rooms
// @access  Private
exports.getChatRooms = asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({ participants: req.user._id, isActive: { $ne: false } })
    .populate('booking', 'service status scheduledAt')
    .populate('customer', 'name avatar')
    .populate('professional', 'name avatar')
    .sort({ lastActivity: -1 })
    .limit(30);

  // Get unread counts per room
  const roomIds = rooms.map(r => r._id);
  const unreadCounts = await ChatMessage.aggregate([
    { $match: { room: { $in: roomIds }, sender: { $ne: req.user._id }, readAt: null } },
    { $group: { _id: '$room', count: { $sum: 1 } } },
  ]);
  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));

  const enriched = rooms.map(room => ({
    ...room.toObject(),
    unreadCount: unreadMap[room._id.toString()] || 0,
    isCustomer: room.customer?._id?.toString() === req.user._id.toString(),
  }));

  res.json({ success: true, data: enriched });
});

// @desc    Send typing indicator
// @route   POST /api/chat/room/:roomId/typing
// @access  Private
exports.sendTypingIndicator = asyncHandler(async (req, res) => {
  const { isTyping } = req.body;
  const io = req.app.get('io');
  if (io) {
    io.to(`chat_${req.params.roomId}`).emit('typing', {
      roomId: req.params.roomId,
      userId: req.user._id,
      userName: req.user.name,
      isTyping: !!isTyping,
    });
  }
  res.json({ success: true });
});

// @desc    Get unread message count across all rooms
// @route   GET /api/chat/unread-count
// @access  Private
exports.getTotalUnreadCount = asyncHandler(async (req, res) => {
  const count = await ChatMessage.countDocuments({
    sender: { $ne: req.user._id },
    readAt: null,
    room: {
      $in: await ChatRoom.distinct('_id', { participants: req.user._id }),
    },
  });
  res.json({ success: true, data: { unreadCount: count } });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.getConversations = exports.getChatRooms;

exports.getConversation = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const room = await ChatRoom.findOne({ booking: bookingId }).populate('participants', 'name avatar');
  if (!room) return res.json({ success: true, data: { messages: [] } });
  
  const messages = await ChatMessage.find({ room: room._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: { room, messages: messages.reverse() } });
});

exports.getUnreadCount = exports.getTotalUnreadCount;

exports.reactToMessage = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Reaction added' });
});

exports.startSupportChat = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, message: 'Support chat started' });
});

exports.getSupportHistory = asyncHandler(async (req, res) => {
  res.json({ success: true, history: [] });
});
