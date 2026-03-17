/**
 * MK App — Middleware Collection
 * upload, validation, pagination, response formatter, rate-limiter helpers
 */

const multer    = require('multer');
const path      = require('path');
const { AppError } = require('./errorHandler');

// ══════════════════════════════════════════════════════════════
// UPLOAD MIDDLEWARE (multer + optional Cloudinary)
// ══════════════════════════════════════════════════════════════
const ALLOWED_TYPES = {
  image:    ['image/jpeg','image/png','image/webp','image/gif'],
  document: ['image/jpeg','image/png','application/pdf'],
  any:      ['image/jpeg','image/png','image/webp','application/pdf','video/mp4'],
};

const MAX_SIZES = {
  image:    5  * 1024 * 1024,  // 5MB
  document: 10 * 1024 * 1024,  // 10MB
  video:    50 * 1024 * 1024,  // 50MB
};

// Memory storage — file available at req.file.buffer
const memoryStorage = multer.memoryStorage();

const createUploader = (type = 'image', fieldName = 'file', maxCount = 1) => {
  return multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_SIZES[type] || MAX_SIZES.image },
    fileFilter: (req, file, cb) => {
      const allowed = ALLOWED_TYPES[type] || ALLOWED_TYPES.image;
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError(`Invalid file type. Allowed: ${allowed.join(', ')}`, 400));
      }
    },
  })[maxCount > 1 ? 'array' : 'single'](fieldName, maxCount);
};

// Upload to Cloudinary
const uploadToCloudinary = async (buffer, folder, options = {}) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    // Dev: save to local
    const fileName = `upload_${Date.now()}.jpg`;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    require('fs').writeFileSync(filePath, buffer);
    return { url: `/uploads/${fileName}`, publicId: fileName };
  }

  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `mk-app/${folder}`, ...options },
      (err, result) => err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
    );
    stream.end(buffer);
  });
};

const uploadSingleImage = (fieldName = 'image', folder = 'general') => [
  createUploader('image', fieldName),
  async (req, res, next) => {
    if (!req.file) return next();
    try {
      const result = await uploadToCloudinary(req.file.buffer, folder, { transformation:[{width:800,quality:'auto',fetch_format:'auto'}] });
      req.uploadedFile = result;
      next();
    } catch (err) {
      next(new AppError('Image upload failed: ' + err.message, 500));
    }
  },
];

const uploadMultipleImages = (fieldName = 'images', folder = 'general', maxCount = 5) => [
  createUploader('image', fieldName, maxCount),
  async (req, res, next) => {
    if (!req.files?.length) return next();
    try {
      req.uploadedFiles = await Promise.all(
        req.files.map(f => uploadToCloudinary(f.buffer, folder, { transformation:[{width:800,quality:'auto'}] }))
      );
      next();
    } catch (err) {
      next(new AppError('Upload failed: ' + err.message, 500));
    }
  },
];

const uploadDocument = (fieldName = 'document', folder = 'documents') => [
  createUploader('document', fieldName),
  async (req, res, next) => {
    if (!req.file) return next();
    try {
      const result = await uploadToCloudinary(req.file.buffer, folder, { resource_type:'auto' });
      req.uploadedDocument = result;
      next();
    } catch (err) {
      next(new AppError('Document upload failed', 500));
    }
  },
];

// ══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE
// ══════════════════════════════════════════════════════════════
const Joi = require('joi').default || require('joi');

const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map(d => d.message.replace(/['"]/g, '')).join('; ');
    return next(new AppError(messages, 400));
  }

  req[target] = value;
  next();
};

// Common validation schemas
const schemas = {
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.pattern.base': 'Phone number must be a valid 10-digit Indian mobile number',
  }),

  sendOTP: Joi.object({
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  }),

  verifyOTP: Joi.object({
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    otp:   Joi.string().length(4).pattern(/^\d+$/).required(),
    name:  Joi.string().min(2).max(50).optional(),
  }),

  createBooking: Joi.object({
    serviceId:      Joi.string().required(),
    categoryId:     Joi.string().required(),
    subServiceName: Joi.string().optional(),
    scheduledDate:  Joi.date().min('now').required(),
    scheduledTime:  Joi.string().required(),
    paymentMethod:  Joi.string().valid('online','cash','wallet','corporate').default('cash'),
    address:        Joi.object({
      label:    Joi.string().optional(),
      line1:    Joi.string().required(),
      line2:    Joi.string().optional(),
      area:     Joi.string().optional(),
      city:     Joi.string().required(),
      state:    Joi.string().optional(),
      pincode:  Joi.string().pattern(/^\d{6}$/).required(),
      landmark: Joi.string().optional(),
      lat:      Joi.number().optional(),
      lng:      Joi.number().optional(),
    }).required(),
    couponCode: Joi.string().optional(),
    notes:      Joi.string().max(500).optional(),
  }),

  createReview: Joi.object({
    bookingId:  Joi.string().required(),
    serviceId:  Joi.string().optional(),
    rating:     Joi.number().integer().min(1).max(5).required(),
    comment:    Joi.string().max(1000).optional(),
    subRatings: Joi.object({
      punctuality:     Joi.number().integer().min(1).max(5).optional(),
      professionalism: Joi.number().integer().min(1).max(5).optional(),
      quality:         Joi.number().integer().min(1).max(5).optional(),
    }).optional(),
  }),

  updateProfile: Joi.object({
    name:   Joi.string().min(2).max(50).optional(),
    email:  Joi.string().email().optional(),
    dob:    Joi.string().optional(),
    gender: Joi.string().valid('Male','Female','Other').optional(),
    city:   Joi.string().optional(),
    profilePhoto: Joi.string().uri().optional(),
  }),

  addAddress: Joi.object({
    label:    Joi.string().valid('Home','Work','Other').default('Home'),
    line1:    Joi.string().required(),
    line2:    Joi.string().allow('').optional(),
    area:     Joi.string().allow('').optional(),
    city:     Joi.string().required(),
    state:    Joi.string().allow('').optional(),
    pincode:  Joi.string().pattern(/^\d{6}$/).required(),
    landmark: Joi.string().allow('').optional(),
    isDefault:Joi.boolean().optional(),
    lat:      Joi.number().optional(),
    lng:      Joi.number().optional(),
  }),
};

// ══════════════════════════════════════════════════════════════
// PAGINATION UTILITY
// ══════════════════════════════════════════════════════════════
const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip  = (page - 1) * limit;

  return {
    page, limit, skip,
    paginationMeta: (total) => ({
      total,
      page,
      limit,
      pages:    Math.ceil(total / limit),
      hasMore:  page < Math.ceil(total / limit),
      hasPrev:  page > 1,
    }),
  };
};

// Sort helper
const buildSort = (sortQuery, allowedFields = []) => {
  if (!sortQuery) return { createdAt: -1 };
  const [field, dir] = sortQuery.split(':');
  if (allowedFields.length && !allowedFields.includes(field)) return { createdAt:-1 };
  return { [field]: dir === 'asc' ? 1 : -1 };
};

// ══════════════════════════════════════════════════════════════
// RESPONSE FORMATTER
// ══════════════════════════════════════════════════════════════
const formatResponse = (res, { statusCode = 200, success = true, message, data = {}, meta = {} }) => {
  return res.status(statusCode).json({
    success,
    message,
    ...data,
    ...(Object.keys(meta).length > 0 && { meta }),
    timestamp: new Date().toISOString(),
  });
};

const successResponse = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, ...data });
};

const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

// ══════════════════════════════════════════════════════════════
// REQUEST LOGGER (for audit trail)
// ══════════════════════════════════════════════════════════════
const auditLog = (action) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body.success !== false && req.user) {
      // Fire-and-forget audit log
      require('../models/User').findByIdAndUpdate(req.user._id, {
        $push: { auditLog: { action, ip: req.ip, at: new Date(), resourceId: req.params.id } },
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
};

// ══════════════════════════════════════════════════════════════
// SANITIZE QUERY
// ══════════════════════════════════════════════════════════════
const sanitizeQuery = (req, res, next) => {
  // Remove MongoDB operators from query params to prevent injection
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith('$') && !key.includes('.')) {
        clean[key] = typeof value === 'object' ? sanitize(value) : value;
      }
    }
    return clean;
  };
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  // Upload
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
  uploadToCloudinary,

  // Validation
  validate,
  schemas,

  // Pagination
  paginate,
  buildSort,

  // Response
  formatResponse,
  successResponse,
  errorResponse,

  // Misc
  auditLog,
  sanitizeQuery,
};
