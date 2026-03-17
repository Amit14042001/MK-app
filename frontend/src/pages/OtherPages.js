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

  const STATUS_STEPS = [
    { status: 'confirmed', label: 'Booking Confirmed', icon: '✅', desc: 'Your booking is confirmed' },
    { status: 'professional_assigned', label: 'Professional Assigned', icon: '👷', desc: 'Expert assigned to your booking' },
    { status: 'professional_arriving', label: 'On The Way', icon: '🚗', desc: 'Professional is heading to you' },
    { status: 'professional_arrived', label: 'Arrived', icon: '🏠', desc: 'Professional has arrived' },
    { status: 'in_progress', label: 'In Progress', icon: '⚡', desc: 'Service is underway' },
    { status: 'completed', label: 'Completed', icon: '🎉', desc: 'Service completed!' },
  ];

  const statusOrder = STATUS_STEPS.map(s => s.status);

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
    } catch {} finally { setLoading(false); }
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !socket) return;
    socket.emit('send_message', { bookingId, senderId: 'customer', senderType: 'customer', message: msgInput });
    setMessages(prev => [...prev, { senderType: 'customer', message: msgInput, timestamp: new Date() }]);
    setMsgInput('');
  };

  const currentStatusIdx = tracking ? statusOrder.indexOf(tracking.status) : 0;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => navigate('my-bookings')}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Bookings
        </button>

        {/* Status Banner */}
        <div style={{
          background: tracking?.status === 'completed'
            ? 'linear-gradient(135deg, #2e7d32, #388e3c)'
            : 'linear-gradient(135deg, #1a1a2e, #0f3460)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: '#fff',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {STATUS_STEPS.find(s => s.status === tracking?.status)?.icon || '📋'}
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            {STATUS_STEPS.find(s => s.status === tracking?.status)?.label || 'Processing...'}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Booking ID: <strong style={{ color: '#fff' }}>{tracking?.bookingId || bookingId}</strong>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Timeline */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f0f0f0' }}>
            <h3 style={{ fontWeight: 800, marginBottom: 20, color: '#1a1a2e' }}>Live Tracking</h3>

            {/* Map placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', borderRadius: 14,
              height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 6, marginBottom: 20,
            }}>
              <span style={{ fontSize: 36 }}>🗺️</span>
              <div style={{ fontWeight: 600, color: '#1565c0', fontSize: 14 }}>Live Map</div>
              <div style={{ fontSize: 12, color: '#1976d2' }}>Professional en route</div>
            </div>

            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStatusIdx;
              const active = i === currentStatusIdx;
              return (
                <div key={step.status} style={{ display: 'flex', gap: 14, marginBottom: i < STATUS_STEPS.length - 1 ? 4 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? (active ? '#e94560' : '#4caf50') : '#f0f0f0',
                      boxShadow: active ? '0 0 0 4px rgba(233,69,96,0.2)' : 'none',
                      transition: 'all 0.5s',
                    }}>{done ? step.icon : <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ddd' }} />}</div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ width: 2, height: 28, background: done && i < currentStatusIdx ? '#4caf50' : '#f0f0f0', transition: 'all 0.5s' }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 8, paddingBottom: i < STATUS_STEPS.length - 1 ? 8 : 0 }}>
                    <div style={{ fontWeight: active ? 700 : 500, fontSize: 14, color: done ? '#1a1a2e' : '#bbb' }}>{step.label}</div>
                    {active && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{step.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Professional card + Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pro Card */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontWeight: 800, marginBottom: 16, color: '#1a1a2e', fontSize: 16 }}>Your Professional</h3>
              {tracking?.professional ? (
                <div>
                    <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>
                      {tracking.professional.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{tracking.professional.name || 'Professional'}</div>
                      <div style={{ color: '#f5a623' }}>{'★'.repeat(Math.floor(tracking.professional.rating || 4))} {tracking.professional.rating || 4.9}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{tracking.professional.totalBookings?.toLocaleString()} bookings</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <a href={`tel:+91${tracking.professional.phone}`}
                      style={{ flex: 1, background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      📞 Call
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '16px 0', fontSize: 14 }}>Assigning a professional...</div>
              )}
            </div>

            {/* Chat */}
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f5f5f5', fontWeight: 700, fontSize: 15 }}>💬 Chat</div>
              <div style={{ height: 160, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#ddd', marginTop: 40, fontSize: 13 }}>No messages yet</div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.senderType === 'customer' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ background: m.senderType === 'customer' ? '#e94560' : '#f0f0f0', color: m.senderType === 'customer' ? '#fff' : '#333', padding: '8px 12px', borderRadius: 12, fontSize: 13, maxWidth: '80%' }}>
                        {m.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f5f5f5', display: 'flex', gap: 8 }}>
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e8e8e8', borderRadius: 20, fontSize: 13, outline: 'none' }} />
                <button onClick={sendMessage}
                  style={{ background: '#e94560', color: '#fff', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>➤</button>
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
  const { bookingsAPI } = require('../utils/api');

  useEffect(() => { if (user) loadBookings(); }, [user, filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await bookingsAPI.getAll(params);
      setBookings(data.bookings || []);
    } catch {} finally { setLoading(false); }
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

  if (!user) return <div style={{ padding: 80, textAlign: 'center' }}>Please login to view bookings</div>;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>My Bookings</h1>
        <p style={{ color: '#888', marginBottom: 28 }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: filter === f ? '#e94560' : '#fff',
                color: filter === f ? '#fff' : '#555',
                textTransform: 'capitalize', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>{f.replace('_', ' ')}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
            <h3 style={{ color: '#1a1a2e', fontWeight: 800 }}>No bookings found</h3>
            <button onClick={() => navigate('services')}
              style={{ background: '#e94560', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 24, cursor: 'pointer', fontWeight: 700, marginTop: 16 }}>
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
              <div key={b._id} style={{ background: '#fff', borderRadius: 20, padding: 22, marginBottom: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 36 }}>{b.service?.icon || '🔧'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>{b.service?.name || 'Service'}</div>
                      {b.subService?.name && <div style={{ fontSize: 13, color: '#888' }}>{b.subService.name}</div>}
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{b.bookingId}</div>
                    </div>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#888', marginBottom: 14, flexWrap: 'wrap' }}>
                  <span>📅 {new Date(b.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>⏰ {b.scheduledTime}</span>
                  <span>💰 ₹{b.pricing?.totalAmount}</span>
                  {b.professional?.user?.name && <span>👷 {b.professional.user.name}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('booking-detail', { bookingId: b._id })}
                    style={{ padding: '9px 18px', background: '#f8f9fa', color: '#333', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    View Details
                  </button>
                  {canTrack && (
                    <button onClick={() => navigate('tracking', { bookingId: b._id })}
                      style={{ padding: '9px 18px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      📍 Track
                    </button>
                  )}
                  {canReview && (
                    <button onClick={() => navigate('review', { bookingId: b._id })}
                      style={{ padding: '9px 18px', background: '#fff3e0', color: '#e65100', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      ⭐ Rate
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => handleCancel(b._id)}
                      style={{ padding: '9px 18px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
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
  const taxes = Math.round(cartTotal * 0.18);
  const total = cartTotal + taxes;

  if (cart.length === 0) return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
      <h2 style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Your cart is empty</h2>
      <p style={{ color: '#888', marginBottom: 24 }}>Add services to get started</p>
      <button onClick={() => navigate('services')}
        style={{ background: '#e94560', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 24, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>Explore Services</button>
    </div>
  );

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 32 }}>Cart ({cart.length})</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          <div>
            {cart.map(item => (
              <div key={item.cartId} style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, border: '1px solid #f0f0f0', display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 40 }}>{item.serviceIcon || '🔧'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{item.serviceName}</div>
                  {item.subServiceName && <div style={{ fontSize: 13, color: '#888' }}>{item.subServiceName}</div>}
                  {item.date && <div style={{ fontSize: 13, color: '#4caf50', marginTop: 4 }}>📅 {item.date} · {item.time}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>₹{item.price}</div>
                  <button onClick={() => removeFromCart(item.cartId)}
                    style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, marginTop: 6 }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f0f0f0' }}>
              <h3 style={{ fontWeight: 800, marginBottom: 18 }}>Order Summary</h3>
              {[['Subtotal', cartTotal], ['GST (18%)', taxes]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: '#555' }}><span>{l}</span><span>₹{v}</span></div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
                <span>Total</span><span style={{ color: '#e94560' }}>₹{total}</span>
              </div>
              <button onClick={() => user ? navigate('checkout') : navigate('login')}
                style={{ width: '100%', marginTop: 18, background: 'linear-gradient(135deg, #e94560, #c0392b)', color: '#fff', border: 'none', padding: '15px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, boxShadow: '0 6px 20px rgba(233,69,96,0.3)' }}>
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
  return (
    <footer style={{ background: '#1a1a2e', color: '#9ba8c0', padding: '60px 24px 32px', marginTop: 80 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1a1a2e, #e94560)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 17, border: '1.5px solid rgba(255,255,255,0.1)' }}>MK</div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>MK</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: '0 0 16px' }}>India's most trusted home services platform. Professional, verified & guaranteed.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['📘', '🐦', '📸', '▶️'].map((ic, i) => (
                <div key={i} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{ic}</div>
              ))}
            </div>
          </div>
          {[
            { title: 'Services', items: ['AC Service', 'Cleaning', 'Salon for Women', 'Salon for Men', 'Car Battery', 'Jump Start', 'Oil Change'] },
            { title: 'Company', items: ['About Us', 'Careers', 'Blog', 'Partner With Us', 'Press'] },
            { title: 'Support', items: ['Help Center', 'Contact Us', 'Privacy Policy', 'Terms of Service', 'Cancellation Policy'] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ color: '#fff', marginBottom: 16, fontWeight: 700, fontSize: 15 }}>{col.title}</h4>
              {col.items.map(item => (
                <div key={item} style={{ fontSize: 14, marginBottom: 10, cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#e94560'}
                  onMouseLeave={e => e.target.style.color = '#9ba8c0'}>{item}</div>
              ))}
            </div>
          ))}
          <div>
            <h4 style={{ color: '#fff', marginBottom: 16, fontWeight: 700, fontSize: 15 }}>Download App</h4>
            {[['🍎', 'App Store'], ['🤖', 'Google Play']].map(([ic, nm]) => (
              <div key={nm} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.07)', padding: '10px 14px', borderRadius: 10, marginBottom: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 22 }}>{ic}</span>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Download on</div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{nm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
          <span>© 2026 MK Technologies Pvt. Ltd. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune'].map(c => (
              <span key={c} style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.color = '#e94560'}
                onMouseLeave={e => e.target.style.color = '#9ba8c0'}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
