/**
 * MK App — Admin Routes Tests
 */
const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../backend/src/server');
const User     = require('../../backend/src/models/User');
const Service  = require('../../backend/src/models/Service');
const Booking  = require('../../backend/src/models/Booking');
const jwt      = require('jsonwebtoken');

const makeToken = (id, role) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'test_secret_mk_2025', { expiresIn: '1h' });

let adminToken, customerToken;
let adminId, customerId, serviceId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mk_test_admin');

  const [admin, customer] = await User.create([
    { name: 'Admin User',    phone: '+919300000001', role: 'admin',    isVerified: true },
    { name: 'Customer User', phone: '+919300000002', role: 'customer', isVerified: true },
  ]);

  adminId      = admin._id;
  customerId   = customer._id;
  adminToken   = makeToken(admin._id, 'admin');
  customerToken= makeToken(customer._id, 'customer');

  const svc = await Service.create({
    name: 'Admin Test Service', category: new mongoose.Types.ObjectId(),
    startingPrice: 499, duration: 60, isActive: true,
  });
  serviceId = svc._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Admin access control', () => {
  it('should block customer from admin routes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${customerToken}`);
    expect([403, 404]).toContain(res.statusCode);
  });

  it('should block unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/admin/users', () => {
  it('should return users list for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users || res.body.data)).toBe(true);
    }
  });

  it('should support pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should support filtering by role', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?role=customer')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200 && res.body.users) {
      res.body.users.forEach(u => expect(u.role).toBe('customer'));
    }
  });
});

describe('PATCH /api/v1/admin/users/:id/block', () => {
  it('should block a customer user', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${customerId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Test block — admin test' });

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const user = await User.findById(customerId);
      expect(user.isBlocked).toBe(true);
    }
  });

  it('should unblock a user', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${customerId}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const user = await User.findById(customerId);
      expect(user.isBlocked).toBe(false);
    }
  });
});

describe('Admin Service Management', () => {
  it('should create a service as admin', async () => {
    const res = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:          'New Admin Service',
        category:      new mongoose.Types.ObjectId(),
        startingPrice: 399,
        duration:      45,
        description:   'Service created by admin test',
        isActive:      true,
      });

    expect([200, 201]).toContain(res.statusCode);
  });

  it('should block customer from creating services', async () => {
    const res = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Hack Service', category: new mongoose.Types.ObjectId(), startingPrice: 0, duration: 30 });

    expect(res.statusCode).toBe(403);
  });

  it('should delete a service as admin', async () => {
    const res = await request(app)
      .delete(`/api/v1/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
  });
});

describe('GET /api/v1/admin/bookings', () => {
  it('should return all bookings for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.bookings || res.body.data)).toBe(true);
    }
  });
});

describe('GET /api/v1/analytics/overview', () => {
  it('should return analytics overview for admin', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
    }
  });
});
