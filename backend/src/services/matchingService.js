/**
 * MK App — Professional Matching Algorithm
 * Smart assignment: proximity + skills + rating + availability + load balancing
 */

const Professional = require('../models/Professional');
const Booking      = require('../models/Booking');
const redis        = require('../config/redis');

// ── Constants ───────────────────────────────────────────────
const MAX_RADIUS_KM    = 25;    // Search radius
const MIN_RATING       = 3.5;   // Minimum acceptable rating
const MAX_ACTIVE_JOBS  = 3;     // Max concurrent jobs per pro
const WEIGHTS = {
  distance:     0.35,  // Closer = better
  rating:       0.25,  // Higher rating = better
  completions:  0.15,  // More experience = better
  responseRate: 0.15,  // Accepts jobs quickly = better
  load:         0.10,  // Less current load = better
};

// ── Haversine distance formula ───────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Normalize a value between 0–1 ───────────────────────────
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ── Score a single professional for a booking ────────────────
function scoreProfessional(pro, booking, customerLat, customerLng, allDistances) {
  const proLat = pro.currentLocation?.coordinates?.[1] || pro.serviceAreas?.[0]?.center?.coordinates?.[1];
  const proLng = pro.currentLocation?.coordinates?.[0] || pro.serviceAreas?.[0]?.center?.coordinates?.[0];

  if (!proLat || !proLng) return { score: 0, breakdown: {} };

  const distanceKm = haversineKm(customerLat, customerLng, proLat, proLng);
  if (distanceKm > MAX_RADIUS_KM) return null;

  const maxDist = Math.max(...allDistances, 1);
  const distScore       = 1 - normalize(distanceKm, 0, maxDist);       // closer = higher
  const ratingScore     = normalize(pro.rating || 0, MIN_RATING, 5);
  const completionScore = normalize(Math.min(pro.totalBookings || 0, 500), 0, 500);
  const responseScore   = normalize(pro.responseRate || 0, 0, 100);
  const loadScore       = 1 - normalize(pro.activeJobCount || 0, 0, MAX_ACTIVE_JOBS);

  const totalScore =
    distScore       * WEIGHTS.distance +
    ratingScore     * WEIGHTS.rating +
    completionScore * WEIGHTS.completions +
    responseScore   * WEIGHTS.responseRate +
    loadScore       * WEIGHTS.load;

  return {
    score: totalScore,
    distanceKm: Math.round(distanceKm * 10) / 10,
    breakdown: { distScore, ratingScore, completionScore, responseScore, loadScore },
  };
}

// ── Get available professionals for a service ────────────────
async function getCandidates(serviceId, categorySlug, scheduledDate, scheduledTime) {
  // Check cache
  const cacheKey = `matching:candidates:${categorySlug}:${scheduledDate}:${scheduledTime}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const scheduledDt = new Date(`${scheduledDate}T${convert12To24(scheduledTime)}`);
  const dayName = scheduledDt.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

  const candidates = await Professional.find({
    isVerified:  true,
    isActive:    true,
    isAvailable: true,
    skills:      { $elemMatch: { $regex: categorySlug, $options: 'i' } },
    rating:      { $gte: MIN_RATING },
    backgroundCheckStatus: 'passed',
  })
    .select('user rating totalBookings responseRate activeJobCount currentLocation serviceAreas skills availability')
    .populate('user', 'name phone')
    .lean();

  // Filter by availability for the requested time slot
  const available = candidates.filter(pro => {
    const avail = pro.availability;
    if (!avail) return true; // No restrictions = always available
    const dayAvail = avail[dayName];
    if (!dayAvail?.isActive) return false;

    const fromH = parseInt(dayAvail.from?.split(':')[0] || 0);
    const toH   = parseInt(dayAvail.to?.split(':')[0] || 23);
    const slotH = scheduledDt.getHours();

    return slotH >= fromH && slotH < toH;
  });

  await redis.set(cacheKey, available, 30); // Cache 30s
  return available;
}

// ── Main matching function ───────────────────────────────────
async function findBestProfessional(booking) {
  try {
    const {
      service, category, scheduledDate, scheduledTime,
      address,
    } = booking;

    const customerLat = address?.coordinates?.lat  || address?.lat;
    const customerLng = address?.coordinates?.lng  || address?.lng;

    if (!customerLat || !customerLng) {
      console.warn('[Matching] No customer coordinates — using city fallback');
    }

    const lat = customerLat || 17.3850; // Hyderabad fallback
    const lng = customerLng || 78.4867;

    const categorySlug = typeof category === 'object' ? category.slug : category;

    // 1. Get candidates
    const candidates = await getCandidates(service?._id || service, categorySlug, scheduledDate, scheduledTime);

    if (candidates.length === 0) {
      console.log('[Matching] No candidates found in DB');
      return null;
    }

    // 2. Get active job counts for all candidates
    const candidateIds = candidates.map(c => c._id);
    const activeCounts = await Booking.aggregate([
      {
        $match: {
          professional: { $in: candidateIds },
          status: { $in: ['professional_assigned', 'professional_arriving', 'professional_arrived', 'in_progress'] },
        },
      },
      { $group: { _id: '$professional', count: { $sum: 1 } } },
    ]);

    const activeCountMap = {};
    activeCounts.forEach(ac => { activeCountMap[ac._id.toString()] = ac.count; });

    // 3. Enrich candidates with active counts and filter overloaded pros
    const enriched = candidates
      .map(pro => ({
        ...pro,
        activeJobCount: activeCountMap[pro._id.toString()] || 0,
      }))
      .filter(pro => pro.activeJobCount < MAX_ACTIVE_JOBS);

    if (enriched.length === 0) {
      console.log('[Matching] All candidates are at max load');
      return null;
    }

    // 4. Calculate distances for normalization
    const distances = enriched.map(pro => {
      const pLat = pro.currentLocation?.coordinates?.[1];
      const pLng = pro.currentLocation?.coordinates?.[0];
      return pLat && pLng ? haversineKm(lat, lng, pLat, pLng) : MAX_RADIUS_KM;
    });

    // 5. Score each professional
    const scored = enriched
      .map(pro => {
        const result = scoreProfessional(pro, booking, lat, lng, distances);
        if (!result) return null;
        return { pro, ...result };
      })
      .filter(Boolean)
      .filter(r => r.distanceKm <= MAX_RADIUS_KM)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      console.log('[Matching] No professionals within radius');
      return null;
    }

    // 6. Top pick (with soft randomization among top 3 to avoid always picking same pro)
    const topN = scored.slice(0, 3);
    const weights = [0.70, 0.20, 0.10];
    const rand = Math.random();
    let cumulative = 0;
    let selected = topN[0];
    for (let i = 0; i < topN.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) { selected = topN[i]; break; }
    }

    console.log(`[Matching] Selected: ${selected.pro.user?.name} | Score: ${selected.score.toFixed(3)} | Distance: ${selected.distanceKm}km`);

    return {
      professional: selected.pro,
      score:        selected.score,
      distanceKm:   selected.distanceKm,
      breakdown:    selected.breakdown,
      candidatesConsidered: enriched.length,
    };

  } catch (err) {
    console.error('[Matching] Error:', err.message);
    return null;
  }
}

// ── Auto-assign with retry ────────────────────────────────────
async function autoAssign(bookingId, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY  = [0, 5000, 15000]; // 0s, 5s, 15s

  if (attempt > MAX_ATTEMPTS) {
    console.log(`[Matching] Auto-assign failed after ${MAX_ATTEMPTS} attempts for booking ${bookingId}`);
    await Booking.findByIdAndUpdate(bookingId, { assignmentStatus: 'failed' });
    return null;
  }

  await new Promise(r => setTimeout(r, RETRY_DELAY[attempt - 1]));

  try {
    const booking = await Booking.findById(bookingId)
      .populate('service', 'name category')
      .populate('category', 'slug')
      .lean();

    if (!booking || booking.professional) return null; // Already assigned or gone

    const result = await findBestProfessional(booking);

    if (!result) {
      console.log(`[Matching] Attempt ${attempt} failed — retrying...`);
      return autoAssign(bookingId, attempt + 1);
    }

    // Assign
    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      {
        professional: result.professional._id,
        status: 'professional_assigned',
        assignedAt: new Date(),
        matchingScore: result.score,
        matchingDistanceKm: result.distanceKm,
      },
      { new: true }
    ).populate('professional');

    // Update pro's active count in cache
    await redis.del(`matching:candidates:${booking.category?.slug || 'all'}:*`);

    console.log(`[Matching] ✅ Assigned ${result.professional.user?.name} to booking ${bookingId}`);
    return updated;

  } catch (err) {
    console.error(`[Matching] Attempt ${attempt} error:`, err.message);
    return autoAssign(bookingId, attempt + 1);
  }
}

// ── Re-assign (for cancellation/no-show) ─────────────────────
async function reassign(bookingId, excludeProfessionalId) {
  const booking = await Booking.findById(bookingId)
    .populate('service', 'name category')
    .populate('category', 'slug')
    .lean();

  if (!booking) return null;

  // Reset assignment
  await Booking.findByIdAndUpdate(bookingId, { professional: null, status: 'confirmed' });

  const result = await findBestProfessional({
    ...booking,
    _excludePro: excludeProfessionalId,
  });

  if (!result) return null;

  return Booking.findByIdAndUpdate(
    bookingId,
    { professional: result.professional._id, status: 'professional_assigned', assignedAt: new Date() },
    { new: true }
  );
}

// ── Nearby professionals (for customer UI) ───────────────────
async function getNearbyProfessionals(lat, lng, categorySlug, limit = 10) {
  const cacheKey = redis.KEYS.PROFESSIONALS_NEARBY(lat, lng);
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const radiusMeters = MAX_RADIUS_KM * 1000;

  const nearby = await Professional.find({
    isVerified: true,
    isActive: true,
    isAvailable: true,
    ...(categorySlug && { skills: { $elemMatch: { $regex: categorySlug, $options: 'i' } } }),
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  })
    .select('user rating totalBookings currentLocation skills')
    .populate('user', 'name')
    .limit(limit)
    .lean();

  const result = nearby.map(pro => ({
    ...pro,
    distanceKm: haversineKm(
      lat, lng,
      pro.currentLocation?.coordinates?.[1],
      pro.currentLocation?.coordinates?.[0]
    ).toFixed(1),
  }));

  await redis.set(cacheKey, result, redis.TTL.NEARBY_PROS);
  return result;
}

// ── Utility: convert "09:30 AM" → "09:30" ────────────────────
function convert12To24(time12) {
  if (!time12) return '09:00';
  const [time, modifier] = time12.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes || '00'}`;
}

// ── Analytics helpers ─────────────────────────────────────────
async function getMatchingMetrics() {
  const [
    totalBookings,
    assignedInTime,
    avgScore,
    failedAssignments,
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } }),
    Booking.countDocuments({ professional: { $exists: true }, assignedAt: { $exists: true } }),
    Booking.aggregate([{ $group: { _id: null, avg: { $avg: '$matchingScore' } } }]),
    Booking.countDocuments({ assignmentStatus: 'failed' }),
  ]);

  return {
    totalBookings,
    assignmentRate: totalBookings > 0 ? ((assignedInTime / totalBookings) * 100).toFixed(1) + '%' : '0%',
    avgMatchingScore: avgScore[0]?.avg?.toFixed(3) || 'N/A',
    failedAssignments,
  };
}

module.exports = {
  findBestProfessional,
  autoAssign,
  reassign,
  getNearbyProfessionals,
  getMatchingMetrics,
  haversineKm,
};
