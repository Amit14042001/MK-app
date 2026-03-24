/**
 * Slot App — Store Controller
 * Full UC Store clone: browse products, cart, checkout, orders, reviews
 */
const { Product, StoreOrder } = require('../models/StoreModels');
const User                    = require('../models/User');
const Coupon                  = require('../models/Coupon');
const paymentService          = require('../services/paymentService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── GET /store/products ───────────────────────────────────────
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    category, search, sort = 'popular',
    minPrice, maxPrice, page = 1, limit = 20,
    featured, topSeller,
  } = req.query;

  const filter = { isActive: true };
  if (category)  filter.category = category;
  if (featured)  filter.isFeatured = true;
  if (topSeller) filter.isTopSeller = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) filter.$text = { $search: search };

  const sortMap = {
    popular:     { soldCount: -1 },
    newest:      { createdAt: -1 },
    price_asc:   { price: 1 },
    price_desc:  { price: -1 },
    rating:      { 'ratings.average': -1 },
    discount:    { discount: -1 },
  };
  const sortQuery = sortMap[sort] || sortMap.popular;

  const skip  = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortQuery).skip(skip).limit(Number(limit)).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
});

// ── GET /store/products/:id ───────────────────────────────────
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('relatedServices', 'name icon startingPrice')
    .lean();
  if (!product || !product.isActive) throw new AppError('Product not found', 404);
  res.json({ success: true, data: product });
});

// ── GET /store/categories ─────────────────────────────────────
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, minPrice: { $min: '$price' } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, data: categories });
});

// ── POST /store/orders ────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, couponCode, paymentMethod = 'online' } = req.body;

  if (!items?.length) throw new AppError('Order must have at least one item', 400);
  if (!deliveryAddress?.line1 || !deliveryAddress?.pincode) throw new AppError('Delivery address required', 400);

  // Validate & price items
  const enrichedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) throw new AppError(`Product ${item.productId} not found`, 404);
    if (product.stock < item.quantity) throw new AppError(`Insufficient stock for "${product.name}"`, 400);

    const itemSubtotal = product.price * item.quantity;
    subtotal += itemSubtotal;
    enrichedItems.push({
      product:  product._id,
      name:     product.name,
      price:    product.price,
      quantity: item.quantity,
      subtotal: itemSubtotal,
    });
  }

  // Delivery fee: free above ₹499
  const deliveryFee = subtotal >= 499 ? 0 : 49;

  // Coupon
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (coupon) {
      const validity = coupon.isValid(req.user._id, subtotal);
      if (validity.valid) couponDiscount = coupon.calculateDiscount(subtotal);
    }
  }

  const gst         = Math.round((subtotal - couponDiscount) * 0.05); // 5% GST on products
  const totalAmount = subtotal + deliveryFee - couponDiscount + gst;

  // Estimated delivery: 2-3 working days
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

  const order = await StoreOrder.create({
    user: req.user._id,
    items: enrichedItems,
    deliveryAddress,
    pricing: { subtotal, deliveryFee, couponDiscount, gst, totalAmount },
    couponCode,
    payment: { method: paymentMethod, status: 'pending' },
    status: 'pending',
    estimatedDelivery,
  });

  // Reserve stock
  for (const item of enrichedItems) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
  }

  // Create Razorpay order if online
  let razorpayOrder = null;
  if (paymentMethod === 'online') {
    razorpayOrder = await paymentService.createStoreOrder(order);
  }

  res.status(201).json({ success: true, data: { order, razorpayOrder } });
});

// ── POST /store/orders/:id/pay ────────────────────────────────
exports.confirmPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const order = await StoreOrder.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user.toString() !== req.user._id.toString()) throw new AppError('Unauthorized', 403);

  const valid = paymentService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new AppError('Payment verification failed', 400);

  order.payment.status            = 'paid';
  order.payment.razorpayOrderId   = razorpayOrderId;
  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.paidAt            = new Date();
  order.status                    = 'confirmed';
  await order.save();

  res.json({ success: true, data: order });
});

// ── GET /store/orders ─────────────────────────────────────────
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await StoreOrder.find({ user: req.user._id })
    .populate('items.product', 'name images category')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: orders });
});

// ── GET /store/orders/:id ─────────────────────────────────────
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await StoreOrder.findById(req.params.id)
    .populate('items.product', 'name images category brand')
    .lean();
  if (!order) throw new AppError('Order not found', 404);
  if (order.user.toString() !== req.user._id.toString()) throw new AppError('Unauthorized', 403);
  res.json({ success: true, data: order });
});

// ── POST /store/orders/:id/cancel ─────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await StoreOrder.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user.toString() !== req.user._id.toString()) throw new AppError('Unauthorized', 403);
  if (['shipped','out_for_delivery','delivered'].includes(order.status)) {
    throw new AppError('Cannot cancel order that is already shipped or delivered', 400);
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  await order.save();

  res.json({ success: true, data: order });
});

// ── POST /store/products/:id/review ──────────────────────────
exports.addReview = asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400);

  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  // Verify purchase
  const purchased = await StoreOrder.findOne({
    user: req.user._id,
    'items.product': product._id,
    status: 'delivered',
  });
  if (!purchased) throw new AppError('You can only review products you have purchased and received', 400);

  // Update rating
  const newCount   = product.ratings.count + 1;
  const newAverage = ((product.ratings.average * product.ratings.count) + rating) / newCount;
  product.ratings = { average: Math.round(newAverage * 10) / 10, count: newCount };
  await product.save();

  res.json({ success: true, message: 'Review submitted successfully' });
});

// ── Admin: POST /store/products ───────────────────────────────
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// ── Admin: PUT /store/products/:id ───────────────────────────
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, data: product });
});

// ── Admin: GET /store/orders (all) ───────────────────────────
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const [orders, total] = await Promise.all([
    StoreOrder.find(filter)
      .populate('user', 'name phone')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    StoreOrder.countDocuments(filter),
  ]);
  res.json({ success: true, data: { orders, total } });
});

// ── Aliases & Stubs ───────────────────────────────────────────
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true }).limit(10);
  res.json({ success: true, data: products });
});

exports.getTopSellers = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isTopSeller: true }).limit(10);
  res.json({ success: true, data: products });
});

exports.getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, category: req.params.category }).limit(20);
  res.json({ success: true, data: products });
});

exports.initiateReturn = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Return initiated' });
});

exports.addProductReview = exports.addReview;

exports.getWishlist = asyncHandler(async (req, res) => {
  res.json({ success: true, products: [] });
});

exports.toggleWishlist = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Wishlist updated' });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Product deleted' });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await StoreOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json({ success: true, data: order });
});

exports.getInventory = asyncHandler(async (req, res) => {
  const inventory = await Product.find().select('name stock price').lean();
  res.json({ success: true, data: inventory });
});

exports.updateInventory = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { stock: req.body.stock }, { new: true });
  res.json({ success: true, data: product });
});
