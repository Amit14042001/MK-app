/**
 * MK App — Cache Service Tests
 */
const mongoose = require('mongoose');

const redisMock = {
  store:      {},
  get:        jest.fn(async (k) => redisMock.store[k] ?? null),
  set:        jest.fn(async (k, v, ttl) => { redisMock.store[k] = v; return 'OK'; }),
  del:        jest.fn(async (k) => { delete redisMock.store[k]; return 1; }),
  delPattern: jest.fn(async (p) => {
    const prefix = p.replace('*', '');
    Object.keys(redisMock.store).filter(k => k.startsWith(prefix)).forEach(k => delete redisMock.store[k]);
    return 1;
  }),
  incr:       jest.fn(async (k) => { redisMock.store[k] = (redisMock.store[k] || 0) + 1; return redisMock.store[k]; }),
  expire:     jest.fn().mockResolvedValue(1),
};

jest.mock('../../backend/src/config/redis', () => redisMock);

const cacheService = require('../../backend/src/services/cacheService');

beforeEach(() => {
  redisMock.store = {};
  jest.clearAllMocks();
});

describe('CacheService.withCache', () => {
  it('should call fn on cache miss', async () => {
    const fn     = jest.fn().mockResolvedValue({ data: 'fresh' });
    const result = await cacheService.withCache('test:key', fn, 300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'fresh' });
  });

  it('should return cached value on hit', async () => {
    const fn = jest.fn().mockResolvedValue({ data: 'fresh' });

    // First call — cache miss
    await cacheService.withCache('test:key2', fn, 300);
    // Second call — cache hit
    await cacheService.withCache('test:key2', fn, 300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should store result in cache', async () => {
    const fn = jest.fn().mockResolvedValue({ value: 42 });
    await cacheService.withCache('test:store', fn, 300);

    expect(redisMock.set).toHaveBeenCalled();
    const cachedVal = redisMock.store['test:store'];
    expect(cachedVal).toEqual({ value: 42 });
  });

  it('should not cache null/undefined values', async () => {
    const fn = jest.fn().mockResolvedValue(null);
    await cacheService.withCache('test:null', fn, 300);

    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('should fallback to fn on redis error', async () => {
    redisMock.get.mockRejectedValueOnce(new Error('Redis error'));
    const fn = jest.fn().mockResolvedValue({ fallback: true });

    const result = await cacheService.withCache('test:error', fn, 300);
    expect(result).toEqual({ fallback: true });
  });
});

describe('CacheService OTP functions', () => {
  it('should store and retrieve OTP', async () => {
    await cacheService.setOTP('+919876543210', '123456', 600);
    const otp = await cacheService.getOTP('+919876543210');
    expect(otp).toBe('123456');
  });

  it('should delete OTP', async () => {
    await cacheService.setOTP('+919876543211', '654321', 600);
    await cacheService.deleteOTP('+919876543211');
    const otp = await cacheService.getOTP('+919876543211');
    expect(otp).toBeNull();
  });
});

describe('CacheService rate limiting', () => {
  it('should increment rate limit counter', async () => {
    const count1 = await cacheService.incrementRateLimit('ip:1.2.3.4:login');
    const count2 = await cacheService.incrementRateLimit('ip:1.2.3.4:login');
    expect(count2).toBeGreaterThan(count1);
  });

  it('should return 0 for uncounted key', async () => {
    const count = await cacheService.getRateLimitCount('new:key:9999');
    expect(count).toBe(0);
  });
});

describe('CacheService session functions', () => {
  it('should store and retrieve session', async () => {
    const session = { userId: 'user123', role: 'customer', createdAt: new Date() };
    await cacheService.setSession('sess_abc123', session, 3600);
    const retrieved = await cacheService.getSession('sess_abc123');
    expect(retrieved).toEqual(session);
  });

  it('should delete session', async () => {
    await cacheService.setSession('sess_del', { userId: 'user456' }, 3600);
    await cacheService.deleteSession('sess_del');
    const retrieved = await cacheService.getSession('sess_del');
    expect(retrieved).toBeNull();
  });
});

describe('CacheService refresh token functions', () => {
  it('should store and retrieve refresh token', async () => {
    await cacheService.setRefreshToken('user_abc', 'token_xyz_123', 604800);
    const token = await cacheService.getRefreshToken('user_abc');
    expect(token).toBe('token_xyz_123');
  });

  it('should delete refresh token on logout', async () => {
    await cacheService.setRefreshToken('user_logout', 'token_to_delete', 604800);
    await cacheService.deleteRefreshToken('user_logout');
    const token = await cacheService.getRefreshToken('user_logout');
    expect(token).toBeNull();
  });
});

describe('CacheService invalidation', () => {
  it('should invalidate all booking cache for user', async () => {
    redisMock.store['bookings:user:abc:{}'] = [{ id: 1 }];
    redisMock.store['bookings:user:abc:{status:completed}'] = [{ id: 2 }];

    await cacheService.invalidateBookingCache('abc');

    expect(redisMock.delPattern).toHaveBeenCalled();
  });

  it('should invalidate analytics cache', async () => {
    redisMock.store['analytics:overview:month'] = { data: 'old' };
    await cacheService.invalidateAnalytics();
    expect(redisMock.delPattern).toHaveBeenCalledWith('analytics:*');
  });
});

describe('CacheService socket state', () => {
  it('should track user online status', async () => {
    await cacheService.setUserOnline('user_online_1', 'socket_id_abc');
    const socketId = await cacheService.getUserSocketId('user_online_1');
    expect(socketId).toBe('socket_id_abc');
  });

  it('should remove user from online state', async () => {
    await cacheService.setUserOnline('user_offline_1', 'socket_id_xyz');
    await cacheService.setUserOffline('user_offline_1');
    const socketId = await cacheService.getUserSocketId('user_offline_1');
    expect(socketId).toBeNull();
  });
});
