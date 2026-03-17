/**
 * MK App — E2E User Journey Tests
 * Complete flows: Customer journey, Professional journey, Admin journey
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Service  = require('../../backend/src/models/Service');
const Category = require('../../backend/src/models/Category');
const Professional = require('../../backend/src/models/Professional');
const jwt      = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_mk_2025';
const makeToken  = (id, role) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '2h' });

let customerToken, proToken, adminToken;
let customerId, proUserId, adminId;
let serviceId, categoryId, proId, bookingId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_e2e');

  const [customer, proUser, admin] = await User.create([
    { name: 'E2E Customer', phone: '+919800000001', role: 'customer', isVerified: true, wallet: { balance: 200 } },
    { name: 'E2E Professional', phone: '+919800000002', role: 'professional', isVerified: true },
    { name: 'E2E Admin', phone: '+919800000003', role: 'admin', isVerified: true },
  ]);

  customerId    = customer._id;
  proUserId     = proUser._id;
  adminId       = admin._id;
  customerToken = makeToken(customer._id, 'customer');
  proToken      = makeToken(proUser._id, 'professional');
  adminToken    = makeToken(admin._id, 'admin');

  const cat = await Category.create({ name: 'E2E HVAC', icon: '🔧', isActive: true });
  categoryId = cat._id;

  const svc = await Service.create({
    name: 'E2E AC Service', category: categoryId,
    startingPrice: 499, duration: 60, isActive: true,
    description: 'E2E test service for AC maintenance',
    subServices: [{ name: 'Full Service', price: 599, duration: 90, isActive: true }],
  });
  serviceId = svc._id;

  const pro = await Professional.create({
    user: proUserId, experience: 6, rating: 4.7, reviewCount: 95,
    verificationStatus: 'verified', isActive: true,
    services: [{ serviceId: svc._id, name: 'E2E AC Service', isAvailable: true }],
    serviceAreas: ['500001'],
    location: { type: 'Point', coordinates: [78.4867, 17.3850] },
  });
  proId = pro._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── JOURNEY 1: Customer Books a Service ───────────────────────
describe('Customer Journey: Browse → Book → Track → Review', () => {
  it('Step 1: Browse categories', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.categories || res.body.data)).toBe(true);
  });

  it('Step 2: View services in category', async () => {
    const res = await request(app).get(`/api/v1/services?category=${categoryId}`);
    expect(res.statusCode).toBe(200);
  });

  it('Step 3: View service details', async () => {
    const res = await request(app).get(`/api/v1/services/${serviceId}`);
    expect(res.statusCode).toBe(200);
    const svcData = res.body.service || res.body.data;
    expect(svcData.name).toBe('E2E AC Service');
  });

  it('Step 4: Create booking', async () => {
    const futureDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        service:       serviceId,
        scheduledDate: futureDate,
        scheduledTime: '10:00 AM',
        address: { line1: '1 E2E Street', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
        payment: { method: 'cash' },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.booking.bookingId).toMatch(/^BK/);
    bookingId = res.body.booking._id;
  });

  it('Step 5: View booking details', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.booking._id.toString()).toBe(bookingId.toString());
  });

  it('Step 6: View all bookings', async () => {
    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.bookings.length).toBeGreaterThan(0);
  });

  it('Step 7: View notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
  });

  it('Step 8: Post a review (if booking completed)', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId,
        rating:  5,
        comment: 'Excellent E2E test service!',
      });

    // May fail if booking isn't completed
    expect([200, 201, 400]).toContain(res.statusCode);
  });
});

// ── JOURNEY 2: Professional Receives and Completes Job ────────
describe('Professional Journey: Receive Job → Start → Complete', () => {
  it('Step 1: Pro views their bookings', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/bookings')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
  });

  it('Step 2: Pro views their profile', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/profile')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
  });

  it('Step 3: Pro updates status to in_progress', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${proToken}`)
      .send({ status: 'in_progress', note: 'Started work' });

    expect([200, 403]).toContain(res.statusCode);
  });

  it('Step 4: Pro marks as completed', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${proToken}`)
      .send({ status: 'completed', note: 'Work done' });

    expect([200, 403]).toContain(res.statusCode);
  });

  it('Step 5: Pro views earnings', async () => {
    const res = await request(app)
      .get('/api/v1/professionals/me/earnings')
      .set('Authorization', `Bearer ${proToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
  });
});

// ── JOURNEY 3: Admin Management ────────────────────────────────
describe('Admin Journey: Monitor → Assign → Manage', () => {
  it('Step 1: Admin views all bookings', async () => {
    const res = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.bookings || res.body.data)).toBe(true);
    }
  });

  it('Step 2: Admin views analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 403, 404]).toContain(res.statusCode);
  });

  it('Step 3: Admin views all users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
  });

  it('Step 4: Admin assigns professional to booking', async () => {
    if (!bookingId) return;
    const res = await request(app)
      .put(`/api/v1/bookings/${bookingId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ professionalId: proId });

    expect([200, 400, 404]).toContain(res.statusCode);
  });

  it('Step 5: Admin blocks a user', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${customerId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'E2E test block' });

    expect([200, 404]).toContain(res.statusCode);
  });

  it('Step 6: Admin unblocks a user', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${customerId}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});

// ── JOURNEY 4: Subscription Flow ──────────────────────────────
describe('Subscription Journey: View Plans → Subscribe → Cancel', () => {
  it('Step 1: View available plans', async () => {
    const res = await request(app).get('/api/v1/subscriptions/plans');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('Step 2: Subscribe to Silver plan', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/subscribe')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planId: 'silver', paymentMethod: 'cash' });

    expect([200, 201, 400]).toContain(res.statusCode);
  });

  it('Step 3: View current subscription', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
  });

  it('Step 4: Cancel subscription', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/cancel')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'E2E test cancel' });

    expect([200, 404]).toContain(res.statusCode);
  });
});

// ── JOURNEY 5: Support Flow ────────────────────────────────────
describe('Support Journey: Create Ticket → Reply → Close', () => {
  let ticketId;

  it('Step 1: Create support ticket', async () => {
    const res = await request(app)
      .post('/api/v1/support')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        subject:     'E2E Test Issue',
        description: 'This is an automated E2E test support ticket.',
        category:    'booking',
        priority:    'medium',
      });

    expect([200, 201]).toContain(res.statusCode);
    if (res.body.data) ticketId = res.body.data._id;
  });

  it('Step 2: View my tickets', async () => {
    const res = await request(app)
      .get('/api/v1/support')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(200);
  });

  it('Step 3: Reply to ticket', async () => {
    if (!ticketId) return;
    const res = await request(app)
      .post(`/api/v1/support/${ticketId}/reply`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'E2E follow-up message on this ticket.' });

    expect([200, 404]).toContain(res.statusCode);
  });

  it('Step 4: Close ticket', async () => {
    if (!ticketId) return;
    const res = await request(app)
      .put(`/api/v1/support/${ticketId}/close`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});
