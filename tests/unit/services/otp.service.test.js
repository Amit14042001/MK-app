/**
 * MK App — OTP Service Tests
 */

process.env.NODE_ENV = 'test';
process.env.USE_MOCK_OTP = 'true';

const redisMock = {
  store: {},
  get:    jest.fn(async (k) => redisMock.store[k] ?? null),
  set:    jest.fn(async (k, v) => { redisMock.store[k] = v; return 'OK'; }),
  del:    jest.fn(async (k) => { delete redisMock.store[k]; return 1; }),
  delPattern: jest.fn().mockResolvedValue(1),
  incr:   jest.fn(async (k) => { redisMock.store[k] = (redisMock.store[k] || 0) + 1; return redisMock.store[k]; }),
  expire: jest.fn().mockResolvedValue(1),
};

jest.mock('../../backend/src/config/redis', () => redisMock);
jest.mock('../../backend/src/utils/sms', () => ({
  sendSMS: jest.fn().mockResolvedValue({ sid: 'mock_sid' }),
}));

const otpService = require('../../backend/src/services/otpService');

const TEST_PHONE = '+919876540001';

beforeEach(() => {
  redisMock.store = {};
  jest.clearAllMocks();
});

describe('OTPService.sendOTP', () => {
  it('should send OTP successfully', async () => {
    const result = await otpService.sendOTP(TEST_PHONE);
    expect(result.success).toBe(true);
    expect(result.message).toContain('OTP sent');
    expect(result.expiresIn).toBe(otpService.OTP_TTL);
  });

  it('should include OTP in response in test mode', async () => {
    const result = await otpService.sendOTP(TEST_PHONE);
    expect(result.otp).toBeDefined();
    expect(result.otp).toBe('123456');
  });

  it('should store OTP in redis', async () => {
    await otpService.sendOTP(TEST_PHONE);
    expect(redisMock.set).toHaveBeenCalled();
    const stored = redisMock.store[`otp:${TEST_PHONE}`];
    expect(stored).toBeDefined();
  });

  it('should reject during cooldown', async () => {
    // First request
    await otpService.sendOTP(TEST_PHONE);
    // Simulate cooldown
    redisMock.store[`otp:cooldown:${TEST_PHONE}`] = 1;

    const result = await otpService.sendOTP(TEST_PHONE);
    expect(result.success).toBe(false);
    expect(result.cooldown).toBe(true);
  });

  it('should enforce hourly rate limit', async () => {
    const phone = '+919876540002';
    redisMock.store[`otp:hourly:${phone}`] = 5; // at limit

    const result = await otpService.sendOTP(phone);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many/i);
  });
});

describe('OTPService.verifyOTP', () => {
  it('should verify correct OTP', async () => {
    await otpService.sendOTP(TEST_PHONE);
    const result = await otpService.verifyOTP(TEST_PHONE, '123456');

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/verified/i);
  });

  it('should reject incorrect OTP', async () => {
    await otpService.sendOTP(TEST_PHONE);
    const result = await otpService.verifyOTP(TEST_PHONE, '000000');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/incorrect/i);
    expect(result.attemptsLeft).toBeDefined();
  });

  it('should reject expired/missing OTP', async () => {
    const result = await otpService.verifyOTP('+919876540099', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/expired|not found/i);
  });

  it('should delete OTP from redis after successful verification', async () => {
    await otpService.sendOTP(TEST_PHONE);
    await otpService.verifyOTP(TEST_PHONE, '123456');

    const remaining = redisMock.store[`otp:${TEST_PHONE}`];
    expect(remaining).toBeUndefined();
  });

  it('should lock after max attempts', async () => {
    const phone = '+919876540003';
    await otpService.sendOTP(phone);

    // Exhaust all attempts
    for (let i = 0; i < otpService.MAX_ATTEMPTS; i++) {
      await otpService.verifyOTP(phone, '999999');
    }

    const result = await otpService.verifyOTP(phone, '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many/i);
  });
});

describe('OTPService.getOTPStatus', () => {
  it('should return exists:true when OTP is active', async () => {
    await otpService.sendOTP(TEST_PHONE);
    const status = await otpService.getOTPStatus(TEST_PHONE);
    expect(status.exists).toBe(true);
  });

  it('should return exists:false when no OTP', async () => {
    const status = await otpService.getOTPStatus('+919876540099');
    expect(status.exists).toBe(false);
  });

  it('should report cooldown correctly', async () => {
    const phone = '+919876540004';
    await otpService.sendOTP(phone);
    redisMock.store[`otp:cooldown:${phone}`] = 1;

    const status = await otpService.getOTPStatus(phone);
    expect(status.inCooldown).toBe(true);
  });
});

describe('OTPService.generateOTP', () => {
  it('should return test OTP in test mode', () => {
    const otp = otpService.generateOTP();
    expect(otp).toBe('123456');
  });

  it('should be 6 digits', () => {
    const otp = otpService.generateOTP(6);
    expect(otp).toHaveLength(6);
  });
});
