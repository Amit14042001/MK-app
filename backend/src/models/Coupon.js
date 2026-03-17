const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscount: Number, // cap for percentage discounts
  minOrderAmount: { type: Number, default: 0 },

  // Usage limits
  totalUsageLimit: { type: Number, default: null }, // null = unlimited
  perUserLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Validity
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true },

  // Restrictions
  applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  applicableCities: [String],
  newUsersOnly: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

couponSchema.methods.isValid = function (userId, orderAmount) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (now < this.validFrom) return { valid: false, message: 'Coupon not yet active' };
  if (now > this.validUntil) return { valid: false, message: 'Coupon has expired' };
  if (this.totalUsageLimit && this.usedCount >= this.totalUsageLimit) return { valid: false, message: 'Coupon usage limit reached' };
  if (orderAmount < this.minOrderAmount) return { valid: false, message: `Minimum order ₹${this.minOrderAmount} required` };
  if (this.usedBy.includes(userId)) return { valid: false, message: 'You have already used this coupon' };
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (amount) {
  if (this.discountType === 'percentage') {
    const discount = (amount * this.discountValue) / 100;
    return this.maxDiscount ? Math.min(discount, this.maxDiscount) : discount;
  }
  return Math.min(this.discountValue, amount);
};

module.exports = mongoose.model('Coupon', couponSchema);
