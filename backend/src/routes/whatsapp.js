/**
 * MK App — WhatsApp Webhook Route
 * Meta Business API webhook + outbound message helpers
 */
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const axios   = require('axios');
const Booking = require('../models/Booking');
const User    = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleBookingBot } = require('../services/whatsappBotService');

const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WA_VERIFY   = process.env.WHATSAPP_VERIFY_TOKEN || 'mk_wa_verify_2026';
const WA_API      = `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`;

// ── Verify webhook (GET) ──────────────────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WA_VERIFY) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Forbidden' });
});

// ── Receive webhook (POST) ────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  // Always respond 200 first to prevent Meta retries
  res.status(200).json({ status: 'ok' });

  // Verify signature
  const sig = req.headers['x-hub-signature-256'] || '';
  const hmac = crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET || '');
  hmac.update(req.body);
  const expected = 'sha256=' + hmac.digest('hex');
  if (sig && sig !== expected) {
    console.warn('[WhatsApp] Signature mismatch — ignoring');
    return;
  }

  const body = JSON.parse(req.body.toString());
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;

      // Incoming message
      for (const msg of value.messages || []) {
        await handleIncomingMessage(msg, value.contacts?.[0]);
      }

      // Status update (sent/delivered/read/failed)
      for (const status of value.statuses || []) {
        await handleStatusUpdate(status);
      }
    }
  }
}));

// ── Outbound helpers ──────────────────────────────────────────
async function sendWAMessage(to, body) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp MOCK] To: ${to} | Msg: ${body}`);
    return;
  }
  try {
    await axios.post(WA_API, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[WhatsApp] Send error:', e.response?.data || e.message);
  }
}

async function sendWATemplate(to, templateName, components = []) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp MOCK] Template: ${templateName} to ${to}`);
    return;
  }
  try {
    await axios.post(WA_API, {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: 'en_IN' }, components },
    }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[WhatsApp] Template error:', e.response?.data || e.message);
  }
}

async function handleIncomingMessage(msg, contact) {
  const from    = msg.from;
  const rawText = msg.text?.body?.trim() || '';
  const text    = rawText.toLowerCase();
  const name    = contact?.profile?.name || 'Customer';

  console.log(`[WhatsApp] Message from ${from} (${name}): ${rawText}`);

  // ── Booking bot handles all multi-step conversational flows ─
  const botReply = await handleBookingBot(from, rawText, name);
  if (botReply) {
    await sendWAMessage(from, botReply);
    return;
  }

  // Legacy one-shot commands (bot handles most things now)
  const user = await User.findOne({ phone: from }).lean();

  if (text === 'hi' || text === 'hello' || text === 'help') {
    await sendWAMessage(from, `Hello ${name}! 👋 Welcome to MK App Support.\n\nReply with:\n1️⃣ *STATUS* — Check booking status\n2️⃣ *CANCEL* — Cancel a booking\n3️⃣ *RESCHEDULE* — Reschedule a booking\n4️⃣ *SUPPORT* — Talk to our team\n\nYou can also call us at 1800-123-4567`);
    return;
  }

  if (text.startsWith('status')) {
    const bookingId = text.replace('status', '').trim().toUpperCase();
    if (bookingId && user) {
      const booking = await Booking.findOne({ bookingId, customer: user._id })
        .populate('service', 'name')
        .lean();
      if (booking) {
        await sendWAMessage(from,
          `📋 Booking ${booking.bookingId}\n` +
          `Service: ${booking.service?.name}\n` +
          `Status: ${booking.status.toUpperCase()}\n` +
          `Date: ${new Date(booking.scheduledDate).toDateString()}\n` +
          `Time: ${booking.scheduledTimeSlot}\n\n` +
          `For help, reply *SUPPORT*`
        );
      } else {
        await sendWAMessage(from, `❌ No booking found with ID "${bookingId}". Please check and try again.`);
      }
    } else {
      await sendWAMessage(from, `Please reply: STATUS <BOOKING_ID>\nExample: STATUS BK1234`);
    }
    return;
  }

  if (text === 'support' || text === '4') {
    await sendWAMessage(from, `👨‍💼 Connecting you to our support team...\n\nOur team will contact you on this number within 30 minutes.\n\nAlternatively:\n📞 Call: 1800-123-4567\n⏰ Hours: 8 AM – 10 PM`);
    return;
  }

  // Default fallback
  await sendWAMessage(from, `Hi ${name}! We received your message.\n\nFor faster support, please:\n• Open the MK App\n• Go to Help & Support\n• Create a ticket\n\nOr reply *HELP* for options.`);
}

async function handleStatusUpdate(status) {
  const { id: msgId, status: msgStatus, timestamp, recipient_id } = status;
  console.log(`[WhatsApp] Message ${msgId} to ${recipient_id}: ${msgStatus}`);
  // Could update DB message delivery status here
}

// ── Exported send helpers (used by other controllers) ─────────
router.sendMessage  = sendWAMessage;
router.sendTemplate = sendWATemplate;

// ── Admin: send manual message ────────────────────────────────
router.post('/send', asyncHandler(async (req, res) => {
  const { to, message, templateName, components } = req.body;
  if (!to) return res.status(400).json({ success: false, message: 'Phone number required' });

  if (templateName) {
    await sendWATemplate(to, templateName, components);
  } else if (message) {
    await sendWAMessage(to, message);
  } else {
    return res.status(400).json({ success: false, message: 'message or templateName required' });
  }

  res.json({ success: true, message: 'WhatsApp message sent' });
}));

// ── Booking notifications ─────────────────────────────────────
exports.notifyBookingConfirmed = async (booking, customerPhone) => {
  await sendWAMessage(customerPhone,
    `✅ Booking Confirmed!\n\n` +
    `Booking ID: ${booking.bookingId}\n` +
    `Service: ${booking.service?.name || ''}\n` +
    `Date: ${new Date(booking.scheduledDate).toDateString()}\n` +
    `Time: ${booking.scheduledTimeSlot}\n\n` +
    `Track your booking in the MK App.\nFor help, reply *SUPPORT*`
  );
};

exports.notifyProfessionalArriving = async (booking, customerPhone, eta) => {
  await sendWAMessage(customerPhone,
    `🚗 Your professional is arriving!\n\n` +
    `ETA: ${eta || '10–15 minutes'}\n` +
    `Booking: ${booking.bookingId}\n\n` +
    `Please be ready to receive the service.`
  );
};

exports.notifyBookingCompleted = async (booking, customerPhone) => {
  await sendWAMessage(customerPhone,
    `🎉 Service Completed!\n\n` +
    `Booking: ${booking.bookingId}\n` +
    `Thank you for using MK App!\n\n` +
    `Please rate your experience in the app. Your feedback helps us improve. ⭐`
  );
};

module.exports = router;
