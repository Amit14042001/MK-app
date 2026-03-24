/**
 * Slot App — Services Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/',              serviceController.getServices);
router.get('/featured',      serviceController.getFeaturedServices);
router.get('/popular',       serviceController.getPopularServices);
router.get('/new',           serviceController.getNewServices);
router.get('/search',        serviceController.searchServices);
router.get('/category/:slug', serviceController.getServicesByCategory);
router.get('/:slugOrId',     serviceController.getService);

// Availability check
router.get('/:serviceId/availability', serviceController.checkAvailability);
router.get('/:serviceId/slots',        serviceController.getAvailableSlots);
router.get('/:serviceId/professionals', serviceController.getServiceProfessionals);

// Price estimation
router.post('/:serviceId/estimate',    serviceController.getEstimate);

// Protected — admin only
router.use(protect, authorize('admin'));
router.post('/',           serviceController.createService);
router.put('/:id',         serviceController.updateService);
router.delete('/:id',      serviceController.deleteService);
router.post('/:id/images', serviceController.uploadServiceImages);
router.put('/:id/toggle',  serviceController.toggleServiceStatus);

module.exports = router;
