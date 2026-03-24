/**
 * Slot App — Store Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const storeController = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/auth');

// Public product routes
router.get('/products',                        storeController.getProducts);
router.get('/products/featured',               storeController.getFeaturedProducts);
router.get('/products/top-sellers',            storeController.getTopSellers);
router.get('/products/category/:category',     storeController.getProductsByCategory);
router.get('/products/:id',                    storeController.getProduct);

// Protected customer routes
router.use(protect);
router.post('/orders',                         storeController.createOrder);
router.get('/orders',                          storeController.getMyOrders);
router.get('/orders/:id',                      storeController.getOrder);
router.post('/orders/:id/cancel',              storeController.cancelOrder);
router.post('/orders/:id/pay',                 storeController.confirmPayment);
router.post('/orders/:id/return',              storeController.initiateReturn);
router.post('/products/:id/review',            storeController.addProductReview);

// Wishlist
router.get('/wishlist',                        storeController.getWishlist);
router.post('/wishlist/:productId',            storeController.toggleWishlist);

// Admin routes
router.use(authorize('admin'));
router.post('/products',                       storeController.createProduct);
router.put('/products/:id',                    storeController.updateProduct);
router.delete('/products/:id',                 storeController.deleteProduct);
router.get('/admin/orders',                    storeController.getAllOrders);
router.put('/admin/orders/:id/status',         storeController.updateOrderStatus);
router.get('/admin/inventory',                 storeController.getInventory);
router.put('/admin/inventory/:id',             storeController.updateInventory);

module.exports = router;
