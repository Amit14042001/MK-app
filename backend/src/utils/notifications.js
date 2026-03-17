const Notification = require('../models/Notification');
const User         = require('../models/User');
const firebase     = require('../config/firebase');
const redis        = require('../config/redis');

let _io = null;
const setIO = (io) => { _io = io; };
const getIO = () => _io;

// ── Core dispatcher — DB + Socket.IO + Firebase ──────────────
const sendNotification = async ({
  userId, title, message, type = 'general', data = {},
  priority = 'normal', channels = ['inapp', 'push'],
}) => {
  try {
    let dbNotif = null;

    if (channels.includes('inapp')) {
      dbNotif = await Notification.create({
        user: userId, title, message, type, data, priority, isRead: false,
      });
      await redis.incr(`notifications:unread:${userId}`);
      await redis.expire(`notifications:unread:${userId}`, 86400);
    }

    // Socket.IO real-time
    if (_io) {
      _io.to(`user_${userId}`).emit('new_notification', {
        notification: dbNotif,
        unreadCount: await getUnreadCount(userId),
      });
    }

    // Firebase push
    if (channels.includes('push')) {
      const user = await User.findById(userId).select('fcmTokens').lean();
      if (user?.fcmTokens?.length > 0) {
        const result = await firebase.sendToUser(user.fcmTokens, { title, body: message, data });
        if (result?.tokensToRemove?.length > 0) {
          await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: result.tokensToRemove } } });
        }
      }
    }

    return dbNotif;
  } catch (err) {
    console.error('sendNotification:', err.message);
    return null;
  }
};

const getUnreadCount = async (userId) => {
  try {
    const cached = await redis.get(`notifications:unread:${userId}`);
    if (cached !== null) return Number(cached);
    const count = await Notification.countDocuments({ user: userId, isRead: false });
    await redis.set(`notifications:unread:${userId}`, count, 300);
    return count;
  } catch { return 0; }
};

// ── Booking lifecycle ────────────────────────────────────────
const notifyBookingConfirmed       = (b) => sendNotification({ userId: b.customer, title: '🎉 Booking Confirmed!', message: `Booking #${b.bookingId} confirmed.`, type: 'booking', data: { bookingId: b._id.toString() }, priority: 'high', channels: ['inapp','push'] });
const notifyProfessionalAssigned   = (b, pro) => sendNotification({ userId: b.customer, title: '👷 Professional Assigned', message: `${pro?.user?.name || 'A professional'} is on the way.`, type: 'booking', data: { bookingId: b._id.toString() }, priority: 'high', channels: ['inapp','push'] });
const notifyProfessionalArriving   = (b, eta) => sendNotification({ userId: b.customer, title: '🚗 On The Way', message: `Your professional is ~${eta} mins away!`, type: 'booking', data: { bookingId: b._id.toString(), eta: String(eta) }, priority: 'critical', channels: ['inapp','push'] });
const notifyProfessionalArrived    = (b) => sendNotification({ userId: b.customer, title: '🏠 Professional Arrived', message: 'Your professional is at the door!', type: 'booking', data: { bookingId: b._id.toString() }, priority: 'critical', channels: ['inapp','push'] });
const notifyServiceCompleted       = (b) => sendNotification({ userId: b.customer, title: '✅ Service Completed!', message: 'Please rate your experience.', type: 'booking', data: { bookingId: b._id.toString() }, priority: 'high', channels: ['inapp','push'] });
const notifyBookingCancelled       = (b, by) => sendNotification({ userId: b.customer, title: '❌ Booking Cancelled', message: by === 'customer' ? 'Your booking was cancelled.' : 'Your booking was cancelled. Refund initiated.', type: 'booking', data: { bookingId: b._id.toString() }, priority: 'high', channels: ['inapp','push'] });
const notifyPaymentReceived        = (userId, amount, bookingId) => sendNotification({ userId, title: '💳 Payment Received', message: `₹${amount} payment confirmed.`, type: 'payment', data: { bookingId: bookingId?.toString(), amount: String(amount) }, priority: 'high', channels: ['inapp','push'] });
const notifyWalletCredited         = (userId, amount, reason) => sendNotification({ userId, title: '💰 Wallet Credited', message: `₹${amount} added. ${reason||''}`, type: 'wallet', data: { amount: String(amount) }, priority: 'normal', channels: ['inapp','push'] });
const notifyProfessionalNewBooking = (proUserId, b) => sendNotification({ userId: proUserId, title: '🔔 New Booking', message: `New ${b.service?.name||'service'} booking assigned.`, type: 'booking', data: { bookingId: b._id.toString() }, priority: 'critical', channels: ['inapp','push'] });

const registerFcmToken = async (userId, token) => {
  if (!token) return;
  await User.findByIdAndUpdate(userId, { $addToSet: { fcmTokens: token } });
  await firebase.subscribeToTopic([token], 'all_users');
};

const unregisterFcmToken = async (userId, token) => {
  if (!token) return;
  await User.findByIdAndUpdate(userId, { $pull: { fcmTokens: token } });
};

module.exports = {
  setIO, sendNotification, getUnreadCount,
  notifyBookingConfirmed, notifyProfessionalAssigned, notifyProfessionalArriving,
  notifyProfessionalArrived, notifyServiceCompleted, notifyBookingCancelled,
  notifyPaymentReceived, notifyWalletCredited, notifyProfessionalNewBooking,
  registerFcmToken, unregisterFcmToken,
};
