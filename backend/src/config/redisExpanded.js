/**
 * MK App — Redis Config (Complete)
 * Connection, helpers, cache middleware, rate limiter, pub/sub
 */
const { createClient } = require('redis');

let client = null;
let isConnected = false;

// ── Connect ───────────────────────────────────────────────────
async function connectRedis() {
  if (isConnected && client) return client;

  if (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL) {
    // In-memory mock for test/dev without Redis
    console.log('[Redis] Using in-memory mock cache');
    client      = createMemoryMock();
    isConnected = true;
    return client;
  }

  try {
    client = createClient({
      url:     process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        connectTimeout:    5000,
      },
    });

    client.on('error',     (err) => console.error('[Redis] Error:', err.message));
    client.on('connect',   ()    => console.log('[Redis] Connected'));
    client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));
    client.on('ready',     ()    => { isConnected = true; console.log('[Redis] Ready'); });
    client.on('end',       ()    => { isConnected = false; });

    await client.connect();
    isConnected = true;
    return client;
  } catch (err) {
    console.warn('[Redis] Connection failed, using in-memory fallback:', err.message);
    client      = createMemoryMock();
    isConnected = true;
    return client;
  }
}

// ── In-Memory Mock (dev/test fallback) ────────────────────────
function createMemoryMock() {
  const store    = new Map();
  const expiries = new Map();

  const isExpired = (key) => {
    const exp = expiries.get(key);
    if (!exp) return false;
    if (Date.now() > exp) { store.delete(key); expiries.delete(key); return true; }
    return false;
  };

  return {
    isConnected: true,
    isMock: true,

    async get(key) {
      if (isExpired(key)) return null;
      const raw = store.get(key);
      if (raw === undefined) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    },

    async set(key, value, ttlSeconds) {
      const serialised = typeof value === 'string' ? value : JSON.stringify(value);
      store.set(key, serialised);
      if (ttlSeconds) expiries.set(key, Date.now() + ttlSeconds * 1000);
      return 'OK';
    },

    async del(key) {
      store.delete(key);
      expiries.delete(key);
      return 1;
    },

    async delPattern(pattern) {
      const prefix = pattern.replace(/\*/g, '');
      let count = 0;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) { store.delete(key); expiries.delete(key); count++; }
      }
      return count;
    },

    async incr(key) {
      const val = parseInt(await this.get(key) || '0') + 1;
      await this.set(key, String(val));
      return val;
    },

    async expire(key, ttl) {
      if (store.has(key)) expiries.set(key, Date.now() + ttl * 1000);
      return 1;
    },

    async exists(key) {
      if (isExpired(key)) return 0;
      return store.has(key) ? 1 : 0;
    },

    async keys(pattern) {
      const prefix = pattern.replace(/\*/g, '');
      return [...store.keys()].filter(k => !isExpired(k) && k.startsWith(prefix));
    },

    async flushAll() { store.clear(); expiries.clear(); return 'OK'; },

    async hSet(key, field, value) {
      const obj = JSON.parse(store.get(key) || '{}');
      obj[field] = value;
      store.set(key, JSON.stringify(obj));
      return 1;
    },

    async hGet(key, field) {
      const obj = JSON.parse(store.get(key) || '{}');
      return obj[field] ?? null;
    },

    async hGetAll(key) {
      if (isExpired(key)) return {};
      return JSON.parse(store.get(key) || '{}');
    },

    async zAdd(key, items) {
      const obj = JSON.parse(store.get(key) || '{}');
      items.forEach(({ score, value }) => { obj[value] = score; });
      store.set(key, JSON.stringify(obj));
      return items.length;
    },

    async zRange(key, start, stop, options = {}) {
      const obj = JSON.parse(store.get(key) || '{}');
      const arr = Object.entries(obj).sort((a, b) => a[1] - b[1]).map(([v]) => v);
      return arr.slice(start, stop + 1);
    },

    async publish(channel, message) { return 0; },
    async subscribe(channel, cb) { return; },
    quit: async () => {},
    disconnect: async () => {},
  };
}

// ── Proxy: get/set with JSON serialization ────────────────────
const redisProxy = {
  async get(key) {
    if (!client) await connectRedis();
    try {
      const val = await client.get(key);
      if (val === null || val === undefined) return null;
      if (typeof val === 'object') return val; // mock already parsed
      try { return JSON.parse(val); } catch { return val; }
    } catch (e) {
      console.error(`[Redis] GET error (${key}):`, e.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    if (!client) await connectRedis();
    try {
      if (client.isMock) return client.set(key, value, ttlSeconds);
      const serialised = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) return client.setEx(key, ttlSeconds, serialised);
      return client.set(key, serialised);
    } catch (e) {
      console.error(`[Redis] SET error (${key}):`, e.message);
      return null;
    }
  },

  async del(key) {
    if (!client) await connectRedis();
    try { return client.del(key); } catch { return 0; }
  },

  async delPattern(pattern) {
    if (!client) await connectRedis();
    try {
      if (client.isMock) return client.delPattern(pattern);
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return client.del(keys);
    } catch { return 0; }
  },

  async incr(key) {
    if (!client) await connectRedis();
    try { return client.incr(key); } catch { return 1; }
  },

  async expire(key, ttl) {
    if (!client) await connectRedis();
    try { return client.expire(key, ttl); } catch { return 0; }
  },

  async exists(key) {
    if (!client) await connectRedis();
    try { return client.exists(key); } catch { return 0; }
  },

  // ── Express cache middleware ──────────────────────────────
  cache(prefix, ttl = 300) {
    return async (req, res, next) => {
      try {
        const key    = `${prefix}:${req.originalUrl}`;
        const cached = await redisProxy.get(key);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }
        res.setHeader('X-Cache', 'MISS');
        const originalJson = res.json.bind(res);
        res.json = (data) => {
          if (res.statusCode < 400) redisProxy.set(key, data, ttl).catch(() => {});
          return originalJson(data);
        };
        next();
      } catch {
        next();
      }
    };
  },

  // ── Rate limiter ──────────────────────────────────────────
  rateLimiter(keyFn, max = 10, window = 60) {
    return async (req, res, next) => {
      try {
        const key   = `rl:${keyFn(req)}`;
        const count = await redisProxy.incr(key);
        if (count === 1) await redisProxy.expire(key, window);
        if (count > max) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests. Please slow down.',
            retryAfter: window,
          });
        }
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
        next();
      } catch {
        next(); // never block on cache failure
      }
    };
  },

  getClient: () => client,
  isReady:   () => isConnected,
};

module.exports = { ...redisProxy, connectRedis };
