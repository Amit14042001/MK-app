/**
 * MK Web — Profile Page (Full)
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../utils/api';

export default function ProfilePage({ navigate = () => {} }) {
  const { user, logout } = useApp();
  const [profile, setProfile]   = useState(null);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '' });
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState('');

  useEffect(() => {
    if (!user) { navigate('login'); return; }
    Promise.all([usersAPI.getProfile(), usersAPI.getStats()])
      .then(([pRes, sRes]) => {
        setProfile(pRes.data.user);
        setStats(sRes.data.stats);
        setForm({ name: pRes.data.user.name, email: pRes.data.user.email || '' });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersAPI.updateProfile(form);
      setProfile(prev => ({ ...prev, ...form }));
      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const MENU = [
    { icon: '📋', label: 'My Bookings',     path: '/bookings' },
    { icon: '💰', label: 'MK Wallet',       path: '/wallet' },
    { icon: '📍', label: 'Saved Addresses', path: '/addresses' },
    { icon: '👑', label: 'MK Prime',        path: '/prime' },
    { icon: '🏢', label: 'Corporate',       path: '/corporate' },
    { icon: '🔔', label: 'Notifications',   path: '/notifications' },
    { icon: '🎁', label: 'Offers & Coupons',path: '/offers' },
    { icon: '👥', label: 'Refer & Earn',    path: '/refer' },
    { icon: '❓', label: 'Help & Support',  path: '/help' },
    { icon: '⚙️',  label: 'Settings',        path: '/settings' },
  ];

  const TIER_COLORS = {
    Standard:  { bg: '#F0F0F5', text: '#666' },
    Silver:    { bg: '#E8E8E8', text: '#555' },
    Gold:      { bg: '#FFF8E1', text: '#F59E0B' },
    Platinum:  { bg: '#F3E5F5', text: '#9C27B0' },
    Prime:     { bg: '#FFF3E0', text: '#E65100' },
  };
  const tier = profile?.membershipTier || 'Standard';
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.Standard;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-orange-600 text-white px-6 py-10">
        <div className="max-w-4xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl font-black border-2 border-white/30">
            {profile?.name?.[0] || 'U'}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <input className="w-full bg-white/20 rounded-xl px-3 py-2 text-white placeholder-white/60 text-lg font-bold border border-white/30 outline-none"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                <input className="w-full bg-white/20 rounded-xl px-3 py-2 text-white placeholder-white/60 text-sm border border-white/30 outline-none"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" type="email" />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2 bg-white text-orange-600 font-bold rounded-xl text-sm hover:bg-orange-50 transition-colors">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-5 py-2 bg-white/20 text-white font-semibold rounded-xl text-sm hover:bg-white/30 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black">{profile?.name}</h2>
                  <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: tierStyle.bg, color: tierStyle.text }}>
                    {tier === 'Prime' ? '👑' : ''} {tier}
                  </span>
                </div>
                <p className="text-white/70 text-sm mt-1">+91 {profile?.phone}</p>
                {profile?.email && <p className="text-white/70 text-sm">{profile.email}</p>}
                <button onClick={() => setEditing(true)} className="mt-3 text-xs bg-white/20 hover:bg-white/30 transition-colors px-4 py-1.5 rounded-full font-semibold">
                  ✏️ Edit Profile
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div className="max-w-4xl mx-auto mt-3 bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">{message}</div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 -mt-6 mb-6">
            {[
              { label: 'Bookings', value: stats.totalBookings || 0, icon: '📋' },
              { label: 'Total Saved', value: `₹${stats.savingsThisYear || 0}`, icon: '💰' },
              { label: 'Wallet', value: `₹${stats.walletBalance || 0}`, icon: '👛' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Prime Banner */}
        {tier !== 'Prime' && (
          <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 mb-6 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-3xl">👑</span>
            <div className="flex-1">
              <p className="font-black text-white">Upgrade to MK Prime</p>
              <p className="text-sm text-white/80">Save 15% on every booking + free services</p>
            </div>
            <span className="text-white font-bold text-lg">→</span>
          </span>
        )}

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {MENU.map((item, idx) => (
            <React.Fragment key={item.path}>
              <Link to={item.path} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className="text-xl w-7">{item.icon}</span>
                <span className="flex-1 font-medium text-gray-800">{item.label}</span>
                <span className="text-gray-300 text-xl">›</span>
              </Link>
              {idx < MENU.length - 1 && <div className="h-px bg-gray-50 ml-16" />}
            </React.Fragment>
          ))}
        </div>

        {/* Logout */}
        <button onClick={() => { if (window.confirm('Logout?')) logout(); navigate(''); }}
          className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors mb-4">
          🚪 Logout
        </button>

        <p className="text-center text-xs text-gray-400">MK Services v1.0.0 · Referral: {profile?.referralCode || '—'}</p>
      </div>
    </div>
  );
}
