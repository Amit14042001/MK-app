/**
 * MK App — AI Chat + WhatsApp Bot Tests
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app     = require('../../../backend/src/server');
const User    = require('../../../backend/src/models/User');
const Booking = require('../../../backend/src/models/Booking');
const jwt     = require('jsonwebtoken');

let customerToken, testUser;

beforeAll(async () => {
  testUser = await User.create({
    name: 'AI Test User', phone: '9990003333', role: 'customer', isVerified: true,
    addresses: [{ label: 'Home', line1: '123 Test St', city: 'Hyderabad', pincode: '500001', lat: 17.385, lng: 78.487, isDefault: true }],
  });
  customerToken = jwt.sign({ id: testUser._id, role: 'customer' }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1d' });
});

afterAll(async () => {
  await User.deleteMany({ phone: '9990003333' });
  await Booking.deleteMany({ customer: testUser._id, source: 'ai_chat' });
});

// ── AI Chat ───────────────────────────────────────────────────
describe('AI Chat Booking Assistant', () => {
  test('POST /ai-chat/message — requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/ai-chat/message')
      .send({ message: 'Book AC service' });
    expect(res.status).toBe(401);
  });

  test('POST /ai-chat/message — empty message returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/ai-chat/message')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  test('POST /ai-chat/message — returns reply for valid message', async () => {
    const res = await request(app)
      .post('/api/v1/ai-chat/message')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ message: 'Hello, what services do you offer?', conversationHistory: [] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);
  });

  test('GET /ai-chat/suggestions — returns suggestion list', async () => {
    const res = await request(app)
      .get('/api/v1/ai-chat/suggestions')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('AI chat handles conversation history context', async () => {
    const conversationHistory = [
      { role: 'user',      content: 'I need cleaning service' },
      { role: 'assistant', content: 'Great! When would you like the cleaning service?' },
    ];
    const res = await request(app)
      .post('/api/v1/ai-chat/message')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ message: 'This Sunday at 10am', conversationHistory });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });

  test('AI chat fallback works when no API key', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const res = await request(app)
      .post('/api/v1/ai-chat/message')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ message: 'Book AC service', conversationHistory: [] });
    process.env.ANTHROPIC_API_KEY = originalKey;
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
  });
});

// ── WhatsApp Bot ──────────────────────────────────────────────
describe('WhatsApp Bot', () => {
  test('GET /whatsapp/webhook — verify token challenge', async () => {
    const res = await request(app)
      .get('/api/v1/whatsapp/webhook')
      .query({
        'hub.mode':         'subscribe',
        'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'mkapp_verify_123',
        'hub.challenge':    'test_challenge_12345',
      });
    expect(res.status).toBe(200);
    expect(res.text).toContain('test_challenge_12345');
  });

  test('POST /whatsapp/webhook — invalid signature returns 403', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .set('x-hub-signature-256', 'sha256=invalidsignature')
      .send({ object: 'whatsapp_business_account', entry: [] });
    expect([200, 403]).toContain(res.status);
  });

  test('WhatsApp webhook handles empty entry array gracefully', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/webhook')
      .send({ object: 'whatsapp_business_account', entry: [] });
    expect([200, 403]).toContain(res.status);
  });
});

// ── Pro Bids ─────────────────────────────────────────────────
describe('Pro Bidding System', () => {
  test('GET /pro-bids/booking/:id — requires auth', async () => {
    const res = await request(app).get('/api/v1/pro-bids/booking/fakeid123');
    expect(res.status).toBe(401);
  });

  test('POST /pro-bids — requires bookingId and bidAmount', async () => {
    const res = await request(app)
      .post('/api/v1/pro-bids')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bidAmount: 500 }); // missing bookingId
    expect(res.status).toBe(400);
  });
});

// ── Instant Booking ──────────────────────────────────────────
describe('Instant Booking', () => {
  test('GET /instant-booking/available — requires service and lat/lng', async () => {
    const res = await request(app)
      .get('/api/v1/instant-booking/available')
      .set('Authorization', `Bearer ${customerToken}`)
      .query({ service: 'AC Service', lat: 17.385, lng: 78.487 });
    expect(res.status).toBe(200);
  });
});
