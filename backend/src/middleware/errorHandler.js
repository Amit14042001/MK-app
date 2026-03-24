/**
 * Slot App — Error Handler Middleware (Full)
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper — eliminates try/catch in controllers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message  = err.message;
  error.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error(`❌ [${req.method}] ${req.originalUrl}:`, err.message);
  }

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    error.message = `Resource not found (invalid id: ${err.value})`;
    error.statusCode = 404;
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    error.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error.statusCode = 400;
  }

  // Mongoose: validation
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map((e) => e.message).join(', ');
    error.statusCode = 400;
  }

  // JWT
  if (err.name === 'JsonWebTokenError')  { error.message = 'Invalid token';  error.statusCode = 401; }
  if (err.name === 'TokenExpiredError')  { error.message = 'Token expired';  error.statusCode = 401; }

  // Multer
  if (err.code === 'LIMIT_FILE_SIZE') { error.message = 'File too large (max 5MB)'; error.statusCode = 400; }
  if (err.code === 'LIMIT_FILE_COUNT') { error.message = 'Too many files'; error.statusCode = 400; }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') { error.message = `Unexpected field: ${err.field}`; error.statusCode = 400; }

  // SyntaxError (bad JSON)
  if (err.type === 'entity.parse.failed') { error.message = 'Invalid JSON body'; error.statusCode = 400; }

  // Razorpay signature mismatch (custom)
  if (err.message?.includes('Payment verification failed')) error.statusCode = 400;

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err }),
  });
};

// 404 handler for unknown routes
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = { AppError, asyncHandler, errorHandler, notFound };
