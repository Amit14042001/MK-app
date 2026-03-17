const { createClient } = require('redis');

let client = null;
let isConnected = false;

// ── Connect ────────────────────────────────────────────────
const connectRedis = async () => {
  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) },
    });
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.on('connect', () => { isConnected = true; console.log('[Redis] Connected'); });
    client.on('disconnect', () => { isConnected = false; });
    await client.connect();
    return client;
  } catch (err) {
    console.warn('[Redis] Could not connect — caching disabled:', err.message);
    return null;
  }
};

// ── Cache middleware factory ───────────────────────────────
// Usage: router.get('/services', cache('services', 300), controller)
const cache = (keyPrefix, ttlSeconds = 300) => async (req, res, next) => {
  if (!isConnected || !client) return next();
  try {
    const key = `${keyPrefix}:${JSON.stringify(req.query)}:${req.params?.id || ''}:${req.user?.city || 'all'}`;
    const cached = await client.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
    // Monkey-patch res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        client.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };
    next();
  } catch (err) {
    console.error('[Redis] Cache middleware error:', err.message);
    next();
  }
};

// ── Manual cache helpers ───────────────────────────────────
const get = async (key) => {
  if (!isConnected || !client) return null;
  try { const v = await client.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
};

const set = async (key, value, ttlSeconds = 300) => {
  if (!isConnected || !client) return;
  try { await client.setEx(key, ttlSeconds, JSON.stringify(value)); } catch {}
};

const del = async (...keys) => {
  if (!isConnected || !client) return;
  try { await client.del(keys); } catch {}
};

const delPattern = async (pattern) => {
  if (!isConnected || !client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length) await client.del(keys);
    console.log(`[Redis] Invalidated ${keys.length} keys matching "${pattern}"`);
  } catch {}
};

// ── Rate limiter using Redis ───────────────────────────────
const rateLimiter = (keyFn, maxRequests, windowSeconds) => async (req, res, next) => {
  if (!isConnected || !client) return next();
  try {
    const key = `ratelimit:${keyFn(req)}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSeconds);
    if (count > maxRequests) {
      return res.status(429).json({ success: false, message: `Too many requests. Try again in ${windowSeconds}s.` });
    }
    res.set('X-RateLimit-Remaining', maxRequests - count);
    next();
  } catch { next(); }
};

// ── Session store helper ──────────────────────────────────
const setSession = async (sessionId, data, ttlSeconds = 3600) => set(`session:${sessionId}`, data, ttlSeconds);
const getSession = async (sessionId) => get(`session:${sessionId}`);
const delSession = async (sessionId) => del(`session:${sessionId}`);

// ── OTP store ─────────────────────────────────────────────
const setOTP = async (phone, otp) => set(`otp:${phone}`, { otp, attempts: 0 }, 600); // 10 min TTL
const getOTP = async (phone) => get(`otp:${phone}`);
const delOTP = async (phone) => del(`otp:${phone}`);

module.exports = {
  connectRedis, cache, get, set, del, delPattern,
  rateLimiter, setSession, getSession, delSession,
  setOTP, getOTP, delOTP,
  getClient: () => client,
  KEYS: {
    CATEGORIES_ALL: 'categories:all',
    SERVICES_FEATURED: (city = 'all') => `services:featured:${city}`,
    SERVICE_ONE: (id) => `service:one:${id}`,
    PRO_PROFILE: (id) => `pro:profile:${id}`,
  },
  TTL: {
    CATEGORIES: 3600 * 24, // 24h
    SERVICES: 3600,       // 1h
    PRO_PROFILE: 3600 * 6, // 6h
  },
  isConnected: () => isConnected,
};
