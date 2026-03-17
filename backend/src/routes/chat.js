/**
 * MK App — Chat Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const chatController = require('../controllers/chatController');
const { protect }    = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

// Conversation management
router.get('/conversations',                     chatController.getConversations);
router.get('/conversations/:bookingId',          chatController.getConversation);
router.post('/conversations/:bookingId',         upload.single('media'), chatController.sendMessage);
router.put('/conversations/:bookingId/read',     chatController.markAsRead);

// Message operations
router.delete('/messages/:messageId',            chatController.deleteMessage);
router.post('/messages/:messageId/react',        chatController.reactToMessage);

// Support chat
router.post('/support',                          chatController.startSupportChat);
router.get('/support/history',                   chatController.getSupportHistory);

// Unread count
router.get('/unread',                            chatController.getUnreadCount);

module.exports = router;
