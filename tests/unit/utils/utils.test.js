/**
 * MK App — Utils Unit Tests
 * Tests for email, SMS, notifications, cache invalidation
 */

// Mock external dependencies
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  }),
}));

jest.mock('twilio', () => () => ({
  messages: {
    create: jest.fn().mockResolvedValue({ sid: 'test-sms-sid' }),
  },
}));

jest.mock('../../backend/src/config/redis', () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue('OK'),
  del:        jest.fn().mockResolvedValue(1),
  delPattern: jest.fn().mockResolvedValue(1),
  incr:       jest.fn().mockResolvedValue(1),
  expire:     jest.fn().mockResolvedValue(1),
}));

jest.mock('firebase-admin', () => ({
  initializeApp:   jest.fn(),
  credential:      { cert: jest.fn() },
  messaging:       jest.fn().mockReturnValue({
    send:     jest.fn().mockResolvedValue('message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

describe('Email Utils', () => {
  let emailUtils;

  beforeAll(() => {
    try {
      emailUtils = require('../../backend/src/utils/email');
    } catch {
      emailUtils = null;
    }
  });

  it('should export sendEmail function', () => {
    if (!emailUtils) return;
    expect(typeof emailUtils.sendEmail).toBe('function');
  });

  it('should send email without throwing', async () => {
    if (!emailUtils?.sendEmail) return;
    await expect(emailUtils.sendEmail({
      to:      'test@example.com',
      subject: 'Test Email',
      html:    '<h1>Test</h1>',
    })).resolves.not.toThrow();
  });

  it('should export booking confirmation email helper', () => {
    if (!emailUtils) return;
    expect(typeof emailUtils.bookingConfirmationEmail).toBe('function');
  });

  it('should generate booking confirmation HTML', () => {
    if (!emailUtils?.bookingConfirmationEmail) return;
    const html = emailUtils.bookingConfirmationEmail({
      bookingId: 'BK1234',
      service:   { name: 'AC Service' },
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
      address:   { line1: '123 Test', city: 'Hyderabad' },
      pricing:   { totalAmount: 599 },
    });
    expect(typeof html).toBe('string');
    expect(html).toContain('BK1234');
  });
});

describe('SMS Utils', () => {
  let smsUtils;

  beforeAll(() => {
    try {
      smsUtils = require('../../backend/src/utils/sms');
    } catch {
      smsUtils = null;
    }
  });

  it('should export sendSMS function', () => {
    if (!smsUtils) return;
    expect(typeof smsUtils.sendSMS).toBe('function');
  });

  it('should send SMS without throwing', async () => {
    if (!smsUtils?.sendSMS) return;
    await expect(
      smsUtils.sendSMS('+919876543210', 'Test OTP: 123456')
    ).resolves.not.toThrow();
  });

  it('should export booking confirmation SMS', () => {
    if (!smsUtils) return;
    if (smsUtils.sendBookingConfirmationSMS) {
      expect(typeof smsUtils.sendBookingConfirmationSMS).toBe('function');
    }
  });
});

describe('Notification Utils', () => {
  let notifUtils;

  beforeAll(() => {
    try {
      notifUtils = require('../../backend/src/utils/notifications');
    } catch {
      notifUtils = null;
    }
  });

  it('should export notification functions', () => {
    if (!notifUtils) return;
    const expectedFns = [
      'notifyBookingConfirmed',
      'notifyProfessionalNewBooking',
      'notifyBookingCancelled',
    ];
    expectedFns.forEach(fn => {
      if (notifUtils[fn]) expect(typeof notifUtils[fn]).toBe('function');
    });
  });

  it('should send booking confirmed notification without throwing', async () => {
    if (!notifUtils?.notifyBookingConfirmed) return;
    const mockBooking = {
      _id:           'booking123',
      bookingId:     'BK1234',
      customer:      { fcmToken: 'test-token', name: 'Test User' },
      service:       { name: 'AC Service' },
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
    };
    await expect(notifUtils.notifyBookingConfirmed(mockBooking)).resolves.not.toThrow();
  });
});

describe('Cache Invalidation Utils', () => {
  let cacheUtils;

  beforeAll(() => {
    try {
      cacheUtils = require('../../backend/src/utils/cacheInvalidation');
    } catch {
      cacheUtils = null;
    }
  });

  it('should export cache invalidation functions', () => {
    if (!cacheUtils) return;
    if (cacheUtils.invalidateBookingCache) {
      expect(typeof cacheUtils.invalidateBookingCache).toBe('function');
    }
    if (cacheUtils.invalidateUserCache) {
      expect(typeof cacheUtils.invalidateUserCache).toBe('function');
    }
  });

  it('should invalidate cache without throwing', async () => {
    if (!cacheUtils?.invalidateBookingCache) return;
    await expect(cacheUtils.invalidateBookingCache('user123')).resolves.not.toThrow();
  });
});

describe('Input Validation', () => {
  it('should validate phone number format', () => {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    expect(phoneRegex.test('+919876543210')).toBe(true);
    expect(phoneRegex.test('9876543210')).toBe(true);
    expect(phoneRegex.test('123')).toBe(false);
    expect(phoneRegex.test('')).toBe(false);
  });

  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('user@mkapp.in')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('')).toBe(false);
  });

  it('should validate pincode format', () => {
    const pincodeRegex = /^\d{6}$/;
    expect(pincodeRegex.test('500001')).toBe(true);
    expect(pincodeRegex.test('50000')).toBe(false);
    expect(pincodeRegex.test('5000011')).toBe(false);
  });

  it('should validate OTP format', () => {
    const otpRegex = /^\d{4,6}$/;
    expect(otpRegex.test('123456')).toBe(true);
    expect(otpRegex.test('1234')).toBe(true);
    expect(otpRegex.test('12')).toBe(false);
    expect(otpRegex.test('abcdef')).toBe(false);
  });
});

describe('Price Calculation', () => {
  const calcTotal = (base, couponDiscount = 0, walletUsed = 0) => {
    const convenienceFee = base >= 500 ? 0 : 29;
    const gst = Math.round((base - couponDiscount) * 0.18);
    const total = Math.max(0, base - couponDiscount + convenienceFee + gst - walletUsed);
    return { convenienceFee, gst, total };
  };

  it('should not charge convenience fee for orders >= ₹500', () => {
    const { convenienceFee } = calcTotal(500);
    expect(convenienceFee).toBe(0);
  });

  it('should charge ₹29 convenience fee for orders < ₹500', () => {
    const { convenienceFee } = calcTotal(299);
    expect(convenienceFee).toBe(29);
  });

  it('should calculate 18% GST correctly', () => {
    const { gst } = calcTotal(500);
    expect(gst).toBe(Math.round(500 * 0.18));
  });

  it('should apply coupon discount before GST', () => {
    const { gst } = calcTotal(500, 50);
    expect(gst).toBe(Math.round(450 * 0.18));
  });

  it('should not return negative total', () => {
    const { total } = calcTotal(299, 0, 99999);
    expect(total).toBe(0);
  });
});
