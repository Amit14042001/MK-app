const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeId: { type: String, unique: true },

  // Profile
  bio: String,
  profilePhoto: String,
  idProof: { type: String }, // document URL
  idProofType: { type: String, enum: ['Aadhaar', 'PAN', 'Passport', 'VoterId'] },
  addressProof: String,

  // Professional Details
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  specializations: [String],
  experience: { type: Number, default: 0 }, // years
  languages: [String],

  // Availability
  isAvailable: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date,
  },
  workingAreas: [String], // pincodes or area names
  workingHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '20:00' },
  },
  workingDays: [{
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  }],

  // Stats
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  completedBookings: { type: Number, default: 0 },
  cancelledBookings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },

  // Verification
  isVerified: { type: Boolean, default: false },
  isBackgroundChecked: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending',
  },
  verificationNotes: String,

  // Earnings
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      amount: Number,
      type: { type: String, enum: ['credit', 'debit'] },
      description: String,
      date: { type: Date, default: Date.now },
    }],
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String,
    upiId: String,
  },
  commissionRate: { type: Number, default: 20 }, // percentage Slot takes

  // Device
  fcmToken: String,

  // Active booking
  activeBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { timestamps: true });

// Auto-generate employee ID
professionalSchema.pre('save', function (next) {
  if (!this.employeeId) {
    this.employeeId = 'MKP' + Date.now().toString().slice(-7);
  }
  next();
});

professionalSchema.index({ user: 1 });
professionalSchema.index({ isAvailable: 1, isOnline: 1 });
professionalSchema.index({ skills: 1 });
professionalSchema.index({ rating: -1 });

module.exports = mongoose.model('Professional', professionalSchema);
