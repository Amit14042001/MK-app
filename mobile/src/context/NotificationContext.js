/**
 * MK App — NotificationContext
 * Push notifications, in-app badge, deep link routing
 * Feature #10: Deep links from notifications
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Real Firebase messaging — graceful fallback if not yet linked
let messaging = null;
try { messaging = require('@react-native-firebase/messaging').default; } catch {}

const NotifContext = createContext(null);

// ── Deep link route map ───────────────────────────────────────
const DEEP_LINK_ROUTES = {
  booking_confirmed:   (data, nav) => nav.navigate('BookingsTab', { screen: 'BookingDetail', params: { bookingId: data.bookingId } }),
  booking_cancelled:   (data, nav) => nav.navigate('BookingsTab', { screen: 'BookingDetail', params: { bookingId: data.bookingId } }),
  pro_assigned:        (data, nav) => nav.navigate('HomeTab',     { screen: 'Tracking',      params: { bookingId: data.bookingId } }),
  pro_arriving:        (data, nav) => nav.navigate('HomeTab',     { screen: 'Tracking',      params: { bookingId: data.bookingId } }),
  service_completed:   (data, nav) => nav.navigate('HomeTab',     { screen: 'Review',        params: { bookingId: data.bookingId } }),
  wallet_credited:     (data, nav) => nav.navigate('HomeTab',     { screen: 'Wallet' }),
  offer_new:           (data, nav) => nav.navigate('OffersTab'),
  subscription_expiry: (data, nav) => nav.navigate('ProfileTab',  { screen: 'Subscription' }),
  referral_bonus:      (data, nav) => nav.navigate('HomeTab',     { screen: 'Wallet' }),
  support_reply:       (data, nav) => nav.navigate('ProfileTab',  { screen: 'Help' }),
};

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount]   = useState(0);
  const [notifications, setNotifs]      = useState([]);
  const [initialNotif, setInitialNotif] = useState(null); // notif that launched app
  const navigationRef = useRef(null);

  useEffect(() => {
    setupNotifications();
    loadUnreadCount();
  }, []);

  const setupNotifications = async () => {
    try {
      // ── In production: Firebase messaging setup ──────────
      // const authStatus = await messaging().requestPermission();
      // const token = await messaging().getToken();
      // Save token to backend
      // await api.put('/users/profile/fcm-token', { fcmToken: token });

      // Foreground notification handler
      // messaging().onMessage(async remoteMessage => {
      //   handleForegroundNotif(remoteMessage);
      // });

      // Background tap handler
      // messaging().onNotificationOpenedApp(remoteMessage => {
      //   handleNotifTap(remoteMessage.data);
      // });

      // App killed tap handler
      // const initNotif = await messaging().getInitialNotification();
      // if (initNotif) setInitialNotif(initNotif.data);

      console.log('[Notif] Notification setup complete (mock mode)');
    } catch (e) {
      console.error('[Notif] Setup error:', e.message);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { api } = require('../utils/api');
      const res = await api.get('/notifications?limit=1');
      if (res.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {}
  };

  const handleForegroundNotif = (message) => {
    const { title, body } = message.notification || {};
    const data = message.data || {};

    // Add to in-app list
    setNotifs(prev => [{
      id:        message.messageId || Date.now().toString(),
      title,
      body,
      data,
      timestamp: new Date(),
      isRead:    false,
    }, ...prev]);

    setUnreadCount(c => c + 1);

    // Show in-app banner (in production: use notifee)
    // notifee.displayNotification({ title, body, android: { channelId: 'default' } });
  };

  const handleNotifTap = (data) => {
    if (!data?.type || !navigationRef.current) return;
    const handler = DEEP_LINK_ROUTES[data.type];
    if (handler) {
      setTimeout(() => handler(data, navigationRef.current), 300);
    }
  };

  // Call this after navigation is ready
  const setNavigationRef = (ref) => {
    navigationRef.current = ref;
    // If app was opened from a notification, route now
    if (initialNotif) {
      handleNotifTap(initialNotif);
      setInitialNotif(null);
    }
  };

  const navigateFromNotif = (type, data) => {
    handleNotifTap({ type, ...data });
  };

  const markAllRead = async () => {
    try {
      const { api } = require('../utils/api');
      await api.put('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const markRead = async (notifId) => {
    try {
      const { api } = require('../utils/api');
      await api.put(`/notifications/${notifId}/read`);
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const clearBadge = async () => {
    setUnreadCount(0);
    try {
      // Real iOS app-icon badge clear via notifee
      const notifee = require('@notifee/react-native').default;
      await notifee.setBadgeCount(0);
    } catch {
      // notifee not installed or Android (no badge API needed)
    }
  };

  return (
    <NotifContext.Provider value={{
      unreadCount,
      notifications,
      setNavigationRef,
      navigateFromNotif,
      markAllRead,
      markRead,
      clearBadge,
      loadUnreadCount,
      DEEP_LINK_ROUTES,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

export default NotifContext;
