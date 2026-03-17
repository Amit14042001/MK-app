/**
 * MK App — Socket.io Configuration (Complete)
 * Real-time: booking updates, live tracking, chat, notifications
 */
const socketIO = require('socket.io');
const jwt      = require('jsonwebtoken');

const connectedUsers = new Map(); // userId → Set of socketIds
const connectedPros  = new Map(); // proId  → socketId

// ── Initialize Socket ─────────────────────────────────────────
function initSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin:      (process.env.FRONTEND_URLS || 'http://localhost:3000').split(','),
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports:       ['websocket', 'polling'],
    pingTimeout:      60000,
    pingInterval:     25000,
    maxHttpBufferSize:1e6, // 1MB
  });

  // ── Auth Middleware ─────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mk_jwt_secret_2025');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ──────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, userRole } = socket;
    console.log(`[Socket] ${userRole} ${userId} connected — ${socket.id}`);

    // Register user
    if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
    connectedUsers.get(userId).add(socket.id);
    socket.join(`user_${userId}`);

    // Professional room
    if (userRole === 'professional') {
      connectedPros.set(userId, socket.id);
      socket.join('professionals');
    }

    // Update online status in Redis
    try {
      const redis = require('./redis');
      redis.set(`online:${userId}`, socket.id, 300);
    } catch {}

    // ── Event: Join booking room ──────────────────────────────
    socket.on('join_booking', (bookingId) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        console.log(`[Socket] ${userId} joined booking:${bookingId}`);
      }
    });

    socket.on('leave_booking', (bookingId) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    // ── Event: Professional location update ───────────────────
    socket.on('location_update', async (data) => {
      try {
        const { bookingId, lat, lng, accuracy } = data;
        if (!bookingId || !lat || !lng) return;

        // Broadcast to booking room (customer gets the update)
        io.to(`booking:${bookingId}`).emit('pro_location', { lat, lng, accuracy, timestamp: Date.now() });

        // Update DB
        const Booking = require('../models/Booking');
        await Booking.findByIdAndUpdate(bookingId, {
          'tracking.professionalLat':    lat,
          'tracking.professionalLng':    lng,
          'tracking.lastLocationUpdate': new Date(),
        });
      } catch (err) {
        console.error('[Socket] location_update error:', err.message);
      }
    });

    // ── Event: Chat message ───────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, messageType = 'text' } = data;
        if (!conversationId || !message) return;

        const msgData = {
          id:             `msg_${Date.now()}`,
          conversationId,
          senderId:       userId,
          senderRole:     userRole,
          message,
          messageType,
          timestamp:      new Date().toISOString(),
          status:         'sent',
        };

        // Broadcast to conversation room
        socket.to(`conv:${conversationId}`).emit('new_message', msgData);

        // Confirm to sender
        socket.emit('message_sent', { ...msgData, status: 'delivered' });
      } catch (err) {
        console.error('[Socket] send_message error:', err.message);
      }
    });

    socket.on('join_conversation', (conversationId) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on('typing_start', ({ conversationId }) => {
      if (conversationId) socket.to(`conv:${conversationId}`).emit('user_typing', { userId, conversationId });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (conversationId) socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId });
    });

    // ── Event: Booking status update ──────────────────────────
    socket.on('update_status', async (data) => {
      try {
        const { bookingId, status, note } = data;
        if (!bookingId || !status) return;

        io.to(`booking:${bookingId}`).emit('status_update', {
          bookingId, status, note,
          updatedBy: userId,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    });

    // ── Event: OTP verify for job start ──────────────────────
    socket.on('verify_start_otp', async (data) => {
      try {
        const { bookingId, otp } = data;
        const Booking = require('../models/Booking');
        const booking = await Booking.findById(bookingId);
        if (booking && booking.tracking.otp === otp) {
          booking.tracking.otpVerified = true;
          booking.status               = 'in_progress';
          booking.tracking.actualStartTime = new Date();
          booking.statusHistory.push({ status: 'in_progress', note: 'OTP verified, work started' });
          await booking.save();
          io.to(`booking:${bookingId}`).emit('otp_verified', { bookingId, status: 'in_progress' });
        } else {
          socket.emit('otp_error', { message: 'Invalid OTP' });
        }
      } catch {}
    });

    // ── Event: Video call signalling ──────────────────────────
    socket.on('call_signal', (data) => {
      const { targetUserId, signal, callId } = data;
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('call_signal', { signal, callId, fromUserId: userId });
      }
    });

    socket.on('ice_candidate', (data) => {
      const { targetUserId, candidate, callId } = data;
      if (targetUserId) {
        io.to(`user_${targetUserId}`).emit('ice_candidate', { candidate, callId, fromUserId: userId });
      }
    });

    // ── Event: Heartbeat ──────────────────────────────────────
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
      try {
        const redis = require('./redis');
        redis.set(`online:${userId}`, socket.id, 300); // renew 5 min
      } catch {}
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ${userId} disconnected — ${reason}`);

      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          if (userRole === 'professional') connectedPros.delete(userId);
          // Mark offline
          try {
            const redis = require('./redis');
            redis.del(`online:${userId}`);
          } catch {}
        }
      }
    });
  });

  // ── Attach helpers to io ──────────────────────────────────
  io.emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  io.emitToBooking = (bookingId, event, data) => {
    io.to(`booking:${bookingId}`).emit(event, data);
  };

  io.broadcastToPros = (event, data) => {
    io.to('professionals').emit(event, data);
  };

  io.getOnlineUsers = () => [...connectedUsers.keys()];
  io.getOnlinePros  = () => [...connectedPros.keys()];
  io.isUserOnline   = (userId) => connectedUsers.has(userId);

  console.log('[Socket] Socket.io initialized');
  return io;
}

module.exports = { initSocket, connectedUsers, connectedPros };
