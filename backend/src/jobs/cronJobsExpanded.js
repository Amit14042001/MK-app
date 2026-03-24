/**
 * Slot App — Cron Jobs (Complete)
 * All scheduled background tasks
 */
const cron = require('node-cron');

let jobs = [];

// ── Job Registry ──────────────────────────────────────────────
const JOBS = [
  {
    name:     'Auto-assign pending bookings',
    schedule: '*/5 * * * *', // every 5 minutes
    fn:       autoAssignBookings,
  },
  {
    name:     'Send booking reminders',
    schedule: '0 * * * *',   // every hour
    fn:       sendBookingReminders,
  },
  {
    name:     'Review reminder notifications',
    schedule: '0 9 * * *',   // 9 AM daily
    fn:       sendReviewReminders,
  },
  {
    name:     'Expire stale bookings',
    schedule: '*/15 * * * *', // every 15 minutes
    fn:       expireStaleBookings,
  },
  {
    name:     'Process pending payouts',
    schedule: '0 10 * * *',  // 10 AM daily
    fn:       processPendingPayouts,
  },
  {
    name:     'Expire subscriptions',
    schedule: '0 0 * * *',   // midnight daily
    fn:       expireSubscriptions,
  },
  {
    name:     'Auto-renew subscriptions',
    schedule: '30 0 * * *',  // 12:30 AM daily
    fn:       autoRenewSubscriptions,
  },
  {
    name:     'Reset monthly earnings',
    schedule: '0 0 1 * *',   // 1st of each month midnight
    fn:       resetMonthlyEarnings,
  },
  {
    name:     'Reset weekly earnings',
    schedule: '0 0 * * 1',   // Monday midnight
    fn:       resetWeeklyEarnings,
  },
  {
    name:     'Clean expired OTPs',
    schedule: '*/30 * * * *', // every 30 minutes
    fn:       cleanExpiredData,
  },
  {
    name:     'Update professional availability',
    schedule: '*/10 * * * *', // every 10 minutes
    fn:       syncProfessionalAvailability,
  },
  {
    name:     'Daily analytics snapshot',
    schedule: '0 23 * * *',  // 11 PM daily
    fn:       takeDailySnapshot,
  },
  {
    name:     'Send inactivity reminders',
    schedule: '0 11 * * 3',  // Wednesday 11 AM
    fn:       sendInactivityReminders,
  },
  {
    name:     'Health check',
    schedule: '*/5 * * * *',  // every 5 minutes
    fn:       performHealthCheck,
  },
];

// ── Job Functions ─────────────────────────────────────────────

async function autoAssignBookings() {
  try {
    const Booking = require('../models/Booking');
    const matchingService = require('../services/matchingService');

    const unassigned = await Booking.find({
      status: 'confirmed',
      professional: null,
      matchingAttempts: { $lt: 5 },
      scheduledDate: { $gte: new Date() },
    }).populate('service').limit(20);

    let assigned = 0;
    for (const booking of unassigned) {
      try {
        const pro = await matchingService.assignProfessional(booking);
        if (pro) {
          assigned++;
          console.log(`[Cron] Auto-assigned ${pro._id} to booking ${booking.bookingId}`);
        } else {
          await Booking.findByIdAndUpdate(booking._id, { $inc: { matchingAttempts: 1 } });
        }
      } catch (e) {
        console.error(`[Cron] Auto-assign failed for ${booking.bookingId}:`, e.message);
      }
    }
    if (assigned > 0) console.log(`[Cron] Auto-assigned ${assigned}/${unassigned.length} bookings`);
  } catch (e) {
    console.error('[Cron] autoAssignBookings error:', e.message);
  }
}

async function sendBookingReminders() {
  try {
    const Booking = require('../models/Booking');
    const notif   = require('../services/notificationService');

    const in2hrs = new Date(Date.now() + 2 * 3600000);
    const in1hr  = new Date(Date.now() + 3600000);

    const upcoming = await Booking.find({
      status: { $in: ['confirmed', 'professional_assigned'] },
      scheduledDate: { $gte: in1hr, $lte: in2hrs },
      'notifications.confirmed': true,
    }).populate('service', 'name').populate({ path: 'customer', select: 'name phone fcmToken' });

    for (const b of upcoming) {
      const hrs = Math.round((b.scheduledDate - new Date()) / 3600000);
      await notif.dispatch(b.customer._id, 'BOOKING_CONFIRMED', {
        bookingId:   b.bookingId,
        serviceName: b.service?.name,
        date:        b.scheduledDate.toDateString(),
        time:        b.scheduledTime,
        reminder:    true,
        hoursLeft:   hrs,
      }, { skipEmail: true }).catch(() => {});
    }
    if (upcoming.length > 0) console.log(`[Cron] Sent ${upcoming.length} booking reminders`);
  } catch (e) {
    console.error('[Cron] sendBookingReminders error:', e.message);
  }
}

async function sendReviewReminders() {
  try {
    const Booking = require('../models/Booking');
    const notif   = require('../services/notificationService');

    const yesterday = new Date(Date.now() - 24 * 3600000);
    const twoDaysAgo= new Date(Date.now() - 48 * 3600000);

    const unreviewed = await Booking.find({
      status:             'completed',
      isReviewed:         false,
      reviewReminderSent: false,
      updatedAt:          { $gte: twoDaysAgo, $lte: yesterday },
    }).populate('service', 'name').limit(100);

    let sent = 0;
    for (const b of unreviewed) {
      try {
        await notif.dispatch(b.customer, 'SERVICE_COMPLETED', {
          bookingId:   b.bookingId,
          serviceName: b.service?.name,
          proName:     'your professional',
          reminder:    true,
        }, { skipSms: true }).catch(() => {});

        await Booking.findByIdAndUpdate(b._id, { reviewReminderSent: true });
        sent++;
      } catch {}
    }
    if (sent > 0) console.log(`[Cron] Sent ${sent} review reminders`);
  } catch (e) {
    console.error('[Cron] sendReviewReminders error:', e.message);
  }
}

async function expireStaleBookings() {
  try {
    const Booking = require('../models/Booking');
    const cutoff  = new Date(Date.now() - 30 * 60000); // 30 min ago

    const stale = await Booking.updateMany(
      {
        status:       'pending',
        'payment.method': { $ne: 'cash' },
        createdAt:    { $lte: cutoff },
      },
      {
        status: 'cancelled',
        $push: { statusHistory: { status: 'cancelled', note: 'Auto-cancelled: payment timeout', timestamp: new Date() } },
        'cancellation': {
          cancelledBy: 'system',
          reason:      'Payment not received within 30 minutes',
          cancelledAt: new Date(),
          refundAmount:0,
        },
      }
    );

    if (stale.modifiedCount > 0) {
      console.log(`[Cron] Expired ${stale.modifiedCount} stale bookings`);
    }
  } catch (e) {
    console.error('[Cron] expireStaleBookings error:', e.message);
  }
}

async function processPendingPayouts() {
  try {
    const Professional = require('../models/Professional');
    const Payment      = require('../models/Payment');

    const pros = await Professional.find({
      'earnings.pending': { $gt: 0 },
      isActive: true,
      verificationStatus: 'verified',
      'bankDetails.isVerified': true,
    }).limit(50);

    let processed = 0;
    for (const pro of pros) {
      const amount = pro.earnings.pending;
      if (amount < 100) continue; // minimum payout ₹100

      try {
        await Professional.findByIdAndUpdate(pro._id, {
          $inc:  { 'earnings.paid': amount, 'earnings.pending': -amount },
          $set:  { 'earnings.lastPayout': amount, 'earnings.lastPayoutDate': new Date() },
        });

        await Payment.create({
          user:        pro.user,
          amount,
          type:        'payout',
          status:      'completed',
          description: `Weekly payout — ${new Date().toDateString()}`,
        });
        processed++;
      } catch (e) {
        console.error(`[Cron] Payout failed for pro ${pro._id}:`, e.message);
      }
    }
    if (processed > 0) console.log(`[Cron] Processed ${processed} payouts`);
  } catch (e) {
    console.error('[Cron] processPendingPayouts error:', e.message);
  }
}

async function expireSubscriptions() {
  try {
    const Subscription = require('../models/Subscription');
    const User         = require('../models/User');

    const expired = await Subscription.find({
      status:  'active',
      endDate: { $lte: new Date() },
      autoRenew: false,
    });

    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();
      await User.findByIdAndUpdate(sub.user, { 'subscription.status': 'expired' });
    }
    if (expired.length > 0) console.log(`[Cron] Expired ${expired.length} subscriptions`);
  } catch (e) {
    console.error('[Cron] expireSubscriptions error:', e.message);
  }
}

async function autoRenewSubscriptions() {
  try {
    const Subscription = require('../models/Subscription');
    // Find subscriptions expiring in next 24 hours with auto-renew on
    const tomorrow = new Date(Date.now() + 24 * 3600000);

    const toRenew = await Subscription.find({
      status:    'active',
      autoRenew: true,
      endDate:   { $lte: tomorrow },
    }).populate('user', 'name phone email');

    for (const sub of toRenew) {
      try {
        console.log(`[Cron] Auto-renewing ${sub.user?.name} — ${sub.plan}`);

        if (sub.razorpaySubscriptionId && process.env.RAZORPAY_KEY_ID) {
          // Razorpay Subscriptions — fetch status; charge happens automatically
          const Razorpay = require('razorpay');
          const rp = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
          });
          const rpSub = await rp.subscriptions.fetch(sub.razorpaySubscriptionId).catch(() => null);
          if (rpSub?.status === 'active') {
            // Razorpay will auto-charge on cycle date; log and continue
            console.log(`[Cron] Razorpay subscription ${sub.razorpaySubscriptionId} active — auto-charge pending`);
          } else {
            // Subscription lapsed — extend grace period and notify
            sub.status        = 'grace_period';
            sub.gracePeriodEnd = new Date(Date.now() + 7 * 86400000);
            await sub.save();
          }
        } else {
          // No Razorpay subscription — create renewal payment link and notify
          sub.status        = 'grace_period';
          sub.gracePeriodEnd = new Date(Date.now() + 7 * 86400000);
          await sub.save();
          if (sub.user?.fcmToken) {
            const { sendPushNotification } = require('../utils/notifications');
            await sendPushNotification(sub.user.fcmToken, {
              title: '👑 Slot Prime Renewal Required',
              body:  `Your ${sub.plan} plan has expired. Renew now to keep your benefits.`,
              data:  { type: 'subscription_renewal', planId: sub.plan },
            }).catch(() => {});
          }
        }
      } catch (subErr) {
        console.error(`[Cron] Renewal failed for ${sub.user?.name}:`, subErr.message);
      }
    }
    if (toRenew.length > 0) console.log(`[Cron] ${toRenew.length} subscriptions queued for auto-renewal`);
  } catch (e) {
    console.error('[Cron] autoRenewSubscriptions error:', e.message);
  }
}

async function resetMonthlyEarnings() {
  try {
    await require('../models/Professional').updateMany({}, { 'earnings.thisMonth': 0 });
    console.log('[Cron] Monthly earnings reset');
  } catch (e) {
    console.error('[Cron] resetMonthlyEarnings error:', e.message);
  }
}

async function resetWeeklyEarnings() {
  try {
    await require('../models/Professional').updateMany({}, { 'earnings.thisWeek': 0 });
    console.log('[Cron] Weekly earnings reset');
  } catch (e) {
    console.error('[Cron] resetWeeklyEarnings error:', e.message);
  }
}

async function cleanExpiredData() {
  try {
    // Cleanup old notifications (> 30 days)
    const Notification = require('../models/Notification');
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoff }, isRead: true });
    if (result.deletedCount > 0) console.log(`[Cron] Cleaned ${result.deletedCount} old notifications`);
  } catch (e) {
    console.error('[Cron] cleanExpiredData error:', e.message);
  }
}

async function syncProfessionalAvailability() {
  try {
    const Professional = require('../models/Professional');
    // Un-suspend professionals whose suspension has ended
    const now = new Date();
    await Professional.updateMany(
      { isSuspended: true, suspendedTill: { $lte: now } },
      { isSuspended: false, suspendedTill: null }
    );
  } catch (e) {
    console.error('[Cron] syncProfessionalAvailability error:', e.message);
  }
}

async function takeDailySnapshot() {
  try {
    const redis = require('./redis');
    await redis.delPattern('analytics:*');
    console.log('[Cron] Analytics cache cleared for daily refresh');
  } catch (e) {
    console.error('[Cron] takeDailySnapshot error:', e.message);
  }
}

async function sendInactivityReminders() {
  try {
    const User  = require('../models/User');
    const notif = require('../services/notificationService');
    const cutoff= new Date(Date.now() - 14 * 86400000); // 14 days inactive

    const inactive = await User.find({
      role:        'customer',
      isActive:    true,
      lastActive:  { $lte: cutoff },
      fcmToken:    { $exists: true, $ne: null },
    }).select('_id name fcmToken').limit(500);

    let sent = 0;
    for (const user of inactive) {
      await notif.sendPush(user.fcmToken,
        '👋 We miss you!',
        'Book a home service today and get ₹50 off with code WELCOME50',
        { type: 'reengagement' }
      ).catch(() => {});
      sent++;
    }
    if (sent > 0) console.log(`[Cron] Sent ${sent} inactivity reminders`);
  } catch (e) {
    console.error('[Cron] sendInactivityReminders error:', e.message);
  }
}

async function performHealthCheck() {
  try {
    const mongoose = require('mongoose');
    const dbState  = mongoose.connection.readyState;
    if (dbState !== 1) console.warn(`[Cron] MongoDB state: ${dbState} (not connected!)`);
  } catch (e) {
    console.error('[Cron] healthCheck error:', e.message);
  }
}

// ── Start all cron jobs ───────────────────────────────────────
function startCronJobs() {
  if (process.env.NODE_ENV === 'test') {
    console.log('[Cron] Skipped in test environment');
    return;
  }

  JOBS.forEach(({ name, schedule, fn }) => {
    const job = cron.schedule(schedule, async () => {
      const start = Date.now();
      try {
        await fn();
      } catch (e) {
        console.error(`[Cron] ${name} failed:`, e.message);
      } finally {
        const ms = Date.now() - start;
        if (ms > 5000) console.warn(`[Cron] ${name} took ${ms}ms`);
      }
    }, { timezone: 'Asia/Kolkata' });

    jobs.push({ name, job });
    console.log(`[Cron] Scheduled: "${name}" — ${schedule}`);
  });

  console.log(`[Cron] ${jobs.length} jobs started`);
}

function stopCronJobs() {
  jobs.forEach(({ name, job }) => {
    job.stop();
    console.log(`[Cron] Stopped: ${name}`);
  });
  jobs = [];
}

module.exports = { startCronJobs, stopCronJobs, JOBS };
