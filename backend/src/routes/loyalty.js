/**
 * Slot App — Loyalty Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile',               loyaltyController.getLoyaltyProfile);
router.get('/history',               loyaltyController.getLoyaltyHistory);
router.get('/rewards',               loyaltyController.getAvailableRewards);
router.post('/redeem',               loyaltyController.redeemPoints);
router.post('/rewards/:rewardId/claim', loyaltyController.claimReward);
router.get('/tiers',                 loyaltyController.getTierInfo);
router.get('/leaderboard',           loyaltyController.getLoyaltyLeaderboard);
router.post('/earn',                 loyaltyController.earnPoints);    // internal use
router.get('/expiring',              loyaltyController.getExpiringPoints);

module.exports = router;
