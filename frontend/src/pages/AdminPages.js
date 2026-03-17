import { useState, useEffect } from 'react';
import { adminAPI, servicesAPI, usersAPI, categoriesAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter',system-ui,sans-serif; background:#f8f9fa; }
  .stat-card:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(0,0,0,0.1); }
  .table-row:hover { background:#fafafa; }
  .action-btn:hover { opacity:0.85; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation:fadeIn 0.3s ease forwards; }
  input:focus,select:focus,textarea:focus { border-color:#e94560!important; outline:none; box-shadow:0 0 0 3px rgba(233,69,96,0.1); }
`;

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} className="stat-card" style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px', cursor: onClick ? 'pointer' : 'default',
      border: '1px solid #f0f0f0', transition: 'all 0.2s', borderLeft: `4px solid ${color || '#e94560'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: color || '#e94560', fontWeight: 600, marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    confirmed: { bg: '#e3f2fd', color: '#1565c0' },
    pending: { bg: '#fff3e0', color: '#e65100' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
    in_progress: { bg: '#f3e5f5', color: '#6a1b9a' },
    active: { bg: '#e8f5e9', color: '#2e7d32' },
    inactive: { bg: '#f0f0f0', color: '#888' },
    verified: { bg: '#e8f5e9', color: '#2e7d32' },
    unverified: { bg: '#fff3e0', color: '#e65100' },
    banned: { bg: '#ffebee', color: '#c62828' },
  };
  const cfg = map[status] || { bg: '#f0f0f0', color: '#888' };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── ADMIN OVERVIEW ────────────────────────────────────────────
export function AdminOverviewPage({ navigate }) {
  const [stats, setStats] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getStats(),
      fetch('/api/v1/analytics/overview?period=week').then(r => r.json()).catch(() => ({})),
      fetch('/api/v1/analytics/realtime').then(r => r.json()).catch(() => ({})),
    ]).then(([statsRes, overview, rt]) => {
      setStats(statsRes.data.stats);
      setRealtime(rt.realtime);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Poll realtime every 30s
    const interval = setInterval(() => {
      fetch('/api/v1/analytics/realtime').then(r => r.json()).then(d => setRealtime(d.realtime)).catch(() => { });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fade-in">
      <style>{css}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: -0.5 }}>Dashboard</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Welcome back, Admin 👋</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('admin-seed')}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#f0f0f0', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            🌱 Seed DB
          </button>
          <button onClick={() => navigate('admin-analytics')}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#000', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            📊 Full Analytics
          </button>
        </div>
      </div>

      {/* Realtime strip */}
      {realtime && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', borderRadius: 16, padding: '16px 24px' }}>
          {[
            { label: 'Active Jobs', value: realtime.activeBookings, icon: '⚡' },
            { label: 'Last Hour Bookings', value: realtime.newBookingsLastHour, icon: '📋' },
            { label: 'Online Professionals', value: realtime.onlineProfessionals, icon: '👷' },
            { label: "Today's Revenue", value: `₹${realtime.revenueToday?.toLocaleString() || 0}`, icon: '💰' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>{item.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{item.label}</div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#4caf50', marginRight: 6 }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>LIVE</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading stats...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard icon="👤" label="Total Users" value={stats?.users?.total?.toLocaleString() || '—'} color="#2196f3" onClick={() => navigate('admin-users')} />
          <StatCard icon="📋" label="Total Bookings" value={stats?.bookings?.total?.toLocaleString() || '—'} color="#e94560" onClick={() => navigate('admin-bookings')} />
          <StatCard icon="✅" label="Completed" value={stats?.bookings?.completed?.toLocaleString() || '—'} color="#4caf50" sub={`${stats?.bookings?.completionRate || '—'} rate`} />
          <StatCard icon="💰" label="Total Revenue" value={`₹${((stats?.revenue?.total || 0) / 100000).toFixed(1)}L`} color="#ff9800" />
          <StatCard icon="🔧" label="Active Services" value={stats?.services?.active?.toLocaleString() || '—'} color="#9c27b0" onClick={() => navigate('admin-services')} />
          <StatCard icon="👷" label="Professionals" value={stats?.professionals?.total?.toLocaleString() || '—'} color="#00bcd4" onClick={() => navigate('admin-professionals')} />
        </div>
      )}

      {/* Quick actions */}
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1a1a2e' }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
        {[
          { icon: '👥', label: 'Manage Users', page: 'admin-users' },
          { icon: '📋', label: 'All Bookings', page: 'admin-bookings' },
          { icon: '🔧', label: 'Manage Services', page: 'admin-services' },
          { icon: '🎟️', label: 'Coupons', page: 'admin-coupons' },
          { icon: '👷', label: 'Verify Pros', page: 'admin-professionals' },
          { icon: '📊', label: 'Analytics', page: 'admin-analytics' },
          { icon: '💬', label: 'Notifications', page: 'admin-notifications' },
          { icon: '🛒', label: 'View Cart', page: 'cart' },
          { icon: '⚙️', label: 'App Settings', page: 'admin-settings' },
        ].map(item => (
          <div key={item.page} onClick={() => navigate(item.page)}
            style={{
              background: '#fff', borderRadius: 16, padding: 20, cursor: 'pointer', border: '1px solid #f0f0f0',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.background = '#f9f9f9'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.background = '#fff'; }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#000' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN USERS ───────────────────────────────────────────────
export function AdminUsersPage() {
  const { showToast } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadUsers(); }, [search, role, page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ search, role: role !== 'all' ? role : undefined, page, limit: 20 });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch { } finally { setLoading(false); }
  };

  const handleBan = async (userId, currentStatus) => {
    try {
      await adminAPI.banUser(userId, { ban: currentStatus !== 'banned' });
      showToast(`User ${currentStatus === 'banned' ? 'unbanned' : 'banned'}`, 'success');
      loadUsers();
    } catch { showToast('Action failed', 'error'); }
  };

  return (
    <div className="fade-in">
      <style>{css}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e' }}>Users <span style={{ color: '#888', fontWeight: 400, fontSize: 18 }}>({total.toLocaleString()})</span></h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
          style={{ flex: 1, padding: '11px 16px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: '11px 16px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }}>
          {['all', 'customer', 'professional', 'admin', 'corporate_admin'].map(r => (
            <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #f0f0f0' }}>
              {['User', 'Phone', 'Role', 'Joined', 'Bookings', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u._id} className="table-row" style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e94560', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || '—'}</div>
                        {u.email && <div style={{ fontSize: 12, color: '#888' }}>{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14 }}>{u.phone}</td>
                  <td style={{ padding: '14px 16px' }}><Badge status={u.role} /></td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#888' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{u.totalBookings || 0}</td>
                  <td style={{ padding: '14px 16px' }}><Badge status={u.status || 'active'} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => handleBan(u._id, u.status)} className="action-btn"
                      style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${u.status === 'banned' ? '#4caf50' : '#f44336'}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: u.status === 'banned' ? '#4caf50' : '#f44336' }}>
                      {u.status === 'banned' ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        {Array.from({ length: Math.min(Math.ceil(total / 20), 10) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setPage(p)}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid', borderColor: page === p ? '#e94560' : '#e8e8e8', background: page === p ? '#e94560' : '#fff', color: page === p ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN BOOKINGS ─────────────────────────────────────────────
export function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadBookings(); }, [status, page]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getBookings({ status: status !== 'all' ? status : undefined, page, limit: 20 });
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
    } catch { } finally { setLoading(false); }
  };

  const STATUS_TABS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="fade-in">
      <style>{css}</style>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', marginBottom: 20 }}>
        Bookings <span style={{ color: '#888', fontWeight: 400, fontSize: 18 }}>({total.toLocaleString()})</span>
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
              background: status === s ? '#e94560' : '#fff', color: status === s ? '#fff' : '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #f0f0f0' }}>
              {['Booking ID', 'Service', 'Customer', 'Date', 'Amount', 'Status', 'Pro'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
            ) : bookings.map(b => (
              <tr key={b._id} className="table-row" style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'monospace', color: '#e94560', fontWeight: 700 }}>{b.bookingId}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{b.service?.icon || '🔧'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{b.service?.name || '—'}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{b.customer?.name || '—'}<br /><span style={{ color: '#888', fontSize: 11 }}>{b.customer?.phone}</span></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#555' }}>
                  {new Date(b.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}<br />
                  <span style={{ color: '#888', fontSize: 11 }}>{b.scheduledTime}</span>
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14 }}>₹{b.pricing?.totalAmount || 0}</td>
                <td style={{ padding: '14px 16px' }}><Badge status={b.status} /></td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{b.professional?.user?.name || <span style={{ color: '#ccc' }}>Unassigned</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ADMIN COUPONS ─────────────────────────────────────────────
export function AdminCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: 20, maxDiscountAmount: 200, minOrderAmount: 299, usageLimit: 1000, expiresAt: '' });

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getCoupons();
      setCoupons(data.coupons || []);
    } catch { } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.expiresAt) { showToast('Code and expiry required', 'error'); return; }
    try {
      await adminAPI.createCoupon(form);
      showToast('Coupon created!', 'success');
      setCreating(false);
      setForm({ code: '', type: 'percentage', value: 20, maxDiscountAmount: 200, minOrderAmount: 299, usageLimit: 1000, expiresAt: '' });
      loadCoupons();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await adminAPI.updateCoupon(id, { isActive: !isActive });
      showToast(`Coupon ${!isActive ? 'activated' : 'deactivated'}`, 'success');
      loadCoupons();
    } catch { showToast('Failed', 'error'); }
  };

  const inputStyle = { width: '100%', padding: '11px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' };

  return (
    <div className="fade-in">
      <style>{css}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e' }}>Coupons</h1>
        <button onClick={() => setCreating(v => !v)}
          style={{ padding: '10px 24px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          {creating ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #f0f0f0', marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Create New Coupon</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>CODE *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MKWELCOME" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>TYPE</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>VALUE</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>MAX DISCOUNT (₹)</label>
              <input type="number" value={form.maxDiscountAmount} onChange={e => setForm(f => ({ ...f, maxDiscountAmount: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>MIN ORDER (₹)</label>
              <input type="number" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>USAGE LIMIT</label>
              <input type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>EXPIRES AT *</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <button onClick={handleCreate}
            style={{ marginTop: 16, padding: '12px 32px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            Create Coupon
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #f0f0f0' }}>
              {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expiry', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading...</td></tr>
            ) : coupons.map(c => (
              <tr key={c._id} className="table-row" style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#e94560', fontSize: 15 }}>{c.code}</td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{c.type}</td>
                <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14 }}>
                  {c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                  {c.maxDiscountAmount && <span style={{ fontSize: 11, color: '#888', display: 'block' }}>max ₹{c.maxDiscountAmount}</span>}
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>₹{c.minOrderAmount || 0}</td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{c.usedCount || 0} / {c.usageLimit}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#888' }}>
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                </td>
                <td style={{ padding: '14px 16px' }}><Badge status={c.isActive ? 'active' : 'inactive'} /></td>
                <td style={{ padding: '14px 16px' }}>
                  <button onClick={() => handleToggle(c._id, c.isActive)} className="action-btn"
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid', borderColor: c.isActive ? '#f44336' : '#4caf50', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: c.isActive ? '#f44336' : '#4caf50' }}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
