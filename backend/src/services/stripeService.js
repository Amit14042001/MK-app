/**
 * MK App — Stripe Service
 * International payments for UAE, Singapore, UK, US expansion
 * Complements Razorpay (India) with Stripe (rest of world)
 */

let stripe = null;

function getStripe() {
  if (stripe) return stripe;
  if (!process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'test') {
    // Mock for test/dev
    return {
      paymentIntents: {
        create: async (opts) => ({
          id:             `pi_mock_${Date.now()}`,
          client_secret:  `pi_mock_${Date.now()}_secret_mock`,
          amount:         opts.amount,
          currency:       opts.currency,
          status:         'requires_payment_method',
        }),
        retrieve: async (id) => ({ id, status: 'succeeded', amount: 0 }),
        confirm:  async (id, opts) => ({ id, status: 'succeeded' }),
      },
      customers: {
        create:   async (opts) => ({ id: `cus_mock_${Date.now()}` }),
        retrieve: async (id)   => ({ id, email: '' }),
      },
      refunds: {
        create: async (opts) => ({ id: `re_mock_${Date.now()}`, status: 'succeeded' }),
      },
      webhooks: {
        constructEvent: (body, sig, secret) => JSON.parse(body),
      },
    };
  }
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  return stripe;
}

// ── Currency map by country code ─────────────────────────────
const CURRENCY_MAP = {
  IN:  { currency: 'inr',  symbol: '₹',  multiplier: 100 },   // India (use Razorpay instead)
  AE:  { currency: 'aed',  symbol: 'AED', multiplier: 100 },   // UAE
  SG:  { currency: 'sgd',  symbol: 'S$', multiplier: 100 },   // Singapore
  GB:  { currency: 'gbp',  symbol: '£',  multiplier: 100 },   // UK
  US:  { currency: 'usd',  symbol: '$',  multiplier: 100 },   // USA
  AU:  { currency: 'aud',  symbol: 'A$', multiplier: 100 },   // Australia
  CA:  { currency: 'cad',  symbol: 'C$', multiplier: 100 },   // Canada
  EU:  { currency: 'eur',  symbol: '€',  multiplier: 100 },   // Europe
};

// ── Create Payment Intent ─────────────────────────────────────
exports.createPaymentIntent = async (booking, countryCode = 'AE') => {
  const s = getStripe();
  const currencyInfo = CURRENCY_MAP[countryCode.toUpperCase()] || CURRENCY_MAP.AE;
  const amountInSmallestUnit = Math.round(booking.pricing.totalAmount * currencyInfo.multiplier);

  const intent = await s.paymentIntents.create({
    amount:   amountInSmallestUnit,
    currency: currencyInfo.currency,
    metadata: {
      bookingId:   booking._id.toString(),
      bookingRef:  booking.bookingId,
      customerId:  booking.customer.toString(),
      appName:     'MKApp',
      countryCode,
    },
    description: `MK App Booking: ${booking.bookingId}`,
    // Enable multiple payment method types for the region
    payment_method_types: getPaymentMethodsForRegion(countryCode),
  });

  return {
    clientSecret:   intent.client_secret,
    paymentIntentId: intent.id,
    currency:       currencyInfo.currency,
    symbol:         currencyInfo.symbol,
    amount:         booking.pricing.totalAmount,
  };
};

// ── Create Store Payment Intent ───────────────────────────────
exports.createStorePaymentIntent = async (order, countryCode = 'AE') => {
  const s = getStripe();
  const currencyInfo = CURRENCY_MAP[countryCode.toUpperCase()] || CURRENCY_MAP.AE;
  const amountInSmallestUnit = Math.round(order.pricing.totalAmount * currencyInfo.multiplier);

  const intent = await s.paymentIntents.create({
    amount:   amountInSmallestUnit,
    currency: currencyInfo.currency,
    metadata: {
      orderId:     order._id.toString(),
      orderRef:    order.orderId,
      customerId:  order.user.toString(),
      type:        'store_order',
    },
    description: `MK Store Order: ${order.orderId}`,
    payment_method_types: getPaymentMethodsForRegion(countryCode),
  });

  return {
    clientSecret:   intent.client_secret,
    paymentIntentId: intent.id,
    currency:       currencyInfo.currency,
    symbol:         currencyInfo.symbol,
  };
};

// ── Verify Payment Intent ─────────────────────────────────────
exports.verifyPaymentIntent = async (paymentIntentId) => {
  const s = getStripe();
  const intent = await s.paymentIntents.retrieve(paymentIntentId);
  return {
    success: intent.status === 'succeeded',
    status:  intent.status,
    amount:  intent.amount,
    currency:intent.currency,
    metadata:intent.metadata,
  };
};

// ── Refund ────────────────────────────────────────────────────
exports.createRefund = async (paymentIntentId, amount, reason = 'requested_by_customer') => {
  const s = getStripe();
  const refund = await s.refunds.create({
    payment_intent: paymentIntentId,
    amount:         amount ? Math.round(amount * 100) : undefined, // partial refund if amount specified
    reason,
  });
  return {
    refundId: refund.id,
    status:   refund.status,
    amount:   refund.amount / 100,
  };
};

// ── Create or get Stripe Customer ────────────────────────────
exports.getOrCreateCustomer = async (user) => {
  const s = getStripe();
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  const customer = await s.customers.create({
    email: user.email,
    phone: `+91${user.phone}`,
    name:  user.name,
    metadata: { userId: user._id.toString(), appName: 'MKApp' },
  });
  return customer.id;
};

// ── Webhook Handler ───────────────────────────────────────────
exports.handleWebhook = async (rawBody, signature) => {
  const s = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  let event;

  try {
    event = s.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  return event;
};

// ── Helper: payment methods per region ───────────────────────
function getPaymentMethodsForRegion(countryCode) {
  const methods = {
    AE: ['card', 'link'],
    SG: ['card', 'paynow', 'grabpay'],
    GB: ['card', 'link', 'bacs_debit'],
    US: ['card', 'link', 'us_bank_account'],
    AU: ['card', 'au_becs_debit'],
    IN: ['card'],  // In India use Razorpay; Stripe as fallback cards only
  };
  return methods[countryCode.toUpperCase()] || ['card'];
}

// ── Supported countries ───────────────────────────────────────
exports.SUPPORTED_COUNTRIES = Object.keys(CURRENCY_MAP).map(code => ({
  code,
  ...CURRENCY_MAP[code],
}));
