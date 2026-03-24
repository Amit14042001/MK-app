// ============================================================
// TrackingPage.js
// ============================================================
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { trackingAPI } from '../utils/api';

export function TrackingPage({ bookingId, navigate }) {
  const { socket } = useApp();
  const [tracking, setTracking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const STATUS_STEPS = [
    { status: 'confirmed', label: 'Confirmed', icon: '✅', desc: 'Booking confirmed' },
    { status: 'professional_assigned', label: 'Assigned', icon: '👷', desc: 'Expert assigned' },
    { status: 'professional_arriving', label: 'On Way', icon: '🚗', desc: 'Heading to you' },
    { status: 'professional_arrived', label: 'Arrived', icon: '🏠', desc: 'Pro arrived' },
    { status: 'in_progress', label: 'In Progress', icon: '⚡', desc: 'Service underway' },
    { status: 'completed', label: 'Completed', icon: '🎉', desc: 'Completed!' },
  ];

  const statusOrder = STATUS_STEPS.map(s => s.status);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (bookingId) loadTracking();
  }, [bookingId]);

  useEffect(() => {
    if (!socket || !bookingId) return;
    socket.emit('join_booking', bookingId);
    socket.on('status_update', (data) => {
      setTracking(t => t ? { ...t, status: data.status } : t);
    });
    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => { socket.off('status_update'); socket.off('receive_message'); };
  }, [socket, bookingId]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const { data } = await trackingAPI.getBookingTracking(bookingId);
      setTracking(data.tracking);
    } catch { } finally { setLoading(false); }
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !socket) return;
    socket.emit('send_message', { bookingId, senderId: 'customer', senderType: 'customer', message: msgInput });
    setMessages(prev => [...prev, { senderType: 'customer', message: msgInput, timestamp: new Date() }]);
    setMsgInput('');
  };

  const currentStatusIdx = tracking ? statusOrder.indexOf(tracking.status) : 0;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: isMobile ? '24px 16px' : '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => navigate('my-bookings')}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>

        {/* Status Banner */}
        <div style={{
          background: tracking?.status === 'completed'
            ? 'linear-gradient(135deg, #2e7d32, #388e3c)'
            : 'linear-gradient(135deg, #1a1a2e, #0f3460)',
          borderRadius: 20, padding: isMobile ? '20px 24px' : '28px 32px', marginBottom: 24, color: '#fff',
        }}>
          <h2 style={{ margin: '0 0 4px', fontSize: isMobile ? 18 : 22, fontWeight: 800 }}>
            {STATUS_STEPS.find(s => s.status === tracking?.status)?.label || 'Tracking...'}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Booking #{tracking?.bookingId?.slice(-6) || '...'}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
          {/* Timeline */}
          <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: isMobile ? 18 : 24, border: '1px solid #f0f0f0' }}>
            <h3 style={{ fontWeight: 800, marginBottom: 20, fontSize: 16 }}>Status</h3>

            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStatusIdx;
              const active = i === currentStatusIdx;
              return (
                <div key={step.status} style={{ display: 'flex', gap: 14, marginBottom: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? (active ? 'var(--color-brand)' : '#4caf50') : '#f0f0f0',
                    }}>{done ? step.icon : '•'}</div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ width: 2, height: 24, background: done && i < currentStatusIdx ? '#4caf50' : '#f0f0f0' }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <div style={{ fontWeight: active ? 700 : 500, fontSize: 13, color: done ? '#1a1a2e' : '#bbb' }}>{step.label}</div>
                    {active && <div style={{ fontSize: 11, color: '#888' }}>{step.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Pro Card */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontWeight: 800, marginBottom: 16, fontSize: 15 }}>Professional</h3>
              {tracking?.professional ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{tracking.professional.name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tracking.professional.name}</div>
                    <div style={{ fontSize: 12, color: '#f5a623' }}>★ {tracking.professional.rating || 4.9}</div>
                  </div>
                  <a href={`tel:${tracking.professional.phone}`} style={{ padding: '8px 12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Call</a>
                </div>
              ) : <div style={{ fontSize: 13, color: '#aaa' }}>Assigning pro...</div>}
            </div>

            {/* Chat */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', height: 240 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', fontWeight: 700, fontSize: 14 }}>Chat</div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.senderType === 'customer' ? 'flex-end' : 'flex-start', background: m.senderType === 'customer' ? 'var(--color-brand)' : '#f0f0f0', color: m.senderType === 'customer' ? '#fff' : '#333', padding: '8px 12px', borderRadius: 12, fontSize: 12, maxWidth: '85%' }}>
                    {m.message}
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, display: 'flex', gap: 8 }}>
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message..." style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid #eee', fontSize: 12, outline: 'none' }} />
                <button onClick={sendMessage} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>➤</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MyBookingsPage.js
// ============================================================
export function MyBookingsPage({ navigate }) {
  const { user, showToast } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { bookingsAPI } = require('../utils/api');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (user) loadBookings(); }, [user, filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await bookingsAPI.getAll(params);
      setBookings(data.bookings || []);
    } catch { } finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id, 'Customer requested cancellation');
      showToast('Booking cancelled', 'info');
      loadBookings();
    } catch (err) { showToast(err.response?.data?.message || 'Cannot cancel', 'error'); }
  };

  const STATUS_COLORS = {
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
    pending: { bg: '#fff3e0', color: '#e65100' },
    confirmed: { bg: '#e3f2fd', color: '#1565c0' },
    in_progress: { bg: '#f3e5f5', color: '#6a1b9a' },
  };

  if (!user) return <div style={{ padding: isMobile ? '60px 20px' : 80, textAlign: 'center' }}>Please login to view bookings</div>;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: isMobile ? '24px 16px' : '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>My Bookings</h1>
        <p style={{ color: '#888', marginBottom: 28 }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: isMobile ? '10px 16px' : '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: filter === f ? 'var(--color-brand)' : '#fff',
                color: filter === f ? '#fff' : '#555',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>{f.replace('_', ' ')}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
            <h3 style={{ color: '#1a1a2e', fontWeight: 800 }}>No bookings found</h3>
            <button onClick={() => navigate('services')}
              style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 24, cursor: 'pointer', fontWeight: 700, marginTop: 16 }}>
              Book a Service
            </button>
          </div>
        ) : (
          bookings.map(b => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
            const canCancel = ['pending', 'confirmed', 'professional_assigned'].includes(b.status);
            const canTrack = ['professional_assigned', 'professional_arriving', 'professional_arrived', 'in_progress'].includes(b.status);
            const canReview = b.status === 'completed' && !b.isReviewed;
            return (
              <div key={b._id} style={{ background: '#fff', borderRadius: 20, padding: isMobile ? 18 : 22, marginBottom: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: isMobile ? 12 : 14, alignItems: 'center' }}>
                    <span style={{ fontSize: isMobile ? 32 : 36 }}>{b.service?.icon || '🔧'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16, color: '#1a1a2e' }}>{b.service?.name || 'Service'}</div>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>ID: {b.bookingId}</div>
                    </div>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                    {b.status.split('_').join(' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#666', marginBottom: 16, flexWrap: 'wrap' }}>
                  <span>📅 {new Date(b.scheduledDate).toLocaleDateString()}</span>
                  <span>💰 ₹{b.pricing?.totalAmount}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('booking-detail', { bookingId: b._id })}
                    style={{ flex: isMobile ? 1 : 'none', padding: '10px 18px', background: '#f8f9fa', color: '#333', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                    Details
                  </button>
                  {canTrack && (
                    <button onClick={() => navigate('tracking', { bookingId: b._id })}
                      style={{ flex: isMobile ? 1 : 'none', padding: '10px 18px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      📍 Track
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => handleCancel(b._id)}
                      style={{ padding: '10px 18px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// CartPage.js
// ============================================================
export function CartPage({ navigate }) {
  const { cart, removeFromCart, cartTotal, user } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const taxes = Math.round(cartTotal * 0.18);
  const total = cartTotal + taxes;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (cart.length === 0) return (
    <div style={{ textAlign: 'center', padding: isMobile ? '80px 20px' : '100px 24px' }}>
      <div style={{ fontSize: isMobile ? 60 : 72, marginBottom: 16 }}>🛒</div>
      <h2 style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 8, fontSize: isMobile ? 22 : 26 }}>Your cart is empty</h2>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Add services to get started</p>
      <button onClick={() => navigate('services')}
        style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 24, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Explore Services</button>
    </div>
  );

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: isMobile ? '24px 16px' : '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 24 }}>Cart ({cart.length})</h1>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24 }}>
          <div style={{ flex: 1 }}>
            {cart.map(item => (
              <div key={item.cartId} style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 16 : 20, marginBottom: 14, border: '1px solid #f0f0f0', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: isMobile ? 50 : 64, height: isMobile ? 50 : 64, borderRadius: 12, overflow: 'hidden', background: '#f8f9fa', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.serviceImage ? (
                    <img src={item.serviceImage} alt={item.serviceName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: isMobile ? 24 : 32 }}>{item.serviceIcon || '🔧'}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16 }}>{item.serviceName}</div>
                  {item.subServiceName && <div style={{ fontSize: 12, color: '#888' }}>{item.subServiceName}</div>}
                  {item.date && <div style={{ fontSize: 12, color: '#4caf50', marginTop: 4 }}>📅 {item.date}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: isMobile ? 16 : 18 }}>₹{item.price}</div>
                  <button onClick={() => removeFromCart(item.cartId)}
                    style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 11, marginTop: 6 }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ width: isMobile ? '100%' : 340, position: isMobile ? 'static' : 'sticky', top: 80, alignSelf: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f0f0f0', boxShadow: isMobile ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <h3 style={{ fontWeight: 800, marginBottom: 18, fontSize: 16 }}>Order Summary</h3>
              {[['Subtotal', cartTotal], ['GST (18%)', taxes]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#555' }}><span>{l}</span><span>₹{v}</span></div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
                <span>Total</span><span style={{ color: 'var(--color-brand)' }}>₹{total}</span>
              </div>
              <button onClick={() => user ? navigate('checkout') : navigate('login')}
                style={{ width: '100%', marginTop: 18, background: 'linear-gradient(135deg, var(--color-brand), #c0392b)', color: '#fff', border: 'none', padding: '15px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, boxShadow: '0 6px 20px rgba(233,69,96,0.2)' }}>
                {user ? 'Proceed to Checkout' : 'Login to Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Footer.js
// ============================================================
export function Footer({ navigate }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const badgeWrapper = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#000',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    width: 'fit-content'
  };

  return (
    <footer style={{ background: '#f8f9fa', color: '#666', padding: isMobile ? '40px 20px 24px' : '60px 48px 32px', marginTop: 80, borderTop: '1px solid #eee' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: isMobile ? 32 : 24, marginBottom: 48 }}>

          {/* Column 1: Logo */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <img src="/logo.png" alt="Slot Logo" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
              <div style={{ lineHeight: 1 }}>
                <div style={{ color: '#000', fontWeight: 800, fontSize: 18 }}>Slot</div>
                <div style={{ color: '#000', fontWeight: 800, fontSize: 18 }}>Services</div>
              </div>
            </div>
          </div>

          {/* Column 2: Company */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4 style={{ color: '#000', marginBottom: 20, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</h4>
            {['About Us', 'Terms & Conditions', 'Privacy Policy', 'Anti-discrimination policy', 'Slot impact', 'Careers'].map(item => (
              <div key={item} style={{ fontSize: 13, marginBottom: 12, color: '#666', cursor: 'pointer' }}>{item}</div>
            ))}
          </div>

          {/* Column 3: For Customers */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4 style={{ color: '#000', marginBottom: 20, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>For customers</h4>
            {['Slot reviews', 'Categories near you', 'Blog', 'Contact Us'].map(item => (
              <div key={item} style={{ fontSize: 13, marginBottom: 12, color: '#666', cursor: 'pointer' }}>{item}</div>
            ))}
          </div>

          {/* Column 4: For Professionals */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4 style={{ color: '#000', marginBottom: 20, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>For professionals</h4>
            {['Become a professional'].map(item => (
              <div key={item} onClick={() => navigate('become-pro')} style={{ fontSize: 13, marginBottom: 12, color: '#666', cursor: 'pointer' }}>{item}</div>
            ))}
          </div>

          {/* Column 5: Social & Stores */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4 style={{ color: '#000', marginBottom: 20, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Social links</h4>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {[
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.916 4.916 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>,
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.012 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.012 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.012-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.584-.071 4.85c-.055 1.17-.249 1.805-.415 2.227-.217.562-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.164-1.057.36-2.227.413-1.266.057-1.646.07-4.85.07s-3.584-.015-4.85-.071c-1.17-.055-1.805-.249-2.227-.415-.562-.217-.96-.477-1.382-.896-.419-.42-.679-.819-.896-1.381-.164-.422-.36-1.057-.413-2.227-.057-1.266-.07-1.646-.07-4.85s.016-3.584.072-4.85c.055-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.382.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.057 1.646-.07 4.85-.07zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" /></svg>
              ].map((ic, i) => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#333' }}>{ic}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: isMobile ? 'center' : 'flex-start' }}>
              <div style={badgeWrapper}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.89 1.22-2.13 1.08-3.37-1.07.04-2.36.71-3.13 1.6-.68.79-1.28 2.05-1.12 3.25 1.19.09 2.39-.55 3.17-1.48z" /></svg>
                <div style={{ textAlign: 'left', lineHeight: 1 }}>
                  <div style={{ fontSize: 8, fontWeight: 500 }}>Download on the</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>App Store</div>
                </div>
              </div>
              <div style={badgeWrapper}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M7 6.4v35.2c0 1.2 1 2.2 2.2 2.2c0.4 0 0.8-0.1 1.1-0.3l17.7-17.5L7 6.4z" />
                  <path fill="#34A853" d="M36.3 19.8l-8.3 6.2L7 6.4c0.5-0.3 1.1-0.4 1.7-0.1l27.6 13.5z" />
                  <path fill="#FBBC04" d="M41 24c0 1.2-0.7 2.3-1.8 2.9l-2.9 1.7l-8.3-8.6l8.3-6.2l2.9 1.7C40.3 21.7 41 22.8 41 24z" />
                  <path fill="#EA4335" d="M36.3 28.2L8.7 41.7c-0.6 0.3-1.2 0.2-1.7-0.1l21-19.6l8.3 6.2z" />
                </svg>
                <div style={{ textAlign: 'left', lineHeight: 1 }}>
                  <div style={{ fontSize: 8, fontWeight: 500 }}>GET IT ON</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Google Play</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>* As of December 31, 2024</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 11, color: '#999' }}>
            <span>© Copyright 2026 Slot Services Limited (formerly known as Slot-app Technologies India Limited) All rights reserved. | CIN: L74140DL2014PLC274413</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
