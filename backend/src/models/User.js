const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  line1: { type: String, required: true },
  line2: String,
  area: String,
  city: { type: String, required: true },
  state: String,
  pincode: { type: String, required: true },
  landmark: String,
  lat: Number,
  lng: Number,
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    sparse: true,
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  avatar: { type: String, default: '' },
  role: {
    type: String,
    enum: ['customer', 'professional', 'admin'],
    default: 'customer',
  },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  addresses: [addressSchema],
  savedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['credit', 'debit'] },
      amount: Number,
      description: String,
      date: { type: Date, default: Date.now },
    }],
  },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalBookings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  membershipTier: {
    type: String,
    enum: ['Standard', 'Silver', 'Gold', 'Platinum'],
    default: 'Standard',
  },
  notifications: {
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
  },
  fcmToken: String, // Firebase push notifications
  lastLogin: Date,
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 },
  },
  refreshTokens: [String],
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate referral code
userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = 'Slot' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '90d',
  });
};

// Update membership tier based on spend
userSchema.methods.updateMembershipTier = function () {
  if (this.totalSpent >= 50000) this.membershipTier = 'Platinum';
  else if (this.totalSpent >= 20000) this.membershipTier = 'Gold';
  else if (this.totalSpent >= 5000) this.membershipTier = 'Silver';
  else this.membershipTier = 'Standard';
};

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
