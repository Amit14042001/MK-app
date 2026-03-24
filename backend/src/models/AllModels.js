/**
 * Slot App — All Missing Mongoose Models
 * Referral, LoyaltyTransaction, LoyaltyReward, WarrantyClaim,
 * ChatRoom, ChatMessage, CorporateEmployee, CorporateBooking,
 * GiftCard, Bundle, ServiceArea, AppVersion, FlashSale, ProBid
 */
const mongoose = require('mongoose');

// ── Referral ──────────────────────────────────────────────────
const referralSchema = new mongoose.Schema({
  referrer:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referee:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code:            { type: String, required: true, uppercase: true },
  status:          { type: String, enum: ['applied', 'rewarded', 'expired', 'invalid'], default: 'applied', index: true },
  refereeDiscount: { type: Number, default: 150 },
  referrerReward:  { type: Number, default: 200 },
  bookingId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  appliedAt:       { type: Date, default: Date.now },
  rewardedAt:      Date,
}, { timestamps: true });
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referee: 1 }, { unique: true });
const Referral = mongoose.model('Referral', referralSchema);

// ── LoyaltyTransaction ───────────────────────────────────────
const loyaltyTransactionSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:          { type: String, enum: ['earned', 'redeemed', 'bonus', 'expired', 'adjusted'], required: true },
  points:        { type: Number, required: true },
  basePoints:    Number,
  bonusPoints:   Number,
  walletCredit:  Number,
  source:        { type: String, enum: ['booking', 'referral', 'review', 'signup', 'birthday', 'streak_3', 'streak_5', 'streak_10', 'redemption', 'adjustment', 'expiry'] },
  reference:     { type: mongoose.Schema.Types.ObjectId },
  description:   String,
  balanceAfter:  Number,
}, { timestamps: true });
loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

// ── LoyaltyReward ────────────────────────────────────────────
const loyaltyRewardSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  description:  String,
  icon:         String,
  pointsCost:   { type: Number, required: true },
  rewardType:   { type: String, enum: ['wallet_credit', 'free_service', 'discount', 'product'], required: true },
  rewardValue:  Number,
  requiredTier: { type: String, enum: ['all', 'bronze', 'silver', 'gold', 'platinum'], default: 'all' },
  isActive:     { type: Boolean, default: true },
  stock:        { type: Number, default: -1 },
  expiresAt:    Date,
}, { timestamps: true });
const LoyaltyReward = mongoose.model('LoyaltyReward', loyaltyRewardSchema);

// ── WarrantyClaim ────────────────────────────────────────────
const warrantyClaimSchema = new mongoose.Schema({
  booking:              { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  professional:         { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', index: true },
  issueType:            { type: String, required: true },
  issueDescription:     { type: String, required: true },
  status:               { type: String, enum: ['pending', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'], default: 'pending', index: true },
  preferredDate:        Date,
  preferredTimeSlot:    String,
  warrantyExpiry:       Date,
  serviceName:          String,
  serviceCategory:      String,
  originalBookingAmount: Number,
  revisitDate:          Date,
  revisitTimeSlot:      String,
  revisitBooking:       { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  professionalNotes:    String,
  rejectionReason:      String,
  filedAt:              { type: Date, default: Date.now },
  approvedAt:           Date,
  completedAt:          Date,
}, { timestamps: true });
const WarrantyClaim = mongoose.model('WarrantyClaim', warrantyClaimSchema);

// ── ChatRoom ─────────────────────────────────────────────────
const chatRoomSchema = new mongoose.Schema({
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastActivity: { type: Date, default: Date.now, index: true },
  lastMessage:  String,
  isActive:     { type: Boolean, default: true },
  roomType:     { type: String, enum: ['customer_pro', 'customer_support'], default: 'customer_pro' },
}, { timestamps: true });
chatRoomSchema.index({ participants: 1, lastActivity: -1 });
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// ── ChatMessage ──────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  room:        { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:        String,
  messageType: { type: String, enum: ['text', 'image', 'audio', 'video', 'document', 'booking', 'location', 'options'], default: 'text' },
  mediaUrl:    String,
  replyTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  sentAt:      { type: Date, default: Date.now, index: true },
  deliveredAt: Date,
  readAt:      Date,
  isDeleted:   { type: Boolean, default: false },
  deletedAt:   Date,
  metadata:    mongoose.Schema.Types.Mixed,
}, { timestamps: true });
chatMessageSchema.index({ room: 1, sentAt: -1 });
chatMessageSchema.index({ room: 1, sender: 1, readAt: 1 });
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// ── CorporateEmployee ────────────────────────────────────────
const corporateEmployeeSchema = new mongoose.Schema({
  corporate:     { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true, index: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name:          { type: String, required: true },
  email:         { type: String, required: true, lowercase: true },
  phone:         { type: String, required: true },
  employeeId:    String,
  department:    String,
  designation:   String,
  monthlyBudget: { type: Number, default: 2000 },
  usedBudget:    { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
  addedAt:       { type: Date, default: Date.now },
}, { timestamps: true });
corporateEmployeeSchema.index({ corporate: 1, department: 1 });
const CorporateEmployee = mongoose.model('CorporateEmployee', corporateEmployeeSchema);

// ── CorporateBooking ─────────────────────────────────────────
const corporateBookingSchema = new mongoose.Schema({
  corporate:       { type: mongoose.Schema.Types.ObjectId, ref: 'Corporate', required: true, index: true },
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: 'CorporateEmployee', index: true },
  booking:         { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  amount:          Number,
  department:      String,
  serviceCategory: String,
  status:          { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  billingCycle:    String,
  invoiceGenerated: { type: Boolean, default: false },
}, { timestamps: true });
const CorporateBooking = mongoose.model('CorporateBooking', corporateBookingSchema);

// ── GiftCard ─────────────────────────────────────────────────
const giftCardSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true },
  purchasedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  recipientName: String,
  recipientPhone: String,
  recipientEmail: String,
  personalMessage: String,
  amount:        { type: Number, required: true },
  balance:       { type: Number, required: true },
  design:        { type: String, enum: ['classic', 'spa', 'home', 'premium'], default: 'classic' },
  status:        { type: String, enum: ['active', 'partially_used', 'fully_used', 'expired', 'cancelled'], default: 'active', index: true },
  sentAt:        Date,
  redeemedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  redeemedAt:    Date,
  expiresAt:     { type: Date, required: true },
  transactions:  [{ amount: Number, bookingId: mongoose.Schema.Types.ObjectId, usedAt: Date }],
}, { timestamps: true });
const GiftCard = mongoose.model('GiftCard', giftCardSchema);

// ── Bundle ───────────────────────────────────────────────────
const bundleSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  description:  String,
  icon:         String,
  services:     [{ serviceId: mongoose.Schema.Types.ObjectId, serviceName: String, price: Number, duration: Number }],
  bundlePrice:  { type: Number, required: true },
  originalPrice: Number,
  savings:      Number,
  totalDuration: Number,
  gradient:     [String],
  isActive:     { type: Boolean, default: true, index: true },
  isPopular:    { type: Boolean, default: false },
  cities:       [String],
  validFrom:    Date,
  validUntil:   Date,
  bookingCount: { type: Number, default: 0 },
}, { timestamps: true });
const Bundle = mongoose.model('Bundle', bundleSchema);

// ── ServiceArea / Pincode ────────────────────────────────────
const serviceAreaSchema = new mongoose.Schema({
  pincode:    { type: String, required: true, index: true },
  city:       { type: String, required: true, index: true },
  area:       String,
  state:      String,
  isActive:   { type: Boolean, default: true, index: true },
  categories: [String],
  proCount:   { type: Number, default: 0 },
  launchDate: Date,
  location:   { type: { type: String, default: 'Point' }, coordinates: [Number] },
}, { timestamps: true });
serviceAreaSchema.index({ location: '2dsphere' });
serviceAreaSchema.index({ pincode: 1, isActive: 1 });
const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

// ── AppVersion ───────────────────────────────────────────────
const appVersionSchema = new mongoose.Schema({
  platform:       { type: String, enum: ['ios', 'android'], required: true },
  appType:        { type: String, enum: ['customer', 'professional'], required: true },
  minVersion:     { type: String, required: true },
  latestVersion:  { type: String, required: true },
  forceUpdate:    { type: Boolean, default: false },
  updateMessage:  String,
  storeUrl:       String,
  releaseNotes:   String,
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });
appVersionSchema.index({ platform: 1, appType: 1 }, { unique: true });
const AppVersion = mongoose.model('AppVersion', appVersionSchema);

// ── FlashSale ────────────────────────────────────────────────
const flashSaleSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  subtitle:        String,
  discount:        { type: Number, required: true },
  discountType:    { type: String, enum: ['percent', 'flat'], default: 'percent' },
  serviceCategory: String,
  serviceIds:      [mongoose.Schema.Types.ObjectId],
  maxUses:         Number,
  usedCount:       { type: Number, default: 0 },
  startTime:       { type: Date, required: true, index: true },
  endTime:         { type: Date, required: true, index: true },
  cities:          [String],
  isActive:        { type: Boolean, default: true, index: true },
  couponCode:      String,
  backgroundColor: String,
  image:           String,
}, { timestamps: true });
flashSaleSchema.index({ startTime: 1, endTime: 1, isActive: 1 });
const FlashSale = mongoose.model('FlashSale', flashSaleSchema);

// ── ProBid ───────────────────────────────────────────────────
const proBidSchema = new mongoose.Schema({
  booking:      { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  professional: { type: mongoose.Schema.Types.ObjectId, ref: 'Professional', required: true },
  bidAmount:    { type: Number, required: true },
  timeline:     String,
  message:      String,
  status:       { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'], default: 'pending', index: true },
  acceptedAt:   Date,
  rejectedAt:   Date,
  expiresAt:    Date,
}, { timestamps: true });
proBidSchema.index({ booking: 1, status: 1 });
proBidSchema.index({ professional: 1, status: 1 });
const ProBid = mongoose.model('ProBid', proBidSchema);

// ── RemoteConfig ─────────────────────────────────────────────
const remoteConfigSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  value:       mongoose.Schema.Types.Mixed,
  description: String,
  platform:    { type: String, enum: ['all', 'ios', 'android'], default: 'all' },
  cities:      [String],
  isActive:    { type: Boolean, default: true },
  updatedBy:   String,
}, { timestamps: true });
const RemoteConfig = mongoose.model('RemoteConfig', remoteConfigSchema);

module.exports = {
  Referral, LoyaltyTransaction, LoyaltyReward, WarrantyClaim,
  ChatRoom, ChatMessage, CorporateEmployee, CorporateBooking,
  GiftCard, Bundle, ServiceArea, AppVersion, FlashSale, ProBid, RemoteConfig,
};
