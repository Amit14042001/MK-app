/**
 * Slot App — Product Store Model
 * Products, cart, orders — like UC Store selling cleaning kits, tools, beauty products
 */
const mongoose = require('mongoose');

// ── Product Schema ─────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  slug:          { type: String, required: true, unique: true, lowercase: true },
  description:   { type: String, required: true },
  shortDesc:     { type: String, maxLength: 200 },
  category: {
    type: String,
    enum: ['cleaning', 'beauty', 'tools', 'automotive', 'pest_control', 'home_care', 'wellness'],
    required: true,
    index: true,
  },
  brand:         { type: String },
  images:        [{ url: String, alt: String }],
  price:          { type: Number, required: true, min: 0 },
  mrp:            { type: Number, required: true, min: 0 },
  discount:       { type: Number, default: 0, min: 0, max: 100 },
  stock:          { type: Number, default: 0, min: 0 },
  unit:           { type: String, default: 'piece' },  // piece, ml, kg, set
  weight:         { type: Number }, // grams
  tags:           [String],
  highlights:     [String],  // bullet point features
  howToUse:       String,
  safetyInfo:     String,
  ingredients:    String,    // for beauty products
  isActive:       { type: Boolean, default: true, index: true },
  isFeatured:     { type: Boolean, default: false },
  isTopSeller:    { type: Boolean, default: false },
  isProfessionalUse: { type: Boolean, default: false }, // sold by pros during service
  relatedServices:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },
  soldCount:     { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

productSchema.virtual('discountedPrice').get(function () {
  return Math.round(this.mrp * (1 - this.discount / 100));
});

productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

// ── Store Order Schema ─────────────────────────────────────────
const storeOrderSchema = new mongoose.Schema({
  orderId:   { type: String, unique: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:     String,
    price:    Number,
    quantity: { type: Number, required: true, min: 1 },
    subtotal: Number,
  }],
  deliveryAddress: {
    line1:    String,
    area:     String,
    city:     String,
    state:    String,
    pincode:  String,
    lat:      Number,
    lng:      Number,
  },
  pricing: {
    subtotal:        { type: Number, default: 0 },
    deliveryFee:     { type: Number, default: 0 },
    discount:        { type: Number, default: 0 },
    couponDiscount:  { type: Number, default: 0 },
    gst:             { type: Number, default: 0 },
    totalAmount:     { type: Number, default: 0 },
  },
  payment: {
    method:           String,
    status:           { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
    razorpayOrderId:  String,
    razorpayPaymentId:String,
    paidAt:           Date,
  },
  couponCode:  String,
  status: {
    type: String,
    enum: ['pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled','returned'],
    default: 'pending',
    index: true,
  },
  deliveryDate:  Date,
  deliveredAt:   Date,
  cancelledAt:   Date,
  cancelReason:  String,
  trackingUrl:   String,
  estimatedDelivery: Date,
  notes:         String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

storeOrderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = 'SO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
  }
  next();
});

storeOrderSchema.index({ user: 1, createdAt: -1 });
storeOrderSchema.index({ status: 1, createdAt: -1 });

const Product    = mongoose.model('Product',    productSchema);
const StoreOrder = mongoose.model('StoreOrder', storeOrderSchema);

module.exports = { Product, StoreOrder };
