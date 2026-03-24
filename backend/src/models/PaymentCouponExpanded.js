/**
 * Slot App — Payment Model (Complete)
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  booking:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },

  amount:    { type: Number, required: true },
  currency:  { type: String, default: 'INR' },

  type: {
    type: String,
    enum: ['booking', 'refund', 'wallet_topup', 'payout', 'subscription', 'cashback', 'penalty', 'adjustment'],
    required: true,
  },
  status: {
    type:    String,
    enum:    ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
  },

  // Gateway
  gateway:          { type: String, enum: ['razorpay', 'upi', 'wallet', 'cash', 'bank', 'mock'], default: 'razorpay' },
  gatewayOrderId:   String,
  gatewayPaymentId: String,
  gatewaySignature: String,
  gatewayResponse:  mongoose.Schema.Types.Mixed,

  // Metadata
  description:  String,
  reference:    String, // bookingId, subscriptionId, etc.
  invoiceNumber:String,
  receiptUrl:   String,

  // Refund specific
  refundFor:      { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  refundReason:   String,
  refundMethod:   String,

  // Timestamps
  completedAt: Date,
  failedAt:    Date,
  refundedAt:  Date,
  failReason:  String,

  // Audit
  ipAddress:   String,
  userAgent:   String,
  metadata:    mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ gatewayOrderId: 1 }, { sparse: true });
paymentSchema.index({ gatewayPaymentId: 1 }, { sparse: true });
paymentSchema.index({ status: 1, type: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.virtual('isCredit').get(function () {
  return ['wallet_topup', 'refund', 'cashback'].includes(this.type);
});

paymentSchema.virtual('displayAmount').get(function () {
  return `${this.isCredit ? '+' : '-'}₹${Math.abs(this.amount)}`;
});

const Payment = mongoose.model('Payment', paymentSchema);

// ═══════════════════════════════════════════════════════════════
// COUPON MODEL
// ═══════════════════════════════════════════════════════════════
const couponSchema = new mongoose.Schema({
  code: {
    type:      String,
    required:  true,
    unique:    true,
    uppercase: true,
    trim:      true,
    maxlength: 20,
  },
  description: { type: String, required: true },
  title:       String,

  discountType:  { type: String, enum: ['percentage', 'flat', 'free_service'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscount:   Number, // cap on discount (for percentage type)
  minOrderValue: { type: Number, default: 0 },

  // Validity
  validFrom: { type: Date, default: Date.now },
  validTill: { type: Date, required: true },
  isActive:  { type: Boolean, default: true },

  // Usage
  usageLimit:     { type: Number, default: -1 },  // -1 = unlimited
  usedCount:      { type: Number, default: 0 },
  perUserLimit:   { type: Number, default: 1 },
  usedBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Restrictions
  applicableFor:  { type: String, enum: ['all', 'new_users', 'existing_users', 'premium', 'corporate'], default: 'all' },
  applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  minBookingCount:  Number, // min previous bookings required

  // Type
  couponType: { type: String, enum: ['public', 'private', 'referral', 'system'], default: 'public' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Display
  imageUrl:  String,
  termsUrl:  String,
  color:     String,
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, validTill: 1 });

couponSchema.methods.isValid = function (userId, orderValue = 0) {
  const now = new Date();
  if (!this.isActive)              return { valid: false, message: 'Coupon is inactive' };
  if (this.validFrom > now)        return { valid: false, message: 'Coupon is not yet active' };
  if (this.validTill < now)        return { valid: false, message: 'Coupon has expired' };
  if (this.usageLimit !== -1 && this.usedCount >= this.usageLimit)
                                   return { valid: false, message: 'Coupon usage limit reached' };
  if (orderValue < this.minOrderValue)
                                   return { valid: false, message: `Minimum order value of ₹${this.minOrderValue} required` };
  const userUsage = this.usedBy.filter(id => id.toString() === userId.toString()).length;
  if (userUsage >= this.perUserLimit)
                                   return { valid: false, message: 'You have already used this coupon' };
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (orderValue) {
  if (this.discountType === 'flat')       return Math.min(this.discountValue, orderValue);
  if (this.discountType === 'percentage') {
    const disc = Math.round(orderValue * (this.discountValue / 100));
    return this.maxDiscount ? Math.min(disc, this.maxDiscount) : disc;
  }
  return 0;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = { Payment, Coupon };
