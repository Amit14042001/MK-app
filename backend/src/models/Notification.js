const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: [
      'booking_confirmed', 'booking_cancelled', 'booking_completed',
      'booking_rescheduled', 'booking_reminder',
      'professional_assigned', 'professional_arriving', 'professional_arrived',
      'payment_success', 'payment_failed', 'refund_processed',
      'review_reminder', 'offer', 'promo', 'system',
      'subscription_activated', 'subscription_expiring', 'subscription_expired',
      'wallet_credit', 'wallet_debit',
      'referral_joined', 'referral_bonus',
      'account_verified', 'password_changed',
    ],
    required: true,
  },
  title:   { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  imageUrl: String,
  deepLink: String,
  data: mongoose.Schema.Types.Mixed,
  isRead:    { type: Boolean, default: false },
  readAt:    Date,
  isDeleted: { type: Boolean, default: false },
  channels: {
    push:      { sent: Boolean, sentAt: Date, error: String },
    sms:       { sent: Boolean, sentAt: Date },
    email:     { sent: Boolean, sentAt: Date },
    whatsapp:  { sent: Boolean, sentAt: Date },
  },
  scheduledFor: Date,
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  relatedBooking:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',  default: null },
  relatedService:  { type: mongoose.Schema.Types.ObjectId, ref: 'Service',  default: null },
  relatedPayment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Payment',  default: null },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isDeleted: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
