/**
 * MK App — Slot Capacity Management Service
 * Feature #17: Max bookings per time slot per professional
 * Prevents double-booking and manages availability
 */
const redis = require('../config/redis');

const SLOT_TTL    = 86400 * 7; // 7 days
const SLOT_CAPACITY = 1;       // 1 booking per slot per professional (can be > 1 for teams)

// ── Key builders ──────────────────────────────────────────────
const slotKey   = (proId, date, slot) => `slot:${proId}:${date}:${encodeURIComponent(slot)}`;
const dayKey    = (proId, date)       => `slots:${proId}:${date}`;
const globalKey = (date, slot)        => `global_slot:${date}:${encodeURIComponent(slot)}`;

/**
 * Check if a slot is available for a professional
 */
async function isSlotAvailable(professionalId, date, timeSlot, capacity = SLOT_CAPACITY) {
  try {
    const key    = slotKey(professionalId, date, timeSlot);
    const booked = parseInt(await redis.get(key) || '0');
    return booked < capacity;
  } catch {
    return true; // fail open — don't block bookings on cache error
  }
}

/**
 * Reserve a slot (atomic increment)
 */
async function reserveSlot(professionalId, date, timeSlot) {
  try {
    const key   = slotKey(professionalId, date, timeSlot);
    const count = await redis.incr(key);
    await redis.expire(key, SLOT_TTL);

    // Also mark in day bitmap
    await redis.hSet(dayKey(professionalId, date), timeSlot, count.toString());
    await redis.expire(dayKey(professionalId, date), SLOT_TTL);

    return { reserved: true, count };
  } catch (e) {
    console.error('[SlotCapacity] reserveSlot error:', e.message);
    return { reserved: true, count: 1 }; // fail open
  }
}

/**
 * Release a slot (on booking cancellation)
 */
async function releaseSlot(professionalId, date, timeSlot) {
  try {
    const key   = slotKey(professionalId, date, timeSlot);
    const current = parseInt(await redis.get(key) || '0');
    if (current > 0) {
      await redis.set(key, (current - 1).toString(), SLOT_TTL);
    }
    return { released: true };
  } catch (e) {
    console.error('[SlotCapacity] releaseSlot error:', e.message);
    return { released: false };
  }
}

/**
 * Get all booked slots for a professional on a date
 */
async function getProfessionalDaySlots(professionalId, date) {
  try {
    const slots = await redis.hGetAll(dayKey(professionalId, date));
    return slots || {};
  } catch {
    return {};
  }
}

/**
 * Get available time slots for a service on a date
 * Filters out slots where all professionals in area are booked
 */
async function getAvailableSlots(date, serviceId, pincode, options = {}) {
  const Professional = require('../models/Professional');
  const {
    slotDuration = 60,
    startHour    = 7,
    endHour      = 20,
    capacity     = SLOT_CAPACITY,
  } = options;

  // Generate all possible slots
  const allSlots = [];
  for (let h = startHour; h < endHour; h++) {
    const hour    = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    const nextH   = (h + 1) < 12 ? `${h + 1} AM` : (h + 1) === 12 ? '12 PM' : `${h - 11} PM`;
    allSlots.push({ slot: hour, display: `${hour} – ${nextH}` });
  }

  // Check if date is in the past
  const slotDate = new Date(date);
  const now      = new Date();
  slotDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  if (slotDate < now) return [];

  // Find professionals available for service + pincode
  const pros = await Professional.find({
    isActive:           true,
    verificationStatus: 'verified',
    'availability.isAvailable': true,
    serviceAreas:       pincode,
    ...(serviceId ? { 'services.serviceId': serviceId } : {}),
  }).select('_id').lean();

  if (!pros.length) return [];

  // Check availability for each slot
  const availableSlots = [];
  const isToday = new Date(date).toDateString() === new Date().toDateString();
  const currentHour = new Date().getHours();

  for (const { slot, display } of allSlots) {
    const slotHour = parseInt(slot);
    // Skip past slots for today
    if (isToday && slotHour <= currentHour + 1) continue;

    // Count available professionals for this slot
    let availablePros = 0;
    for (const pro of pros) {
      const available = await isSlotAvailable(pro._id.toString(), date, slot, capacity);
      if (available) availablePros++;
    }

    availableSlots.push({
      slot,
      display,
      available:       availablePros > 0,
      availableCount:  availablePros,
      totalPros:       pros.length,
      isSurge:         [9, 10, 11, 18, 19].includes(slotHour),
      isPeak:          [10, 11, 18].includes(slotHour),
    });
  }

  return availableSlots;
}

/**
 * Block multiple slots (for professional's day off / vacation)
 */
async function blockProfessionalSlots(professionalId, date, slots = [], reason = 'blocked') {
  const results = [];
  for (const slot of slots) {
    const key = slotKey(professionalId, date, slot);
    await redis.set(key, SLOT_CAPACITY.toString(), SLOT_TTL); // set to capacity = fully booked
    results.push({ slot, blocked: true });
  }
  return results;
}

/**
 * Block entire day for professional
 */
async function blockProfessionalDay(professionalId, date) {
  try {
    const Professional = require('../models/Professional');
    await Professional.findByIdAndUpdate(professionalId, {
      $push: {
        blockedSlots: {
          date:      new Date(date),
          isFullDay: true,
          reason:    'Day off',
        },
      },
    });
    return { blocked: true, date };
  } catch (e) {
    console.error('[SlotCapacity] blockDay error:', e.message);
    return { blocked: false };
  }
}

/**
 * Sync Redis slot data with DB bookings (reconciliation)
 * Run periodically to fix any inconsistencies
 */
async function syncSlotsWithDB(date) {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({
      scheduledDate: new Date(date),
      status: { $nin: ['cancelled', 'no_show'] },
      professional:  { $exists: true, $ne: null },
    }).select('professional scheduledTime').lean();

    // Reset and rebuild from DB
    for (const booking of bookings) {
      const proId = booking.professional.toString();
      const slot  = booking.scheduledTime;
      await reserveSlot(proId, date, slot);
    }

    console.log(`[SlotCapacity] Synced ${bookings.length} bookings for ${date}`);
    return { synced: bookings.length };
  } catch (e) {
    console.error('[SlotCapacity] sync error:', e.message);
    return { synced: 0 };
  }
}

/**
 * Express route handler for frontend slot availability
 */
async function handleGetSlots(req, res) {
  const { date, serviceId, pincode } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'date required' });

  const slots = await getAvailableSlots(date, serviceId, pincode || '500001');
  res.json({ success: true, data: slots, date });
}

module.exports = {
  isSlotAvailable,
  reserveSlot,
  releaseSlot,
  getProfessionalDaySlots,
  getAvailableSlots,
  blockProfessionalSlots,
  blockProfessionalDay,
  syncSlotsWithDB,
  handleGetSlots,
  SLOT_CAPACITY,
};
