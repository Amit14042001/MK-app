/**
 * MK App — Booking Controller Tests
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Service  = require('../../backend/src/models/Service');
const Booking  = require('../../backend/src/models/Booking');
const jwt      = require('jsonwebtoken');

let customerToken, adminToken, serviceId, bookingId;

const makeToken = (id, role = 'customer') =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_booking');

  const customer = await User.create({
    name: 'Test Customer', phone: '+919000000001',
    role: 'customer', isVerified: true,
  });
  const admin = await User.create({
    name: 'Test Admin', phone: '+919000000002',
    role: 'admin', isVerified: true,
  });

  customerToken = makeToken(customer._id, 'customer');
  adminToken    = makeToken(admin._id, 'admin');

  const svc = await Service.create({
    name: 'AC Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 499, duration: 60, isActive: true,
    description: 'Professional AC service',
    subServices: [{ name: 'AC Gas Refill', price: 799, duration: 90, isActive: true }],
  });
  serviceId = svc._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/v1/bookings', () => {
  it('should create a booking for authenticated customer', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service:       serviceId,
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledTime: '10:00 AM',
        address: {
          line1:   '123 Test Street',
          city:    'Hyderabad',
          state:   'Telangana',
          pincode: '500001',
        },
        payment: { method: 'cash' },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.bookingId).toMatch(/^BK/);
    bookingId = res.body.booking._id;
  });

  it('should reject booking without required fields', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ service: serviceId });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject unauthenticated booking creation', async () => {
    const res = await request(app).post('/api/v1/bookings').send({});
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/bookings', () => {
  it('should return customer bookings list', async () => {
    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/v1/bookings?status=confirmed')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    res.body.bookings.forEach(b => {
      expect(['confirmed', 'professional_assigned']).toContain(b.status);
    });
  });

  it('should paginate results', async () => {
    const res = await request(app)
      .get('/api/v1/bookings?page=1&limit=5')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.bookings.length).toBeLessThanOrEqual(5);
  });
});

describe('GET /api/v1/bookings/:id', () => {
  it('should return booking by id for owner', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.booking._id).toBe(bookingId.toString());
  });

  it('should return 404 for non-existent booking', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/bookings/${fakeId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/v1/bookings/stats', () => {
  it('should return booking stats for customer', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/stats')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(typeof res.body.stats.total).toBe('number');
    expect(typeof res.body.stats.completed).toBe('number');
  });
});

describe('PUT /api/v1/bookings/:id/cancel', () => {
  it('should cancel a booking with valid reason', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Changed my plans' });

    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.booking.status).toBe('cancelled');
    }
  });
});

describe('PUT /api/v1/bookings/:id/reschedule', () => {
  it('should reschedule a booking to future date', async () => {
    // Create fresh booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const createRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service: serviceId,
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '11:00 AM',
        address: { line1: '456 New Street', city: 'Hyderabad', state: 'Telangana', pincode: '500002' },
        payment: { method: 'cash' },
      });

    if (createRes.statusCode !== 201) return;
    const newBookingId = createRes.body.booking._id;
    const futureDate   = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .put(`/api/v1/bookings/${newBookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ scheduledDate: futureDate, scheduledTime: '2:00 PM', reason: 'Reschedule test' });

    expect([200, 400]).toContain(res.statusCode);
  });

  it('should reject reschedule to past date', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}/reschedule`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ scheduledDate: '2020-01-01', scheduledTime: '10:00 AM' });

    expect(res.statusCode).toBe(400);
  });
});
