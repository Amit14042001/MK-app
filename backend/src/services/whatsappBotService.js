/**
 * MK App — WhatsApp Booking Bot
 * Full conversational booking flow via WhatsApp
 * Extends the base whatsapp.js route
 * 
 * Conversation flow:
 * 1. User sends "Book" or "BOOK"
 * 2. Bot shows service categories
 * 3. User picks category
 * 4. Bot shows services in that category
 * 5. User picks service
 * 6. Bot asks for date
 * 7. Bot shows available time slots
 * 8. User picks slot
 * 9. Bot confirms booking details
 * 10. User confirms with "YES"
 * 11. Bot creates booking and sends payment link
 */
const User     = require('../models/User');
const Service  = require('../models/Service');
const Booking  = require('../models/Booking');
const Category = require('../models/Category');

// ── Session store (Redis recommended for production) ─────────
const sessions = new Map(); // phone → { step, data }

const STEPS = {
  IDLE:        'idle',
  PICK_CAT:    'pick_category',
  PICK_SVC:    'pick_service',
  ENTER_DATE:  'enter_date',
  PICK_SLOT:   'pick_slot',
  ENTER_ADDR:  'enter_address',
  CONFIRM:     'confirm',
  AWAITING_PAYMENT: 'awaiting_payment',
};

const AVAILABLE_SLOTS = [
  '08:00 AM – 10:00 AM',
  '10:00 AM – 12:00 PM',
  '12:00 PM – 02:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
  '06:00 PM – 08:00 PM',
];

// ── Main bot handler ──────────────────────────────────────────
async function handleBookingBot(from, text, name) {
  const session = sessions.get(from) || { step: STEPS.IDLE, data: {} };
  const t = text.trim().toLowerCase();

  // Global commands
  if (t === 'cancel' || t === 'exit' || t === 'stop') {
    sessions.delete(from);
    return `❌ Booking cancelled. Reply *BOOK* anytime to start a new booking, or *HELP* for options.`;
  }

  if (t === 'help' || t === 'hi' || t === 'hello') {
    sessions.delete(from);
    return buildHelpMessage(name);
  }

  switch (session.step) {
    case STEPS.IDLE:
      if (t === 'book' || t === '2') {
        sessions.set(from, { step: STEPS.PICK_CAT, data: {} });
        return await buildCategoryMenu();
      }
      if (t === 'status' || t === '1') {
        return `Please send: *STATUS <BOOKING_ID>*\nExample: STATUS BK123456`;
      }
      if (t === 'offers' || t === '3') {
        return buildOffersMessage();
      }
      return buildHelpMessage(name);

    case STEPS.PICK_CAT: {
      const categories = await getCategories();
      const idx = parseInt(t) - 1;
      if (isNaN(idx) || idx < 0 || idx >= categories.length) {
        return `Please reply with a number (1-${categories.length}):\n\n${buildCategoryList(categories)}`;
      }
      const cat = categories[idx];
      session.data.category = cat;
      session.step = STEPS.PICK_SVC;
      sessions.set(from, session);
      return await buildServiceMenu(cat._id);
    }

    case STEPS.PICK_SVC: {
      const services = await getServicesForCategory(session.data.category._id);
      const idx = parseInt(t) - 1;
      if (isNaN(idx) || idx < 0 || idx >= services.length) {
        return `Please reply with a number (1-${services.length}):\n\n${buildServiceList(services)}`;
      }
      const svc = services[idx];
      session.data.service = svc;
      session.step = STEPS.ENTER_DATE;
      sessions.set(from, session);
      return `✅ Great choice! *${svc.name}* — Starting at ₹${svc.startingPrice}\n\n📅 Which date? Reply in format:\n*DD/MM/YYYY*\n\nExample: *25/01/2026*\n\nOr reply *TODAY* or *TOMORROW*`;
    }

    case STEPS.ENTER_DATE: {
      let date = parseDate(t);
      if (!date) {
        return `❌ Invalid date. Please use format *DD/MM/YYYY*\nExample: 25/01/2026\n\nOr reply *TODAY* or *TOMORROW*`;
      }
      if (date < new Date()) {
        return `❌ Please select a future date. Reply with DD/MM/YYYY`;
      }
      session.data.date = date;
      session.step = STEPS.PICK_SLOT;
      sessions.set(from, session);
      return buildSlotMenu(date);
    }

    case STEPS.PICK_SLOT: {
      const idx = parseInt(t) - 1;
      if (isNaN(idx) || idx < 0 || idx >= AVAILABLE_SLOTS.length) {
        return `Please reply with a number (1-${AVAILABLE_SLOTS.length}):\n\n${buildSlotList()}`;
      }
      session.data.slot = AVAILABLE_SLOTS[idx];
      session.step = STEPS.ENTER_ADDR;
      sessions.set(from, session);
      return `📍 *Your service address?*\n\nPlease send your full address in one message:\n_Example: Flat 201, Green Valley Apartments, HITEC City, Hyderabad 500081_\n\nOr reply *SAVED* to use your last saved address.`;
    }

    case STEPS.ENTER_ADDR: {
      let address;
      if (t === 'saved') {
        // Try to find user's saved address
        const user = await User.findOne({ phone: from }).lean();
        const saved = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0];
        if (!saved) {
          return `No saved address found. Please type your address.`;
        }
        address = `${saved.line1}, ${saved.area || ''}, ${saved.city} ${saved.pincode}`;
        session.data.savedAddress = saved;
      } else {
        address = text.trim(); // Use original case
        session.data.addressText = address;
      }
      session.data.addressDisplay = address;
      session.step = STEPS.CONFIRM;
      sessions.set(from, session);
      return buildConfirmation(session.data);
    }

    case 'RESCHEDULE_DATE': {
      const date = parseDate(rawText);
      if (!date) return `Invalid date. Use *DD/MM/YYYY*, *TODAY*, or *TOMORROW*`;
      if (date < new Date()) return `❌ Please choose a future date.`;
      session.step = 'RESCHEDULE_SLOT';
      session.data.newDate = date;
      sessions.set(from, session);
      return buildSlotMenu(date);
    }

    case 'RESCHEDULE_SLOT': {
      const idx = parseInt(rawText) - 1;
      if (isNaN(idx) || idx < 0 || idx >= AVAILABLE_SLOTS.length) {
        return `Please pick a slot (1–${AVAILABLE_SLOTS.length}):

${buildSlotList()}`;
      }
      const { bookingId, newDate } = session.data;
      sessions.delete(from);
      return await doReschedule(from, bookingId, newDate, AVAILABLE_SLOTS[idx]);
    }

    case STEPS.CONFIRM: {
      if (t === 'yes' || t === '1' || t === 'confirm') {
        return await createBookingAndRespond(from, session.data, name);
      }
      if (t === 'no' || t === '2' || t === 'change') {
        sessions.delete(from);
        return `Booking cancelled. Reply *BOOK* to start again.`;
      }
      return buildConfirmation(session.data);
    }

    default:
      sessions.delete(from);
      return buildHelpMessage(name);
  }
}

// ── Message Builders ──────────────────────────────────────────
function buildHelpMessage(name) {
  return `👋 Hello ${name}! Welcome to *MK App* 🏠\n\nI can help you:\n\n1️⃣ *STATUS* — Check booking status\n2️⃣ *BOOK* — Book a home service\n3️⃣ *OFFERS* — View current offers\n4️⃣ *SUPPORT* — Talk to our team\n\nWhat would you like to do?`;
}

async function buildCategoryMenu() {
  const categories = await getCategories();
  let msg = `🏠 *Select a Service Category:*\n\n`;
  categories.forEach((cat, i) => {
    msg += `${i + 1}. ${cat.icon || '🔧'} ${cat.name}\n`;
  });
  msg += `\n_Reply with the number_`;
  return msg;
}

function buildCategoryList(categories) {
  return categories.map((cat, i) => `${i + 1}. ${cat.icon || '🔧'} ${cat.name}`).join('\n');
}

async function buildServiceMenu(categoryId) {
  const services = await getServicesForCategory(categoryId);
  if (!services.length) return `No services available in this category currently. Reply *BOOK* to choose another.`;
  let msg = `📋 *Available Services:*\n\n`;
  services.forEach((svc, i) => {
    msg += `${i + 1}. ${svc.name}\n   ₹${svc.startingPrice}+ · ⭐${svc.rating || 4.8}\n`;
  });
  msg += `\n_Reply with the number_\nOr *BACK* to change category`;
  return msg;
}

function buildServiceList(services) {
  return services.map((svc, i) => `${i + 1}. ${svc.name} — ₹${svc.startingPrice}+`).join('\n');
}

function buildSlotMenu(date) {
  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  let msg = `⏰ *Available slots for ${dateStr}:*\n\n`;
  AVAILABLE_SLOTS.forEach((slot, i) => {
    msg += `${i + 1}. ${slot}\n`;
  });
  msg += `\n_Reply with the number_`;
  return msg;
}

function buildSlotList() {
  return AVAILABLE_SLOTS.map((slot, i) => `${i + 1}. ${slot}`).join('\n');
}

function buildConfirmation(data) {
  const dateStr = data.date?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `📋 *Booking Summary*\n\n` +
    `🔧 Service: *${data.service?.name}*\n` +
    `💰 Price: *₹${data.service?.startingPrice}+*\n` +
    `📅 Date: *${dateStr}*\n` +
    `⏰ Slot: *${data.slot}*\n` +
    `📍 Address: *${data.addressDisplay}*\n\n` +
    `_Note: Final price includes GST. Professional assigned on confirmation._\n\n` +
    `✅ Reply *YES* to confirm\n❌ Reply *NO* to cancel`;
}

function buildOffersMessage() {
  return `🎉 *Current Offers:*\n\n` +
    `🏷️ *FIRST15* — 15% off your first booking\n` +
    `🏷️ *PRIME20* — 20% off with MK Prime\n` +
    `🏷️ *AC499* — AC service at ₹499 (today only)\n\n` +
    `Apply codes at checkout in the MK App.\n` +
    `Download: mkapp.in/download`;
}

// ── Book creation ─────────────────────────────────────────────
async function createBookingAndRespond(phone, data, name) {
  try {
    const user = await User.findOne({ phone }).lean();
    if (!user) {
      return `❌ No account found for this number.\n\nPlease download the MK App to create an account first:\n📱 mkapp.in/download`;
    }

    // Build address object
    const address = data.savedAddress || {
      line1: data.addressText || 'Via WhatsApp',
      city:  'Hyderabad',
      pincode: '500000',
    };

    const booking = await Booking.create({
      customer:        user._id,
      service:         data.service._id,
      subServiceName:  null,
      scheduledDate:   data.date,
      scheduledTimeSlot: data.slot,
      address,
      specialInstructions: 'Booked via WhatsApp',
      status:          'pending',
      pricing: {
        basePrice:       data.service.startingPrice,
        convenienceFee:  data.service.startingPrice >= 500 ? 0 : 29,
        gst:             Math.round(data.service.startingPrice * 0.18),
        totalAmount:     data.service.startingPrice + Math.round(data.service.startingPrice * 0.18) + (data.service.startingPrice >= 500 ? 0 : 29),
      },
      source: 'whatsapp',
    });

    sessions.delete(phone);

    return `🎉 *Booking Confirmed!*\n\n` +
      `📋 *Booking ID:* ${booking.bookingId}\n` +
      `🔧 *Service:* ${data.service.name}\n` +
      `📅 *Date:* ${data.date.toLocaleDateString('en-IN')}\n` +
      `⏰ *Slot:* ${data.slot}\n` +
      `💰 *Total:* ₹${booking.pricing.totalAmount}\n\n` +
      `📱 *Pay & manage your booking:*\n` +
      `mkapp.in/booking/${booking.bookingId}\n\n` +
      `You'll receive a confirmation SMS once a professional is assigned.\n\n` +
      `Need help? Reply *SUPPORT*`;
  } catch (err) {
    console.error('[WhatsApp Bot] Booking creation error:', err);
    sessions.delete(phone);
    return `❌ Sorry, we couldn't complete your booking.\n\nPlease try again via the app:\n📱 mkapp.in/download\n\nOr call us: 1800-123-4567`;
  }
}

// ── Data helpers ──────────────────────────────────────────────
async function getCategories() {
  try {
    return await Category.find({ isActive: true }).select('name icon').limit(8).lean();
  } catch {
    // Fallback mock
    return [
      { _id: '1', name: 'Cleaning', icon: '🧹' },
      { _id: '2', name: 'Salon at Home', icon: '💄' },
      { _id: '3', name: 'AC & Appliances', icon: '❄️' },
      { _id: '4', name: 'Electrical', icon: '⚡' },
      { _id: '5', name: 'Plumbing', icon: '🔧' },
    ];
  }
}

async function getServicesForCategory(categoryId) {
  try {
    return await Service.find({ category: categoryId, isActive: true })
      .select('name startingPrice rating')
      .limit(6)
      .lean();
  } catch {
    return [];
  }
}

function parseDate(text) {
  const t = text.trim().toLowerCase();
  if (t === 'today') return new Date();
  if (t === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }
  // DD/MM/YYYY
  const parts = t.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  return null;
}

// ── Cancel booking via WhatsApp ───────────────────────────────
async function handleCancelBooking(from, bookingId) {
  try {
    const user = await User.findOne({ phone: from }).lean();
    if (!user) return `No account found. Download MK App: mkapp.in/download`;
    const booking = await Booking.findOne({ bookingId, customer: user._id });
    if (!booking) return `❌ Booking *${bookingId}* not found.`;
    if (['completed','cancelled'].includes(booking.status)) {
      return `❌ Booking *${bookingId}* is already *${booking.status}* and cannot be cancelled.`;
    }
    const hrs = (new Date(booking.scheduledDate) - Date.now()) / 3600000;
    const refundPct = hrs >= 24 ? 100 : hrs >= 4 ? 50 : 0;
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = 'Cancelled via WhatsApp';
    await booking.save();
    return `✅ *Booking Cancelled*

Booking ID: ${bookingId}
Refund: ${refundPct === 100 ? 'Full refund to wallet within 24hrs' : refundPct === 50 ? '50% refund within 24hrs' : 'No refund (cancelled < 4hrs before service)'}

For help: reply *SUPPORT*`;
  } catch (e) {
    return `❌ Could not cancel booking. Please try in the app or call 1800-123-4567`;
  }
}

// ── Reschedule booking via WhatsApp ───────────────────────────
async function doReschedule(from, bookingId, newDate, newSlot) {
  try {
    const user = await User.findOne({ phone: from }).lean();
    if (!user) return `No account found. Download MK App: mkapp.in/download`;
    const booking = await Booking.findOne({ bookingId, customer: user._id });
    if (!booking) return `❌ Booking *${bookingId}* not found.`;
    if (['completed','cancelled'].includes(booking.status)) {
      return `❌ Cannot reschedule a *${booking.status}* booking.`;
    }
    booking.scheduledDate = newDate;
    booking.scheduledTimeSlot = newSlot;
    booking.statusHistory.push({ status: booking.status, note: 'Rescheduled via WhatsApp' });
    await booking.save();
    return `✅ *Booking Rescheduled!*

Booking ID: ${bookingId}
New date: ${newDate.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
New slot: ${newSlot}

Your professional will be notified. Track in the MK App.`;
  } catch (e) {
    return `❌ Reschedule failed. Please try in the app or call 1800-123-4567`;
  }
}

// ── Rate a booking via WhatsApp ────────────────────────────────
async function handleRateBooking(from, bookingId, rating, comment) {
  try {
    const user = await User.findOne({ phone: from }).lean();
    if (!user) return `No account found.`;
    const booking = await Booking.findOne({ bookingId, customer: user._id });
    if (!booking) return `❌ Booking *${bookingId}* not found.`;
    if (booking.status !== 'completed') return `❌ Can only rate completed bookings.`;
    // Store review (simplified)
    booking.review = { rating, comment: comment || '', createdAt: new Date() };
    await booking.save();
    const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
    return `${stars} *Thank you for rating!*

Your ${rating}/5 review for booking *${bookingId}* has been submitted. It helps our professionals improve and helps other customers choose.

🙏 Thanks for using MK App!`;
  } catch (e) {
    return `❌ Rating failed. Please rate in the app.`;
  }
}

module.exports = { handleBookingBot };
