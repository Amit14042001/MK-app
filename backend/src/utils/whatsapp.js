/**
 * MK App — WhatsApp Webhook Handler
 * Handles incoming WhatsApp messages via Meta Business API
 * Use cases: OTP delivery, booking updates, customer support
 */

const axios   = require('axios');
const crypto  = require('crypto');
const Booking = require('../models/Booking');
const User    = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WA_VERIFY   = process.env.WHATSAPP_VERIFY_TOKEN || 'mk_wa_verify_2026';
const WA_API      = `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`;

// ── Webhook verification (GET) ────────────────────────────────
exports.verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WA_VERIFY) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Verification failed');
};

// ── Incoming message handler (POST) ──────────────────────────
exports.handleMessage = asyncHandler(async (req, res) => {
  // Verify signature
  const sig     = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET || '')
    .update(payload).digest('hex');

  if (sig && expected !== sig) {
    console.warn('[WhatsApp] Invalid signature');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // Immediately acknowledge
  res.status(200).json({ status: 'ok' });

  // Process async
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) return;

    for (const message of value.messages) {
      await processMessage(message, value.contacts?.[0]);
    }
  } catch (err) {
    console.error('[WhatsApp] Processing error:', err.message);
  }
});

// ── Process individual message ────────────────────────────────
async function processMessage(message, contact) {
  const from    = message.from;      // Phone number (no +)
  const type    = message.type;
  const name    = contact?.profile?.name || 'Customer';

  console.log(`[WhatsApp] Message from ${from}: type=${type}`);

  if (type === 'text') {
    const text = message.text?.body?.trim().toLowerCase();

    if (text === 'hi' || text === 'hello' || text === 'start') {
      await sendWAMessage(from, {
        type: 'text',
        text: { body: `Hello ${name}! 👋 Welcome to MK — India's most trusted home services app.\n\nType:\n📋 *status* — Track your booking\n🆘 *help* — Get support\n📞 *call* — Request callback\n❌ *cancel* — Cancel booking` },
      });
      return;
    }

    if (text === 'status' || text.includes('booking')) {
      const user = await User.findOne({ phone: `+91${from}` }).lean();
      if (!user) {
        await sendWAMessage(from, { type:'text', text:{ body:'No account found. Download MK App: https://mkapp.in' } });
        return;
      }
      const booking = await Booking.findOne({ customer:user._id, status:{ $nin:['completed','cancelled'] } })
        .populate('service','name icon').sort({ createdAt:-1 }).lean();
      if (!booking) {
        await sendWAMessage(from, { type:'text', text:{ body:'You have no active bookings. Book a service at mkapp.in 🏠' } });
        return;
      }
      await sendWAMessage(from, {
        type: 'text',
        text: { body: `📋 *Booking Update*\n\n${booking.service?.icon} ${booking.service?.name}\nStatus: *${booking.status.replace(/_/g,' ').toUpperCase()}*\nID: ${booking.bookingId}\n📅 ${new Date(booking.scheduledDate).toDateString()} at ${booking.scheduledTime}\n\nTrack live: https://mkapp.in/track/${booking._id}` },
      });
      return;
    }

    if (text === 'help' || text === 'support') {
      await sendWATemplate(from, 'support_menu', [{ type:'text', text:name }]);
      return;
    }

    if (text === 'call') {
      await User.findOneAndUpdate({ phone:`+91${from}` }, { $push:{ supportCallbacks:{ requestedAt:new Date() } } });
      await sendWAMessage(from, { type:'text', text:{ body:'📞 A support agent will call you within 5 minutes. Reference: ' + Date.now().toString(36).toUpperCase() } });
      return;
    }

    // Default fallback
    await sendWAMessage(from, {
      type: 'text',
      text: { body: `I didn't understand that. Reply:\n*status* — Booking status\n*help* — Support\n*call* — Callback\n\nOr visit mkapp.in 🏠` },
    });
  }

  if (type === 'interactive') {
    const reply = message.interactive?.button_reply || message.interactive?.list_reply;
    if (reply?.id === 'cancel_booking') {
      const user    = await User.findOne({ phone:`+91${from}` }).lean();
      const booking = await Booking.findOneAndUpdate(
        { customer:user?._id, status:{ $in:['pending','confirmed','professional_assigned'] } },
        { status:'cancelled', cancelledAt:new Date(), cancelReason:'Customer cancelled via WhatsApp' }
      );
      const msg = booking ? `✅ Booking ${booking.bookingId} cancelled. Refund in 5-7 days.` : 'No active booking to cancel.';
      await sendWAMessage(from, { type:'text', text:{ body:msg } });
    }
  }
}

// ── Send WhatsApp message ─────────────────────────────────────
async function sendWAMessage(to, messageBody) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp DEV] Would send to ${to}:`, JSON.stringify(messageBody).slice(0,100));
    return;
  }
  try {
    await axios.post(WA_API, { messaging_product:'whatsapp', to, ...messageBody }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type':'application/json' },
    });
  } catch (err) {
    console.error('[WhatsApp] Send error:', err.response?.data || err.message);
  }
}

// ── Send template message ─────────────────────────────────────
async function sendWATemplate(to, templateName, components = []) {
  await sendWAMessage(to, {
    type: 'template',
    template: {
      name: templateName,
      language: { code:'en' },
      components: components.map(c => ({ type:'body', parameters:[c] })),
    },
  });
}

// ── Outbound: Booking confirmation ────────────────────────────
exports.sendBookingConfirmation = async (booking) => {
  const user = await User.findById(booking.customer).lean();
  if (!user?.phone) return;
  const phone = user.phone.replace('+', '');
  await sendWAMessage(phone, {
    type: 'text',
    text: { body: `✅ *Booking Confirmed!*\n\n📋 ${booking.service?.name}\n📅 ${new Date(booking.scheduledDate).toDateString()} at ${booking.scheduledTime}\n💰 ₹${booking.pricing?.totalAmount}\n\nID: ${booking.bookingId}\nTrack: https://mkapp.in/track/${booking._id}` },
  });
};

// ── Outbound: Professional assigned ──────────────────────────
exports.sendProAssigned = async (booking, professional) => {
  const user = await User.findById(booking.customer).lean();
  if (!user?.phone) return;
  const phone = user.phone.replace('+', '');
  const proName = professional?.user?.name || 'a professional';
  await sendWAMessage(phone, {
    type: 'text',
    text: { body: `👷 *Professional Assigned*\n\n${proName} will be at your location for ${booking.service?.name}.\n⭐ Rating: ${professional?.rating || 4.8}\n📍 Track live: https://mkapp.in/track/${booking._id}` },
  });
};

// ── Outbound: OTP via WhatsApp ────────────────────────────────
exports.sendOTPWhatsApp = async (phone, otp) => {
  const to = phone.replace('+', '');
  await sendWAMessage(to, {
    type: 'text',
    text: { body: `🔐 Your MK App OTP is: *${otp}*\n\nValid for 10 minutes. Do NOT share with anyone.\n\nIf you didn't request this, ignore this message.` },
  });
};

// ── Routes ────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();

router.get('/',  exports.verify);
router.post('/', exports.handleMessage);

module.exports = { router, sendBookingConfirmation:exports.sendBookingConfirmation, sendProAssigned:exports.sendProAssigned, sendOTPWhatsApp:exports.sendOTPWhatsApp };
