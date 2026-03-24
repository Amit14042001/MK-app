import { useState, useEffect } from 'react';
import { professionalsAPI } from '../utils/api';
import { useApp } from '../context/AppContext';
import { Spinner } from '../components/UI';

export default function ProfessionalDashboard({ navigate }) {
  const { user, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'earnings', 'profile'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: pData }, { data: eData }, { data: bData }] = await Promise.all([
        professionalsAPI.getMe(),
        professionalsAPI.getEarnings(),
        professionalsAPI.getMyBookings({ status: 'professional_assigned,professional_arriving,professional_arrived,in_progress' })
      ]);
      setProfile(pData.professional);
      setEarnings(eData);
      setBookings(bData.bookings || []);
    } catch (err) {
      showToast('Failed to load professional data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await professionalsAPI.updateBookingStatus(id, { status });
      showToast(`Booking updated to ${status.replace('_', ' ')}`, 'success');
      fetchData();
    } catch (err) {
      showToast('Status update failed', 'error');
    }
  };

  const handleToggleOnline = async () => {
    try {
      const { data } = await professionalsAPI.updateAvailability({ 
        isOnline: !profile?.isOnline,
        isAvailable: !profile?.isOnline 
      });
      setProfile(prev => ({ ...prev, isOnline: data.isOnline, isAvailable: data.isAvailable }));
      showToast(`You are now ${data.isOnline ? 'Online' : 'Offline'}`, 'info');
    } catch (err) {
      showToast('Offline toggle failed', 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={40} color="var(--color-brand)" />
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>Professional Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Welcome back, {user?.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button 
            onClick={handleToggleOnline}
            style={{ 
              padding: '8px 16px', 
              borderRadius: 12, 
              background: profile?.isOnline ? '#f0fdf4' : '#fef2f2', 
              color: profile?.isOnline ? '#166534' : '#991b1b',
              fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `2px solid ${profile?.isOnline ? '#bbf7d0' : '#fecaca'}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: profile?.isOnline ? '#22c55e' : '#ef4444' }} />
            {profile?.isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}
          </button>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatCard label="Pending Jobs" value={bookings.length} icon="🎯" color="#3b82f6" />
        <StatCard label="Wallet Bal" value={`₹${earnings?.walletBalance || 0}`} icon="💰" color="#10b981" />
        <StatCard label="Total Jobs" value={profile?.completedBookings || 0} icon="✅" color="#f59e0b" />
        <StatCard label="Avg Rating" value={profile?.rating || 'N/A'} icon="⭐" color="#6366f1" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        <Tab icon="📋" label="Active Jobs" active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} />
        <Tab icon="📊" label="My Earnings" active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')} />
        <Tab icon="👤" label="My Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>

      {activeTab === 'bookings' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 24, border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>😴</div>
              <h3 style={{ fontWeight: 700, color: '#475569' }}>No active bookings</h3>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>New booking assignments will appear here.</p>
            </div>
          ) : (
            bookings.map(b => (
              <BookingCard key={b._id} booking={b} onStatusUpdate={handleStatusUpdate} navigate={navigate} />
            ))
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #f1f5f9' }}>
           <h3 style={{ fontWeight: 800, marginBottom: 20 }}>Recent Earning History</h3>
           <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                   <th style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>DATE</th>
                   <th style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>SERVICE</th>
                   <th style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>AMOUNT</th>
                   <th style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>EARNED</th>
                 </tr>
               </thead>
               <tbody>
                 {earnings?.bookings?.map(b => (
                    <tr key={b._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '16px', fontSize: 13 }}>{new Date(b.scheduledDate).toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 600 }}>{b.service?.name}</td>
                      <td style={{ padding: '16px', fontSize: 14 }}>₹{b.pricing?.totalAmount}</td>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 700, color: '#10b981' }}>+₹{Math.round(b.pricing?.totalAmount * 0.8)}</td>
                    </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #f1f5f9' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
                <div>
                   <div style={{ fontWeight: 800, fontSize: 18 }}>{user?.name}</div>
                   <div style={{ color: '#64748b', fontSize: 13 }}>{user?.phone}</div>
                </div>
             </div>
             <div style={{ display: 'grid', gap: 16 }}>
                <InfoRow label="Experience" value={profile?.experience || 'N/A'} />
                <InfoRow label="Skills" value={profile?.skills?.map(s => s.name).join(', ') || 'N/A'} />
                <InfoRow label="Verification" value={profile?.verificationStatus?.toUpperCase() || 'PENDING'} />
                <InfoRow label="Commission" value={`${profile?.commissionRate}%`} />
             </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #f1f5f9' }}>
             <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Service Areas</h3>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile?.serviceAreas?.map(a => (
                   <span key={a.pincode} style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{a.area} ({a.pincode})</span>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function Tab({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ 
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 4px', border: 'none', background: 'transparent', 
      cursor: 'pointer', fontSize: 15, fontWeight: active ? 700 : 500, color: active ? 'var(--color-brand)' : '#64748b',
      borderBottom: active ? '3px solid var(--color-brand)' : '3px solid transparent', transition: 'all 0.2s', marginBottom: -2
    }}>
      <span>{icon}</span> {label}
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#0f172a' }}>{value}</span>
    </div>
  );
}

function BookingCard({ booking, onStatusUpdate, navigate }) {
  const steps = [
    { key: 'professional_assigned', label: 'Assigned', current: 'professional_assigned' },
    { key: 'professional_arriving', label: 'On Way', current: 'professional_arriving' },
    { key: 'professional_arrived', label: 'Arrived', current: 'professional_arrived' },
    { key: 'in_progress', label: 'Started', current: 'in_progress' },
    { key: 'completed', label: 'Finish', current: 'completed' },
  ];

  const currentIdx = steps.findIndex(s => s.key === booking.status);
  const nextStep = steps[currentIdx + 1];

  return (
    <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
         <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ fontSize: 32 }}>{booking.service?.icon}</div>
            <div>
               <div style={{ fontSize: 16, fontWeight: 800 }}>{booking.service?.name}</div>
               <div style={{ fontSize: 13, color: '#64748b' }}>#{booking.bookingId} • {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}</div>
            </div>
         </div>
         <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>₹{booking.pricing?.totalAmount}</div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>PAID</div>
         </div>
      </div>

      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 16, marginBottom: 20, border: '1px solid #f1f5f9' }}>
         <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
            <div>
               <div style={{ fontSize: 14, fontWeight: 700 }}>{booking.customer?.name}</div>
               <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>Call: {booking.customer?.phone}</div>
            </div>
         </div>
         <div style={{ fontSize: 13, color: '#64748b', marginTop: 10 }}>📍 {booking.address?.line1}, {booking.address?.city}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
            {steps.map((s, i) => (
              <span key={s.key} style={{ 
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: i <= currentIdx ? '#dcfce7' : '#f1f5f9',
                color: i <= currentIdx ? '#166534' : '#94a3b8'
              }}>{s.label}</span>
            ))}
         </div>
         {nextStep && (
           <button 
             onClick={() => onStatusUpdate(booking._id, nextStep.key)}
             style={{ 
               padding: '10px 20px', background: 'var(--color-brand)', color: '#fff', borderRadius: 12, 
               border: 'none', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 16
             }}>
             Mark as {nextStep.label}
           </button>
         )}
      </div>
    </div>
  );
}
