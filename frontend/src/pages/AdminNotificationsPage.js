import { useState } from 'react';
import { notificationsAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function AdminNotificationsPage() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ title: '', message: '', type: 'system', deepLink: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      showToast('Title and message required', 'error');
      return;
    }

    setSending(true);
    try {
      const { data } = await notificationsAPI.broadcast(form);
      showToast(`Successfully broadcasted to ${data.sent} users!`, 'success');
      setForm({ title: '', message: '', type: 'system', deepLink: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    marginBottom: 16,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>Notification Broadcast</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Send system-wide notifications to all active users</p>
      </header>

      <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>Notification Title</label>
              <input 
                style={inputStyle} 
                value={form.title} 
                onChange={p => setForm({...form, title: p.target.value})} 
                placeholder="e.g. Special Offer Today! 🎁"
                onFocus={e => e.target.style.borderColor = '#000'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={labelStyle}>Notification Type</label>
              <select 
                style={inputStyle} 
                value={form.type} 
                onChange={p => setForm({...form, type: p.target.value})}
                onFocus={e => e.target.style.borderColor = '#000'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              >
                <option value="system">System Announcement</option>
                <option value="offer">Special Offer</option>
                <option value="promo">Promo Code</option>
                <option value="booking_reminder">Update reminder</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Message Body</label>
          <textarea 
            style={{ ...inputStyle, height: 120, resize: 'none' }} 
            value={form.message} 
            onChange={p => setForm({...form, message: p.target.value})} 
            placeholder="Write your notification content here..."
            onFocus={e => e.target.style.borderColor = '#000'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />

          <label style={labelStyle}>Deep Link (optional)</label>
          <input 
            style={inputStyle} 
            value={form.deepLink} 
            onChange={p => setForm({...form, deepLink: p.target.value})} 
            placeholder="e.g. /offers or /services/salon"
            onFocus={e => e.target.style.borderColor = '#000'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
             <p style={{ fontSize: 13, color: '#94a3b8' }}>This will be sent to <b>all active users</b></p>
             <button 
              type="submit" 
              disabled={sending}
              style={{
                padding: '14px 40px',
                borderRadius: 14,
                background: sending ? '#cbd5e1' : '#000',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                border: 'none',
                cursor: sending ? 'wait' : 'pointer',
                transition: 'transform 0.2s, background 0.2s'
              }}
              onMouseEnter={e => !sending && (e.target.style.transform = 'scale(1.02)')}
              onMouseLeave={e => !sending && (e.target.style.transform = 'scale(1)')}
            >
              {sending ? 'Sending...' : 'Send Broadcast Now 🚀'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginTop: 40, background: '#f8fafc', borderRadius: 20, padding: 24, border: '1px dashed #cbd5e1' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Preview on Mobile</h3>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {form.type === 'offer' ? '🎁' : form.type === 'promo' ? '🎟️' : '🔔'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{form.title || 'Notification Title'}</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{form.message || 'The user will see your message here...'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
