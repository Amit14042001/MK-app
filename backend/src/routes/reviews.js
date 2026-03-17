/**
 * MK App — Reviews Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

// Create review (customer after booking completes)
router.post('/',                            upload.array('images', 3), reviewController.createReview);

// Get reviews
router.get('/service/:serviceId',           reviewController.getServiceReviews);
router.get('/professional/:professionalId', reviewController.getProfessionalReviews);
router.get('/my-reviews',                   reviewController.getMyReviews);
router.get('/pending',                      reviewController.getPendingReviews);

// Update review
router.put('/:reviewId',                    reviewController.updateReview);
router.delete('/:reviewId',                 reviewController.deleteReview);

// Helpful votes
router.post('/:reviewId/helpful',           reviewController.markHelpful);
router.post('/:reviewId/report',            reviewController.reportReview);

// Professional reply to review
router.post('/:reviewId/reply',             authorize('professional'), reviewController.replyToReview);

// Admin moderation
router.put('/:reviewId/moderate',           authorize('admin'), reviewController.moderateReview);
router.get('/flagged',                      authorize('admin'), reviewController.getFlaggedReviews);

module.exports = router;
