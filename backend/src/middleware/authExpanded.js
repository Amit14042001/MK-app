/**
 * MK App — Auth Middleware (Complete)
 * JWT verification, role-based access, optional auth, rate limits
 */
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const redis    = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'mk_jwt_secret_2025';

// ── Error helpers ─────────────────────────────────────────────
const authError = (res, message = 'Not authenticated', code = 401) =>
  res.status(code).json({ success: false, message });

// ── Token extractor ───────────────────────────────────────────
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies?.mk_token)       return req.cookies.mk_token;
  if (req.query?.token)            return req.query.token;
  return null;
}

// ── Core protect middleware ───────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return authError(res, 'Access denied. Please log in to continue.');

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError')  return authError(res, 'Session expired. Please log in again.');
      if (err.name === 'JsonWebTokenError')  return authError(res, 'Invalid token. Please log in again.');
      return authError(res, 'Authentication failed.');
    }

    // Check token blacklist (logout)
    const isBlacklisted = await redis.get(`blacklist:${token}`).catch(() => null);
    if (isBlacklisted) return authError(res, 'Session invalidated. Please log in again.');

    // Get user from DB (or cache)
    const cacheKey = `auth:user:${decoded.id}`;
    let user = await redis.get(cacheKey).catch(() => null);

    if (!user) {
      user = await User.findById(decoded.id).select('+password').lean();
      if (user) await redis.set(cacheKey, user, 60).catch(() => {}); // 1 min cache
    }

    if (!user) return authError(res, 'User account not found.');
    if (!user.isActive)  return authError(res, 'Your account has been deactivated. Contact support.', 403);
    if (user.isBlocked)  return authError(res, `Account suspended: ${user.blockedReason || 'Policy violation.'}`, 403);

    // Token version check (invalidates all old tokens on password change/logout-all)
    if (decoded.version !== undefined && user.refreshTokenVersion !== decoded.version) {
      return authError(res, 'Session expired. Please log in again.');
    }

    // Attach user to request
    req.user   = user;
    req.userId = user._id;
    req.token  = token;

    // Update last active (non-blocking, throttled)
    const activeKey = `active:${user._id}`;
    redis.get(activeKey).then(val => {
      if (!val) {
        redis.set(activeKey, 1, 300);
        User.findByIdAndUpdate(user._id, { lastActive: new Date() }).catch(() => {});
      }
    }).catch(() => {});

    next();
  } catch (err) {
    console.error('[Auth] protect error:', err.message);
    authError(res, 'Authentication error. Please try again.');
  }
};

// ── Optional auth (populates req.user if token present) ───────
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).lean();
    if (user && user.isActive && !user.isBlocked) {
      req.user   = user;
      req.userId = user._id;
    }
    next();
  } catch {
    next(); // ignore auth errors for optional auth
  }
};

// ── Role-based authorization ──────────────────────────────────
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) return authError(res, 'Authentication required.', 401);
  if (!roles.includes(req.user.role)) {
    return authError(res, `Access denied. Required role: ${roles.join(' or ')}.`, 403);
  }
  next();
};

// ── Professional-only guard ───────────────────────────────────
exports.proOnly = (req, res, next) => {
  if (!req.user) return authError(res, 'Authentication required.');
  if (req.user.role !== 'professional') return authError(res, 'Professional account required.', 403);
  next();
};

// ── Admin-only guard ──────────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (!req.user) return authError(res, 'Authentication required.');
  if (!['admin', 'support'].includes(req.user.role)) return authError(res, 'Admin access required.', 403);
  next();
};

// ── Verified user guard ───────────────────────────────────────
exports.requireVerified = (req, res, next) => {
  if (!req.user) return authError(res, 'Authentication required.');
  if (!req.user.isVerified && !req.user.isPhoneVerified) {
    return res.status(403).json({ success: false, message: 'Please verify your phone number.', code: 'UNVERIFIED' });
  }
  next();
};

// ── Active subscription guard ─────────────────────────────────
exports.requireSubscription = (...plans) => (req, res, next) => {
  if (!req.user) return authError(res, 'Authentication required.');
  const sub  = req.user.subscription;
  const now  = new Date();
  const hasActiveSub = sub?.status === 'active' && sub?.endDate > now;

  if (!hasActiveSub) {
    return res.status(403).json({ success: false, message: 'Active subscription required.', code: 'NO_SUBSCRIPTION' });
  }
  if (plans.length > 0 && !plans.includes(sub.plan)) {
    return res.status(403).json({
      success: false,
      message: `This feature requires a ${plans.join(' or ')} plan.`,
      code: 'INSUFFICIENT_PLAN',
      currentPlan: sub.plan,
    });
  }
  next();
};

// ── Ownership guard ───────────────────────────────────────────
exports.requireOwnership = (idField = 'userId') => (req, res, next) => {
  const resourceUserId = req.params[idField] || req.body[idField];
  if (!resourceUserId) return next(); // can't check, let controller handle
  if (req.user.role === 'admin') return next(); // admins bypass

  if (req.user._id.toString() !== resourceUserId.toString()) {
    return authError(res, 'You do not have permission to access this resource.', 403);
  }
  next();
};

// ── Logout: blacklist token ───────────────────────────────────
exports.blacklistToken = async (token, expiresIn = 3600 * 24 * 7) => {
  await redis.set(`blacklist:${token}`, 1, expiresIn).catch(() => {});
};

// ── Clear user auth cache ─────────────────────────────────────
exports.clearUserCache = async (userId) => {
  await redis.del(`auth:user:${userId}`).catch(() => {});
};
