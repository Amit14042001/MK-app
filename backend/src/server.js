/**
 * Slot App — Express Server (Production-Complete)
 * All routes wired, video calls, banners, FAQs, support tickets
 */
require('dotenv').config();
const express       = require('express');
const http          = require('http');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');
const compression   = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

const { connectDB }     = require('./config/database');
const { connectRedis }  = require('./config/redis');
const { initFirebaseAdmin } = require('./config/firebase');
const { initSocket }    = require('./config/socket');
const { startCronJobs } = require('./jobs/cronJobs');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);

// ── Security middleware ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.FRONTEND_URLS || 'http://localhost:3000').split(',');
    if (!origin || allowed.some(u => origin.startsWith(u)) || process.env.NODE_ENV !== 'production')
      cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
}));

// ── Body parsers ──────────────────────────────────────────────
app.use('/api/v1/whatsapp', express.raw({ type: 'application/json' })); // raw for WhatsApp signature
app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' })); // raw for Stripe signature
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(compression({ level: 6 }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use('/uploads', express.static('uploads', { maxAge: '7d' }));

// ── Rate limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 10000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/metrics',
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth/send-otp',   authLimiter);
app.use('/api/v1/auth/verify-otp', authLimiter);

// ── Health & metrics ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/api/v1/health', async (req, res) => {
  const mongoose = require('mongoose');
  const redis    = require('./config/redis');
  res.json({
    status:    'ok',
    version:   process.env.npm_package_version || '1.0.0',
    uptime:    Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis:    redis.isConnected() ? 'connected' : 'unavailable',
    },
  });
});

app.get('/api/v1/metrics', async (req, res) => {
  try {
    const Booking = require('./models/Booking');
    const User    = require('./models/User');
    const [active, pending, users] = await Promise.all([
      Booking.countDocuments({ status: 'in_progress' }),
      Booking.countDocuments({ status: 'pending' }),
      User.countDocuments({ isActive: true }),
    ]);
    res.set('Content-Type', 'text/plain');
    res.send(
      `slot_active_bookings ${active}\n` +
      `slot_pending_bookings ${pending}\n` +
      `slot_active_users ${users}\n` +
      `slot_uptime_seconds ${Math.round(process.uptime())}\n` +
      `slot_memory_mb ${Math.round(process.memoryUsage().rss / 1024 / 1024)}\n`
    );
  } catch { res.status(500).send(''); }
});

// ── API Routes ────────────────────────────────────────────────
const API = '/api/v1';

// Core
app.use(`${API}/auth`,          require('./routes/auth'));
app.use(`${API}/users`,         require('./routes/users'));
app.use(`${API}/addresses`,     require('./routes/addresses'));

// Services & Categories
app.use(`${API}/services`,      require('./routes/services'));
app.use(`${API}/categories`,    require('./routes/categories'));

// Bookings & Payments
app.use(`${API}/bookings`,      require('./routes/bookings'));
app.use(`${API}/payments`,      require('./routes/payments'));
app.use(`${API}/tracking`,      require('./routes/tracking'));

// Reviews & Notifications
app.use(`${API}/reviews`,       require('./routes/reviews'));
app.use(`${API}/notifications`, require('./routes/notifications'));

// Professionals
app.use(`${API}/professionals`, require('./routes/professionals'));

// Admin & Analytics
app.use(`${API}/admin`,         require('./routes/admin'));
app.use(`${API}/analytics`,     require('./routes/analytics'));

// Business features
app.use(`${API}/subscriptions`, require('./routes/subscriptions'));
app.use(`${API}/corporate`,     require('./routes/corporate'));
app.use(`${API}/banners`,       require('./routes/banners'));

// Support
app.use(`${API}/support`,       require('./routes/support'));
app.use(`${API}/faqs`,          require('./routes/faqs'));
app.use(`${API}/video-calls`,   require('./routes/videoCalls'));

// Webhooks
app.use(`${API}/whatsapp`,      require('./routes/whatsapp'));

// Search (enhanced)
app.use(`${API}/search`,        require('./routes/search'));

// ── AI Chat Booking Assistant ────────────────────────────────
app.use(`${API}/ai-chat`,       require('./routes/aiChat'));

// ── Store (UC Store clone) ─────────────────────────────────────
app.use(`${API}/store`,         require('./routes/store'));

// ── Stripe (international payments) ──────────────────────────
app.use(`${API}/stripe`,        require('./routes/stripe'));
app.use(`${API}/chat`,          require('./routes/chat'));
app.use(`${API}/referrals`,     require('./routes/referrals'));
app.use(`${API}/loyalty`,       require('./routes/loyalty'));
app.use(`${API}/warranty`,      require('./routes/warranty'));
app.use(`${API}/service-areas`, require('./routes/extraRoutes'));

// ── Error Handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    connectRedis().catch(err => console.warn('⚠️  Redis unavailable (caching disabled):', err.message));
    initFirebaseAdmin();
    const io = initSocket(server);
    global.io = io;
    startCronJobs();

    const PORT = parseInt(process.env.PORT || '5000');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🏠 Slot App Server  ➜  http://localhost:${PORT}  (${process.env.NODE_ENV || 'development'})`);
      console.log(`📡 WebSocket       ➜  ws://localhost:${PORT}`);
      console.log(`📊 Metrics         ➜  http://localhost:${PORT}/api/v1/metrics\n`);
    });
  } catch (err) {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  }
}

const shutdown = async (sig) => {
  console.log(`\n[${sig}] Graceful shutdown...`);
  try { require('./jobs/cronJobs').stopCronJobs(); } catch {}
  server.close(async () => {
    await require('mongoose').disconnect();
    console.log('✅ Server closed cleanly');
    process.exit(0);
  });
  setTimeout(() => { console.error('⚠️  Force exit'); process.exit(1); }, 10000);
};

process.on('SIGTERM',           () => shutdown('SIGTERM'));
process.on('SIGINT',            () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err?.message || err));
process.on('uncaughtException',  (err) => { console.error('Uncaught exception:', err); process.exit(1); });

if (require.main === module) bootstrap();

module.exports = app;



// ── Dynamic Pricing Endpoint ──────────────────────────────────
const { protect } = require('./middleware/auth');
const { asyncHandler } = require('./middleware/errorHandler');
const dynamicPricingService = require('./services/dynamicPricingService');
const recommendationService = require('./services/recommendationService');

app.post(`${API}/pricing/calculate`, protect, asyncHandler(async (req, res) => {
  const { basePrice, serviceCategory, lat, lng, scheduledAt } = req.body;
  if (!basePrice || !serviceCategory || !scheduledAt) {
    return res.status(400).json({ success: false, message: 'basePrice, serviceCategory and scheduledAt are required' });
  }
  const pricing = await dynamicPricingService.calculateDynamicPrice({
    basePrice, serviceCategory,
    lat: lat || 17.38, lng: lng || 78.49,
    scheduledAt: new Date(scheduledAt),
    userId: req.user._id,
  });
  res.json({ success: true, data: pricing });
}));

app.get(`${API}/pricing/surge-status`, protect, asyncHandler(async (req, res) => {
  const { category, lat, lng } = req.query;
  const status = await dynamicPricingService.getSurgeStatus(category, parseFloat(lat) || 17.38, parseFloat(lng) || 78.49);
  res.json({ success: true, data: status });
}));

app.get(`${API}/pricing/wait-time`, protect, asyncHandler(async (req, res) => {
  const { category, lat, lng } = req.query;
  const waitTime = await dynamicPricingService.getEstimatedWaitTime(category, parseFloat(lat) || 17.38, parseFloat(lng) || 78.49);
  res.json({ success: true, data: waitTime });
}));

// ── Recommendations Endpoints ─────────────────────────────────
app.get(`${API}/recommendations`, protect, asyncHandler(async (req, res) => {
  const { city = 'Hyderabad', limit = 8 } = req.query;
  const recs = await recommendationService.getPersonalizedRecommendations(req.user._id, { city, limit: parseInt(limit) });
  res.json({ success: true, data: recs });
}));

app.get(`${API}/recommendations/home-layout`, protect, asyncHandler(async (req, res) => {
  const { city = 'Hyderabad' } = req.query;
  const layout = await recommendationService.getHomeScreenLayout(req.user._id, city);
  res.json({ success: true, data: layout });
}));

app.get(`${API}/recommendations/complementary/:category`, protect, asyncHandler(async (req, res) => {
  const comps = await recommendationService.getComplementaryRecommendations(req.params.category, req.user._id);
  res.json({ success: true, data: comps });
}));

// ── v3 Routes (all missing endpoints wired) ──────────────────
const giftCardsRouter = require('./routes/giftCards');
const { versionRouter, configRouter, flashRouter, instantRouter, bidsRouter } = require('./routes/extraRoutes');
const serviceAreasRouter = require('./routes/extraRoutes'); // serviceAreas is also in extraRoutes

app.use(`${API}/gift-cards`,      giftCardsRouter);
app.use(`${API}/app-version`,     versionRouter);
app.use(`${API}/config`,          configRouter);
app.use(`${API}/flash-sales`,     flashRouter);
app.use(`${API}/instant-booking`, instantRouter);
app.use(`${API}/pro-bids`,        bidsRouter);


// ── Razorpay Webhook (with signature verification) ────────────
const crypto = require('crypto');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !secret) return res.status(400).json({ error: 'Missing signature or secret' });

  const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (signature !== expectedSignature) {
    console.error('[Razorpay Webhook] Invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body);
  const event = payload.event;

  console.log('[Razorpay Webhook] Event:', event);

  // Handle payment events
  if (event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const bookingId = payment.notes?.bookingId;
    if (bookingId) {
      const Booking = require('./models/Booking');
      const { onBookingConfirmed } = require('./controllers/bookingController');
      Booking.findByIdAndUpdate(bookingId, { status: 'confirmed', paymentId: payment.id, paidAt: new Date() })
        .then(booking => booking && onBookingConfirmed(booking))
        .catch(err => console.error('[Webhook] Booking update error:', err.message));
    }
  }

  if (event === 'payment.failed') {
    const payment = payload.payload.payment.entity;
    const bookingId = payment.notes?.bookingId;
    if (bookingId) {
      const Booking = require('./models/Booking');
      Booking.findByIdAndUpdate(bookingId, { status: 'payment_failed' }).catch(() => {});
    }
  }

  if (event === 'subscription.charged') {
    const sub = payload.payload.subscription.entity;
    console.log('[Razorpay] Subscription charged:', sub.id);
    // Handle subscription renewal
    const User = require('./models/User');
    User.findOne({ 'subscription.razorpaySubId': sub.id })
      .then(user => {
        if (user) {
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          user.subscription.validUntil = nextDate;
          user.subscription.status = 'active';
          return user.save();
        }
      }).catch(err => console.error('[Webhook] Subscription update error:', err.message));
  }

  res.json({ status: 'ok' });
});
