/**
 * MK App — Corporate Controller
 * B2B corporate account management, bulk bookings, employee management
 */
const { Corporate, CorporateEmployee, CorporateBooking } = require('../models/Corporate');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

// @desc    Create corporate account / enquiry
// @route   POST /api/corporate/register
// @access  Public
exports.registerCorporate = asyncHandler(async (req, res) => {
  const {
    companyName, registrationNumber, gstin, industry, employeeCount,
    contactName, contactEmail, contactPhone, contactDesignation,
    billingAddress, website, message,
  } = req.body;

  if (!companyName || !contactEmail || !contactPhone || !contactName) {
    throw new AppError('Company name, contact name, email and phone are required', 400);
  }

  // Check if already registered
  const existing = await Corporate.findOne({ contactEmail });
  if (existing) throw new AppError('A corporate account with this email already exists', 400);

  const corporate = await Corporate.create({
    companyName,
    registrationNumber,
    gstin,
    industry,
    employeeCount: parseInt(employeeCount) || 0,
    contactName,
    contactEmail,
    contactPhone,
    contactDesignation,
    billingAddress,
    website,
    message,
    status: 'pending',
    tier: employeeCount > 500 ? 'enterprise' : employeeCount > 100 ? 'business' : 'starter',
  });

  // Notify sales team
  await sendEmail({
    to: process.env.SALES_EMAIL || 'sales@mkapp.com',
    subject: `New Corporate Enquiry: ${companyName}`,
    text: `New corporate account request from ${companyName}. Contact: ${contactName} (${contactEmail}, ${contactPhone}). Employees: ${employeeCount}. Tier: ${corporate.tier}.`,
  });

  // Send confirmation to client
  await sendEmail({
    to: contactEmail,
    subject: 'Corporate Account Request Received — MK App',
    text: `Dear ${contactName},\n\nThank you for your interest in MK App for Business. Your request has been received and our corporate team will contact you within 24 business hours.\n\nCompany: ${companyName}\nTier: ${corporate.tier}\n\nBest regards,\nMK App Corporate Team`,
  });

  res.status(201).json({
    success: true,
    message: 'Corporate account request submitted successfully. Our team will contact you within 24 hours.',
    data: {
      id: corporate._id,
      companyName: corporate.companyName,
      tier: corporate.tier,
      status: corporate.status,
    },
  });
});

// @desc    Get corporate account details
// @route   GET /api/corporate/account
// @access  Private (corporate admin)
exports.getCorporateAccount = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findOne({ adminUser: req.user._id })
    .populate('adminUser', 'name email phone');

  if (!corporate) throw new AppError('Corporate account not found', 404);

  res.json({ success: true, data: corporate });
});

// @desc    Add employees to corporate account
// @route   POST /api/corporate/employees
// @access  Private (corporate admin)
exports.addEmployees = asyncHandler(async (req, res) => {
  const { employees } = req.body; // Array of { name, email, phone, department }

  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    throw new AppError('Employee list is required', 400);
  }

  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  if (corporate.status !== 'active') {
    throw new AppError('Corporate account must be active to add employees', 403);
  }

  const results = [];
  for (const emp of employees) {
    try {
      // Create or find user account
      let user = await User.findOne({ $or: [{ email: emp.email }, { phone: emp.phone }] });
      if (!user) {
        user = await User.create({
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          accountType: 'corporate_employee',
          corporateId: corporate._id,
        });
      }
      const employee = await CorporateEmployee.create({
        corporate: corporate._id,
        user: user._id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        employeeId: emp.employeeId,
        monthlyBudget: corporate.defaultEmployeeBudget || 2000,
        isActive: true,
      });
      results.push({ id: employee._id, name: emp.name, email: emp.email, status: 'added' });

      // Send invite to employee
      await sendSMS(emp.phone, `You've been added to ${corporate.companyName}'s MK App corporate account. Login with your phone number to access company-sponsored services.`);
    } catch (err) {
      results.push({ name: emp.name, email: emp.email, status: 'failed', error: err.message });
    }
  }

  const added = results.filter(r => r.status === 'added').length;
  res.status(201).json({
    success: true,
    message: `${added} of ${employees.length} employees added successfully`,
    data: results,
  });
});

// @desc    Get corporate employees
// @route   GET /api/corporate/employees
// @access  Private (corporate admin)
exports.getEmployees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, department, status } = req.query;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const filter = { corporate: corporate._id };
  if (department) filter.department = department;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const employees = await CorporateEmployee.find(filter)
    .populate('user', 'name email phone lastActive')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await CorporateEmployee.countDocuments(filter);

  res.json({
    success: true,
    data: employees,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// @desc    Get corporate bookings / usage
// @route   GET /api/corporate/bookings
// @access  Private (corporate admin)
exports.getCorporateBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, month, year, department, employeeId } = req.query;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const filter = { corporate: corporate._id };
  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    filter.createdAt = { $gte: startDate, $lte: endDate };
  }
  if (department) filter.department = department;
  if (employeeId) filter.employee = employeeId;

  const bookings = await CorporateBooking.find(filter)
    .populate('employee', 'name email department')
    .populate('booking', 'service status amount scheduledAt')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const stats = await CorporateBooking.aggregate([
    { $match: { corporate: corporate._id } },
    { $group: {
      _id: null,
      totalSpend: { $sum: '$amount' },
      totalBookings: { $count: {} },
      avgSpendPerEmployee: { $avg: '$amount' },
    }},
  ]);

  res.json({
    success: true,
    data: bookings,
    stats: stats[0] || {},
    pagination: { page: Number(page), limit: Number(limit) },
  });
});

// @desc    Get corporate analytics / usage report
// @route   GET /api/corporate/analytics
// @access  Private (corporate admin)
exports.getCorporateAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [spendByDept, topServices, spendTrend, activeEmployees] = await Promise.all([
    CorporateBooking.aggregate([
      { $match: { corporate: corporate._id, createdAt: { $gte: since } } },
      { $group: { _id: '$department', totalSpend: { $sum: '$amount' }, count: { $count: {} } } },
      { $sort: { totalSpend: -1 } },
      { $limit: 10 },
    ]),
    CorporateBooking.aggregate([
      { $match: { corporate: corporate._id, createdAt: { $gte: since } } },
      { $group: { _id: '$serviceCategory', count: { $count: {} }, totalSpend: { $sum: '$amount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    CorporateBooking.aggregate([
      { $match: { corporate: corporate._id, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, spend: { $sum: '$amount' }, count: { $count: {} } } },
      { $sort: { '_id': 1 } },
    ]),
    CorporateEmployee.countDocuments({ corporate: corporate._id, isActive: true }),
  ]);

  res.json({
    success: true,
    data: {
      period,
      spendByDepartment: spendByDept,
      topServices,
      spendTrend,
      activeEmployees,
      corporateTier: corporate.tier,
      monthlyLimit: corporate.monthlyBudget,
    },
  });
});

// @desc    Update employee budget
// @route   PUT /api/corporate/employees/:employeeId/budget
// @access  Private (corporate admin)
exports.updateEmployeeBudget = asyncHandler(async (req, res) => {
  const { monthlyBudget } = req.body;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const employee = await CorporateEmployee.findOne({ _id: req.params.employeeId, corporate: corporate._id });
  if (!employee) throw new AppError('Employee not found', 404);

  employee.monthlyBudget = monthlyBudget;
  await employee.save();

  res.json({ success: true, message: 'Budget updated', data: { employeeId: employee._id, monthlyBudget } });
});

// @desc    Generate corporate invoice
// @route   POST /api/corporate/invoices/generate
// @access  Private (corporate admin)
exports.generateInvoice = asyncHandler(async (req, res) => {
  const { month, year } = req.body;
  const corporate = await Corporate.findOne({ adminUser: req.user._id });
  if (!corporate) throw new AppError('Corporate account not found', 404);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const bookings = await CorporateBooking.find({
    corporate: corporate._id,
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed',
  }).populate('employee', 'name department').populate('booking', 'service amount');

  const totalAmount = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const gst = totalAmount * 0.18;
  const grandTotal = totalAmount + gst;

  const invoice = {
    invoiceNumber: `MK-CORP-${corporate._id.toString().slice(-6).toUpperCase()}-${year}${String(month).padStart(2, '0')}`,
    corporate: { name: corporate.companyName, gstin: corporate.gstin, address: corporate.billingAddress },
    period: { month, year, from: startDate, to: endDate },
    lineItems: bookings.map(b => ({
      date: b.createdAt,
      employee: b.employee?.name,
      department: b.employee?.department,
      service: b.booking?.service,
      amount: b.amount,
    })),
    subtotal: totalAmount,
    gst,
    grandTotal,
    generatedAt: new Date(),
  };

  res.json({ success: true, data: invoice });
});
