/**
 * Slot App — Admin Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const {
  getDashboardStats, getAllUsers, toggleBanUser,
  getAllBookings, createCoupon, verifyProfessional,
  getRevenueReport, manageServices, getBanners,
  createBanner, updateBanner, deleteBanner,
  getProfessionals, getAllCategories, createCategory,
  getTickets, resolveTicket,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// Dashboard
router.get('/stats',              getDashboardStats);
router.get('/revenue',            getRevenueReport);

// Users
router.get('/users',              getAllUsers);
router.put('/users/:id/ban',      toggleBanUser);

// Bookings
router.get('/bookings',           getAllBookings);

// Professionals
router.get('/professionals',      getProfessionals);
router.put('/professionals/:id/verify', verifyProfessional);

// Services & Categories
router.get('/categories',         getAllCategories);
router.post('/categories',        createCategory);

// Coupons
router.post('/coupons',           createCoupon);

// Banners
router.get('/banners',            getBanners);
router.post('/banners',           createBanner);
router.put('/banners/:id',        updateBanner);
router.delete('/banners/:id',     deleteBanner);

// Support Tickets
router.get('/tickets',            getTickets);
router.put('/tickets/:id/resolve',resolveTicket);

module.exports = router;
