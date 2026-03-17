/**
 * MK App — Error Handler Middleware (Complete)
 * Global error handling, async wrapper, custom error classes
 */

// ── Custom Error Classes ──────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode  = statusCode;
    this.status      = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    this.code        = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 422, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// ── Async handler wrapper ────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Mongoose error handlers ───────────────────────────────────
function handleCastError(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
}

function handleDuplicateKey(err) {
  const field  = Object.keys(err.keyValue || {})[0] || 'field';
  const value  = err.keyValue?.[field] || '';
  return new AppError(`${field} "${value}" is already taken. Please use a different value.`, 409, 'DUPLICATE');
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map(e => e.message);
  const fields   = {};
  Object.entries(err.errors).forEach(([key, e]) => { fields[key] = e.message; });
  return new ValidationError(messages.join('. '), fields);
}

function handleJWTError() {
  return new UnauthorizedError('Invalid token. Please log in again.');
}

function handleJWTExpiredError() {
  return new UnauthorizedError('Your session has expired. Please log in again.');
}

// ── Send error response ───────────────────────────────────────
function sendErrorDev(err, res) {
  res.status(err.statusCode || 500).json({
    success:    false,
    status:     err.status || 'error',
    message:    err.message,
    code:       err.code,
    stack:      err.stack,
    error:      err,
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    const resp = {
      success: false,
      message: err.message,
      code:    err.code,
    };
    if (err.fields) resp.fields = err.fields;
    return res.status(err.statusCode).json(resp);
  }

  // Programming/unknown error — don't leak details
  console.error('[ERROR] Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
    code:    'INTERNAL_ERROR',
  });
}

// ── Global error handler ──────────────────────────────────────
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message    = err.message;
  error.statusCode = err.statusCode || 500;

  // Log all errors (except 404 which are too noisy)
  if (error.statusCode !== 404) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — ${error.statusCode}: ${error.message}`);
    if (process.env.NODE_ENV === 'development' && error.statusCode >= 500) {
      console.error(err.stack);
    }
  }

  // Transform specific MongoDB/JWT errors
  if (err.name === 'CastError')                         error = handleCastError(err);
  if (err.code === 11000 || err.code === 11001)         error = handleDuplicateKey(err);
  if (err.name === 'ValidationError')                   error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')                 error = handleJWTError();
  if (err.name === 'TokenExpiredError')                 error = handleJWTExpiredError();
  if (err.type === 'entity.too.large')                  error = new AppError('Request body too large', 413);
  if (err.code === 'ECONNREFUSED')                      error = new AppError('Service temporarily unavailable', 503);
  if (err.message?.includes('ENOTFOUND'))               error = new AppError('Network error', 503);

  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (isDev) return sendErrorDev(error, res);
  return sendErrorProd(error, res);
}

// ── 404 handler ───────────────────────────────────────────────
function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

// ── Request validator helper ──────────────────────────────────
function validateRequired(fields, body) {
  const missing = fields.filter(f => !body[f] && body[f] !== 0);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, Object.fromEntries(missing.map(f => [f, 'This field is required'])));
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  asyncHandler,
  errorHandler,
  notFound,
  validateRequired,
};
