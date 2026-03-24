/**
 * Slot App — Notifications Routes (Full)
 */
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/notifications');

router.use(protect);

// GET /notifications — paginated list
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const query = { recipient: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort('-createdAt').skip((page-1)*limit).limit(Number(limit)).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, notifications, total, unreadCount,
    pages: Math.ceil(total/limit), currentPage: Number(page) });
}));

// PUT /notifications/read-all
router.put('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read' });
}));

// PUT /notifications/:id/read
router.put('/:id/read', asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true });
}));

// DELETE /notifications/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  res.json({ success: true });
}));

// DELETE /notifications — clear all
router.delete('/', asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id, isRead: true });
  res.json({ success: true, message: 'Read notifications cleared' });
}));

// POST /notifications/device-token — register FCM token
router.post('/device-token', asyncHandler(async (req, res) => {
  const { token, platform = 'android' } = req.body;
  if (!token) throw new AppError('Token required', 400);
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, { fcmToken: token, devicePlatform: platform });
  res.json({ success: true, message: 'Device token registered' });
}));

// POST /notifications/preferences — update notification preferences
router.post('/preferences', asyncHandler(async (req, res) => {
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, { 'preferences.notifications': req.body });
  res.json({ success: true, message: 'Notification preferences updated' });
}));

// GET /notifications/unread-count
router.get('/unread-count', asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ success: true, count });
}));

// POST /notifications/broadcast (Admin)
router.post('/broadcast', authorize('admin'), asyncHandler(async (req, res) => {
  const { title, message, type = 'system', userIds, deepLink } = req.body;
  let recipients = userIds;
  if (!userIds || userIds.length === 0) {
    const User = require('../models/User');
    const users = await User.find({ isActive: true, isBanned: false }).select('_id').lean();
    recipients = users.map(u => u._id);
  }
  const notifications = recipients.map(userId => ({
    recipient: userId,
    type, title, message, deepLink,
    priority: 'high',
  }));
  await Notification.insertMany(notifications, { ordered: false });
  res.json({ success: true, sent: recipients.length });
}));

module.exports = router;
