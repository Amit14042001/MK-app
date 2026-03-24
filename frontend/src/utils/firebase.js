import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

let app = null;
let messaging = null;
let auth = null;
let googleProvider = null;
let facebookProvider = null;

export const initFirebase = async () => {
  try {
    if (!firebaseConfig.apiKey) {
      console.error('[Firebase] Missing API Key in .env');
      return false;
    }
    if (!app) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      
      googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      
      facebookProvider = new FacebookAuthProvider();
      facebookProvider.addScope('email');
      facebookProvider.addScope('public_profile');
      
      console.log('[Firebase] App & Auth initialized');
    }
    
    // Messaging is async and may not be supported in all browsers
    const supported = await isSupported();
    if (supported && !messaging) {
      messaging = getMessaging(app);
    }
    return true;
  } catch (err) {
    console.error('[Firebase] Init error:', err);
    return false;
  }
};

export const getFirebaseInfo = () => ({ app, messaging, auth, googleProvider, facebookProvider });

export const socialSignIn = async (providerName, useRedirect = false) => {
  try {
    if (!auth) await initFirebase();
    const provider = providerName === 'google' ? googleProvider : facebookProvider;
    
    if (useRedirect) {
      const { signInWithRedirect } = await import('firebase/auth');
      await signInWithRedirect(auth, provider);
      return null; // Redirecting...
    }

    const { signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { idToken, user: result.user };
  } catch (err) {
    console.error(`[Firebase] ${providerName} sign in error:`, err);
    throw err;
  }
};

export const requestNotificationPermission = async () => {
  try {
    if (!messaging) { const ok = await initFirebase(); if (!ok) return null; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    let swReg = null;
    if ('serviceWorker' in navigator) swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    return token || null;
  } catch { return null; }
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed', PROFESSIONAL_ASSIGNED: 'professional_assigned',
  PRO_ARRIVING: 'professional_arriving', PRO_ARRIVED: 'professional_arrived',
  SERVICE_STARTED: 'in_progress', SERVICE_COMPLETED: 'completed',
  BOOKING_CANCELLED: 'cancelled', PAYMENT_SUCCESS: 'payment_success',
  COUPON_AVAILABLE: 'coupon_available', REMINDER: 'reminder',
};

export const getNotificationMeta = (type) => {
  const map = {
    booking_confirmed:    { icon: '✅', color: '#30d158' },
    professional_assigned:{ icon: '👷', color: '#0a84ff' },
    professional_arriving:{ icon: '🚗', color: '#ff9f0a' },
    professional_arrived: { icon: '🏠', color: '#0a84ff' },
    in_progress:          { icon: '⚡', color: '#bf5af2' },
    completed:            { icon: '🎉', color: '#30d158' },
    cancelled:            { icon: '❌', color: '#ff3b30' },
    payment_success:      { icon: '💰', color: '#30d158' },
    coupon_available:     { icon: '🎟️', color: 'var(--color-brand)' },
  };
  return map[type] || { icon: '🔔', color: 'var(--color-brand)' };
};
