/**
 * MK App — Custom Hooks
 * Feature #7: useBooking (repeat booking)
 * Feature #4: useBeforeAfterPhotos
 * Feature various: useSearch, useLocation, usePayment
 */

// ── useBooking Hook ───────────────────────────────────────────
export function useBooking() {
  const [loading, setLoading]   = React.useState(false);
  const [bookings, setBookings] = React.useState([]);

  const repeatBooking = React.useCallback(async (booking) => {
    // Navigate to checkout with pre-filled data from completed booking
    return {
      serviceId:           booking.service?._id,
      subServiceName:      booking.subService?.name,
      prefillAddress:      booking.address,
      specialInstructions: booking.specialInstructions,
      previousBookingId:   booking._id,
    };
  }, []);

  const fetchBookings = React.useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      const params  = new URLSearchParams(filters).toString();
      const res     = await api.get(`/bookings?${params}`);
      setBookings(res.data?.bookings || []);
    } catch (e) {
      console.error('[useBooking] fetchBookings error:', e.message);
    }
    setLoading(false);
  }, []);

  const cancelBooking = React.useCallback(async (bookingId, reason) => {
    const { api } = require('../utils/api');
    const res = await api.put(`/bookings/${bookingId}/cancel`, { cancellationReason: reason });
    return res.data;
  }, []);

  const rescheduleBooking = React.useCallback(async (bookingId, date, time, reason) => {
    const { api } = require('../utils/api');
    const res = await api.put(`/bookings/${bookingId}/reschedule`, { scheduledDate: date, scheduledTime: time, reason });
    return res.data;
  }, []);

  const rateBooking = React.useCallback(async (bookingId, rating, comment, tags) => {
    const { api } = require('../utils/api');
    const res = await api.post('/reviews', { bookingId, rating, comment, tags });
    return res.data;
  }, []);

  return { loading, bookings, fetchBookings, repeatBooking, cancelBooking, rescheduleBooking, rateBooking };
}

// ── useSearch Hook ────────────────────────────────────────────
export function useSearch() {
  const [results, setResults]       = React.useState(null);
  const [searching, setSearching]   = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [recentSearches, setRecent] = React.useState([]);
  const debounceRef = React.useRef(null);

  React.useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const saved = await AsyncStorage.getItem('mk_recent_searches');
      if (saved) setRecent(JSON.parse(saved));
    } catch {}
  };

  const saveSearch = async (query) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 8);
      setRecent(updated);
      await AsyncStorage.setItem('mk_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearRecent = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      setRecent([]);
      await AsyncStorage.removeItem('mk_recent_searches');
    } catch {}
  };

  const search = React.useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query?.trim()) { setResults(null); setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { api } = require('../utils/api');
        const [searchRes, suggRes] = await Promise.all([
          api.get(`/search?q=${encodeURIComponent(query)}`),
          api.get(`/search/suggestions?q=${encodeURIComponent(query)}`),
        ]);
        setResults(searchRes.data?.data || {});
        setSuggestions(suggRes.data?.data || []);
        saveSearch(query.trim());
      } catch {}
      setSearching(false);
    }, 300);
  }, [recentSearches]);

  return { results, searching, suggestions, recentSearches, search, clearRecent };
}

// ── usePayment Hook ───────────────────────────────────────────
export function usePayment() {
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState(null);

  const createOrder = React.useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const { api } = require('../utils/api');
      const res = await api.post('/payments/create-order', { bookingId });
      return res.data;
    } catch (e) {
      setError(e.response?.data?.message || 'Payment setup failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPayment = React.useCallback(async (paymentData) => {
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      const res = await api.post('/payments/verify', paymentData);
      return res.data;
    } catch (e) {
      setError(e.response?.data?.message || 'Payment verification failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const openRazorpay = React.useCallback((order, userInfo, onSuccess, onError) => {
    let RazorpayCheckout = null;
    try { RazorpayCheckout = require('react-native-razorpay').default; } catch {}

    if (RazorpayCheckout) {
      RazorpayCheckout.open({
        description:  order.description || 'MK App Service Payment',
        image:        'https://mkapp.in/logo.png',
        currency:     order.currency || 'INR',
        key:          process.env.RAZORPAY_KEY_ID || '',
        amount:       order.amount,
        name:         'MK App',
        order_id:     order.id,
        prefill:      {
          email:       userInfo?.email  || '',
          contact:     userInfo?.phone  || userInfo?.contact || '',
          name:        userInfo?.name   || '',
        },
        theme:        { color: '#E94560' },
      })
        .then(data  => onSuccess?.(data))
        .catch(err  => {
          if (err?.code !== 0) onError?.(err); // code 0 = user cancelled
        });
    } else {
      // Fallback for simulators where native module is not linked
      console.warn('[usePayment] react-native-razorpay not linked — using dev fallback');
      onSuccess?.({
        razorpay_order_id:   order.id,
        razorpay_payment_id: `pay_dev_${Date.now()}`,
        razorpay_signature:  `sig_dev_${Date.now()}`,
      });
    }
  }, []);

  return { loading, error, createOrder, verifyPayment, openRazorpay };
}

// ── useWallet Hook ────────────────────────────────────────────
export function useWallet() {
  const [balance, setBalance]     = React.useState(0);
  const [transactions, setTxns]   = React.useState([]);
  const [loading, setLoading]     = React.useState(false);

  const fetchWallet = React.useCallback(async () => {
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      const res = await api.get('/users/wallet');
      setBalance(res.data?.wallet?.balance || 0);
      setTxns(res.data?.wallet?.transactions || []);
    } catch {}
    setLoading(false);
  }, []);

  const addMoney = React.useCallback(async (amount) => {
    const { api } = require('../utils/api');
    const res = await api.post('/users/wallet/add', { amount });
    if (res.data?.success) setBalance(res.data.balance);
    return res.data;
  }, []);

  return { balance, transactions, loading, fetchWallet, addMoney };
}

// ── useNotifications Hook ─────────────────────────────────────
export function useNotifList() {
  const [notifications, setNotifs] = React.useState([]);
  const [unread, setUnread]         = React.useState(0);
  const [loading, setLoading]       = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      const res = await api.get('/notifications');
      setNotifs(res.data?.notifications || []);
      setUnread(res.data?.unreadCount || 0);
    } catch {}
    setLoading(false);
  }, []);

  const markRead = React.useCallback(async (id) => {
    try {
      const { api } = require('../utils/api');
      await api.put(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  }, []);

  const markAllRead = React.useCallback(async () => {
    try {
      const { api } = require('../utils/api');
      await api.put('/notifications/mark-all-read');
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {}
  }, []);

  return { notifications, unread, loading, fetchNotifications, markRead, markAllRead };
}

// ── useProfile Hook ───────────────────────────────────────────
export function useProfile() {
  const [profile, setProfile]   = React.useState(null);
  const [loading, setLoading]   = React.useState(false);

  const fetchProfile = React.useCallback(async () => {
    setLoading(true);
    try {
      const { api } = require('../utils/api');
      const res = await api.get('/users/profile');
      setProfile(res.data?.user || res.data?.data);
    } catch {}
    setLoading(false);
  }, []);

  const updateProfile = React.useCallback(async (data) => {
    const { api } = require('../utils/api');
    const res = await api.put('/users/profile', data);
    if (res.data?.success) setProfile(res.data?.user || res.data?.data);
    return res.data;
  }, []);

  return { profile, loading, fetchProfile, updateProfile };
}

// React import for hooks
import React from 'react';
