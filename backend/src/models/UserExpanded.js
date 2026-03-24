/**
 * Slot App — User Model (Complete)
 * Full schema with wallet, subscription, referral, preferences, security
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ── Sub-schemas ───────────────────────────────────────────────
const addressSchema = new mongoose.Schema({
  label:     { type: String, enum: ['Home', 'Work', 'Other', 'Hotel', 'Custom'], default: 'Home' },
  tag:       String, // custom label
  line1:     { type: String, required: true, trim: true },
  line2:     { type: String, trim: true },
  area:      { type: String, trim: true },
  city:      { type: String, required: true, trim: true },
  state:     { type: String, trim: true },
  pincode:   { type: String, required: true, match: [/^\d{6}$/, 'Invalid pincode'] },
  landmark:  String,
  lat:       Number,
  lng:       Number,
  isDefault: { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

const walletTransactionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['credit', 'debit', 'refund', 'cashback', 'referral', 'adjustment'], required: true },
  amount:      { type: Number, required: true, min: 0 },
  balance:     Number, // balance after transaction
  description: { type: String, required: true },
  reference:   String, // bookingId or paymentId
  expiresAt:   Date,   // for expiry-based credits
  status:      { type: String, enum: ['pending', 'completed', 'failed', 'reversed'], default: 'completed' },
}, { timestamps: true });

const notifPrefsSchema = new mongoose.Schema({
  push:          { type: Boolean, default: true },
  sms:           { type: Boolean, default: true },
  email:         { type: Boolean, default: true },
  whatsapp:      { type: Boolean, default: true },
  bookingUpdates:{ type: Boolean, default: true },
  promotions:    { type: Boolean, default: false },
  newsletters:   { type: Boolean, default: false },
  reminders:     { type: Boolean, default: true },
}, { _id: false });

// ── Main User Schema ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: [true, 'Name is required'],
    trim:     true,
    maxlength:[50, 'Name cannot exceed 50 characters'],
  },
  phone: {
    type:     String,
    required: [true, 'Phone number is required'],
    unique:   true,
    trim:     true,
    match:    [/^[+]?[6-9]\d{9}$/, 'Please enter a valid mobile number'],
  },
  email: {
    type:      String,
    lowercase: true,
    trim:      true,
    sparse:    true,
    match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type:     String,
    minlength:[6, 'Password must be at least 6 characters'],
    select:   false,
  },
  avatar:   { type: String, default: '' },
  gender:   { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  dateOfBirth: Date,

  role: {
    type:    String,
    enum:    ['customer', 'professional', 'admin', 'support'],
    default: 'customer',
  },

  // Verification
  isVerified:       { type: Boolean, default: false },
  isPhoneVerified:  { type: Boolean, default: false },
  isEmailVerified:  { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  isBlocked:        { type: Boolean, default: false },
  blockedReason:    String,
  blockedAt:        Date,

  // Auth tokens
  fcmToken:            String,  // Firebase push token
  refreshTokenVersion: { type: Number, default: 0 },
  passwordResetToken:  String,
  passwordResetExpiry: Date,
  emailVerifyToken:    String,
  lastPasswordChange:  Date,

  // Social login
  googleId:   String,
  facebookId: String,

  // Addresses
  addresses: { type: [addressSchema], default: [] },

  // Wallet
  wallet: {
    balance:      { type: Number, default: 0, min: 0 },
    totalCredit:  { type: Number, default: 0 },
    totalDebit:   { type: Number, default: 0 },
    transactions: { type: [walletTransactionSchema], default: [] },
  },

  // Subscription
  subscription: {
    plan:      { type: String, enum: ['free', 'silver', 'gold', 'platinum'], default: 'free' },
    status:    { type: String, enum: ['none', 'active', 'cancelled', 'expired', 'upgraded'], default: 'none' },
    startDate: Date,
    endDate:   Date,
    autoRenew: { type: Boolean, default: false },
  },

  // Referral
  referral: {
    code:           String,  // this user's referral code
    referredBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCount:  { type: Number, default: 0 },
    totalEarned:    { type: Number, default: 0 },
  },

  // Saved / wishlist
  savedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],

  // Notification preferences
  notificationPreferences: { type: notifPrefsSchema, default: () => ({}) },

  // App data
  preferredLanguage: { type: String, default: 'en' },
  appVersion:        String,
  deviceInfo:        {
    platform: String,
    model:    String,
    osVersion:String,
  },

  // Stats (denormalised for performance)
  stats: {
    totalBookings:    { type: Number, default: 0 },
    completedBookings:{ type: Number, default: 0 },
    cancelledBookings:{ type: Number, default: 0 },
    totalSpent:       { type: Number, default: 0 },
    lastBookingAt:    Date,
  },

  // Corporate
  corporate:        { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate' },
  isCorporateAdmin: { type: Boolean, default: false },

  // Activity
  lastActive: { type: Date, default: Date.now },
  lastLogin:  Date,
  loginCount: { type: Number, default: 0 },

  // Support
  supportNote: String, // internal admin note
}, {
  timestamps: true,
  toJSON:     { virtuals: true },
  toObject:   { virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────────
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isBlocked: 1 });
userSchema.index({ 'referral.code': 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActive: -1 });

// ── Virtual: fullName ─────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return this.name;
});

// ── Virtual: subscriptionActive ──────────────────────────────
userSchema.virtual('subscriptionActive').get(function () {
  return this.subscription?.status === 'active' && this.subscription?.endDate > new Date();
});

// ── Pre-save: Hash password ───────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Pre-save: Generate referral code ─────────────────────────
userSchema.pre('save', function (next) {
  if (this.isNew && !this.referral?.code) {
    const code = `Slot${this.phone.slice(-4).toUpperCase()}${Math.random().toString(36).slice(-4).toUpperCase()}`;
    this.referral = { ...this.referral, code };
  }
  next();
});

// ── Method: Compare password ──────────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Method: Generate JWT ──────────────────────────────────────
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, version: this.refreshTokenVersion },
    process.env.JWT_SECRET || 'slot_jwt_secret_2025',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Method: Generate Refresh Token ───────────────────────────
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, version: this.refreshTokenVersion },
    process.env.JWT_REFRESH_SECRET || 'slot_refresh_secret_2025',
    { expiresIn: '30d' }
  );
};

// ── Method: Invalidate all sessions ──────────────────────────
userSchema.methods.invalidateAllSessions = async function () {
  this.refreshTokenVersion += 1;
  await this.save();
};

// ── Method: Credit wallet ─────────────────────────────────────
userSchema.methods.creditWallet = async function (amount, description, reference, type = 'credit') {
  this.wallet.balance    += amount;
  this.wallet.totalCredit += amount;
  this.wallet.transactions.push({
    type, amount,
    balance:     this.wallet.balance,
    description, reference,
    status:      'completed',
  });
  return this.save();
};

// ── Method: Debit wallet ──────────────────────────────────────
userSchema.methods.debitWallet = async function (amount, description, reference) {
  if (this.wallet.balance < amount) throw new Error('Insufficient wallet balance');
  this.wallet.balance   -= amount;
  this.wallet.totalDebit += amount;
  this.wallet.transactions.push({
    type:    'debit',
    amount,
    balance: this.wallet.balance,
    description, reference,
    status:  'completed',
  });
  return this.save();
};

// ── Method: Get default address ───────────────────────────────
userSchema.methods.getDefaultAddress = function () {
  return this.addresses.find(a => a.isDefault && a.isActive) || this.addresses.find(a => a.isActive) || null;
};

// ── Static: Find by phone ─────────────────────────────────────
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone: phone.replace(/\D/g, '').replace(/^91/, '').replace(/^(\d{10})$/, '$1') });
};

// ── Statics: Safe select ──────────────────────────────────────
userSchema.statics.safeFields = 'name phone email avatar role isVerified subscription referral.code stats lastActive createdAt';

const User = mongoose.model('User', userSchema);
module.exports = User;
