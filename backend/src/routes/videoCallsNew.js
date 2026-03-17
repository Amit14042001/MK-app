/**
 * MK App — Video Call Routes (wired to controller)
 */
const express = require('express');
const router = express.Router();
const videoCallController = require('../controllers/videoCallController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/initiate', videoCallController.initiateCall);
router.post('/:callId/accept', videoCallController.acceptCall);
router.post('/:callId/reject', videoCallController.rejectCall);
router.post('/:callId/end', videoCallController.endCall);
router.get('/history', videoCallController.getCallHistory);
router.get('/missed', videoCallController.getMissedCalls);
router.get('/:callId', videoCallController.getCallDetails);
router.post('/:callId/metrics', videoCallController.updateCallMetrics);
router.post('/:callId/review', videoCallController.submitCallReview);

module.exports = router;
