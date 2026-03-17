/**
 * MK App — Booking Model (Complete)
 * Full schema with pricing, status history, tracking, reviews, corporate
 */
const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  note:      String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  metadata:  mongoose.Schema.Types.Mixed,
}, { _id: false });

const pricingSchema = new mongoose.Schema({
  basePrice:       { type: Number, required: true, min: 0 },
  discount:        { type: Number, default: 0 },
  couponDiscount:  { type: Number, default: 0 },
  subscriptionDiscount: { type: Number, default: 0 },
  convenienceFee:  { type: Number, default: 0 },
  taxes:           { type: Number, default: 0 },
  walletUsed:      { type: Number, default: 0 },
  totalAmount:     { type: Number, required: true },
  amountPaid:      { type: Number, default: 0 },
  refundedAmount:  { type: Number, default: 0 },
  tip:             { type: Number, default: 0 },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method:          { type: String, enum: ['online', 'cash', 'wallet', 'upi', 'card', 'netbanking', 'corporate'], default: 'online' },
  status:          { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'], default: 'pending' },
  gatewayId:       String,   // razorpay payment id
  gatewayOrderId:  String,   // razorpay order id
  paidAt:          Date,
  receiptUrl:      String,
}, { _id: false });

const trackingSchema = new mongoose.Schema({
  professionalLat:    Number,
  professionalLng:    Number,
  lastLocationUpdate: Date,
  estimatedArrival:   Date,
  actualStartTime:    Date,
  actualEndTime:      Date,
  distance:           Number, // km from professional to address
  otp:                String, // service start OTP
  otpVerified:        { type: Boolean, default: false },
}, { _id: false });

const cancellationSchema = new mongoose.Schema({
  cancelledBy:   { type: String, enum: ['customer', 'professional', 'admin', 'system'] },
  reason:        String,
  cancelledAt:   Date,
  refundAmount:  { type: Number, default: 0 },
  refundStatus:  { type: String, enum: ['pending', 'processing', 'processed', 'failed'], default: 'processed' },
  refundedAt:    Date,
}, { _id: false });

// ── Main Booking Schema ───────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  bookingId: {
    type:   String,
    unique: true,
  },

  // Parties
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', default: null },

  // Service
  service:    { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  subService: {
    name:     String,
    price:    Number,
    duration: Number,
  },
  items: [{
    name:       String,
    quantity:   { type: Number, default: 1 },
    unitPrice:  Number,
    totalPrice: Number,
  }],

  // Scheduling
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  scheduledTimeSlot: String, // display format "10:00 AM – 11:00 AM"
  duration:      { type: Number, default: 60 }, // minutes

  // Address
  address: {
    label:    String,
    line1:    { type: String, required: true },
    line2:    String,
    area:     String,
    city:     { type: String, required: true },
    state:    String,
    pincode:  { type: String, required: true },
    landmark: String,
    lat:      Number,
    lng:      Number,
  },

  // Location for geo queries
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },

  // Pricing
  pricing: { type: pricingSchema, required: true },

  // Payment
  payment: { type: paymentSchema, default: () => ({}) },

  // Status
  status: {
    type:    String,
    enum: [
      'pending',               // booking created, payment pending
      'confirmed',             // payment done, waiting for professional
      'professional_assigned', // professional matched
      'professional_arriving', // en route
      'professional_arrived',  // at location
      'in_progress',           // work started
      'completed',             // work done
      'cancelled',             // cancelled by customer/pro/admin
      'rescheduled',           // rescheduled
      'no_show',               // professional didn't show
      'disputed',              // under dispute
    ],
    default: 'pending',
  },

  // Status history
  statusHistory: { type: [statusHistorySchema], default: [] },

  // Tracking
  tracking: { type: trackingSchema, default: () => ({}) },

  // Cancellation details
  cancellation: { type: cancellationSchema },

  // Review
  review:         { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  isReviewed:     { type: Boolean, default: false },
  reviewReminderSent: { type: Boolean, default: false },

  // Coupon
  couponCode:     String,

  // Flags
  isRescheduled:    { type: Boolean, default: false },
  rescheduledFrom:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  rescheduleCount:  { type: Number, default: 0 },

  // Corporate
  corporate:        { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate' },
  bookedByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Special instructions
  specialInstructions: { type: String, maxlength: 500 },
  internalNotes:       String, // admin only

  // Matching metadata
  matchingScore:   Number,
  matchingAttempts:{ type: Number, default: 0 },
  autoMatched:     { type: Boolean, default: false },

  // Notifications sent
  notifications: {
    confirmed:          { type: Boolean, default: false },
    assigned:           { type: Boolean, default: false },
    arriving:           { type: Boolean, default: false },
    completed:          { type: Boolean, default: false },
    reviewReminder:     { type: Boolean, default: false },
    cancellationNotice: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────────
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ professional: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ location: '2dsphere' });
bookingSchema.index({ 'address.pincode': 1, scheduledDate: 1 });

// ── Virtual: durationHuman ────────────────────────────────────
bookingSchema.virtual('durationHuman').get(function () {
  const h = Math.floor(this.duration / 60);
  const m = this.duration % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
});

// ── Virtual: isUpcoming ───────────────────────────────────────
bookingSchema.virtual('isUpcoming').get(function () {
  return ['pending', 'confirmed', 'professional_assigned', 'professional_arriving'].includes(this.status)
    && this.scheduledDate > new Date();
});

// ── Virtual: canBeCancelled ───────────────────────────────────
bookingSchema.virtual('canBeCancelled').get(function () {
  return !['completed', 'cancelled', 'no_show'].includes(this.status);
});

// ── Virtual: canBeRescheduled ─────────────────────────────────
bookingSchema.virtual('canBeRescheduled').get(function () {
  return !['completed', 'cancelled', 'in_progress', 'no_show'].includes(this.status)
    && this.rescheduleCount < 2;
});

// ── Pre-save: Auto-generate bookingId ────────────────────────
bookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random    = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.bookingId  = `BK${timestamp}${random}`;
  }
  // Set location from address
  if (this.address?.lat && this.address?.lng && (!this.location?.coordinates?.[0])) {
    this.location = { type: 'Point', coordinates: [this.address.lng, this.address.lat] };
  }
  next();
});

// ── Static: Get customer stats ───────────────────────────────
bookingSchema.statics.getCustomerStats = async function (customerId) {
  const [stats] = await this.aggregate([
    { $match: { customer: customerId } },
    {
      $group: {
        _id:       null,
        total:     { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        spent:     { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$pricing.totalAmount', 0] } },
      },
    },
  ]);
  return stats || { total: 0, completed: 0, cancelled: 0, spent: 0 };
};

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
