const mongoose = require('mongoose');

const subServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  duration: Number, // in minutes
  inclusions: [String],
  exclusions: [String],
  images: [String],
  isActive: { type: Boolean, default: true },
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Service name is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDescription: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  icon: { type: String, default: '🔧' },
  images: [String],
  bannerImage: String,

  subServices: [subServiceSchema],

  startingPrice: { type: Number, required: true },
  priceUnit: { type: String, enum: ['flat', 'per_hour', 'per_sqft', 'per_unit'], default: 'flat' },

  duration: { type: Number, default: 60 }, // default duration in minutes
  warranty: String, // e.g. "30 days warranty"

  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },

  tags: [String],
  inclusions: [String],
  exclusions: [String],
  howItWorks: [{
    step: Number,
    title: String,
    description: String,
    icon: String,
  }],
  faqs: [{
    question: String,
    answer: String,
  }],

  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },

  availableCities: [String],
  availableTimeSlots: [{
    day: String, // Mon, Tue...
    slots: [String], // ['09:00', '10:00', ...]
  }],

  requiredProfessionalSkills: [String],
  professionalsCount: { type: Number, default: 0 },

  metaTitle: String,
  metaDescription: String,
}, { timestamps: true });

// Auto-generate slug
serviceSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

serviceSchema.index({ slug: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ totalBookings: -1 });
serviceSchema.index({ isActive: 1, isFeatured: 1 });
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
