/**
 * Slot App — Gift Cards Routes (Full)
 */
const express = require('express');
const router = express.Router();
const { GiftCard } = require('../models/AllModels');
const { protect } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

function generateGiftCode() {
  return 'Slot' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Buy a gift card
router.post('/', protect, asyncHandler(async (req, res) => {
  const { amount, recipientName, recipientPhone, personalMessage, design } = req.body;
  if (!amount || ![250, 500, 1000, 2000, 5000].includes(Number(amount))) throw new AppError('Invalid gift card amount', 400);
  if (!recipientName || !recipientPhone) throw new AppError('Recipient name and phone required', 400);

  const giftCard = await GiftCard.create({
    code: generateGiftCode(),
    purchasedBy: req.user._id,
    recipientName, recipientPhone, personalMessage,
    amount: Number(amount),
    balance: Number(amount),
    design: design || 'classic',
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  // Send SMS to recipient
  try {
    const { sendSMS } = require('../utils/sms');
    await sendSMS(
      recipientPhone,
      `🎁 You've received a ₹${amount} Slot App Gift Card from ${senderName || 'a friend'}! Code: ${giftCard.code}. Valid 1 year. Download Slot App to redeem. -Slot Services`
    );
  } catch (smsErr) {
    console.warn('[GiftCard] SMS notification failed (non-fatal):', smsErr.message);
  }
  res.status(201).json({ success: true, data: giftCard });
}));

// Get my gift cards (purchased)
router.get('/my-cards', protect, asyncHandler(async (req, res) => {
  const cards = await GiftCard.find({ purchasedBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: cards });
}));

// Check gift card balance
router.get('/check/:code', asyncHandler(async (req, res) => {
  const card = await GiftCard.findOne({ code: req.params.code.toUpperCase() });
  if (!card) throw new AppError('Invalid gift card code', 404);
  res.json({ success: true, data: { code: card.code, balance: card.balance, status: card.status, expiresAt: card.expiresAt, recipientName: card.recipientName } });
}));

// Redeem a gift card
router.post('/redeem', protect, asyncHandler(async (req, res) => {
  const { code, amount, bookingId } = req.body;
  if (!code || !amount) throw new AppError('Code and amount required', 400);

  const card = await GiftCard.findOne({ code: code.toUpperCase(), status: { $in: ['active', 'partially_used'] } });
  if (!card) throw new AppError('Invalid or already used gift card', 404);
  if (card.expiresAt < new Date()) throw new AppError('Gift card has expired', 400);
  if (card.balance < Number(amount)) throw new AppError(`Insufficient balance. Available: ₹${card.balance}`, 400);

  card.balance -= Number(amount);
  card.redeemedBy = req.user._id;
  card.redeemedAt = new Date();
  card.status = card.balance === 0 ? 'fully_used' : 'partially_used';
  card.transactions.push({ amount: Number(amount), bookingId, usedAt: new Date() });
  await card.save();

  res.json({ success: true, data: { redeemed: Number(amount), remainingBalance: card.balance, status: card.status } });
}));

module.exports = router;
