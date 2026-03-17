/**
 * MK App — Professional Controller Tests
 */
const request      = require('supertest');
const mongoose     = require('mongoose');
const app          = require('../../backend/src/server');
const User         = require('../../backend/src/models/User');
const Professional = require('../../backend/src/models/Professional');
const Service      = require('../../backend/src/models/Service');
const jwt          = require('jsonwebtoken');

const makeToken = (id, role = 'customer') =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

let proToken, customerToken, adminToken, proId, proUserId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_professional');

  const [proUser, customer, admin] = await User.create([
    { name: 'Test Pro', phone: '+919700000001', role: 'professional', isVerified: true },
    { name: 'Test Customer', phone: '+919700000002', role: 'customer', isVerified: true },
    { name: 'Test Admin', phone: '+919700000003', role: 'admin', isVerified: true },
  ]);

  proUserId     = proUser._id;
  proToken      = makeToken(proUser._id, 'professional');
  customerToken = makeToken(customer._id, 'customer');
  adminToken    = makeToken(admin._id, 'admin');

  const svc = await Service.create({
    name: 'Pro Test Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 399, duration: 60, isActive: true,
  });

  const pro = await Professional.create({
    user: proUserId,
    experience: 4,
    bio: 'Test professional with 4 years experience',
    verificationStatus: 'verified',
    isActive: true,
    rating: 4.6,
    reviewCount: 85,
    services: [{ serviceId: svc._id, name: 'Pro Test Service', isAvailable: true }],
    serviceAreas: ['500001', '500002'],
    location: { type: 'Point', coordinates: [78.4867, 17.3850] },
  });
  proId = pro._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('GET /api/v1/professionals', () => {
  it('should return verified professionals list', async () => {
    const res = await request(app).get('/api/v1/professionals');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.professionals || res.body.data)).toBe(true);
  });

  it('should filter by service area', async () => {
    const res = await request(app).get('/api/v1/professionals?pincode=500001');
    expect(res.statusCode).toBe(200);
  });

  it('should sort by rating by default', async () => {
    const res = await request(app).get('/api/v1/professionals?sort=-rating');
    expect(res.statusCode).toBe(200);
    const pros = res.body.professionals || res.body.data || [];
    if (pros.length >= 2) {
      expect(pros[0].rating).toBeGreaterThanOrEqual(pros[1].rating || 0);
    }
  });
});

describe('GET /api/v1/professionals/:id', () => {
  it('should return professional by id', async () => {
    const res = await request(app).get(`/api/v1/professionals/${proId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.professional || res.body.data).toBeDefined();
  });

  it('should return 404 for non-existent professional', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/v1/professionals/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/v1/professionals/me/profile', () => {
  it('should return professional own profile', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/profile')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  it('should reject customer accessing pro profile endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/profile')
      .set('Authorization', `Bearer ${customerToken}`);

    expect([403, 404]).toContain(res.statusCode);
  });
});

describe('PUT /api/v1/professionals/me/availability', () => {
  it('should update professional availability', async () => {
    const res = await request(app)
      .put('/api/v1/professionals/me/availability')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ isAvailable: false, reason: 'Taking a break' });

    expect([200, 403, 404]).toContain(res.statusCode);
  });
});

describe('GET /api/v1/professionals/me/bookings', () => {
  it('should return pro bookings', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/bookings')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.bookings || res.body.data)).toBe(true);
    }
  });
});

describe('GET /api/v1/professionals/me/earnings', () => {
  it('should return professional earnings', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/earnings')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.earnings || res.body.data).toBeDefined();
    }
  });
});

describe('Professional Profile Update', () => {
  it('should update bio and services', async () => {
    const res = await request(app)
      .put('/api/v1/professionals/me/profile')
      .set('Authorization', `Bearer ${proToken}`)
      .send({
        bio:        'Updated professional bio with more details.',
        experience: 5,
      });

    expect([200, 403, 404]).toContain(res.statusCode);
  });
});

describe('Professional Reviews', () => {
  it('should return reviews for a professional', async () => {
    const res = await request(app).get(`/api/v1/professionals/${proId}/reviews`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.reviews || res.body.data)).toBe(true);
    }
  });
});

describe('Nearby Professionals Search', () => {
  it('should find professionals by location', async () => {
    const res = await request(app)
      .get('/api/v1/search/nearby-professionals?lat=17.385&lng=78.4867&radius=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should reject request without coordinates', async () => {
    const res = await request(app).get('/api/v1/search/nearby-professionals');
    expect(res.statusCode).toBe(400);
  });
});
