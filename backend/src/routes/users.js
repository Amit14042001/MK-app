/**
 * Slot App — Users Routes (Full)
 */
const express = require('express');
const router  = express.Router();
const {
  getProfile, updateProfile, updateFCMToken,
  addAddress, updateAddress, deleteAddress,
  getWallet, addWalletMoney,
  toggleSavedService, getSavedServices,
  getUserStats, applyReferralCode, deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Profile
router.get('/profile',                 getProfile);
router.put('/profile',                 updateProfile);
router.put('/profile/fcm-token',       updateFCMToken);
router.delete('/account',              deleteAccount);

// Stats
router.get('/stats',                   getUserStats);

// Wallet
router.get('/wallet',                  getWallet);
router.post('/wallet/add',             addWalletMoney);

// Addresses
router.post('/addresses',              addAddress);
router.put('/addresses/:addressId',    updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

// Saved services
router.get('/saved-services',          getSavedServices);
router.post('/saved-services/:serviceId', toggleSavedService);

// Referral
router.post('/apply-referral',         applyReferralCode);

module.exports = router;
