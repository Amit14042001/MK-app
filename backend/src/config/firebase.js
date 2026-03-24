const admin = require('firebase-admin');

let firebaseInitialized = false;

const initFirebaseAdmin = () => {
  if (firebaseInitialized) return;
  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const fs = require('fs');
      const val = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      if (val.startsWith('{')) {
        serviceAccount = JSON.parse(val);
      } else if (fs.existsSync(val)) {
        serviceAccount = JSON.parse(fs.readFileSync(val, 'utf8'));
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      serviceAccount = {
        type:                        'service_account',
        project_id:                  process.env.FIREBASE_PROJECT_ID,
        private_key_id:              process.env.FIREBASE_PRIVATE_KEY_ID || '',
        private_key:                 process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email:                process.env.FIREBASE_CLIENT_EMAIL,
        client_id:                   process.env.FIREBASE_CLIENT_ID || '',
        auth_uri:                    'https://accounts.google.com/o/oauth2/auth',
        token_uri:                   'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:        process.env.FIREBASE_CERT_URL || '',
      };
    }

    if (!serviceAccount) {
      console.warn('[Firebase Admin] No service account found — push notifications disabled');
      return;
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    console.log('[Firebase Admin] Initialized successfully');
  } catch (err) {
    console.error('[Firebase Admin] Init error:', err.message);
  }
};

// Send notification to a single FCM token
const sendPushNotification = async ({ token, title, body, data = {}, imageUrl }) => {
  if (!firebaseInitialized) return null;
  try {
    const message = {
      token,
      notification: { title, body, ...(imageUrl && { imageUrl }) },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: {
        notification: { icon: 'ic_notification', color: '#f15c22', channelId: 'slot_bookings', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
        priority: 'high',
      },
      apns: {
        payload: { aps: { badge: 1, sound: 'default' } },
        headers: { 'apns-priority': '10' },
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { icon: '/logo192.png', badge: '/badge.png', vibrate: [200, 100, 200] },
      },
    };
    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      console.log('[Firebase] Stale token, should remove from DB:', token.slice(0, 20));
    }
    console.error('[Firebase] Send error:', err.message);
    return null;
  }
};

// Send to multiple tokens (batch)
const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  if (!firebaseInitialized || !tokens?.length) return null;
  try {
    const message = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[Firebase] Multicast: ${response.successCount} sent, ${response.failureCount} failed`);
    return response;
  } catch (err) {
    console.error('[Firebase] Multicast error:', err.message);
    return null;
  }
};

// Send to topic (e.g. 'all_users', 'city_hyderabad')
const sendTopicNotification = async ({ topic, title, body, data = {} }) => {
  if (!firebaseInitialized) return null;
  try {
    const message = {
      topic,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    return await admin.messaging().send(message);
  } catch (err) {
    console.error('[Firebase] Topic send error:', err.message);
    return null;
  }
};

module.exports = { initFirebaseAdmin, sendPushNotification, sendMulticastNotification, sendTopicNotification };
