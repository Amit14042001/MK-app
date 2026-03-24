/**
 * Slot App — Warranty Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const warrantyController = require('../controllers/warrantyController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

// Customer warranty operations
router.post('/claims',                        upload.array('photos', 5), warrantyController.fileWarrantyClaim);
router.get('/claims',                         warrantyController.getMyClaims);
router.get('/claims/:claimId',                warrantyController.getClaimDetails);
router.get('/check/:bookingId',               warrantyController.checkWarrantyStatus);

// Professional warranty responses
router.get('/professional-claims',            authorize('professional'), warrantyController.getProfessionalClaims);
router.put('/claims/:claimId/respond',        authorize('professional'), warrantyController.respondToClaim);
router.post('/claims/:claimId/schedule-redo', authorize('professional'), warrantyController.scheduleRedo);

// Shared
router.post('/claims/:claimId/message',       warrantyController.addClaimMessage);
router.get('/claims/:claimId/messages',       warrantyController.getClaimMessages);

// Admin
router.put('/claims/:claimId/status',         authorize('admin'), warrantyController.updateClaimStatus);
router.get('/admin/all-claims',               authorize('admin'), warrantyController.getAllClaims);
router.get('/admin/stats',                    authorize('admin'), warrantyController.getWarrantyStats);
router.post('/admin/auto-approve',            authorize('admin'), warrantyController.autoApproveOldClaims);

module.exports = router;
