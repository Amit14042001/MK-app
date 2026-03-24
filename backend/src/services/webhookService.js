/**
 * Slot App — Webhook Retry Queue Service
 * Feature #38: Failed webhook deliveries retried with exponential backoff
 */
const axios  = require('axios');
const crypto = require('crypto');
const redis  = require('../config/redis');

const MAX_RETRIES    = 5;
const BASE_DELAY_MS  = 1000; // 1 second
const QUEUE_KEY      = 'webhook:retry_queue';
const REGISTRY_KEY   = 'webhook:registry';

// ── Webhook registry — MongoDB-backed with in-memory cache ───
const webhooksCache = new Map(); // in-memory LRU cache for speed

async function getWebhookModel() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.modelNames().includes('Webhook')) return mongoose.model('Webhook');
    const schema = new mongoose.Schema({
      id:        { type: String, required: true, unique: true },
      url:       { type: String, required: true },
      events:    [String],
      secret:    String,
      isActive:  { type: Boolean, default: true },
      createdAt: { type: Date,    default: Date.now },
    });
    return mongoose.model('Webhook', schema);
  } catch { return null; }
}

async function loadWebhooksFromDB() {
  const Webhook = await getWebhookModel();
  if (!Webhook) return;
  const all = await Webhook.find({ isActive: true }).lean();
  all.forEach(w => webhooksCache.set(w.id, w));
}
// Load on startup
loadWebhooksFromDB().catch(() => {});

/**
 * Register a new webhook endpoint
 */
function registerWebhook(id, url, events, secret) {
  webhooks.set(id, {
    id, url, events,
    secret:       secret || crypto.randomBytes(32).toString('hex'),
    isActive:     true,
    createdAt:    new Date(),
    failCount:    0,
    successCount: 0,
    lastSuccess:  null,
    lastFailure:  null,
  });
  return webhooks.get(id);
}

/**
 * Build webhook signature
 */
function buildSignature(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

/**
 * Send webhook to endpoint with timeout
 */
async function deliverWebhook(webhook, event, payload) {
  const signature = buildSignature(payload, webhook.secret);
  const response  = await axios.post(webhook.url, {
    event,
    payload,
    timestamp:  new Date().toISOString(),
    webhookId:  webhook.id,
    deliveryId: crypto.randomUUID(),
  }, {
    timeout: 10000, // 10 second timeout
    headers: {
      'Content-Type':          'application/json',
      'X-MKApp-Signature':     signature,
      'X-MKApp-Event':         event,
      'X-MKApp-Delivery':      crypto.randomUUID(),
      'User-Agent':            'MKApp-Webhooks/1.0',
    },
  });

  return { success: true, statusCode: response.status };
}

/**
 * Schedule webhook delivery with retry logic
 */
async function scheduleWebhook(webhookId, event, payload, attempt = 0) {
  const webhook = webhooks.get(webhookId);
  if (!webhook || !webhook.isActive) return;

  // Check if webhook is subscribed to this event
  if (!webhook.events.includes(event) && !webhook.events.includes('*')) return;

  const job = {
    id:         `whk_${webhookId}_${event}_${Date.now()}`,
    webhookId,
    event,
    payload,
    attempt,
    scheduledAt: new Date().toISOString(),
    nextRetryAt: new Date(Date.now() + calculateDelay(attempt)).toISOString(),
  };

  try {
    await redis.set(`webhook:job:${job.id}`, job, 86400); // store for 24h
    console.log(`[WebhookQueue] Scheduled: ${event} → ${webhook.url} (attempt ${attempt + 1})`);

    // Use setImmediate for zero-delay jobs, setTimeout for retry backoff
    const delay = calculateDelay(attempt);
    const schedule = delay <= 0
      ? (fn) => setImmediate(fn)
      : (fn) => setTimeout(fn, delay);

    schedule(() => processWebhookJob(job));
  } catch (e) {
    console.error('[WebhookQueue] Schedule error:', e.message);
  }
}

/**
 * Process a webhook job
 */
async function processWebhookJob(job) {
  const webhook = webhooks.get(job.webhookId);
  if (!webhook) return;

  try {
    const result = await deliverWebhook(webhook, job.event, job.payload);

    webhook.successCount++;
    webhook.lastSuccess = new Date();
    console.log(`[WebhookQueue] ✅ Delivered: ${job.event} → ${webhook.url} [${result.statusCode}]`);

    await redis.del(`webhook:job:${job.id}`);
  } catch (error) {
    const statusCode = error.response?.status || 0;
    console.warn(`[WebhookQueue] ❌ Failed: ${job.event} → ${webhook.url} [${statusCode}] Attempt ${job.attempt + 1}/${MAX_RETRIES}`);

    webhook.failCount++;
    webhook.lastFailure = new Date();

    if (job.attempt < MAX_RETRIES - 1) {
      // Schedule retry with exponential backoff
      const nextAttempt = job.attempt + 1;
      const delay       = calculateDelay(nextAttempt);
      console.log(`[WebhookQueue] Retry in ${delay / 1000}s...`);
      setTimeout(() => processWebhookJob({ ...job, attempt: nextAttempt }), delay);
    } else {
      console.error(`[WebhookQueue] 🚫 Max retries exhausted for ${job.event} → ${webhook.url}`);
      webhook.isActive = false; // Disable after too many failures

      await redis.set(`webhook:dead:${job.id}`, {
        ...job,
        failedAt:    new Date().toISOString(),
        error:       error.message,
        statusCode,
      }, 86400 * 7); // keep dead letters for 7 days
    }
  }
}

/**
 * Exponential backoff calculation
 * attempt 0: 1s, 1: 2s, 2: 4s, 3: 8s, 4: 16s
 */
function calculateDelay(attempt) {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Emit event to all registered webhooks
 */
async function emit(event, payload) {
  for (const [id, webhook] of webhooks.entries()) {
    if (webhook.isActive) {
      await scheduleWebhook(id, event, payload);
    }
  }
}

/**
 * Get webhook delivery stats
 */
function getStats() {
  const stats = [];
  for (const [id, webhook] of webhooks.entries()) {
    stats.push({
      id,
      url:          webhook.url,
      events:       webhook.events,
      isActive:     webhook.isActive,
      successCount: webhook.successCount,
      failCount:    webhook.failCount,
      lastSuccess:  webhook.lastSuccess,
      lastFailure:  webhook.lastFailure,
    });
  }
  return stats;
}

/**
 * Reactivate a disabled webhook
 */
function reactivateWebhook(id) {
  const webhook = webhooks.get(id);
  if (webhook) { webhook.isActive = true; webhook.failCount = 0; }
  return webhook;
}

/**
 * List dead letter queue
 */
async function getDeadLetters() {
  const keys = await redis.keys('webhook:dead:*').catch(() => []);
  const letters = [];
  for (const key of keys) {
    const val = await redis.get(key).catch(() => null);
    if (val) letters.push(val);
  }
  return letters;
}

/**
 * Replay a dead letter
 */
async function replayDeadLetter(jobId) {
  const job = await redis.get(`webhook:dead:${jobId}`).catch(() => null);
  if (!job) throw new Error('Dead letter not found');
  await redis.del(`webhook:dead:${jobId}`);
  const webhook = webhooks.get(job.webhookId);
  if (webhook) webhook.isActive = true;
  await scheduleWebhook(job.webhookId, job.event, job.payload, 0);
  return { replayed: true, jobId };
}

// ── Pre-register core webhooks for known integrations ─────────
registerWebhook('razorpay_main', process.env.RAZORPAY_WEBHOOK_URL || 'https://api.slotapp.in/webhooks/razorpay', ['payment.*'], process.env.RAZORPAY_WEBHOOK_SECRET || 'rp_secret');

module.exports = {
  registerWebhook,
  scheduleWebhook,
  emit,
  getStats,
  reactivateWebhook,
  getDeadLetters,
  replayDeadLetter,
  calculateDelay,
  MAX_RETRIES,
};
