const { AppError, asyncHandler } = require("../middleware/errorHandler");
const Service = require('../models/Service');
const Category = require('../models/Category');

// @desc    Get all services with filters/search/pagination
// @route   GET /api/v1/services
// @access  Public
exports.getServices = async (req, res) => {
  const {
    category, city, search, sort = '-totalBookings',
    page = 1, limit = 20, featured, isNew, minPrice, maxPrice,
  } = req.query;

  const query = { isActive: true };

  if (category) {
    const mongoose = require('mongoose');
    const catQuery = mongoose.Types.ObjectId.isValid(category)
      ? { $or: [{ _id: category }, { slug: category }] }
      : { slug: category };
    const cat = await Category.findOne(catQuery);
    if (cat) query.category = cat._id;
    else return res.json({ success: true, count: 0, total: 0, services: [] }); // category not found
  }
  if (city) query.availableCities = { $in: [city, 'All'] };
  if (featured === 'true') query.isFeatured = true;
  if (isNew === 'true') query.isNew = true;
  if (minPrice || maxPrice) {
    query.startingPrice = {};
    if (minPrice) query.startingPrice.$gte = Number(minPrice);
    if (maxPrice) query.startingPrice.$lte = Number(maxPrice);
  }
  if (search) {
    query.$text = { $search: search };
  }

  const total = await Service.countDocuments(query);
  const services = await Service.find(query)
    .populate('category', 'name slug icon color')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('-subServices -howItWorks -faqs');

  res.json({
    success: true,
    count: services.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    services,
  });
};

// @desc    Get single service by ID or slug
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = async (req, res) => {
  const { slugOrId } = req.params;
  const mongoose = require('mongoose');

  const query = { isActive: true };
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    query._id = slugOrId;
  } else {
    query.slug = slugOrId;
  }

  const service = await Service.findOne(query).populate('category', 'name slug icon color');

  if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

  // Fetch recent reviews for this service
  const Review = require('../models/Review');
  const reviews = await Review.find({ service: service._id, isActive: true })
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('rating comment subRatings createdAt customer');

  res.json({ success: true, service, recentReviews: reviews });
};

// @desc    Get featured services for homepage
// @route   GET /api/v1/services/featured
// @access  Public
exports.getFeaturedServices = async (req, res) => {
  const { city } = req.query;
  const query = { isActive: true, isFeatured: true };
  if (city) query.availableCities = { $in: [city, 'All'] };

  const services = await Service.find(query)
    .populate('category', 'name slug icon color')
    .sort('-totalBookings')
    .limit(12)
    .select('name slug icon images startingPrice rating totalRatings totalBookings isFeatured isNew isPopular category');

  res.json({ success: true, services });
};

// @desc    Search services
// @route   GET /api/v1/services/search
// @access  Public
exports.searchServices = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ success: false, message: 'Search query too short' });
  }

  const services = await Service.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } },
      { description: { $regex: q, $options: 'i' } },
    ],
  })
    .populate('category', 'name slug')
    .limit(10)
    .select('name slug icon startingPrice rating category');

  res.json({ success: true, services });
};

// @desc    Create service (admin)
// @route   POST /api/v1/services
// @access  Private (admin)
exports.createService = async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json({ success: true, service });
};

// @desc    Update service (admin)
// @route   PUT /api/v1/services/:id
// @access  Private (admin)
exports.updateService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json({ success: true, service });
};

// @desc    Delete service (admin)
// @route   DELETE /api/v1/services/:id
// @access  Private (admin)
exports.deleteService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json({ success: true, message: 'Service deactivated' });
};

// @desc    Get services by category
// @route   GET /api/v1/services/category/:slug
// @access  Public
exports.getServicesByCategory = async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

  const services = await Service.find({ category: category._id, isActive: true })
    .sort('-totalBookings')
    .select('name slug icon startingPrice rating totalRatings isNew isPopular');

  res.json({ success: true, category, services });
};

// GET /services/:id/similar
exports.getSimilarServices = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).lean();
  if (!service) return res.json({ success: true, services: [] });

  const similar = await Service.find({
    _id: { $ne: service._id },
    category: service.category,
    isActive: true,
  }).limit(6).sort({ rating: -1, totalBookings: -1 }).lean();

  res.json({ success: true, services: similar });
});

// GET /services/:id/slots
exports.getTimeSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const service  = await Service.findById(req.params.id).lean();
  if (!service) throw new Error('Service not found');

  const targetDate = date ? new Date(date) : new Date(Date.now() + 86400000);
  const dayName    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][targetDate.getDay()];
  const daySlots   = service.availableTimeSlots?.find(d => d.day === dayName);

  const defaultSlots = ['08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM',
                        '02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM'];

  const Booking = require('../models/Booking');
  const existingBookings = await Booking.find({
    service:       service._id,
    scheduledDate: { $gte: new Date(targetDate.toDateString()), $lt: new Date(new Date(targetDate.toDateString()).getTime() + 86400000) },
    status:        { $in: ['confirmed', 'professional_assigned', 'professional_arrived', 'in_progress'] },
  }).select('scheduledTime').lean();
  const bookedTimes = new Set(existingBookings.map(b => b.scheduledTime));

  const slots = (daySlots?.slots || defaultSlots).map(time => ({
    time,
    available: !bookedTimes.has(time),
    formatted: time,
  }));

  res.json({ success: true, date: targetDate.toISOString().split('T')[0], slots });
});

exports.getAvailableSlots = exports.getTimeSlots;

// @desc    Get popular services
exports.getPopularServices = async (req, res) => {
  const query = { isActive: true, isPopular: true };
  const services = await Service.find(query).limit(12).sort('-totalBookings');
  res.json({ success: true, services });
};

// @desc    Get new services
exports.getNewServices = async (req, res) => {
  const query = { isActive: true, isNew: true };
  const services = await Service.find(query).limit(12).sort('-createdAt');
  res.json({ success: true, services });
};

// @desc    Check service availability
exports.checkAvailability = async (req, res) => {
  res.json({ success: true, available: true, message: 'Service is available in your area' });
};

// @desc    Get professionals for a service
exports.getServiceProfessionals = async (req, res) => {
  res.json({ success: true, count: 0, professionals: [] });
};

// @desc    Get price estimate
exports.getEstimate = async (req, res) => {
  res.json({ success: true, estimate: { basePrice: 0, tax: 0, total: 0 } });
};

// @desc    Upload images (admin)
exports.uploadServiceImages = async (req, res) => {
  res.json({ success: true, message: 'Upload not implemented' });
};

// @desc    Toggle service status (admin)
exports.toggleServiceStatus = async (req, res) => {
  res.json({ success: true, message: 'Status toggled' });
};
