/**
 * MK App — Professional Model (Complete)
 * Full schema: services, availability, earnings, documents, ratings
 */
const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────
const serviceOfferingSchema = new mongoose.Schema({
  serviceId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  name:          String,
  isAvailable:   { type: Boolean, default: true },
  priceOverride: Number,   // null = use service default
  experienceYrs: Number,
  specialNote:   String,
}, { _id: false });

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun
  startTime: String, // "08:00"
  endTime:   String, // "20:00"
  isActive:  { type: Boolean, default: true },
}, { _id: false });

const blockedSlotSchema = new mongoose.Schema({
  date:      { type: Date, required: true },
  timeSlots: [String],
  reason:    String,
  isFullDay: { type: Boolean, default: false },
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  type:       { type: String, enum: ['aadhaar', 'pan', 'police_clearance', 'skill_cert', 'bank', 'selfie', 'other'] },
  url:        String,
  number:     String, // document ID/number
  status:     { type: String, enum: ['pending', 'uploaded', 'verified', 'rejected'], default: 'pending' },
  rejectionReason: String,
  verifiedAt: Date,
  expiresAt:  Date,
}, { timestamps: true });

const bankDetailsSchema = new mongoose.Schema({
  accountNumber: String,
  ifscCode:      String,
  accountHolder: String,
  bankName:      String,
  branchName:    String,
  isVerified:    { type: Boolean, default: false },
  verifiedAt:    Date,
}, { _id: false });

const earningsSchema = new mongoose.Schema({
  total:          { type: Number, default: 0 },
  pending:        { type: Number, default: 0 },  // not yet paid out
  paid:           { type: Number, default: 0 },  // paid out
  thisWeek:       { type: Number, default: 0 },
  thisMonth:      { type: Number, default: 0 },
  lastPayout:     Number,
  lastPayoutDate: Date,
  platformFeeTotal: { type: Number, default: 0 },
}, { _id: false });

// ── Main Professional Schema ──────────────────────────────────
const professionalSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId: { type: String, unique: true, sparse: true },

  // Profile
  bio:           { type: String, maxlength: 500 },
  profilePhoto:  String,
  coverPhoto:    String,
  tagline:       String, // short one-liner
  languages:     [String],
  experience:    { type: Number, default: 0, min: 0 }, // years
  education:     String,

  // Documents
  documents: { type: [documentSchema], default: [] },
  bankDetails: bankDetailsSchema,

  // Services offered
  services:  { type: [serviceOfferingSchema], default: [] },

  // Service areas
  serviceAreas: [String], // pincodes
  serviceCities:[String],
  maxTravelKm:  { type: Number, default: 15 },

  // Location
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  locationUpdatedAt: Date,

  // Availability
  availability: {
    isAvailable:  { type: Boolean, default: true },
    unavailableReason: String,
    unavailableTill:   Date,
  },
  weeklySchedule: { type: [availabilitySlotSchema], default: [
    { dayOfWeek: 1, startTime: '08:00', endTime: '20:00', isActive: true },
    { dayOfWeek: 2, startTime: '08:00', endTime: '20:00', isActive: true },
    { dayOfWeek: 3, startTime: '08:00', endTime: '20:00', isActive: true },
    { dayOfWeek: 4, startTime: '08:00', endTime: '20:00', isActive: true },
    { dayOfWeek: 5, startTime: '08:00', endTime: '20:00', isActive: true },
    { dayOfWeek: 6, startTime: '08:00', endTime: '18:00', isActive: true },
  ]},
  blockedSlots: { type: [blockedSlotSchema], default: [] },

  // Active booking
  activeBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },

  // Verification
  verificationStatus: {
    type:    String,
    enum:    ['pending', 'under_review', 'verified', 'rejected', 'suspended'],
    default: 'pending',
  },
  verifiedAt:       Date,
  verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason:  String,
  isActive:         { type: Boolean, default: false }, // only true after verification
  isSuspended:      { type: Boolean, default: false },
  suspensionReason: String,
  suspendedTill:    Date,

  // Rating & Reviews
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  ratingBreakdown: {
    5: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    1: { type: Number, default: 0 },
  },

  // Stats
  totalBookings:    { type: Number, default: 0 },
  completedBookings:{ type: Number, default: 0 },
  cancelledBookings:{ type: Number, default: 0 },
  noShowCount:      { type: Number, default: 0 },
  acceptanceRate:   { type: Number, default: 100 }, // percentage
  avgResponseTime:  { type: Number, default: 0 },   // minutes
  completionRate:   { type: Number, default: 100 },

  // Earnings
  earnings: { type: earningsSchema, default: () => ({}) },

  // Certificates & Training
  certificates: [{
    courseId:    String,
    courseName:  String,
    issuedAt:    Date,
    expiresAt:   Date,
    badgeUrl:    String,
  }],

  // Tags & Keywords for search
  tags:     [String],
  keywords: [String],

  // Joining
  joinedAt:         Date,
  lastActiveAt:     { type: Date, default: Date.now },
  onboardingComplete: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────────
professionalSchema.index({ location: '2dsphere' });
professionalSchema.index({ user: 1 }, { unique: true });
professionalSchema.index({ verificationStatus: 1, isActive: 1 });
professionalSchema.index({ 'availability.isAvailable': 1, isActive: 1 });
professionalSchema.index({ serviceAreas: 1 });
professionalSchema.index({ rating: -1 });
professionalSchema.index({ totalBookings: -1 });
professionalSchema.index({ createdAt: -1 });

// ── Virtual: completionRatePct ────────────────────────────────
professionalSchema.virtual('completionRatePct').get(function () {
  if (this.totalBookings === 0) return 100;
  return Math.round((this.completedBookings / this.totalBookings) * 100);
});

// ── Virtual: isCurrentlyAvailable ────────────────────────────
professionalSchema.virtual('isCurrentlyAvailable').get(function () {
  if (!this.isActive || !this.availability.isAvailable) return false;
  if (this.activeBooking) return false;
  if (this.availability.unavailableTill && this.availability.unavailableTill > new Date()) return false;
  return true;
});

// ── Method: Update rating after new review ───────────────────
professionalSchema.methods.updateRating = async function (newRating) {
  const total   = this.rating * this.reviewCount + newRating;
  this.reviewCount += 1;
  this.rating       = Math.round((total / this.reviewCount) * 10) / 10;
  if (this.ratingBreakdown && this.ratingBreakdown[newRating] !== undefined) {
    this.ratingBreakdown[newRating] += 1;
  }
  return this.save();
};

// ── Method: Check if available for date/time ─────────────────
professionalSchema.methods.isAvailableAt = function (date, timeSlot) {
  if (!this.isCurrentlyAvailable) return false;
  const dayOfWeek = new Date(date).getDay();
  const schedule  = this.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
  if (!schedule) return false;

  const blocked = this.blockedSlots.find(b => {
    const sameDay = b.date.toDateString() === new Date(date).toDateString();
    return sameDay && (b.isFullDay || b.timeSlots.includes(timeSlot));
  });
  return !blocked;
};

// ── Method: Add earnings ──────────────────────────────────────
professionalSchema.methods.addEarnings = async function (amount) {
  this.earnings.total    += amount;
  this.earnings.pending  += amount;
  this.earnings.thisMonth += amount;
  this.earnings.thisWeek  += amount;
  return this.save();
};

// ── Static: Find near location ────────────────────────────────
professionalSchema.statics.findNearby = function (lng, lat, radiusKm = 15, filters = {}) {
  return this.find({
    ...filters,
    isActive: true,
    verificationStatus: 'verified',
    'availability.isAvailable': true,
    location: {
      $nearSphere: {
        $geometry:    { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).populate('user', 'name avatar phone');
};

const Professional = mongoose.model('Professional', professionalSchema);
module.exports = Professional;
