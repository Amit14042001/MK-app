/**
 * Slot App — Scheduled Cron Jobs
 * Runs: subscription renewals, booking reminders, cleanup, daily reports
 */

const cron = require('node-cron');
const mongoose = require('mongoose');

// ── Imports (lazy to avoid circular deps) ────────────────────
const getModels = () => ({
  Booking: require('../models/Booking'),
  User: require('../models/User'),
  Professional: require('../models/Professional'),
  Payment: require('../models/Payment'),
  Subscription: require('../models/Subscription').Subscription,
  Notification: require('../models/Notification'),
});

const redis = require('../config/redis');
const { sendPushNotification, sendPushToAdmin } = require('../utils/notifications');
const { sendEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

// ── JOB: Booking reminders (every 30 min) ────────────────────
const bookingReminderJob = cron.schedule('*/30 * * * *', async () => {
  const { Booking, User } = getModels();
  try {
    const in2h = new Date(Date.now() + 2 * 3600 * 1000);
    const in3h = new Date(Date.now() + 3 * 3600 * 1000);
    const now = new Date();

    const upcoming = await Booking.find({
      status: { $in: ['confirmed', 'professional_assigned'] },
      scheduledDate: {
        $gte: new Date(now.toDateString()),
        $lte: new Date(new Date(now.toDateString()).getTime() + 86400000),
      },
      reminderSent: { $ne: true },
    })
      .populate('customer', 'name phone fcmToken')
      .populate('service', 'name icon')
      .lean();

    for (const booking of upcoming) {
      const scheduledDt = new Date(`${booking.scheduledDate.toISOString().split('T')[0]}T${convertTime(booking.scheduledTime)}`);
      const hoursUntil = (scheduledDt - now) / 3600000;

      if (hoursUntil <= 2 && hoursUntil > 0) {
        // 2-hour reminder
        if (booking.customer?.fcmToken) {
          await sendPushNotification(booking.customer.fcmToken, {
            title: `⏰ Reminder: ${booking.service?.name} in 2 hours`,
            body: `Your booking is scheduled at ${booking.scheduledTime}. Professional will arrive on time!`,
            data: { type: 'booking_reminder', bookingId: booking._id.toString() },
          });
        }

        await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
        console.log(`[Cron] Reminder sent for booking ${booking.bookingId}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Booking reminder error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Subscription renewal check (daily at 8 AM) ──────────
const subscriptionRenewalJob = cron.schedule('0 8 * * *', async () => {
  const { Subscription } = getModels();
  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const in3days = new Date(today.getTime() + 3 * 86400000);

    // Find expiring subscriptions
    const expiring = await Subscription.find({
      status: 'active',
      endDate: { $lte: in3days },
      autoRenew: true,
    }).populate('user', 'name phone email fcmToken');

    for (const sub of expiring) {
      const daysLeft = Math.ceil((sub.endDate - today) / 86400000);

      if (daysLeft <= 1) {
        // Last day — attempt auto-renewal via Razorpay
        console.log(`[Cron] Attempting renewal for user ${sub.user?.name}`);
        let renewalSuccess = false;
        try {
          if (sub.razorpaySubscriptionId && process.env.RAZORPAY_KEY_ID) {
            // Razorpay Subscriptions API auto-charges the saved payment method
            const Razorpay = require('razorpay');
            const instance = new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            const rpSub = await instance.subscriptions.fetch(sub.razorpaySubscriptionId);
            if (rpSub.status === 'active') {
              // Razorpay will handle the charge automatically on the next billing cycle
              renewalSuccess = true;
              console.log(`[Cron] Razorpay subscription ${sub.razorpaySubscriptionId} is active — auto-charge pending`);
            }
          }
        } catch (rpErr) {
          console.warn(`[Cron] Razorpay renewal check failed for ${sub.user?.name}:`, rpErr.message);
        }

        if (!renewalSuccess) {
          // Manual renewal — send payment link + grace period
          sub.status = 'grace_period';
          sub.gracePeriodEnd = new Date(today.getTime() + 7 * 86400000);
          await sub.save();
        }

        if (sub.user?.fcmToken) {
          await sendPushNotification(sub.user.fcmToken, {
            title: '👑 Slot Prime Renewal',
            body: renewalSuccess
              ? 'Your Prime subscription is being renewed. Thank you!'
              : 'Your Prime subscription expires today. Renew to keep your benefits!',
            data: { type: 'subscription_expiry', action: 'renew' },
          });
        }
      } else if (daysLeft <= 3) {
        // 3-day warning
        if (sub.user?.fcmToken) {
          await sendPushNotification(sub.user.fcmToken, {
            title: `👑 Slot Prime expires in ${daysLeft} days`,
            body: 'Renew now to continue enjoying 15% off, priority slots, and more!',
            data: { type: 'subscription_reminder', daysLeft },
          });
        }
      }
    }

    // Expire overdue subscriptions
    const expired = await Subscription.updateMany(
      { status: { $in: ['active', 'grace_period'] }, endDate: { $lt: today }, gracePeriodEnd: { $lt: today } },
      { status: 'expired' }
    );

    if (expired.modifiedCount > 0) {
      // Downgrade users
      const expiredSubs = await Subscription.find({ status: 'expired', endDate: { $gte: new Date(today - 86400000) } });
      for (const sub of expiredSubs) {
        await require('../models/User').findByIdAndUpdate(sub.user, { membershipTier: 'Standard' });
      }
    }

    console.log(`[Cron] Subscription check: ${expiring.length} expiring, ${expired.modifiedCount} expired`);
  } catch (err) {
    console.error('[Cron] Subscription renewal error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Auto-assign pending bookings (every 5 min) ──────────
const autoAssignJob = cron.schedule('*/5 * * * *', async () => {
  const { Booking } = getModels();
  try {
    const unassigned = await Booking.find({
      status: 'pending',
      professional: { $exists: false },
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // within last 30 min
    }).limit(10).lean();

    const { autoAssign } = require('../services/matchingService');
    for (const booking of unassigned) {
      await autoAssign(booking._id.toString()).catch(err =>
        console.warn(`[Cron] AutoAssign failed for ${booking.bookingId}:`, err.message)
      );
    }

    if (unassigned.length > 0) {
      console.log(`[Cron] Auto-assign checked ${unassigned.length} pending bookings`);
    }
  } catch (err) {
    console.error('[Cron] Auto-assign error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Daily report to admin (daily 9 AM) ──────────────────
const dailyReportJob = cron.schedule('0 9 * * *', async () => {
  const { Booking, User, Payment } = getModels();
  try {
    const yesterday = new Date(Date.now() - 86400000);
    const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86399999);

    const [bookings, newUsers, revenue] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
      User.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd }, role: 'customer' }),
      Payment.aggregate([
        { $match: { status: 'captured', createdAt: { $gte: dayStart, $lte: dayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const report = {
      date: dayStart.toDateString(),
      bookings,
      newUsers,
      revenue: revenue[0]?.total || 0,
    };

    await sendPushToAdmin({
      title: `📊 Daily Report — ${report.date}`,
      body: `${bookings} bookings · ${newUsers} new users · ₹${report.revenue.toLocaleString()} revenue`,
    });

    console.log(`[Cron] Daily report sent:`, report);
  } catch (err) {
    console.error('[Cron] Daily report error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Cleanup expired OTPs from Redis (every hour) ────────
const otpCleanupJob = cron.schedule('0 * * * *', async () => {
  try {
    // Redis handles TTL automatically, but we can clear patterns
    await redis.delPattern('otp:attempts:*');
    console.log('[Cron] OTP attempts cache cleared');
  } catch (err) {
    console.error('[Cron] OTP cleanup error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Professional rating update (every 6 hours) ──────────
const ratingUpdateJob = cron.schedule('0 */6 * * *', async () => {
  const { Professional } = getModels();
  const Review = require('../models/Review');
  try {
    const pros = await Professional.find({}).select('_id').lean();
    let updated = 0;

    for (const pro of pros) {
      const agg = await Review.aggregate([
        { $match: { professional: pro._id } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);

      if (agg[0]) {
        await Professional.findByIdAndUpdate(pro._id, {
          rating: Math.round(agg[0].avg * 10) / 10,
          totalRatings: agg[0].count,
        });
        updated++;
      }
    }

    // Clear pro profile caches
    await redis.delPattern('pro_profile_*');
    console.log(`[Cron] Updated ratings for ${updated} professionals`);
  } catch (err) {
    console.error('[Cron] Rating update error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Stale booking cleanup (daily at 2 AM) ───────────────
const staleBookingJob = cron.schedule('0 2 * * *', async () => {
  const { Booking } = getModels();
  try {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000); // 48h ago

    // Cancel unassigned bookings older than 48h
    const cancelled = await Booking.updateMany(
      {
        status: 'pending',
        professional: { $exists: false },
        createdAt: { $lt: cutoff },
      },
      {
        status: 'cancelled',
        cancelReason: 'No professional available in your area',
        cancelledAt: new Date(),
      }
    );

    if (cancelled.modifiedCount > 0) {
      console.log(`[Cron] Cancelled ${cancelled.modifiedCount} stale unassigned bookings`);
      // Trigger refunds for bookings paid online
      try {
        const stalePaid = await Booking.find({
          status: 'cancelled',
          'payment.status': 'paid',
          'payment.refundStatus': { $in: ['pending', null] },
          updatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // just cancelled
        }).select('_id payment bookingId').lean().limit(50);

        for (const b of stalePaid) {
          try {
            const { createRefund } = require('../services/paymentService');
            await createRefund(b._id, b.payment?.amountPaid || 0, 'Booking auto-cancelled — no professional available');
            console.log(`[Cron] Refund triggered for booking ${b.bookingId}`);
          } catch (refundErr) {
            console.error(`[Cron] Refund failed for ${b.bookingId}:`, refundErr.message);
          }
        }
      } catch (refundBatchErr) {
        console.error('[Cron] Refund batch error:', refundBatchErr.message);
      }
    }

    // Invalidate popular services cache
    await redis.delPattern('popular:*');
    await redis.delPattern('admin:stats');

  } catch (err) {
    console.error('[Cron] Stale booking cleanup error:', err.message);
  }
}, { scheduled: false });

// ── JOB: Warm up Redis cache (every 15 min) ──────────────────
const cacheWarmupJob = cron.schedule('*/15 * * * *', async () => {
  try {
    const Service = require('../models/Service');
    const Category = require('../models/Category');

    const [services, categories] = await Promise.all([
      Service.find({ isActive: true }).populate('category', 'name slug').lean(),
      Category.find({ isActive: true }).sort({ order: 1 }).lean(),
    ]);

    await redis.set(redis.KEYS.CATEGORIES_ALL, categories, redis.TTL.CATEGORIES);
    await redis.set(redis.KEYS.SERVICES_FEATURED(), services.filter(s => s.isFeatured).slice(0, 20), redis.TTL.SERVICES);

    console.log(`[Cron] Cache warmed: ${services.length} services, ${categories.length} categories`);
  } catch (err) {
    console.error('[Cron] Cache warmup error:', err.message);
  }
}, { scheduled: false });

// ── Start all jobs ────────────────────────────────────────────
function startCronJobs() {
  if (process.env.NODE_ENV === 'test') {
    console.log('[Cron] Skipping cron jobs in test environment');
    return;
  }

  bookingReminderJob.start();
  subscriptionRenewalJob.start();
  autoAssignJob.start();
  dailyReportJob.start();
  otpCleanupJob.start();
  ratingUpdateJob.start();
  staleBookingJob.start();
  cacheWarmupJob.start();

  console.log('⏰ Cron jobs started:');
  console.log('   • Booking reminders — every 30 min');
  console.log('   • Subscription renewals — daily 8 AM');
  console.log('   • Auto-assignment — every 5 min');
  console.log('   • Daily report — daily 9 AM');
  console.log('   • OTP cleanup — every hour');
  console.log('   • Rating updates — every 6 hours');
  console.log('   • Stale booking cleanup — daily 2 AM');
  console.log('   • Cache warmup — every 15 min');
}

function stopCronJobs() {
  [bookingReminderJob, subscriptionRenewalJob, autoAssignJob, dailyReportJob,
    otpCleanupJob, ratingUpdateJob, staleBookingJob, cacheWarmupJob].forEach(j => j.stop());
  console.log('[Cron] All jobs stopped');
}

// ── Helper ────────────────────────────────────────────────────
function convertTime(time12) {
  if (!time12) return '09:00';
  const [time, mod] = time12.split(' ');
  let [h, m] = time.split(':');
  h = parseInt(h);
  if (mod === 'PM' && h !== 12) h += 12;
  if (mod === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m || '00'}`;
}

module.exports = { startCronJobs, stopCronJobs };

// ── JOB: Home maintenance reminders (weekly, Monday 9 AM) ─────
const maintenanceReminderJob = cron.schedule('0 9 * * 1', async () => {
  const { Booking, User } = getModels();
  const { sendPushNotification } = require('../utils/notifications');
  try {
    const SERVICE_INTERVALS = {
      'AC Service': 6, 'Deep Cleaning': 1, 'Pest Control': 3,
      'Plumbing': 6, 'Electrical': 12, 'Painting': 24,
    };
    const users = await User.find({ role: 'customer', fcmToken: { $exists: true, $ne: '' } })
      .select('_id name fcmToken').lean().limit(1000);

    for (const user of users) {
      const recentBookings = await Booking.find({
        customer: user._id, status: 'completed',
      }).sort('-completedAt').populate('service', 'name').lean().limit(20);

      const serviceMap = {};
      for (const b of recentBookings) {
        const name = b.service?.name;
        if (!name || serviceMap[name]) continue;
        serviceMap[name] = b.completedAt || b.scheduledDate;
      }

      for (const [service, lastDate] of Object.entries(serviceMap)) {
        const months = SERVICE_INTERVALS[service];
        if (!months) continue;
        const dueDate = new Date(lastDate);
        dueDate.setMonth(dueDate.getMonth() + months);
        const daysUntil = Math.ceil((dueDate - new Date()) / 86400000);
        if (daysUntil === 7 && user.fcmToken) {
          await sendPushNotification(user.fcmToken, {
            title: `⏰ ${service} due in 7 days`,
            body: `Based on your last booking, your ${service} is due next week. Book now to lock today's price.`,
            data: { type: 'maintenance_reminder', service },
          }).catch(() => { });
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Maintenance reminder error:', err.message);
  }
}, { scheduled: false });
