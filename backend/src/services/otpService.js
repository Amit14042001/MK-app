/**
 * MK App — OTP Service
 * Generate, send, verify and expire OTPs via SMS / WhatsApp
 */
const crypto  = require('crypto');
const redis   = require('../config/redis');

const OTP_TTL     = 600;  // 10 minutes
const OTP_LENGTH  = 6;
const MAX_ATTEMPTS= 5;
const RESEND_COOLDOWN = 60; // 1 minute between resends

// In test mode bypass
const TEST_OTP    = '123456';
const IS_TEST     = process.env.NODE_ENV === 'test' || process.env.USE_MOCK_OTP === 'true';

/**
 * Generate a cryptographically secure OTP
 */
function generateOTP(length = OTP_LENGTH) {
  if (IS_TEST) return TEST_OTP;
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(crypto.randomInt(min, max));
}

/**
 * Store OTP in Redis with TTL
 */
async function storeOTP(phone, otp) {
  const key       = `otp:${phone}`;
  const attempKey = `otp:attempts:${phone}`;
  const coolKey   = `otp:cooldown:${phone}`;

  await redis.set(key, { otp, createdAt: Date.now() }, OTP_TTL);
  await redis.set(attempKey, 0, OTP_TTL);
  await redis.set(coolKey, 1, RESEND_COOLDOWN);
}

/**
 * Check resend cooldown
 */
async function isInCooldown(phone) {
  const val = await redis.get(`otp:cooldown:${phone}`).catch(() => null);
  return !!val;
}

/**
 * Send OTP via SMS
 */
async function sendSMSOTP(phone, otp) {
  const message = `${otp} is your MK App OTP. Valid for 10 minutes. Do NOT share. -MK Services`;
  if (IS_TEST) {
    console.log(`[OTP TEST] Phone: ${phone} | OTP: ${otp}`);
    return { success: true, mock: true };
  }
  const { sendSMS } = require('../utils/sms');
  return sendSMS(phone, message);
}

/**
 * Send OTP via WhatsApp (optional channel)
 */
async function sendWhatsAppOTP(phone, otp) {
  if (IS_TEST || !process.env.WHATSAPP_TOKEN) return { success: false, reason: 'WA not configured' };
  const message = `Your MK App verification code: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  const { sendMessage } = require('../routes/whatsapp');
  return sendMessage(phone, message);
}

/**
 * Main: generate and send OTP
 * Returns { success, message, cooldown? }
 */
exports.sendOTP = async (phone, channel = 'sms') => {
  // Rate limit: max 5 OTPs per hour
  const hourKey   = `otp:hourly:${phone}`;
  const hourCount = await redis.get(hourKey).catch(() => null);
  if (parseInt(hourCount) >= 5) {
    return { success: false, message: 'Too many OTP requests. Try again in an hour.' };
  }

  // Cooldown check
  if (await isInCooldown(phone)) {
    return { success: false, message: `Please wait ${RESEND_COOLDOWN} seconds before requesting another OTP.`, cooldown: true };
  }

  const otp = generateOTP();
  await storeOTP(phone, otp);

  // Increment hourly counter
  const newCount = await redis.incr(hourKey).catch(() => 1);
  if (newCount === 1) await redis.expire(hourKey, 3600).catch(() => {});

  // Send via chosen channel
  let sendResult;
  try {
    if (channel === 'whatsapp') {
      sendResult = await sendWhatsAppOTP(phone, otp);
      if (!sendResult?.success) {
        // Fallback to SMS
        sendResult = await sendSMSOTP(phone, otp);
      }
    } else {
      sendResult = await sendSMSOTP(phone, otp);
    }
  } catch (e) {
    console.error('[OTPService] Send error:', e.message);
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }

  return {
    success:    true,
    message:    `OTP sent to ${phone.slice(0, -4).replace(/./g, '*')}****`,
    expiresIn:  OTP_TTL,
    ...(IS_TEST && { otp }), // include otp in response only in test mode
  };
};

/**
 * Verify OTP entered by user
 * Returns { success, message, attemptsLeft? }
 */
exports.verifyOTP = async (phone, enteredOTP) => {
  const key       = `otp:${phone}`;
  const attempKey = `otp:attempts:${phone}`;

  const stored = await redis.get(key).catch(() => null);
  if (!stored) {
    return { success: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  // Increment attempts
  const attempts = await redis.incr(attempKey).catch(() => 1);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(key);
    await redis.del(attempKey);
    return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  const storedOTP = typeof stored === 'object' ? stored.otp : stored;

  if (String(storedOTP) !== String(enteredOTP)) {
    const attemptsLeft = MAX_ATTEMPTS - attempts;
    return {
      success:      false,
      message:      `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
      attemptsLeft,
    };
  }

  // OTP correct — clear from Redis
  await redis.del(key);
  await redis.del(attempKey);
  await redis.del(`otp:cooldown:${phone}`);

  return { success: true, message: 'OTP verified successfully.' };
};

/**
 * Check if OTP exists (for UI "resend" button timer)
 */
exports.getOTPStatus = async (phone) => {
  const inCooldown = await isInCooldown(phone);
  const exists     = !!(await redis.get(`otp:${phone}`).catch(() => null));
  const attempts   = parseInt(await redis.get(`otp:attempts:${phone}`).catch(() => 0)) || 0;
  return { exists, inCooldown, attemptsLeft: MAX_ATTEMPTS - attempts };
};

exports.generateOTP   = generateOTP;
exports.OTP_TTL       = OTP_TTL;
exports.MAX_ATTEMPTS  = MAX_ATTEMPTS;
