/**
 * Slot App — SMS Utility (Twilio + MSG91 fallback)
 * Handles OTP delivery, booking alerts, promotional SMS
 */

// ── Primary: Twilio ──────────────────────────────────────────
const sendViaTwilio = async (to, body) => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: `+91${to}` });
};

// ── Fallback: MSG91 ──────────────────────────────────────────
const sendViaMSG91 = async (to, message) => {
  const axios = require('axios');
  return axios.post('https://api.msg91.com/api/v5/flow/', {
    template_id: process.env.MSG91_OTP_TEMPLATE,
    recipients: [{ mobiles: `91${to}`, otp: message }],
  }, { headers: { authkey: process.env.MSG91_AUTH_KEY } });
};

// ── Core send function ───────────────────────────────────────
const sendSMS = async (to, message) => {
  const phone = to.replace(/[^0-9]/g, '').replace(/^91/, '').replace(/^\+/, '');

  if (!process.env.TWILIO_ACCOUNT_SID && !process.env.MSG91_AUTH_KEY) {
    console.log(`[SMS MOCK] To: +91${phone} | Message: ${message}`);
    return { mock: true };
  }

  try {
    if (process.env.TWILIO_ACCOUNT_SID) {
      return await sendViaTwilio(phone, message);
    } else {
      return await sendViaMSG91(phone, message);
    }
  } catch (err) {
    console.error('[SMS] Primary failed, trying fallback:', err.message);
    try {
      return await sendViaMSG91(phone, message);
    } catch (err2) {
      console.error('[SMS] All channels failed:', err2.message);
      throw err2;
    }
  }
};

// ── Message templates ────────────────────────────────────────
const sendOTPSMS = (phone, otp) =>
  sendSMS(phone, `${otp} is your Slot App OTP. Valid for 10 mins. DO NOT share with anyone. -Slot Services`);

const sendBookingConfirmationSMS = (phone, bookingId, date, time) =>
  sendSMS(phone, `Booking ${bookingId} confirmed for ${date} at ${time}. Track at slotapp.in. -Slot Services`);

const sendBookingCancelledSMS = (phone, bookingId) =>
  sendSMS(phone, `Booking ${bookingId} has been cancelled. Refund will be processed in 5-7 days. -Slot Services`);

const sendProfessionalAssignedSMS = (phone, proName, eta) =>
  sendSMS(phone, `${proName} is assigned for your booking and will arrive in ~${eta} mins. Track live on Slot App. -Slot Services`);

const sendPaymentReceiptSMS = (phone, amount, bookingId) =>
  sendSMS(phone, `Payment of Rs.${amount} received for booking ${bookingId}. Thank you! -Slot Services`);

module.exports = {
  sendSMS, sendOTPSMS, sendBookingConfirmationSMS,
  sendBookingCancelledSMS, sendProfessionalAssignedSMS, sendPaymentReceiptSMS,
};
