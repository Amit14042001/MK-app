/**
 * MK App — Referrals Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const referralController = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/my-code',         referralController.getMyReferralCode);
router.get('/stats',           referralController.getReferralStats);
router.get('/history',         referralController.getReferralHistory);
router.post('/apply',          referralController.applyReferralCode);
router.post('/share',          referralController.generateShareLink);
router.get('/leaderboard',     referralController.getReferralLeaderboard);
router.post('/process-reward', referralController.processReferralReward);

// Professional referral program
router.get('/pro-referrals',   referralController.getProReferrals);
router.post('/refer-pro',      referralController.referProfessional);

module.exports = router;
