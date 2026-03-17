import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, notificationsAPI } from '../utils/api';
import { io } from 'socket.io-client';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mk_user')); } catch { return null; }
  });
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mk_cart')) || []; } catch { return []; }
  });
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem('mk_city') || 'Hyderabad'
  );
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('mk_cart', JSON.stringify(cart));
  }, [cart]);

  // Persist city
  useEffect(() => {
    localStorage.setItem('mk_city', selectedCity);
  }, [selectedCity]);

  // Init socket on login
  useEffect(() => {
    if (user) {
      const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: { token: localStorage.getItem('mk_access_token') },
        reconnectionAttempts: 5,
      });
      s.emit('join_user', user._id);
      s.on('booking_created', (data) => showToast(`Booking ${data.bookingId} confirmed!`, 'success'));
      s.on('status_update', (data) => showToast(data.message || `Status: ${data.status}`, 'info'));
      setSocket(s);
      fetchNotifications();
      return () => s.disconnect();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { }
  };

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), duration);
  }, []);

  // ── AUTH ──────────────────────────────────────────────────
  const login = (userData, accessToken, refreshToken) => {
    setUser(userData);
    localStorage.setItem('mk_user', JSON.stringify(userData));
    localStorage.setItem('mk_access_token', accessToken);
    localStorage.setItem('mk_refresh_token', refreshToken);
  };

  const logout = async () => {
    try {
      await authAPI.logout(localStorage.getItem('mk_refresh_token'));
    } catch { }
    setUser(null);
    setCart([]);
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('mk_user');
    localStorage.removeItem('mk_access_token');
    localStorage.removeItem('mk_refresh_token');
    localStorage.removeItem('mk_cart');
    if (socket) socket.disconnect();
  };

  // ── CART ──────────────────────────────────────────────────
  const addToCart = (item) => {
    const exists = cart.find(c => c.serviceId === item.serviceId && c.subServiceName === item.subServiceName);
    if (exists) {
      showToast('Item already in cart', 'info');
      return;
    }
    setCart(prev => [...prev, { ...item, cartId: `cart_${Date.now()}` }]);
    showToast(`${item.serviceName} added to cart`, 'success');
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  const cartCount = cart.length;

  return (
    <AppContext.Provider value={{
      user, login, logout,
      cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount,
      selectedCity, setSelectedCity,
      notifications, unreadCount, fetchNotifications,
      socket, loading, setLoading,
      toast, showToast,
    }}>
      {children}
      {toast && <Toast toast={toast} />}
    </AppContext.Provider>
  );
};

// ── TOAST COMPONENT ─────────────────────────────────────────
const TOAST_COLORS = {
  success: { bg: '#1b5e20', border: '#4caf50', icon: '✅' },
  error: { bg: '#b71c1c', border: '#f44336', icon: '❌' },
  info: { bg: '#0d47a1', border: '#2196f3', icon: 'ℹ️' },
  warning: { bg: '#e65100', border: '#ff9800', icon: '⚠️' },
};

function Toast({ toast }) {
  const c = TOAST_COLORS[toast.type] || TOAST_COLORS.success;
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: c.bg, color: '#fff',
      padding: '14px 24px', borderRadius: 12,
      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${c.border}`,
      fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap',
    }}>
      <span>{c.icon}</span>
      {toast.message}
      <style>{`@keyframes slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
    </div>
  );
}
