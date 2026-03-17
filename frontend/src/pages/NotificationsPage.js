/**
 * MK Web — Notifications Page (Full)
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { notificationsAPI } from '../utils/api';

const NOTIF_ICONS = {
  booking_confirmed: '✅', booking_cancelled: '❌', booking_completed: '🎉',
  professional_assigned: '👷', payment_success: '💳', refund_processed: '↩️',
  review_reminder: '⭐', offer: '🎁', promo: '📣', system: '📢',
  subscription_activated: '👑', wallet_credit: '💰', default: '🔔',
};

export default function NotificationsPage({ navigate = () => {} }) {
  const { user } = useApp();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread]   = useState(0);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    if (!user) return;
    notificationsAPI.getAll({ limit: 50 }).then(res => {
      setNotifs(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    }).finally(() => setLoading(false));
  }, [user]);

  const markAll = async () => {
    await notificationsAPI.markAllRead();
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const markOne = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifs(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(c => Math.max(0, c - 1));
  };

  const deleteOne = async (id) => {
    await notificationsAPI.delete(id);
    setNotifs(p => p.filter(n => n._id !== id));
  };

  const handleClick = (n) => {
    markOne(n._id);
    if (n.relatedBooking) navigate('booking-detail', { bookingId: n.relatedBooking });
    else if (n.type === 'offer' || n.type === 'promo') navigate('offers');
  };

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filtered = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-2xl font-bold mb-4">Login required</p>
        <span className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl">Login</span></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Notifications</h1>
            {unread > 0 && <p className="text-xs text-orange-500 font-bold">{unread} unread</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {['all','unread'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-sm font-semibold text-orange-500 hover:text-orange-600">
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{filter === 'unread' ? 'All caught up!' : 'No notifications'}</h3>
            <p className="text-gray-500">{filter === 'unread' ? 'No unread notifications.' : 'Your updates and alerts will appear here.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div key={n._id}
                className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
                  !n.isRead ? 'bg-orange-50 border border-orange-100' : 'bg-white border border-gray-100'
                }`}
                onClick={() => handleClick(n)}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
                  !n.isRead ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  {NOTIF_ICONS[n.type] || NOTIF_ICONS.default}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'} leading-tight`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 leading-snug line-clamp-2">{n.message}</p>
                  {!n.isRead && <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />}
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteOne(n._id); }}
                  className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-1">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
