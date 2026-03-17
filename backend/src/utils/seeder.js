require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Service = require('../models/Service');
const Professional = require('../models/Professional');
const Coupon = require('../models/Coupon');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mk-app');
  console.log('✅ MongoDB connected for seeding');
};

const CATEGORIES = [
  { name: 'Home Services', slug: 'home-services', icon: '🏠', color: '#4caf50', order: 1, isFeatured: true },
  { name: 'Beauty & Wellness', slug: 'beauty-wellness', icon: '💄', color: '#e94560', order: 2, isFeatured: true },
  { name: 'Automotive', slug: 'automotive', icon: '🚗', color: '#2196f3', order: 3, isFeatured: true },
  { name: 'Appliance Repair', slug: 'appliance-repair', icon: '📺', color: '#ff9800', order: 4 },
  { name: 'Painting', slug: 'painting', icon: '🎨', color: '#9c27b0', order: 5 },
  { name: 'Pest Control', slug: 'pest-control', icon: '🐛', color: '#795548', order: 6 },
];

const getServices = (cats) => [
  // ── HOME SERVICES ────────────────────────────────────────
  {
    name: 'AC Service & Repair',
    slug: 'ac-service-repair',
    description: 'Professional AC servicing including deep cleaning, gas refilling, and repair by certified technicians.',
    shortDescription: 'Get your AC cleaned and repaired at your doorstep.',
    category: cats['home-services'],
    icon: '❄️',
    startingPrice: 299,
    rating: 4.83,
    totalRatings: 12800,
    totalBookings: 95000,
    isActive: true, isFeatured: true, isPopular: true,
    availableCities: ['All'],
    inclusions: ['Filter cleaning', 'Coil cleaning', 'Gas pressure check', '30-day service warranty'],
    exclusions: ['Gas refilling (extra cost)', 'Spare parts'],
    warranty: '30 days service warranty',
    tags: ['AC', 'air conditioner', 'cooling', 'summer'],
    subServices: [
      { name: 'AC Service (1 unit)', price: 299, originalPrice: 499, duration: 60, inclusions: ['Filter clean', 'Coil clean', 'Gas check'] },
      { name: 'AC Gas Refilling', price: 999, originalPrice: 1499, duration: 90, inclusions: ['Gas refill', 'Leak check', 'Pressure test'] },
      { name: 'AC Installation', price: 799, originalPrice: 1199, duration: 120 },
      { name: 'AC Repair', price: 399, originalPrice: 599, duration: 90 },
    ],
  },
  {
    name: 'Home Deep Cleaning',
    slug: 'home-deep-cleaning',
    description: 'Complete home deep cleaning by trained professionals using eco-friendly products.',
    category: cats['home-services'],
    icon: '🧹',
    startingPrice: 199,
    rating: 4.78, totalRatings: 45200, totalBookings: 180000,
    isActive: true, isFeatured: true, isPopular: true,
    availableCities: ['All'],
    tags: ['cleaning', 'deep clean', 'home', 'hygiene'],
    subServices: [
      { name: '1BHK Full Cleaning', price: 999, originalPrice: 1499, duration: 180 },
      { name: '2BHK Full Cleaning', price: 1399, originalPrice: 1999, duration: 240 },
      { name: '3BHK Full Cleaning', price: 1799, originalPrice: 2499, duration: 300 },
      { name: 'Bathroom Cleaning', price: 199, originalPrice: 349, duration: 60 },
      { name: 'Kitchen Deep Clean', price: 399, originalPrice: 599, duration: 90 },
      { name: 'Sofa Cleaning', price: 299, originalPrice: 499, duration: 60 },
    ],
  },
  {
    name: 'Electrician',
    slug: 'electrician',
    description: 'Certified electricians for all home electrical needs — wiring, switches, fans, and more.',
    category: cats['home-services'],
    icon: '⚡',
    startingPrice: 149,
    rating: 4.85, totalRatings: 22400, totalBookings: 120000,
    isActive: true, isPopular: true,
    availableCities: ['All'],
    tags: ['electrical', 'wiring', 'fan', 'light', 'switchboard'],
    subServices: [
      { name: 'Switch/Socket Repair', price: 149, duration: 30 },
      { name: 'Fan Installation', price: 199, duration: 30 },
      { name: 'Light Fitting', price: 149, duration: 20 },
      { name: 'MCB/Fuse Repair', price: 249, duration: 45 },
    ],
  },
  {
    name: 'Plumber',
    slug: 'plumber',
    description: 'Expert plumbers for leakage, pipe repair, tap installation, and bathroom fitting.',
    category: cats['home-services'],
    icon: '🔧',
    startingPrice: 149,
    rating: 4.80, totalRatings: 18700, totalBookings: 95000,
    isActive: true,
    availableCities: ['All'],
    tags: ['plumbing', 'pipe', 'tap', 'water', 'leakage'],
    subServices: [
      { name: 'Tap Repair/Replace', price: 149, duration: 30 },
      { name: 'Pipe Leak Fix', price: 299, duration: 60 },
      { name: 'Toilet Repair', price: 249, duration: 45 },
      { name: 'Water Heater Install', price: 499, duration: 90 },
    ],
  },
  {
    name: 'Carpenter',
    slug: 'carpenter',
    description: 'Skilled carpenters for furniture repair, door fixing, and custom woodwork.',
    category: cats['home-services'],
    icon: '🪚',
    startingPrice: 249,
    rating: 4.77, totalRatings: 9800, totalBookings: 42000,
    isActive: true,
    availableCities: ['All'],
    tags: ['carpentry', 'furniture', 'wood', 'door'],
    subServices: [
      { name: 'Furniture Repair', price: 249, duration: 60 },
      { name: 'Door/Window Fix', price: 299, duration: 45 },
      { name: 'Cabinet Work', price: 499, duration: 120 },
    ],
  },
  // ── BEAUTY ────────────────────────────────────────────────
  {
    name: 'Salon for Women',
    slug: 'salon-for-women',
    description: 'Premium salon services at home — haircut, facial, waxing, manicure & pedicure by expert beauticians.',
    category: cats['beauty-wellness'],
    icon: '💄',
    startingPrice: 199,
    rating: 4.88, totalRatings: 62000, totalBookings: 320000,
    isActive: true, isFeatured: true, isPopular: true,
    availableCities: ['All'],
    tags: ['salon', 'beauty', 'haircut', 'facial', 'waxing', 'women'],
    subServices: [
      { name: 'Haircut & Styling', price: 249, originalPrice: 399, duration: 45 },
      { name: 'Full Face Facial', price: 399, originalPrice: 599, duration: 60 },
      { name: 'Full Arms Waxing', price: 199, originalPrice: 299, duration: 30 },
      { name: 'Manicure', price: 249, originalPrice: 399, duration: 45 },
      { name: 'Pedicure', price: 299, originalPrice: 449, duration: 45 },
      { name: 'Threading (Eyebrows)', price: 49, duration: 10 },
    ],
  },
  {
    name: 'Salon for Men',
    slug: 'salon-for-men',
    description: 'Professional grooming at home — haircut, beard, facial and head massage.',
    category: cats['beauty-wellness'],
    icon: '💈',
    startingPrice: 149,
    rating: 4.85, totalRatings: 38000, totalBookings: 210000,
    isActive: true, isFeatured: true, isPopular: true,
    availableCities: ['All'],
    tags: ['salon', 'men', 'haircut', 'beard', 'grooming'],
    subServices: [
      { name: 'Haircut', price: 149, originalPrice: 249, duration: 30 },
      { name: 'Beard Trim & Style', price: 99, duration: 20 },
      { name: 'Hair + Beard Combo', price: 199, originalPrice: 349, duration: 45 },
      { name: 'Head Massage', price: 199, duration: 30 },
      { name: 'Face Clean-up', price: 249, originalPrice: 399, duration: 30 },
    ],
  },
  {
    name: 'Spa for Women',
    slug: 'spa-for-women',
    description: 'Relaxing full body spa and massage services at your home by certified therapists.',
    category: cats['beauty-wellness'],
    icon: '💆',
    startingPrice: 499,
    rating: 4.90, totalRatings: 28000, totalBookings: 95000,
    isActive: true, isFeatured: true,
    availableCities: ['All'],
    tags: ['spa', 'massage', 'relaxation', 'women'],
    subServices: [
      { name: 'Swedish Massage (60 min)', price: 799, originalPrice: 1199, duration: 60 },
      { name: 'Deep Tissue Massage (60 min)', price: 999, originalPrice: 1499, duration: 60 },
      { name: 'Full Body Spa (90 min)', price: 1499, originalPrice: 2199, duration: 90 },
      { name: 'Head + Back Massage', price: 499, originalPrice: 699, duration: 45 },
    ],
  },
  {
    name: 'Bridal Makeup',
    slug: 'bridal-makeup',
    description: 'Professional bridal and party makeup at your doorstep for your special day.',
    category: cats['beauty-wellness'],
    icon: '👄',
    startingPrice: 1999,
    rating: 4.91, totalRatings: 15000, totalBookings: 28000,
    isActive: true, isFeatured: true,
    availableCities: ['All'],
    tags: ['makeup', 'bridal', 'wedding', 'party'],
    subServices: [
      { name: 'Party Makeup', price: 1999, originalPrice: 2999, duration: 90 },
      { name: 'Bridal Makeup (HD)', price: 4999, originalPrice: 7999, duration: 180 },
      { name: 'Airbrush Makeup', price: 3499, originalPrice: 5499, duration: 120 },
    ],
  },
  // ── AUTOMOTIVE ────────────────────────────────────────────
  {
    name: 'Car Battery Replacement',
    slug: 'car-battery-replacement',
    description: 'Doorstep car battery replacement with genuine batteries. All brands supported. Installation included.',
    category: cats['automotive'],
    icon: '🔋',
    startingPrice: 1999,
    rating: 4.88, totalRatings: 8500, totalBookings: 35000,
    isActive: true, isFeatured: true, isPopular: true, isNew: true,
    availableCities: ['All'],
    warranty: '12 months warranty on battery',
    inclusions: ['Genuine battery', 'Free installation', 'Old battery disposal', '12-month warranty'],
    tags: ['battery', 'car', 'vehicle', 'automotive'],
    subServices: [
      { name: 'Maruti Suzuki (35Ah)', price: 2299, originalPrice: 3499, duration: 30, inclusions: ['Genuine Exide/Amaron', 'Free install', '1 yr warranty'] },
      { name: 'Hyundai/Kia (45Ah)', price: 2799, originalPrice: 3999, duration: 30 },
      { name: 'Honda (38Ah)', price: 2499, originalPrice: 3699, duration: 30 },
      { name: 'Toyota (55Ah)', price: 3499, originalPrice: 4999, duration: 30 },
      { name: 'Tata (40Ah)', price: 2599, originalPrice: 3799, duration: 30 },
      { name: 'Mahindra (60Ah)', price: 3299, originalPrice: 4799, duration: 30 },
      { name: 'SUV/MUV (65Ah+)', price: 3999, originalPrice: 5999, duration: 45 },
    ],
  },
  {
    name: 'Jump Start',
    slug: 'jump-start',
    description: 'Emergency car battery jump start at your location within 30 minutes. Available 24/7.',
    category: cats['automotive'],
    icon: '⚡',
    startingPrice: 299,
    rating: 4.92, totalRatings: 5200, totalBookings: 22000,
    isActive: true, isFeatured: true, isPopular: true, isNew: true,
    availableCities: ['All'],
    inclusions: ['On-site jump start', 'Battery health check', '24/7 availability'],
    tags: ['jump start', 'dead battery', 'emergency', 'roadside'],
    subServices: [
      { name: '4-Wheeler Jump Start', price: 299, duration: 20, inclusions: ['Jump start', 'Battery health check'] },
      { name: '2-Wheeler Jump Start', price: 149, duration: 15 },
      { name: 'Emergency + Tow (if needed)', price: 799, duration: 30 },
    ],
  },
  {
    name: 'Car Oil Change',
    slug: 'car-oil-change',
    description: 'Engine oil change at your doorstep. Choose from synthetic, semi-synthetic, or mineral oil. All brands.',
    category: cats['automotive'],
    icon: '🛢️',
    startingPrice: 899,
    rating: 4.85, totalRatings: 6700, totalBookings: 28000,
    isActive: true, isFeatured: true, isPopular: true, isNew: true,
    availableCities: ['All'],
    inclusions: ['Oil change', 'Oil filter replacement', 'Fluid top-up check', 'Service record update'],
    tags: ['oil change', 'engine oil', 'car service', 'maintenance'],
    subServices: [
      { name: 'Mineral Oil Change', price: 899, originalPrice: 1299, duration: 45, inclusions: ['3.5L mineral oil', 'Oil filter', 'Fluid check'] },
      { name: 'Semi-Synthetic Oil Change', price: 1299, originalPrice: 1799, duration: 45 },
      { name: 'Full Synthetic Oil Change', price: 1899, originalPrice: 2599, duration: 45 },
      { name: 'Diesel Engine Oil Change', price: 1499, originalPrice: 2099, duration: 60 },
    ],
  },
  {
    name: 'Car Wash & Detailing',
    slug: 'car-wash-detailing',
    description: 'Professional car wash and detailing at your home or office. Exterior, interior, and full detailing.',
    category: cats['automotive'],
    icon: '🚗',
    startingPrice: 399,
    rating: 4.80, totalRatings: 12000, totalBookings: 48000,
    isActive: true, isFeatured: true,
    availableCities: ['All'],
    tags: ['car wash', 'detailing', 'cleaning', 'polish'],
    subServices: [
      { name: 'Exterior Wash', price: 399, duration: 30 },
      { name: 'Interior + Exterior', price: 699, originalPrice: 999, duration: 60 },
      { name: 'Full Detailing', price: 1999, originalPrice: 2999, duration: 180 },
      { name: 'Ceramic Coating', price: 8999, originalPrice: 14999, duration: 480 },
    ],
  },
  {
    name: 'Tyre Service',
    slug: 'tyre-service',
    description: 'Tyre puncture, rotation, balancing, and replacement at your doorstep.',
    category: cats['automotive'],
    icon: '🔄',
    startingPrice: 199,
    rating: 4.78, totalRatings: 9300, totalBookings: 38000,
    isActive: true,
    availableCities: ['All'],
    tags: ['tyre', 'puncture', 'wheel', 'balancing'],
    subServices: [
      { name: 'Tyre Puncture Repair', price: 199, duration: 20 },
      { name: 'Tyre Rotation (4 tyres)', price: 399, duration: 30 },
      { name: 'Wheel Balancing', price: 499, duration: 45 },
      { name: 'Tyre Replacement (1)', price: 299, duration: 30 },
    ],
  },
  {
    name: 'Car AC Service',
    slug: 'car-ac-service',
    description: 'Car AC gas refill, filter change, and deep cleaning by certified auto AC technicians.',
    category: cats['automotive'],
    icon: '❄️',
    startingPrice: 599,
    rating: 4.83, totalRatings: 7800, totalBookings: 32000,
    isActive: true,
    availableCities: ['All'],
    tags: ['car AC', 'cooling', 'gas refill', 'filter'],
    subServices: [
      { name: 'AC Gas Refill (R134a)', price: 1299, duration: 45 },
      { name: 'AC Filter Change', price: 599, duration: 20 },
      { name: 'AC Deep Cleaning', price: 999, duration: 60 },
      { name: 'AC Full Service', price: 1799, originalPrice: 2499, duration: 90 },
    ],
  },
  // ── APPLIANCE ─────────────────────────────────────────────
  {
    name: 'Washing Machine Repair',
    slug: 'washing-machine-repair',
    description: 'Expert repair for all brands of washing machines — front load, top load, fully automatic.',
    category: cats['appliance-repair'],
    icon: '🫧',
    startingPrice: 199,
    rating: 4.82, totalRatings: 14200, totalBookings: 65000,
    isActive: true, isPopular: true,
    availableCities: ['All'],
    tags: ['washing machine', 'repair', 'appliance'],
    subServices: [
      { name: 'Repair Visit', price: 199, duration: 60 },
      { name: 'Service & Clean', price: 499, duration: 90 },
    ],
  },
  {
    name: 'Refrigerator Repair',
    slug: 'refrigerator-repair',
    description: 'Professional refrigerator repair for all brands — Samsung, LG, Whirlpool, Godrej.',
    category: cats['appliance-repair'],
    icon: '🧊',
    startingPrice: 199,
    rating: 4.80, totalRatings: 9800, totalBookings: 42000,
    isActive: true,
    availableCities: ['All'],
    tags: ['refrigerator', 'fridge', 'repair', 'cooling'],
    subServices: [
      { name: 'Diagnosis & Repair', price: 199, duration: 60 },
      { name: 'Gas Refilling', price: 1499, duration: 90 },
    ],
  },
  // ── PAINTING ──────────────────────────────────────────────
  {
    name: 'Home Painting',
    slug: 'home-painting',
    description: 'Professional painters for interior and exterior wall painting. Premium and economy options.',
    category: cats['painting'],
    icon: '🎨',
    startingPrice: 7,
    priceUnit: 'per_sqft',
    rating: 4.75, totalRatings: 5400, totalBookings: 18000,
    isActive: true,
    availableCities: ['All'],
    tags: ['painting', 'wall paint', 'interior', 'exterior'],
    subServices: [
      { name: 'Economy Painting', price: 7, duration: 480 },
      { name: 'Premium Painting', price: 12, duration: 480 },
      { name: 'Texture Painting', price: 18, duration: 480 },
      { name: 'Waterproofing', price: 25, duration: 480 },
    ],
  },
  // ── PEST CONTROL ──────────────────────────────────────────
  {
    name: 'Pest Control',
    slug: 'pest-control',
    description: 'Safe and effective pest control for cockroaches, bed bugs, termites, mosquitoes and more.',
    category: cats['pest-control'],
    icon: '🐛',
    startingPrice: 399,
    rating: 4.72, totalRatings: 7600, totalBookings: 32000,
    isActive: true,
    availableCities: ['All'],
    tags: ['pest control', 'cockroach', 'termite', 'mosquito'],
    subServices: [
      { name: 'Cockroach Control (1BHK)', price: 399, duration: 60 },
      { name: 'Bed Bug Control', price: 999, originalPrice: 1499, duration: 120 },
      { name: 'Termite Control', price: 1999, originalPrice: 2999, duration: 180 },
      { name: 'Mosquito Control', price: 599, duration: 60 },
    ],
  },
];

const COUPONS = [
  {
    code: 'MKWELCOME',
    description: '20% off on your first booking',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 200,
    minOrderAmount: 299,
    newUsersOnly: true,
    totalUsageLimit: 10000,
    validUntil: new Date('2027-12-31'),
  },
  {
    code: 'MK100',
    description: 'Flat ₹100 off on orders above ₹499',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 499,
    totalUsageLimit: 5000,
    validUntil: new Date('2026-12-31'),
  },
  {
    code: 'AUTOCARE',
    description: '15% off on automotive services',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscount: 500,
    minOrderAmount: 599,
    validUntil: new Date('2026-12-31'),
  },
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Service.deleteMany({}),
      Professional.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed categories
    const createdCats = await Category.insertMany(CATEGORIES);
    const catMap = {};
    createdCats.forEach(c => { catMap[c.slug] = c._id; });
    console.log(`✅ ${createdCats.length} categories seeded`);

    // Seed services
    const servicesData = getServices(catMap);
    const createdServices = await Service.insertMany(servicesData);
    console.log(`✅ ${createdServices.length} services seeded`);

    // Seed admin user
    const admin = await User.create({
      name: 'MK Admin',
      phone: '9000000000',
      email: 'admin@mkapp.in',
      role: 'admin',
      isPhoneVerified: true,
      isEmailVerified: true,
    });
    console.log(`✅ Admin user seeded (phone: 9000000000)`);

    // Seed sample customer
    const customer = await User.create({
      name: 'Test Customer',
      phone: '9876543210',
      email: 'customer@test.com',
      role: 'customer',
      isPhoneVerified: true,
    });

    // Seed sample professional
    const proUser = await User.create({
      name: 'Raj Kumar',
      phone: '9123456789',
      role: 'professional',
      isPhoneVerified: true,
    });
    await Professional.create({
      user: proUser._id,
      skills: createdServices.slice(0, 5).map(s => s._id),
      experience: 5,
      rating: 4.9,
      totalBookings: 2847,
      isVerified: true,
      isBackgroundChecked: true,
      verificationStatus: 'approved',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    });
    console.log('✅ Sample users and professional seeded');

    // Seed coupons
    await Coupon.insertMany(COUPONS);
    console.log(`✅ ${COUPONS.length} coupons seeded`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:    phone=9000000000  OTP=1234');
    console.log('Customer: phone=9876543210  OTP=1234');
    console.log('Coupons:  MKWELCOME | MK100 | AUTOCARE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
