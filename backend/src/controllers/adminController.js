const { AppError, asyncHandler } = require("../middleware/errorHandler");
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Professional = require('../models/Professional');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');

// @desc    Admin dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private (admin)
exports.getDashboardStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const [
    totalUsers, newUsersToday, totalProfessionals,
    totalBookings, bookingsToday, bookingsThisMonth,
    completedBookings, pendingBookings, cancelledBookings,
    totalRevenue, revenueToday, revenueThisMonth,
    totalServices, activeServices,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: today } }),
    Professional.countDocuments({ isVerified: true }),
    Booking.countDocuments(),
    Booking.countDocuments({ createdAt: { $gte: today } }),
    Booking.countDocuments({ createdAt: { $gte: thisMonth } }),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: { $in: ['pending', 'confirmed', 'professional_assigned'] } }),
    Booking.countDocuments({ status: 'cancelled' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Service.countDocuments(),
    Service.countDocuments({ isActive: true }),
  ]);

  // Revenue by day for last 7 days
  const revenueChart = await Payment.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: new Date(today - 7 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' }, bookings: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Top services
  const topServices = await Booking.aggregate([
    { $group: { _id: '$service', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
    { $unwind: '$service' },
    { $project: { name: '$service.name', icon: '$service.icon', count: 1 } },
  ]);

  res.json({
    success: true,
    stats: {
      users: { total: totalUsers, newToday: newUsersToday },
      professionals: { total: totalProfessionals },
      bookings: {
        total: totalBookings, today: bookingsToday, thisMonth: bookingsThisMonth,
        completed: completedBookings, pending: pendingBookings, cancelled: cancelledBookings,
        completionRate: totalBookings ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0,
      },
      revenue: {
        total: (totalRevenue[0]?.total || 0) / 100,
        today: (revenueToday[0]?.total || 0) / 100,
        thisMonth: (revenueThisMonth[0]?.total || 0) / 100,
      },
      services: { total: totalServices, active: activeServices },
    },
    revenueChart,
    topServices,
  });
};

// @desc    Get all users with pagination/filter
// @route   GET /api/v1/admin/users
// @access  Private (admin)
exports.getAllUsers = async (req, res) => {
  const { role, page = 1, limit = 20, search, isActive } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('-password -otp -refreshTokens');

  res.json({ success: true, total, users, pages: Math.ceil(total / limit) });
};

// @desc    Ban/unban user
// @route   PUT /api/v1/admin/users/:id/ban
// @access  Private (admin)
exports.toggleBanUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.isBanned = !user.isBanned;
  await user.save();
  res.json({ success: true, message: `User ${user.isBanned ? 'banned' : 'unbanned'}`, isBanned: user.isBanned });
};

// @desc    Get all bookings with filters
// @route   GET /api/v1/admin/bookings
// @access  Private (admin)
exports.getAllBookings = async (req, res) => {
  const { status, page = 1, limit = 20, date } = req.query;
  const query = {};
  if (status) query.status = status;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);
    query.scheduledDate = { $gte: d, $lte: dEnd };
  }

  const total = await Booking.countDocuments(query);
  const bookings = await Booking.find(query)
    .populate('customer', 'name phone')
    .populate('service', 'name icon')
    .populate({ path: 'professional', populate: { path: 'user', select: 'name phone' } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, total, bookings, pages: Math.ceil(total / limit) });
};

// @desc    Create coupon (admin)
// @route   POST /api/v1/admin/coupons
// @access  Private (admin)
exports.createCoupon = async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, coupon });
};

// @desc    Approve professional
// @route   PUT /api/v1/admin/professionals/:id/verify
// @access  Private (admin)
exports.verifyProfessional = async (req, res) => {
  const { status, notes } = req.body;
  const professional = await Professional.findById(req.params.id);
  if (!professional) return res.status(404).json({ success: false, message: 'Professional not found' });

  professional.verificationStatus = status;
  professional.verificationNotes = notes;
  if (status === 'approved') professional.isVerified = true;
  await professional.save();

  res.json({ success: true, message: `Professional ${status}`, professional });
};

// ── BANNER MANAGEMENT ─────────────────────────────────────────
exports.getBanners = asyncHandler(async (req, res) => {
  const { Banner } = require('../models/Banner');
  const banners = await Banner.find().sort({ position: 1 });
  res.json({ success: true, banners });
});

exports.createBanner = asyncHandler(async (req, res) => {
  const { Banner } = require('../models/Banner');
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, banner });
});

exports.updateBanner = asyncHandler(async (req, res) => {
  const { Banner } = require('../models/Banner');
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!banner) throw new AppError('Banner not found', 404);
  res.json({ success: true, banner });
});

exports.deleteBanner = asyncHandler(async (req, res) => {
  const { Banner } = require('../models/Banner');
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Banner deleted' });
});

// ── REVENUE REPORT ────────────────────────────────────────────
exports.getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  const match = { status: 'completed' };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate)   match.createdAt.$lte = new Date(endDate);
  }
  const Booking = require('../models/Booking');
  const revenue = await Booking.aggregate([
    { $match: match },
    { $group: {
      _id: { $dateToString: { format: groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d', date: '$createdAt' } },
      total: { $sum: '$pricing.totalAmount' },
      count: { $sum: 1 },
      avgOrder: { $avg: '$pricing.totalAmount' },
    }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, revenue });
});

// ── MANAGE SERVICES (admin shortcut) ─────────────────────────
exports.manageServices = asyncHandler(async (req, res) => {
  const Service = require('../models/Service');
  const { action, serviceId } = req.body;
  if (action === 'deactivate') {
    await Service.findByIdAndUpdate(serviceId, { isActive: false });
    return res.json({ success: true, message: 'Service deactivated' });
  }
  if (action === 'feature') {
    await Service.findByIdAndUpdate(serviceId, { isFeatured: true });
    return res.json({ success: true, message: 'Service featured' });
  }
  res.status(400).json({ success: false, message: 'Unknown action' });
});

// ── ALL CATEGORIES (admin) ────────────────────────────────────
exports.getAllCategories = asyncHandler(async (req, res) => {
  const { Category } = require('../models/Category');
  const categories = await Category.find().sort({ order: 1 });
  res.json({ success: true, categories });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { Category } = require('../models/Category');
  const cat = await Category.create(req.body);
  res.status(201).json({ success: true, category: cat });
});

// ── SUPPORT TICKETS (admin) ───────────────────────────────────
exports.getTickets = asyncHandler(async (req, res) => {
  const { SupportTicket } = require('../models/SupportModels');
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    SupportTicket.countDocuments(query),
  ]);
  res.json({ success: true, tickets, total });
});

exports.resolveTicket = asyncHandler(async (req, res) => {
  const { SupportTicket } = require('../models/SupportModels');
  const { resolution } = req.body;
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolution, resolvedAt: new Date(), resolvedBy: req.user._id },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found', 404);
  res.json({ success: true, ticket });
});

// @desc    Get all professionals
exports.getProfessionals = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const query = {};
  if (status) query.verificationStatus = status;
  const professionals = await Professional.find(query).populate('user', 'name phone email').sort({ createdAt: -1 });
  res.json({ success: true, professionals });
});
