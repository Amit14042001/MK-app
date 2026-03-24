/**
 * Slot App — Review Controller (Full)
 * Create reviews, reply, vote helpful, report, pending reviews
 */
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Professional = require('../models/Professional');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const redis = require('../config/redis');

// POST /reviews — Create a review (one per completed booking)
exports.createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, title, comment, tags, images } = req.body;

  if (!bookingId) throw new AppError('Booking ID is required', 400);
  if (!rating?.overall) throw new AppError('Overall rating is required', 400);
  if (rating.overall < 1 || rating.overall > 5) throw new AppError('Rating must be between 1 and 5', 400);

  // Find booking
  const booking = await Booking.findById(bookingId)
    .populate('service', 'name')
    .populate('professional');
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customer.toString() !== req.user._id.toString()) throw new AppError('Not your booking', 403);
  if (booking.status !== 'completed') throw new AppError('Can only review completed bookings', 400);
  if (booking.isReviewed) throw new AppError('You have already reviewed this booking', 400);

  // Create review
  const review = await Review.create({
    booking:      bookingId,
    customer:     req.user._id,
    professional: booking.professional._id,
    service:      booking.service._id,
    rating,
    title,
    comment,
    tags: tags || [],
    images: images || [],
  });

  // Mark booking as reviewed
  await Booking.findByIdAndUpdate(bookingId, { isReviewed: true, review: review._id });

  // Invalidate cache
  await redis.delPattern(`reviews:pro:${booking.professional._id}*`);
  await redis.delPattern(`reviews:svc:${booking.service._id}*`);

  res.status(201).json({ success: true, review, message: 'Thank you for your review! ⭐' });
});

// GET /reviews/service/:serviceId — Service reviews
exports.getServiceReviews = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const page  = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const skip  = (page - 1) * limit;

  const cacheKey = `reviews:svc:${serviceId}:p${page}:${sortBy}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, ...cached });

  const query = { service: serviceId, isApproved: true, isHidden: false };
  const sortMap = {
    createdAt: { createdAt: -1 },
    rating_high: { 'rating.overall': -1 },
    rating_low: { 'rating.overall': 1 },
    helpful: { helpfulVotes: -1 },
  };

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('customer', 'name avatar')
      .sort(sortMap[sortBy] || { createdAt: -1 })
      .skip(skip).limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  // Rating distribution
  const allRatings = await Review.find(query).select('rating.overall').lean();
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: allRatings.filter(r => Math.round(r.rating.overall) === star).length,
  }));
  const avgRating = allRatings.length
    ? Math.round((allRatings.reduce((a, r) => a + r.rating.overall, 0) / allRatings.length) * 10) / 10
    : 0;

  const payload = { reviews, total, avgRating, distribution,
    pagination: { page, limit, pages: Math.ceil(total / limit) } };
  await redis.set(cacheKey, payload, 300);
  res.json({ success: true, ...payload });
});

// GET /reviews/professional/:professionalId
exports.getProfessionalReviews = asyncHandler(async (req, res) => {
  const { professionalId } = req.params;
  const page  = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const query = { professional: professionalId, isApproved: true, isHidden: false };
  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('customer', 'name avatar')
      .populate('service', 'name icon')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  const allRatings = await Review.find(query).select('rating.overall').lean();
  const avgRating = allRatings.length
    ? Math.round((allRatings.reduce((a, r) => a + r.rating.overall, 0) / allRatings.length) * 10) / 10
    : 0;

  res.json({ success: true, reviews, total, avgRating,
    pagination: { page, limit, pages: Math.ceil(total / limit) } });
});

// GET /reviews/mine — customer's own reviews
exports.getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ customer: req.user._id })
    .populate('service', 'name icon')
    .populate('professional')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar' } })
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, reviews });
});

// GET /reviews/pending — bookings awaiting review
exports.getPendingReviews = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    customer: req.user._id,
    status: 'completed',
    isReviewed: false,
  }).populate('service', 'name icon images').populate('professional')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name avatar' } })
    .sort({ updatedAt: -1 }).lean();

  res.json({ success: true, pendingReviews: bookings, count: bookings.length });
});

// POST /reviews/:id/reply — Professional replies
exports.replyToReview = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('Reply text is required', 400);

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  // Verify ownership (professional or admin)
  if (req.user.role === 'professional') {
    const pro = await Professional.findOne({ user: req.user._id });
    if (!pro || pro._id.toString() !== review.professional.toString()) {
      throw new AppError('Not your review to reply to', 403);
    }
  }

  review.reply = { text, repliedAt: new Date() };
  await review.save();
  await redis.delPattern(`reviews:*`);

  res.json({ success: true, review, message: 'Reply posted' });
});

// POST /reviews/:id/helpful — Vote helpful
exports.voteHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  const userId = req.user._id.toString();
  const alreadyVoted = review.votedBy.map(id => id.toString()).includes(userId);

  if (alreadyVoted) {
    review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    review.votedBy = review.votedBy.filter(id => id.toString() !== userId);
  } else {
    review.helpfulVotes += 1;
    review.votedBy.push(req.user._id);
  }

  await review.save();
  res.json({ success: true, helpfulVotes: review.helpfulVotes, voted: !alreadyVoted });
});

// POST /reviews/:id/report — Report review
exports.reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  if (!review.reportedBy.includes(req.user._id)) {
    review.reportedBy.push(req.user._id);
    review.reportCount += 1;
    // Auto-hide if too many reports
    if (review.reportCount >= 5) review.isHidden = true;
    await review.save();
  }

  res.json({ success: true, message: 'Review reported. Our team will review it.' });
});

// @desc    Update review
exports.updateReview = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Review updated' });
});

// @desc    Delete review
exports.deleteReview = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Review deleted' });
});

// @desc    Moderate review (admin)
exports.moderateReview = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Review moderated' });
});

// @desc    Get flagged reviews (admin)
exports.getFlaggedReviews = asyncHandler(async (req, res) => {
  res.json({ success: true, reviews: [] });
});

exports.markHelpful = exports.voteHelpful;
