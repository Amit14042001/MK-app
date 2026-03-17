/**
 * MK App — Addresses Routes (Full CRUD)
 */
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

router.use(protect);

// GET /addresses — list all addresses
router.get('/', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
}));

// POST /addresses — add new address
router.post('/', asyncHandler(async (req, res) => {
  const { label, line1, line2, area, city, state, pincode, landmark, lat, lng, isDefault } = req.body;
  if (!line1 || !city || !pincode) throw new AppError('line1, city, and pincode are required', 400);

  const user = await User.findById(req.user._id);

  // If new address is default, unset old defaults
  if (isDefault) {
    user.addresses.forEach(a => { a.isDefault = false; });
  }
  // First address is always default
  const setDefault = isDefault || user.addresses.length === 0;

  user.addresses.push({ label: label || 'Home', line1, line2, area, city, state, pincode, landmark, lat, lng, isDefault: setDefault });
  await user.save();

  const added = user.addresses[user.addresses.length - 1];
  res.status(201).json({ success: true, address: added });
}));

// PUT /addresses/:addressId — update address
router.put('/:addressId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found', 404);

  const { label, line1, line2, area, city, state, pincode, landmark, lat, lng, isDefault } = req.body;
  if (label)    address.label    = label;
  if (line1)    address.line1    = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (area !== undefined)  address.area  = area;
  if (city)     address.city     = city;
  if (state)    address.state    = state;
  if (pincode)  address.pincode  = pincode;
  if (landmark !== undefined) address.landmark = landmark;
  if (lat)      address.lat      = lat;
  if (lng)      address.lng      = lng;

  if (isDefault) {
    user.addresses.forEach(a => { a.isDefault = false; });
    address.isDefault = true;
  }

  await user.save();
  res.json({ success: true, address });
}));

// DELETE /addresses/:addressId
router.delete('/:addressId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found', 404);

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Reassign default to first remaining address
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  res.json({ success: true, message: 'Address removed' });
}));

// PUT /addresses/:addressId/default — set as default
router.put('/:addressId/default', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found', 404);

  user.addresses.forEach(a => { a.isDefault = false; });
  address.isDefault = true;

  await user.save();
  res.json({ success: true, message: 'Default address updated', address });
}));

module.exports = router;
