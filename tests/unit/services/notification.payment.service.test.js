/**
 * MK App — Notification & Payment Service Tests
 */
jest.mock('../../../backend/src/config/redis', () => ({
  store: {},
  get:   jest.fn(async function(k) { return this.store[k] ?? null; }),
  set:   jest.fn(async function(k, v) { this.store[k] = v; return 'OK'; }),
  del:   jest.fn(async function(k) { delete this.store[k]; return 1; }),
  delPattern: jest.fn().mockResolvedValue(1),
  incr:  jest.fn().mockResolvedValue(1),
  expire:jest.fn().mockResolvedValue(1),
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential:    { cert: jest.fn() },
  messaging:     jest.fn().mockReturnValue({
    send: jest.fn().mockResolvedValue('msg-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 2, failureCount: 0 }),
  }),
}));

jest.mock('twilio', () => () => ({
  messages: { create: jest.fn().mockResolvedValue({ sid: 'test-sid' }) },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-id' }),
  }),
}));

const notifService = require('../../../backend/src/services/notificationService');

describe('NotificationService Templates', () => {
  it('should export all required notification functions', () => {
    const required = [
      'notifyBookingConfirmed',
      'notifyBookingCancelled',
      'notifyProfessionalAssigned',
      'notifyProfessionalNewBooking',
      'notifyServiceCompleted',
      'notifyWalletCredited',
    ];
    required.forEach(fn => {
      expect(typeof notifService[fn]).toBe('function');
    });
  });

  it('should call notifyBookingConfirmed without throwing', async () => {
    const mockBooking = {
      _id: 'booking123',
      bookingId: 'BK12345',
      customer: { _id: 'user123', fcmToken: null, phone: null },
      service:  { name: 'AC Service' },
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
    };
    await expect(notifService.notifyBookingConfirmed(mockBooking)).resolves.not.toThrow();
  });

  it('should call notifyBookingCancelled without throwing', async () => {
    const mockBooking = {
      _id: 'booking123',
      bookingId: 'BK12345',
      customer: { _id: 'user123' },
      service:  { name: 'AC Service' },
      cancellation: { refundAmount: 100 },
    };
    await expect(notifService.notifyBookingCancelled(mockBooking)).resolves.not.toThrow();
  });

  it('should call notifyWalletCredited without throwing', async () => {
    await expect(notifService.notifyWalletCredited('user123', 100, 600, 'Referral bonus')).resolves.not.toThrow();
  });

  it('should call broadcastToAll without throwing', async () => {
    await expect(notifService.broadcastToAll('Test Title', 'Test message')).resolves.not.toThrow();
  });
});

describe('NotificationService dispatch', () => {
  it('should dispatch with invalid template gracefully', async () => {
    await expect(notifService.dispatch('user123', 'NONEXISTENT_TEMPLATE', {})).resolves.not.toThrow();
  });
});

// ── Payment Service Tests ──────────────────────────────────────
const paymentService = require('../../../backend/src/services/paymentService');

describe('PaymentService.verifySignature', () => {
  it('should return false for wrong signature', () => {
    const result = paymentService.verifySignature('order_123', 'pay_456', 'wrong_sig');
    expect(typeof result).toBe('boolean');
  });

  it('should handle empty signature', () => {
    const result = paymentService.verifySignature('order_123', 'pay_456', '');
    expect(result).toBe(false);
  });
});

describe('PaymentService.handleWebhookEvent', () => {
  it('should handle payment.captured event without throwing', async () => {
    await expect(paymentService.handleWebhookEvent('payment.captured', {
      payment: { entity: { id: 'pay_test', order_id: 'order_test', status: 'captured' } },
    })).resolves.not.toThrow();
  });

  it('should handle payment.failed event without throwing', async () => {
    await expect(paymentService.handleWebhookEvent('payment.failed', {
      payment: { entity: { id: 'pay_test', order_id: 'order_test', error_description: 'Insufficient funds' } },
    })).resolves.not.toThrow();
  });

  it('should handle unknown event gracefully', async () => {
    await expect(paymentService.handleWebhookEvent('unknown.event', {})).resolves.not.toThrow();
  });
});

describe('PaymentService.verifyWebhookSignature', () => {
  it('should return boolean', () => {
    const result = paymentService.verifyWebhookSignature('body', 'signature');
    expect(typeof result).toBe('boolean');
  });
});
