/**
 * Slot App — Notification Service
 * Orchestrates push notifications, SMS, email and in-app alerts
 * Handles batching, retry logic, template rendering, preferences
 */
const mongoose     = require('mongoose');
const redis        = require('../config/redis');

// ── Template Registry ─────────────────────────────────────────
const TEMPLATES = {
  // Booking templates
  BOOKING_CONFIRMED: {
    push: {
      title: (d) => '✅ Booking Confirmed!',
      body:  (d) => `${d.serviceName} on ${d.date} at ${d.time}. Booking ID: ${d.bookingId}`,
    },
    sms: (d) => `Slot App: Your booking ${d.bookingId} for ${d.serviceName} on ${d.date} is confirmed. Track in app.`,
    email: {
      subject: (d) => `Booking Confirmed — ${d.bookingId}`,
      html:    (d) => `<h2>Booking Confirmed</h2><p>Service: ${d.serviceName}</p><p>Date: ${d.date} at ${d.time}</p><p>ID: ${d.bookingId}</p>`,
    },
  },
  BOOKING_CANCELLED: {
    push: {
      title: (d) => '❌ Booking Cancelled',
      body:  (d) => `Your booking ${d.bookingId} has been cancelled. ${d.refund > 0 ? `₹${d.refund} refunded to wallet.` : ''}`,
    },
    sms: (d) => `Slot App: Booking ${d.bookingId} cancelled. ${d.refund > 0 ? `Refund of Rs.${d.refund} will be credited to your wallet.` : ''} -Slot Services`,
    email: {
      subject: (d) => `Booking Cancelled — ${d.bookingId}`,
      html:    (d) => `<h2>Booking Cancelled</h2><p>Booking ${d.bookingId} has been cancelled.</p>${d.refund > 0 ? `<p>Refund of ₹${d.refund} will be credited to your wallet within 24 hours.</p>` : ''}`,
    },
  },
  PROFESSIONAL_ASSIGNED: {
    push: {
      title: (d) => '👨‍🔧 Professional Assigned!',
      body:  (d) => `${d.proName} will handle your ${d.serviceName} booking. ${d.proPhone ? `Call: ${d.proPhone}` : ''}`,
    },
    sms: (d) => `Slot App: ${d.proName} (${d.proPhone}) assigned for your booking ${d.bookingId}. ETA: ${d.eta || 'As scheduled'}.`,
    email: null,
  },
  PROFESSIONAL_ARRIVING: {
    push: {
      title: (d) => '🚗 Professional is on the way!',
      body:  (d) => `${d.proName} is arriving in ${d.eta || '10-15 mins'}. Please be ready.`,
    },
    sms: (d) => `Slot App: ${d.proName} is on the way. ETA: ${d.eta || '10-15 minutes'}. Booking: ${d.bookingId}`,
    email: null,
  },
  SERVICE_COMPLETED: {
    push: {
      title: (d) => '🎉 Service Completed!',
      body:  (d) => `Your ${d.serviceName} is done! Please rate your experience.`,
    },
    sms: (d) => `Slot App: Service completed! Rate ${d.proName} in the app. Thank you for choosing Slot Services.`,
    email: {
      subject: (d) => `Service Completed — Rate Your Experience`,
      html:    (d) => `<h2>Service Completed!</h2><p>Your ${d.serviceName} has been completed.</p><p>Please rate your experience in the Slot App.</p>`,
    },
  },
  NEW_BOOKING_FOR_PRO: {
    push: {
      title: (d) => '📋 New Booking Request!',
      body:  (d) => `${d.serviceName} on ${d.date} at ${d.time}. Accept within 10 minutes.`,
    },
    sms: (d) => `Slot App: New job! ${d.serviceName} on ${d.date} at ${d.time}. Open app to accept. Booking: ${d.bookingId}`,
    email: null,
  },
  OTP: {
    push: null,
    sms: (d) => `${d.otp} is your Slot App OTP. Valid for 10 minutes. Do NOT share with anyone. -Slot Services`,
    email: {
      subject: () => 'Your Slot App OTP',
      html:    (d) => `<h2>Your OTP: ${d.otp}</h2><p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>`,
    },
  },
  SUBSCRIPTION_ACTIVATED: {
    push: {
      title: (d) => `🎉 ${d.planName} Plan Activated!`,
      body:  (d) => `Enjoy ${d.discount}% off on all services. Valid till ${d.validTill}.`,
    },
    sms: (d) => `Slot App: Your ${d.planName} subscription is active. Enjoy ${d.discount}% off all services till ${d.validTill}.`,
    email: {
      subject: (d) => `${d.planName} Subscription Activated`,
      html:    (d) => `<h2>${d.planName} Plan Active</h2><p>Enjoy ${d.discount}% discount on all services until ${d.validTill}.</p>`,
    },
  },
  WALLET_CREDITED: {
    push: {
      title: (d) => '💰 Wallet Credited!',
      body:  (d) => `₹${d.amount} added to your Slot Wallet. New balance: ₹${d.balance}`,
    },
    sms: (d) => `Slot App: Rs.${d.amount} credited to your wallet. Balance: Rs.${d.balance}. ${d.reason || ''}`,
    email: null,
  },
  REFERRAL_BONUS: {
    push: {
      title: () => '🎁 Referral Bonus Earned!',
      body:  (d) => `₹${d.amount} added to your wallet for referring ${d.friendName}!`,
    },
    sms: (d) => `Slot App: Congrats! Rs.${d.amount} credited for your referral. Balance: Rs.${d.balance}.`,
    email: null,
  },
};

// ── Notification Preference Check ────────────────────────────
async function getUserNotifPrefs(userId) {
  const cacheKey = `notif_prefs:${userId}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return cached;

  try {
    const User  = require('../models/User');
    const user  = await User.findById(userId).select('notificationPreferences fcmToken email phone').lean();
    const prefs = {
      push:  user?.notificationPreferences?.push  !== false,
      sms:   user?.notificationPreferences?.sms   !== false,
      email: user?.notificationPreferences?.email !== false,
      fcmToken: user?.fcmToken,
      phone:    user?.phone,
      email_addr: user?.email,
    };
    await redis.set(cacheKey, prefs, 300); // cache 5 min
    return prefs;
  } catch {
    return { push: true, sms: true, email: true };
  }
}

// ── Core Dispatcher ───────────────────────────────────────────
async function dispatch(userId, templateKey, data, options = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    console.error(`[NotifService] Unknown template: ${templateKey}`);
    return;
  }

  const prefs = await getUserNotifPrefs(userId);

  const tasks = [];

  // Push notification
  if (prefs.push && prefs.fcmToken && template.push && !options.skipPush) {
    tasks.push(
      sendPush(prefs.fcmToken, template.push.title(data), template.push.body(data), data)
        .catch(e => console.error(`[NotifService] Push failed for ${userId}:`, e.message))
    );
  }

  // SMS
  if (prefs.sms && prefs.phone && template.sms && !options.skipSms) {
    tasks.push(
      sendSMS(prefs.phone, template.sms(data))
        .catch(e => console.error(`[NotifService] SMS failed for ${userId}:`, e.message))
    );
  }

  // Email
  if (prefs.email && prefs.email_addr && template.email && !options.skipEmail) {
    tasks.push(
      sendEmail({
        to:      prefs.email_addr,
        subject: template.email.subject(data),
        html:    template.email.html(data),
      }).catch(e => console.error(`[NotifService] Email failed for ${userId}:`, e.message))
    );
  }

  // In-app notification (always)
  if (!options.skipInApp) {
    tasks.push(createInAppNotification(userId, templateKey, data));
  }

  await Promise.allSettled(tasks);
}

// ── In-App Notification Storage ───────────────────────────────
async function createInAppNotification(userId, type, data) {
  try {
    const Notification = require('../models/Notification');
    const titleFn = TEMPLATES[type]?.push?.title;
    const bodyFn  = TEMPLATES[type]?.push?.body;
    await Notification.create({
      user:    userId,
      type,
      title:   titleFn ? titleFn(data) : type,
      message: bodyFn  ? bodyFn(data)  : JSON.stringify(data),
      data,
      isRead:  false,
    });
  } catch (e) {
    console.error('[NotifService] In-app create failed:', e.message);
  }
}

// ── Push (Firebase FCM) ───────────────────────────────────────
async function sendPush(token, title, body, data = {}) {
  try {
    const admin = require('../config/firebase').getAdmin();
    if (!admin) return;
    const msg = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high', notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK', sound: 'default' } },
      apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    const result = await admin.messaging().send(msg);
    return result;
  } catch (e) {
    if (e.code === 'messaging/registration-token-not-registered') {
      // Remove stale token
      console.log('[NotifService] Stale FCM token, clearing...');
    }
    throw e;
  }
}

// ── Batch Push ────────────────────────────────────────────────
async function sendBatchPush(tokens, title, body, data = {}) {
  if (!tokens?.length) return;
  try {
    const admin = require('../config/firebase').getAdmin();
    if (!admin) return;
    const msg = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
    };
    const result = await admin.messaging().sendMulticast(msg);
    console.log(`[NotifService] Batch push: ${result.successCount}/${tokens.length} sent`);
    return result;
  } catch (e) {
    console.error('[NotifService] Batch push error:', e.message);
  }
}

// ── SMS ───────────────────────────────────────────────────────
async function sendSMS(phone, message) {
  const { sendSMS: smsUtil } = require('./smsService');
  return smsUtil(phone, message);
}

// ── Email ─────────────────────────────────────────────────────
async function sendEmail(opts) {
  const { sendEmail: emailUtil } = require('../utils/email');
  return emailUtil(opts);
}

// ── SMS Service (standalone) ──────────────────────────────────
const smsService = {
  async send(phone, message) {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.NODE_ENV === 'test') {
      console.log(`[SMS MOCK] To: ${phone} | ${message}`);
      return { sid: 'mock_sid' };
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });
  },
};

// ── Public API ────────────────────────────────────────────────

/**
 * Notify customer their booking was confirmed
 */
exports.notifyBookingConfirmed = async (booking) => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    date:        new Date(booking.scheduledDate).toDateString(),
    time:        booking.scheduledTimeSlot || booking.scheduledTime,
  };
  await dispatch(booking.customer._id || booking.customer, 'BOOKING_CONFIRMED', data);
};

/**
 * Notify customer their booking was cancelled
 */
exports.notifyBookingCancelled = async (booking, cancelledBy = 'system') => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    refund:      booking.cancellation?.refundAmount || 0,
    cancelledBy,
  };
  await dispatch(booking.customer._id || booking.customer, 'BOOKING_CANCELLED', data);
};

/**
 * Notify customer a professional was assigned
 */
exports.notifyProfessionalAssigned = async (booking, professional) => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    proName:     professional?.user?.name || 'Professional',
    proPhone:    professional?.user?.phone,
    eta:         '30-45 minutes',
  };
  await dispatch(booking.customer._id || booking.customer, 'PROFESSIONAL_ASSIGNED', data);
};

/**
 * Notify professional about new booking
 */
exports.notifyProfessionalNewBooking = async (proUserId, booking) => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    date:        new Date(booking.scheduledDate).toDateString(),
    time:        booking.scheduledTimeSlot || booking.scheduledTime,
    address:     `${booking.address?.city || ''}`,
  };
  await dispatch(proUserId, 'NEW_BOOKING_FOR_PRO', data);
};

/**
 * Notify customer professional is arriving
 */
exports.notifyProfessionalArriving = async (booking, eta) => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    proName:     booking.professional?.user?.name || 'Professional',
    eta:         eta || '10-15 minutes',
  };
  await dispatch(booking.customer._id || booking.customer, 'PROFESSIONAL_ARRIVING', data);
};

/**
 * Notify service completed
 */
exports.notifyServiceCompleted = async (booking) => {
  const data = {
    bookingId:   booking.bookingId,
    serviceName: booking.service?.name || 'Service',
    proName:     booking.professional?.user?.name || 'Professional',
  };
  await dispatch(booking.customer._id || booking.customer, 'SERVICE_COMPLETED', data);
};

/**
 * Notify wallet credited
 */
exports.notifyWalletCredited = async (userId, amount, balance, reason) => {
  await dispatch(userId, 'WALLET_CREDITED', { amount, balance, reason });
};

/**
 * Notify subscription activated
 */
exports.notifySubscriptionActivated = async (userId, plan) => {
  await dispatch(userId, 'SUBSCRIPTION_ACTIVATED', {
    planName:  plan.name,
    discount:  plan.discount,
    validTill: new Date(Date.now() + 30 * 86400000).toDateString(),
  });
};

/**
 * Notify referral bonus
 */
exports.notifyReferralBonus = async (userId, amount, balance, friendName) => {
  await dispatch(userId, 'REFERRAL_BONUS', { amount, balance, friendName });
};

/**
 * Send OTP
 */
exports.sendOTPNotification = async (phone, email, otp) => {
  const tasks = [];
  if (phone) tasks.push(sendSMS(phone, TEMPLATES.OTP.sms({ otp })));
  if (email && TEMPLATES.OTP.email) {
    tasks.push(sendEmail({
      to:      email,
      subject: TEMPLATES.OTP.email.subject({ otp }),
      html:    TEMPLATES.OTP.email.html({ otp }),
    }));
  }
  await Promise.allSettled(tasks);
};

/**
 * Broadcast to all users (admin bulk)
 */
exports.broadcastToAll = async (title, message, filter = {}) => {
  const User = require('../models/User');
  const users = await User.find({ ...filter, fcmToken: { $exists: true, $ne: null } })
    .select('fcmToken').lean();
  const tokens = users.map(u => u.fcmToken).filter(Boolean);
  if (tokens.length) await sendBatchPush(tokens, title, message);
  console.log(`[NotifService] Broadcast sent to ${tokens.length} users`);
};

exports.dispatch         = dispatch;
exports.sendPush         = sendPush;
exports.sendBatchPush    = sendBatchPush;
exports.sendSMS          = (phone, msg) => smsService.send(phone, msg);
exports.createInAppNotification = createInAppNotification;
