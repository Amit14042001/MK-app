const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },

  // Parties
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', default: null },

  // Service Details
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  subService: {
    name: String,
    price: Number,
    duration: Number,
  },
  items: [{
    name: String,
    quantity: { type: Number, default: 1 },
    unitPrice: Number,
    totalPrice: Number,
  }],

  // Scheduling
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true }, // e.g. "10:00 AM"
  duration: { type: Number, default: 60 }, // minutes

  // Address
  address: {
    label: String,
    line1: String,
    line2: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    lat: Number,
    lng: Number,
  },

  // Pricing
  pricing: {
    basePrice: Number,
    discount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    convenienceFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    walletUsed: { type: Number, default: 0 },
    totalAmount: Number,
    amountPaid: { type: Number, default: 0 },
  },
  couponCode: String,

  // Status Flow
  // pending → confirmed → professional_assigned → professional_arriving
  // → professional_arrived → in_progress → completed → cancelled
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'professional_assigned',
      'professional_arriving',
      'professional_arrived',
      'in_progress',
      'completed',
      'cancelled',
      'rescheduled',
      'no_show',
    ],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],

  // Cancellation
  cancellation: {
    cancelledBy: { type: String, enum: ['customer', 'professional', 'admin'] },
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  },

  // Payment
  payment: {
    method: { type: String, enum: ['online', 'cash', 'wallet', 'mixed'] },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'], default: 'pending' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date,
  },

  // Tracking
  tracking: {
    professionalLat: Number,
    professionalLng: Number,
    distanceToCustomer: Number, // km
    estimatedArrival: Date,
    actualStartTime: Date,
    actualEndTime: Date,
  },

  // Review
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },
  isReviewed: { type: Boolean, default: false },

  // Special
  specialInstructions: String,
  isRescheduled: { type: Boolean, default: false },
  originalBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

  // Notifications sent
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate booking ID
bookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    const prefix = 'MK';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingId = `${prefix}${timestamp}${random}`;
  }
  next();
});

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ professional: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });
bookingSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
