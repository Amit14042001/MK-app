/**
 * Slot App — Review Model (Full)
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  service:      { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

  rating: {
    overall:       { type: Number, required: true, min: 1, max: 5 },
    punctuality:   { type: Number, min: 1, max: 5 },
    quality:       { type: Number, min: 1, max: 5 },
    behaviour:     { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
  },
  title:   { type: String, trim: true, maxlength: 100 },
  comment: { type: String, trim: true, maxlength: 1000 },
  images:  [String],
  tags: [{ type: String, enum: [
    'Great work', 'On time', 'Very professional', 'Good value',
    'Clean & tidy', 'Would recommend', 'Friendly', 'Expert',
  ]}],

  reply: { text: String, repliedAt: Date },

  isApproved:   { type: Boolean, default: true },
  isFeatured:   { type: Boolean, default: false },
  isHidden:     { type: Boolean, default: false },
  reportCount:  { type: Number, default: 0 },
  reportedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  helpfulVotes: { type: Number, default: 0 },
  votedBy:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// After save, recalculate professional and service average ratings
reviewSchema.post('save', async function () {
  try {
    const reviews = await mongoose.model('Review').find({ professional: this.professional });
    const avg = reviews.length
      ? Math.round((reviews.reduce((a, r) => a + r.rating.overall, 0) / reviews.length) * 10) / 10
      : 0;
    await mongoose.model('Professional').findByIdAndUpdate(this.professional, {
      rating: avg, totalRatings: reviews.length,
    });

    const svcReviews = await mongoose.model('Review').find({ service: this.service });
    const svcAvg = svcReviews.length
      ? Math.round((svcReviews.reduce((a, r) => a + r.rating.overall, 0) / svcReviews.length) * 10) / 10
      : 0;
    await mongoose.model('Service').findByIdAndUpdate(this.service, {
      rating: svcAvg, totalRatings: svcReviews.length,
    });
  } catch (err) { console.error('[Review post-save]', err.message); }
});

reviewSchema.index({ professional: 1, createdAt: -1 });
reviewSchema.index({ service: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ isApproved: 1, isFeatured: 1 });

module.exports = mongoose.model('Review', reviewSchema);
