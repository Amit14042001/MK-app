/* eslint-disable no-undef */
// firebase-messaging-sw.js — placed in /public/

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ── Firebase config (public — safe to expose) ────────────────
// These values come from Firebase Console → Project Settings → Your Apps
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || 'YOUR_API_KEY',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || 'YOUR_PROJECT.firebaseapp.com',
  projectId:         self.FIREBASE_PROJECT_ID         || 'YOUR_PROJECT_ID',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId:             self.FIREBASE_APP_ID             || 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);

  const { title, body, image } = payload.notification || {};
  const data = payload.data || {};

  const notificationOptions = {
    body:    body || 'You have a new notification from MK',
    icon:    '/logo192.png',
    badge:   '/badge-72x72.png',
    image:   image,
    tag:     data.bookingId || 'mk-notification',
    data:    data,
    actions: data.bookingId
      ? [
          { action: 'view',    title: '👁️ View',    icon: '/icons/view.png'    },
          { action: 'dismiss', title: '✕ Dismiss', icon: '/icons/dismiss.png' },
        ]
      : [],
    requireInteraction: data.priority === 'critical',
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  self.registration.showNotification(title || 'MK App', notificationOptions);
});

// ── Notification click handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (event.action === 'dismiss') return;

  if (data.bookingId) {
    switch (data.type) {
      case 'booking_confirmed':
      case 'service_completed':
        targetUrl = `/my-bookings`;
        break;
      case 'professional_arriving':
      case 'professional_arrived':
      case 'professional_assigned':
        targetUrl = `/tracking/${data.bookingId}`;
        break;
      case 'payment_received':
        targetUrl = `/my-bookings`;
        break;
      default:
        targetUrl = `/my-bookings`;
    }
  } else if (data.type === 'promotion') {
    targetUrl = '/services';
  } else if (data.type === 'wallet_credit') {
    targetUrl = '/profile?tab=wallet';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data, targetUrl });
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Push subscription change ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // TODO: Send new subscription to backend
        console.log('[SW] Push subscription renewed');
      })
  );
});
