/**
 * MK App — Analytics Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Dashboard overview
router.get('/dashboard',         authorize('admin'), analyticsController.getDashboard);
router.get('/bookings',          authorize('admin'), analyticsController.getBookingAnalytics);
router.get('/revenue',           authorize('admin'), analyticsController.getRevenueAnalytics);
router.get('/professionals',     authorize('admin'), analyticsController.getProfessionalAnalytics);
router.get('/customers',         authorize('admin'), analyticsController.getCustomerAnalytics);
router.get('/services/popular',  authorize('admin'), analyticsController.getPopularServices);

// Real-time metrics
router.get('/realtime',          authorize('admin'), analyticsController.getRealtimeMetrics);

// Exports
router.get('/export/bookings',   authorize('admin'), analyticsController.exportBookings);
router.get('/export/revenue',    authorize('admin'), analyticsController.exportRevenue);

// Professional personal analytics
router.get('/my-performance',    authorize('professional'), analyticsController.getMyPerformance);

// City-level analytics
router.get('/city/:city',        authorize('admin'), analyticsController.getCityAnalytics);

// Funnel analytics (conversion)
router.get('/funnel',            authorize('admin'), analyticsController.getFunnelAnalytics);

module.exports = router;
