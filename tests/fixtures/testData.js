/**
 * MK App — Test Fixtures & Factory Functions
 */
const mongoose = require('mongoose');

// ── Static fixtures ───────────────────────────────────────────
const fixtures = {
  customer: {
    name: 'Rahul Sharma',
    phone: '9876543210',
    role: 'customer',
    email: 'rahul@test.mkapp.in',
    password: 'Test@1234',
  },
  customer2: {
    name: 'Priya Patel',
    phone: '9876543211',
    role: 'customer',
    email: 'priya@test.mkapp.in',
  },
  professional: {
    name: 'Suresh Kumar',
    phone: '9123456789',
    role: 'professional',
    email: 'suresh@test.mkapp.in',
  },
  admin: {
    name: 'Admin User',
    phone: '9000000000',
    role: 'admin',
    email: 'admin@mkapp.in',
    password: 'Admin@1234',
  },
  service: {
    name: 'AC Service & Repair',
    shortDescription: 'Expert AC servicing at your doorstep',
    description: 'Complete AC servicing including deep cleaning, gas check, and performance test',
    startingPrice: 499,
    duration: 90,
    icon: '❄️',
    tags: ['AC', 'cooling', 'appliance'],
    inclusions: ['Deep cleaning', 'Filter wash', 'Gas pressure check'],
    exclusions: ['Gas refilling (extra charge)', 'Parts replacement'],
    howItWorks: [
      { step: 1, title: 'Book', description: 'Choose slot', icon: '📅' },
      { step: 2, title: 'Arrive', description: 'Pro arrives on time', icon: '🚗' },
      { step: 3, title: 'Service', description: 'Work done', icon: '🔧' },
      { step: 4, title: 'Pay', description: 'Pay after done', icon: '💳' },
    ],
    warranty: '30 days service warranty',
    priceUnit: 'flat',
    isActive: true,
    isFeatured: true,
    availableCities: ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi'],
  },
  category: {
    name: 'AC & Appliances',
    description: 'Professional repair and maintenance for all home appliances',
    icon: '❄️',
    color: '#1A6EBD',
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  booking: {
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00 AM',
    address: {
      label: 'Home',
      line1: '123 Test Street',
      area: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      lat: 17.385,
      lng: 78.4867,
    },
    specialInstructions: 'Please call before coming',
  },
  coupon: {
    code: 'TEST100',
    description: 'Test coupon — ₹100 off',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 300,
    perUserLimit: 1,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  review: {
    rating: { overall: 5, punctuality: 5, quality: 5, behaviour: 5 },
    title: 'Excellent service!',
    comment: 'The professional was very skilled and thorough. Will definitely book again.',
    tags: ['Great work', 'On time', 'Very professional'],
  },
};

// ── Factory helpers ───────────────────────────────────────────
const createId = () => new mongoose.Types.ObjectId();

const makeBooking = (overrides = {}) => ({
  ...fixtures.booking,
  customer: createId(),
  service:  createId(),
  professional: createId(),
  pricing: {
    basePrice: 499,
    discount: 0,
    couponDiscount: 0,
    convenienceFee: 29,
    taxes: 25,
    walletUsed: 0,
    totalAmount: 553,
    amountPaid: 553,
  },
  payment: { method: 'online', status: 'paid' },
  status: 'confirmed',
  bookingId: `MK${Date.now()}`,
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  ...fixtures.customer,
  phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
  referralCode: 'MK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
  ...overrides,
});

const makeService = (categoryId, overrides = {}) => ({
  ...fixtures.service,
  category: categoryId || createId(),
  slug: 'ac-service-' + Date.now(),
  ...overrides,
});

module.exports = { fixtures, createId, makeBooking, makeUser, makeService };
