const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  amount: { type: Number, required: true }, // in paise for Razorpay
  currency: { type: String, default: 'INR' },

  method: {
    type: String,
    enum: ['razorpay', 'cash', 'wallet', 'upi', 'card', 'netbanking'],
    required: true,
  },

  // Razorpay details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'created',
  },

  // Refund
  refund: {
    razorpayRefundId: String,
    amount: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'processed', 'failed'] },
    processedAt: Date,
  },

  // Invoice
  invoiceNumber: String,
  invoiceUrl: String,

  metadata: mongoose.Schema.Types.Mixed,
  failureReason: String,
  paidAt: Date,
}, { timestamps: true });

paymentSchema.pre('save', function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = 'INV-Slot-' + Date.now().toString().slice(-8);
  }
  next();
});

paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
