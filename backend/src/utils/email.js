/**
 * Slot App — Email Utility (Full Templates)
 * Booking confirmations, receipts, OTP emails, promotions
 */
const nodemailer = require('nodemailer');

const Slot_COLOR    = '#f15c22';
const Slot_DARK     = '#1a1a2e';
const APP_NAME    = 'Slot Services';
const APP_URL     = process.env.FRONTEND_URL || 'https://slotapp.in';

const getTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    pool:   true,
    maxConnections: 5,
  });

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `${APP_NAME} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to, subject, html, text,
    });
    return info;
  } catch (err) {
    console.error('[Email] Send error:', err.message);
    throw err;
  }
};

// ── HTML wrapper ─────────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,${slot_DARK},${slot_COLOR});padding:28px 24px;text-align:center}
.header h1{color:#fff;margin:0;font-size:32px;font-weight:900;letter-spacing:-1px}
.header p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:14px}
.body{padding:28px 24px;color:#333}
.card{background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${slot_COLOR}}
.badge{display:inline-block;background:${slot_COLOR};color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold}
.btn{display:inline-block;background:${slot_COLOR};color:#fff;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold;margin:8px 0}
.footer{background:#f8f9fa;padding:20px 24px;text-align:center;color:#999;font-size:12px}
.divider{border:none;border-top:1px solid #eee;margin:20px 0}
</style></head><body>
<div class="container">${content}</div>
</body></html>`;

// ── Booking Confirmation ─────────────────────────────────────
const bookingConfirmationEmail = ({ user, booking, service }) => ({
  to: user.email,
  subject: `✅ Booking Confirmed — ${booking.bookingId}`,
  html: emailWrapper(`
    <div class="header"><h1>Slot</h1><p>Booking Confirmed! 🎉</p></div>
    <div class="body">
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your booking is confirmed! A professional will arrive at your location on time.</p>
      <div class="card">
        <p><strong>📋 Booking ID:</strong> ${booking.bookingId}</p>
        <p><strong>🔧 Service:</strong> ${service?.name || booking.service?.name}</p>
        <p><strong>📅 Date:</strong> ${new Date(booking.scheduledDate).toDateString()}</p>
        <p><strong>⏰ Time:</strong> ${booking.scheduledTime}</p>
        <p><strong>📍 Address:</strong> ${booking.address?.line1}, ${booking.address?.city}</p>
        <p><strong>💰 Amount:</strong> ₹${booking.pricing?.totalAmount}</p>
        <p><strong>💳 Payment:</strong> ${booking.payment?.status === 'paid' ? '✅ Paid' : '⏳ Pay on delivery'}</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/bookings/${booking._id}" class="btn">Track Booking Live 📍</a>
      </div>
      <p style="color:#666;font-size:13px">💡 Tip: You can track your professional's live location on the Slot app 30 mins before their arrival.</p>
    </div>
    <div class="footer">${APP_NAME} · <a href="${APP_URL}">slotapp.in</a> · India's trusted home services</div>
  `),
});

// ── OTP Email ────────────────────────────────────────────────
const otpEmail = ({ user, otp }) => ({
  to: user.email || user,
  subject: `${otp} — Your Slot App OTP`,
  html: emailWrapper(`
    <div class="header"><h1>Slot</h1><p>One-Time Password</p></div>
    <div class="body" style="text-align:center">
      <p>Hi${user.name ? ` <strong>${user.name}</strong>` : ''},</p>
      <p>Your OTP for Slot App login is:</p>
      <div style="font-size:48px;font-weight:900;color:${slot_COLOR};letter-spacing:12px;margin:24px 0">${otp}</div>
      <p style="color:#e74c3c;font-size:13px">⚠️ Valid for <strong>10 minutes</strong>. Do NOT share with anyone.</p>
    </div>
    <div class="footer">${APP_NAME} — If you didn't request this, please ignore.</div>
  `),
});

// ── Booking Cancelled ────────────────────────────────────────
const bookingCancelledEmail = ({ user, booking, refundAmount }) => ({
  to: user.email,
  subject: `❌ Booking Cancelled — ${booking.bookingId}`,
  html: emailWrapper(`
    <div class="header" style="background:linear-gradient(135deg,${slot_DARK},#e74c3c)">
      <h1>Slot</h1><p>Booking Cancelled</p>
    </div>
    <div class="body">
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your booking <strong>${booking.bookingId}</strong> has been cancelled.</p>
      ${refundAmount ? `<div class="card"><p>💰 <strong>Refund:</strong> ₹${refundAmount} will be credited to your wallet/source in 5-7 business days.</p></div>` : ''}
      <p style="color:#666;font-size:13px">Need help? Contact us at support@slotapp.in or call 1800-XXX-XXXX (toll-free)</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}/services" class="btn">Book Again</a>
      </div>
    </div>
    <div class="footer">${APP_NAME}</div>
  `),
});

// ── Booking Completed + Review Request ───────────────────────
const bookingCompletedEmail = ({ user, booking }) => ({
  to: user.email,
  subject: `⭐ How was your experience? — ${booking.bookingId}`,
  html: emailWrapper(`
    <div class="header"><h1>Slot</h1><p>Service Completed ✅</p></div>
    <div class="body" style="text-align:center">
      <p>Hi <strong>${user.name}</strong>, your service is done!</p>
      <p style="font-size:15px">How was your experience? Your feedback helps us improve.</p>
      <div style="margin:24px 0">
        <a href="${APP_URL}/bookings/${booking._id}/review?r=5" class="btn" style="margin:4px">⭐⭐⭐⭐⭐ Excellent</a><br/>
        <a href="${APP_URL}/bookings/${booking._id}/review" style="color:${slot_COLOR};font-size:13px">Other rating</a>
      </div>
    </div>
    <div class="footer">${APP_NAME}</div>
  `),
});

// ── Welcome Email ────────────────────────────────────────────
const welcomeEmail = ({ user }) => ({
  to: user.email,
  subject: `Welcome to Slot Services, ${user.name}! 🎉`,
  html: emailWrapper(`
    <div class="header"><h1>Slot</h1><p>Welcome to India's trusted home services! 🏠</p></div>
    <div class="body">
      <p>Hi <strong>${user.name}</strong>, welcome to Slot Services!</p>
      <p>We bring trusted professionals to your doorstep for all home services.</p>
      <div class="card">
        <p>🎁 <strong>New user bonus:</strong> Use code <span class="badge">MKNEW100</span> for ₹100 off your first booking!</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${APP_URL}" class="btn">Book Your First Service</a>
      </div>
    </div>
    <div class="footer">${APP_NAME}</div>
  `),
});

module.exports = {
  sendEmail,
  bookingConfirmationEmail, otpEmail, bookingCancelledEmail,
  bookingCompletedEmail, welcomeEmail,
};
