const { Server } = require('socket.io');
let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_URLS || 'http://localhost:3000').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join booking room for tracking updates
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`📍 Socket ${socket.id} joined booking_${bookingId}`);
    });

    // Professional sends location update
    socket.on('professional_location', ({ bookingId, lat, lng, heading }) => {
      io.to(`booking_${bookingId}`).emit('location_update', { lat, lng, heading, timestamp: new Date() });
    });

    // Professional updates booking status
    socket.on('booking_status_update', ({ bookingId, status, message }) => {
      io.to(`booking_${bookingId}`).emit('status_update', { status, message, timestamp: new Date() });
    });

    // Customer joins their own notification room
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
    });

    // Professional joins their room
    socket.on('join_professional', (professionalId) => {
      socket.join(`professional_${professionalId}`);
    });

    // Chat between customer and professional
    socket.on('send_message', ({ bookingId, senderId, senderType, message }) => {
      io.to(`booking_${bookingId}`).emit('receive_message', {
        senderId, senderType, message, timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
