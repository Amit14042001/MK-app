/**
 * MK App — Service Model (Complete)
 */
const mongoose = require('mongoose');

const subServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: String,
  price:       { type: Number, required: true, min: 0 },
  discountedPrice: Number,
  duration:    { type: Number, required: true }, // minutes
  isActive:    { type: Boolean, default: true },
  isPopular:   { type: Boolean, default: false },
  image:       String,
  includes:    [String],
}, { _id: true });

const serviceSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: [true, 'Service name is required'],
    trim:     true,
    maxlength:[100, 'Name cannot exceed 100 chars'],
  },
  slug: {
    type:   String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim:   true,
  },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true, maxlength: 2000 },
  shortDesc:   { type: String, maxlength: 200 },

  // Pricing
  startingPrice:   { type: Number, required: true, min: [0, 'Price cannot be negative'] },
  discountedPrice: Number,
  priceLabel:      { type: String, default: 'Starting at' }, // "Starting at" / "Fixed"

  // Timing
  duration:    { type: Number, required: true }, // minutes
  durationLabel: String, // "60-90 mins"

  // Media
  images:   [String],
  icon:     { type: String, default: '🔧' },
  videoUrl: String,

  // Sub-services / variants
  subServices: { type: [subServiceSchema], default: [] },

  // Content
  inclusions:  [String],
  exclusions:  [String],
  howItWorks:  [{ step: Number, title: String, description: String }],
  safetyTips:  [String],
  faq:         [{ question: String, answer: String }],
  warranty:    String,

  // Stats
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:  { type: Number, default: 0 },
  totalBookings:{ type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 }, // alias

  // Flags
  isActive:   { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isPopular:  { type: Boolean, default: false },
  isNew:      { type: Boolean, default: false },

  // SEO
  tags:       [String],
  keywords:   [String],
  metaTitle:  String,
  metaDesc:   String,

  // Availability
  availablePincodes: [String],
  unavailableDates:  [Date],
  minAdvanceBooking: { type: Number, default: 1 },  // hours
  maxAdvanceBooking: { type: Number, default: 720 }, // hours (30 days)
  timeSlots: [{
    label: String,
    start: String,
    end:   String,
    isAvailable: { type: Boolean, default: true },
  }],

  // Subscription discount
  silverDiscount:   { type: Number, default: 5 },
  goldDiscount:     { type: Number, default: 10 },
  platinumDiscount: { type: Number, default: 15 },

  order: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });
serviceSchema.index({ isFeatured: 1, isActive: 1 });
serviceSchema.index({ rating: -1, totalBookings: -1 });
serviceSchema.index({ slug: 1 }, { unique: true, sparse: true });

serviceSchema.virtual('discountPct').get(function () {
  if (!this.discountedPrice || !this.startingPrice) return 0;
  return Math.round(((this.startingPrice - this.discountedPrice) / this.startingPrice) * 100);
});

serviceSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

const Service = mongoose.model('Service', serviceSchema);

// ═══════════════════════════════════════════════════════════════
// REVIEW MODEL
// ═══════════════════════════════════════════════════════════════
const reviewSchema = new mongoose.Schema({
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',      required: true, unique: true },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  service:      { type: mongoose.Schema.Types.ObjectId, ref: 'Service',      required: true },

  // Ratings
  rating:            { type: Number, required: true, min: 1, max: 5 },
  punctualityRating: { type: Number, min: 1, max: 5 },
  qualityRating:     { type: Number, min: 1, max: 5 },
  behaviourRating:   { type: Number, min: 1, max: 5 },
  cleanlinessRating: { type: Number, min: 1, max: 5 },

  comment: { type: String, maxlength: 1000 },
  images:  [String],

  // Pro reply
  proReply:     String,
  proRepliedAt: Date,

  // Moderation
  isApproved:    { type: Boolean, default: true },
  isHidden:      { type: Boolean, default: false },
  hiddenReason:  String,
  reportedCount: { type: Number, default: 0 },

  // Helpful votes
  helpfulVotes: { type: Number, default: 0 },
  voters:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Source
  source:    { type: String, enum: ['app', 'web', 'admin'], default: 'app' },
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

reviewSchema.index({ professional: 1, createdAt: -1 });
reviewSchema.index({ service: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ rating: -1 });

reviewSchema.virtual('ratingLabel').get(function () {
  const labels = { 5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Poor', 1: 'Terrible' };
  return labels[this.rating] || 'Unknown';
});

// Update professional rating after review saved
reviewSchema.post('save', async function () {
  try {
    const Professional = mongoose.model('Professional');
    const stats = await mongoose.model('Review').aggregate([
      { $match: { professional: this.professional, isApproved: true, isHidden: false } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      await Professional.findByIdAndUpdate(this.professional, {
        rating:      Math.round(stats[0].avg * 10) / 10,
        reviewCount: stats[0].count,
      });
    }
    // Update service rating
    const svcStats = await mongoose.model('Review').aggregate([
      { $match: { service: this.service, isApproved: true } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (svcStats[0]) {
      await Service.findByIdAndUpdate(this.service, {
        rating:      Math.round(svcStats[0].avg * 10) / 10,
        reviewCount: svcStats[0].count,
      });
    }
  } catch (e) {
    console.error('[Review] Post-save rating update failed:', e.message);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = { Service, Review };
