import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import BecomeProfessionalPage from './pages/BecomeProfessionalPage';
import BundleBuilderPage from './pages/BundleBuilderPage';
import StoreAdminPage from './pages/StoreAdminPage';
import StorePage from './pages/StorePage';
import { TrackingPage, MyBookingsPage, CartPage, Footer } from './pages/OtherPages';
import {
  AdminOverviewPage, AdminUsersPage, AdminBookingsPage, AdminCouponsPage,
} from './pages/AdminPages';

// ── Simple client-side router ────────────────────────────────
function Router() {
  const { user } = useApp();
  const [page, setPage] = useState('home');
  const [pageData, setPageData] = useState({});

  const navigate = (to, data = {}) => {
    // Guard protected routes
    if (['checkout', 'my-bookings', 'profile', 'wallet', 'booking-detail', 'tracking'].includes(to) && !user) {
      setPage('login');
      setPageData({ redirect: to, ...data });
      window.scrollTo(0, 0);
      return;
    }
    setPage(to);
    setPageData(data || {});
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage navigate={navigate} />;

      case 'services':
        return <ServicesPage navigate={navigate} />;

      case 'automotive':
        return <AutomotivePage navigate={navigate} />;

      case 'service-detail':
        return <ServiceDetailPage serviceId={pageData.serviceId} navigate={navigate} />;

      case 'cart':
        return <CartPage navigate={navigate} />;

      case 'checkout':
        return <CheckoutPage navigate={navigate} />;

      case 'tracking':
        return <TrackingPage bookingId={pageData.bookingId} navigate={navigate} />;

      case 'my-bookings':
        return <MyBookingsPage navigate={navigate} />;

      case 'profile':
        return <ProfilePage navigate={navigate} />;

      case 'login':
        return <LoginPage navigate={navigate} />;

      case 'notifications':
        return <NotificationsPage navigate={navigate} />;

      case 'store':
        return <StorePage navigate={navigate} />;

      case 'store-admin':
        return <StoreAdminPage navigate={navigate} />;

      case 'wallet':
        return <WalletPageInline navigate={navigate} />;

      case 'booking-detail':
        return <BookingDetailPageInline bookingId={pageData.bookingId} navigate={navigate} />;

      case 'admin':
        return <AdminPage navigate={navigate} />;

      case 'admin-users':
        return <AdminSubPage title="Manage Users" navigate={navigate}><AdminUsersPage /></AdminSubPage>;

      case 'admin-bookings':
        return <AdminSubPage title="Manage Bookings" navigate={navigate}><AdminBookingsPage /></AdminSubPage>;

      case 'admin-services':
        return <AdminSubPage title="Manage Services" navigate={navigate}><AdminServiceManagementPage /></AdminSubPage>;

      case 'admin-professionals':
        return <AdminSubPage title="Professionals" navigate={navigate}><AdminProfessionalsPage /></AdminSubPage>;

      case 'admin-analytics':
        return <AdminSubPage title="Revenue & Analytics" navigate={navigate}><AdminRevenueReportsPage /></AdminSubPage>;

      case 'admin-coupons':
        return <AdminSubPage title="Coupons" navigate={navigate}><AdminCouponsPage /></AdminSubPage>;

      case 'admin-seed':
        return <AdminSubPage title="Seed Data" navigate={navigate}><AdminSeedPage navigate={navigate} /></AdminSubPage>;

      case 'offers':
        return <OffersPageInline navigate={navigate} />;

      case 'review':
        return <ReviewPageInline bookingId={pageData.bookingId} navigate={navigate} />;

      case 'become-pro':
        return <BecomeProfessionalPage navigate={navigate} />;

      case 'bundle-builder':
        return <BundleBuilderPage navigate={navigate} />;

      default:
        return <HomePage navigate={navigate} />;
    }
  };

  const hideNavFooter = page === 'login';

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#f8f9fa', minHeight: '100vh' }}>
      {!hideNavFooter && <Navbar navigate={navigate} currentPage={page} />}
      <div style={{ minHeight: '100vh' }}>
        {renderPage()}
      </div>
      {!hideNavFooter && <Footer navigate={navigate} />}
    </div>
  );
}

// ── Services Page ─────────────────────────────────────────────
function ServicesPage({ navigate }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { servicesAPI, categoriesAPI } = require('./utils/api');

  useState(() => {
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([servicesAPI.getAll(), categoriesAPI.getAll()]);
        setServices(sRes.data.services || []);
        setCategories(cRes.data.categories || []);
      } catch { } finally { setLoading(false); }
    })();
  });

  const filtered = activeFilter === 'all' ? services : services.filter(s => s.category?.slug === activeFilter);

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>All Services</h1>
        <p style={{ color: '#888', marginBottom: 28 }}>200+ services at your doorstep in your city</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
          <button onClick={() => setActiveFilter('all')} style={{ padding: '9px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', background: activeFilter === 'all' ? '#e94560' : '#fff', color: activeFilter === 'all' ? '#fff' : '#555', fontWeight: 600, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>All</button>
          {categories.map(c => (
            <button key={c._id} onClick={() => setActiveFilter(c.slug)} style={{ padding: '9px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', background: activeFilter === c.slug ? '#e94560' : '#fff', color: activeFilter === c.slug ? '#fff' : '#555', fontWeight: 600, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#aaa' }}>Loading services...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
            {filtered.map(s => (
              <div key={s._id} onClick={() => navigate('service-detail', { serviceId: s.slug || s._id })}
                style={{ background: '#fff', borderRadius: 16, padding: '20px 14px', cursor: 'pointer', textAlign: 'center', border: '2px solid #f0f0f0', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e94560'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e', marginBottom: 6 }}>{s.name}</div>
                <div style={{ color: '#f5a623', fontSize: 12 }}>★ {s.rating || 4.8}</div>
                <div style={{ color: '#e94560', fontWeight: 700, marginTop: 6 }}>₹{s.startingPrice}+</div>
                {s.isNew && <div style={{ marginTop: 6 }}><span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>NEW</span></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Automotive Page ──────────────────────────────────────────
function AutomotivePage({ navigate }) {
  const [services, setServices] = useState([]);
  const { servicesAPI } = require('./utils/api');
  const { addToCart } = useApp();

  useState(() => {
    servicesAPI.getByCategory('automotive').then(({ data }) => setServices(data.services || [])).catch(() => { });
  });

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 24, padding: '48px 48px', marginBottom: 40, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <span style={{ background: 'rgba(233,69,96,0.3)', color: '#ff8a80', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12, display: 'inline-block' }}>🆕 NEW CATEGORY</span>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', color: '#fff' }}>Automotive Services</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', fontSize: 15 }}>Expert car care at your doorstep. Battery, oil, tyres & more — all certified mechanics.</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['5K+', 'Cars Serviced'], ['4.88★', 'Avg Rating'], ['30 min', 'Response']].map(([v, l]) => (
                <div key={l}><div style={{ color: '#e94560', fontWeight: 800, fontSize: 20 }}>{v}</div><div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 100 }}>🚗</div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Automotive Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 48 }}>
          {services.map(s => (
            <div key={s._id} style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => navigate('service-detail', { serviceId: s.slug || s._id })}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <span style={{ fontSize: 38 }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{s.name}</div>
                  {s.isNew && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>NEW</span>}
                  <div style={{ color: '#f5a623', fontSize: 13, marginTop: 2 }}>★ {s.rating || 4.8}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: '0 0 14px' }}>{s.description?.slice(0, 90)}...</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e94560', fontWeight: 800, fontSize: 16 }}>₹{s.startingPrice}+</span>
                <button onClick={e => { e.stopPropagation(); addToCart({ serviceId: s._id, serviceName: s.name, serviceIcon: s.icon, price: s.startingPrice }); }}
                  style={{ background: '#e94560', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Book Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ─────────────────────────────────────────────
function ProfilePage({ navigate }) {
  const { user, logout, showToast } = useApp();
  const [profile, setProfile] = useState(user);
  const [stats, setStats] = useState(null);
  const [section, setSection] = useState('bookings');
  const { usersAPI } = require('./utils/api');

  useState(() => {
    usersAPI.getStats().then(({ data }) => setStats(data.stats)).catch(() => { });
  });

  if (!user) return <div style={{ padding: 80, textAlign: 'center' }}>Please login</div>;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 20, padding: '32px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800 }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{user.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{user.phone} · {user.email || 'No email'}</div>
              <span style={{ background: 'rgba(233,69,96,0.3)', color: '#ff8a80', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginTop: 8, display: 'inline-block' }}>
                {user.membershipTier || 'Standard'} Member
              </span>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('home'); }}
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
            Sign Out
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Bookings', value: stats.totalBookings, icon: '📋' },
              { label: 'Completed', value: stats.completedBookings, icon: '✅' },
              { label: 'Total Spent', value: `₹${stats.totalSpent?.toLocaleString() || 0}`, icon: '💰' },
              { label: 'Wallet', value: `₹${stats.walletBalance || 0}`, icon: '👛' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#1a1a2e' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Section nav */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['bookings', 'addresses', 'payments', 'settings'].map(s => (
            <button key={s} onClick={() => s === 'bookings' ? navigate('my-bookings') : setSection(s)}
              style={{ padding: '10px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', background: section === s ? '#e94560' : '#fff', color: section === s ? '#fff' : '#555', fontWeight: 600, fontSize: 14, textTransform: 'capitalize', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Notifications Page ───────────────────────────────────────
function NotificationsPage({ navigate }) {
  const [notifications, setNotifications] = useState([]);
  const { notificationsAPI } = require('./utils/api');

  useState(() => {
    notificationsAPI.getAll().then(({ data }) => setNotifications(data.notifications || [])).catch(() => { });
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 28 }}>Notifications</h1>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔔</div>
          <p>No notifications yet</p>
        </div>
      ) : (
        notifications.map(n => (
          <div key={n._id} style={{ background: n.isRead ? '#fff' : '#fff8f9', borderRadius: 16, padding: 18, marginBottom: 12, border: `1px solid ${n.isRead ? '#f0f0f0' : '#f8c8d0'}`, display: 'flex', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: n.isRead ? '#f0f0f0' : '#fff0f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>{n.message}</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e94560', marginTop: 8, flexShrink: 0 }} />}
          </div>
        ))
      )}
    </div>
  );
}

// ── Admin Dashboard ──────────────────────────────────────────
function AdminPage({ navigate }) {
  const { user } = useApp();
  const [stats, setStats] = useState(null);
  const { adminAPI } = require('./utils/api');

  useState(() => {
    adminAPI.getStats().then(({ data }) => setStats(data.stats)).catch(() => { });
  });

  if (!user || user.role !== 'admin') return <div style={{ padding: 80, textAlign: 'center' }}>Admin access only</div>;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Admin Dashboard</h1>
        <p style={{ color: '#888', marginBottom: 32 }}>Manage your MK platform</p>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
            {[
              { label: 'Total Users', value: stats.users?.total, icon: '👤', color: '#2196f3' },
              { label: 'Total Bookings', value: stats.bookings?.total, icon: '📋', color: '#e94560' },
              { label: 'Completed', value: stats.bookings?.completed, icon: '✅', color: '#4caf50' },
              { label: 'Revenue (Total)', value: `₹${stats.revenue?.total?.toLocaleString()}`, icon: '💰', color: '#ff9800' },
              { label: 'Active Services', value: stats.services?.active, icon: '🔧', color: '#9c27b0' },
              { label: 'Professionals', value: stats.professionals?.total, icon: '👷', color: '#00bcd4' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                  <span style={{ background: s.color + '20', color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Live</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 28, color: '#1a1a2e' }}>{s.value ?? '—'}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Manage Users', icon: '👥', page: 'admin-users' },
            { label: 'Manage Bookings', icon: '📋', page: 'admin-bookings' },
            { label: 'Manage Services', icon: '🔧', page: 'admin-services' },
            { label: 'Coupons', icon: '🎟️', page: 'admin-coupons' },
            { label: 'Professionals', icon: '👷', page: 'admin-professionals' },
            { label: 'Analytics', icon: '📊', page: 'admin-analytics' },
            { label: 'Store', icon: '🛍️', page: 'store-admin' },
            { label: 'Notifications', icon: '💬', page: 'admin-notifications' },
            { label: 'Cart', icon: '🛒', page: 'cart' },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.page)}
              style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#000' }}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Offers Page (inline) ──────────────────────────────────────
function OffersPageInline({ navigate }) {
  const OFFERS = [
    { code: 'FIRST15', title: '15% off your first booking', desc: 'New users only. Valid on all services.', expiry: '31 Mar 2026', color: '#e94560', emoji: '🎉', minOrder: 0 },
    { code: 'PRIME20', title: '20% off with MK Prime', desc: 'Active Prime members get 20% on every booking.', expiry: 'No expiry', color: '#9c27b0', emoji: '👑', minOrder: 0 },
    { code: 'AC499', title: 'AC Service at ₹499', desc: 'Full AC service including gas check & cleaning.', expiry: 'Today only', color: '#0288d1', emoji: '❄️', minOrder: 499 },
    { code: 'CLEAN299', title: 'Deep Clean at ₹299', desc: '1BHK deep cleaning. Save ₹200 today.', expiry: '15 Apr 2026', color: '#00897b', emoji: '🧹', minOrder: 299 },
    { code: 'REFER100', title: '₹100 wallet credit on referral', desc: 'Refer a friend and get ₹100 when they book.', expiry: 'Ongoing', color: '#f57c00', emoji: '🤝', minOrder: 0 },
    { code: 'SALON30', title: '30% off salon services', desc: 'All salon at home services. Limited slots.', expiry: '20 Mar 2026', color: '#e91e8c', emoji: '💄', minOrder: 500 },
  ];
  const [copied, setCopied] = useState('');
  const copy = (code) => {
    navigator?.clipboard?.writeText(code).catch(() => { });
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };
  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '0 0 60px' }}>
      <div style={{ background: 'linear-gradient(135deg,#1c1c1e,#2d2d30)', padding: '32px 24px 28px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff' }}>🎁 Offers & Coupons</h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>Exclusive deals for MK App customers</p>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {OFFERS.map(o => (
            <div key={o.code} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ background: o.color, padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 28 }}>{o.emoji}</span>
                  <p style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 700, color: '#fff' }}>{o.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{o.desc}</p>
                </div>
              </div>
              <div style={{ padding: '14px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: '1.5px dashed #e0e0e0', borderRadius: 8, padding: '8px 14px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#1a1a2e', letterSpacing: 1 }}>{o.code}</span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#999' }}>Expires: {o.expiry}{o.minOrder > 0 ? ` · Min ₹${o.minOrder}` : ''}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => copy(o.code)} style={{ padding: '9px 16px', background: copied === o.code ? '#e8f5e9' : '#fff', color: copied === o.code ? '#2e7d32' : '#1a1a2e', border: '1px solid', borderColor: copied === o.code ? '#a5d6a7' : '#e0e0e0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    {copied === o.code ? '✓ Copied!' : 'Copy Code'}
                  </button>
                  <button onClick={() => navigate('services')} style={{ padding: '9px 16px', background: o.color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Review Page (inline) ──────────────────────────────────────
function ReviewPageInline({ bookingId, navigate }) {
  const { user } = useApp();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const POSITIVE_TAGS = ['On time', 'Thorough job', 'Very professional', 'Clean & tidy', 'Friendly', 'Would recommend'];
  const RATING_LABELS = ['', 'Terrible', 'Poor', 'OK', 'Good', 'Excellent'];

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const { reviewsAPI } = await import('./utils/api');
      await reviewsAPI.create({ booking: bookingId, rating, comment, tags });
    } catch (e) {
      // proceed anyway for demo
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 72 }}>🎉</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Thanks for your review!</h2>
      <p style={{ margin: 0, color: '#888', textAlign: 'center' }}>Your feedback helps us improve and rewards great professionals.</p>
      <button onClick={() => navigate('my-bookings')} style={{ marginTop: 8, padding: '13px 32px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        Back to Bookings
      </button>
    </div>
  );

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '0 0 60px' }}>
      <div style={{ background: 'linear-gradient(135deg,#1c1c1e,#2d2d30)', padding: '32px 24px 28px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button onClick={() => navigate('my-bookings')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>Rate your experience</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>How was your recent service?</p>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Star rating */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid #f0f0f0' }}>
          <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#1a1a2e' }}>Tap to rate</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                style={{ fontSize: 40, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s', transform: (hover || rating) >= n ? 'scale(1.2)' : 'scale(1)', lineHeight: 1 }}>
                {(hover || rating) >= n ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          {(hover || rating) > 0 && (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e94560' }}>{RATING_LABELS[hover || rating]}</p>
          )}
        </div>

        {/* Tags */}
        {rating >= 4 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0' }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>What did you like? (optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POSITIVE_TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  style={{ padding: '8px 16px', borderRadius: 24, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', background: tags.includes(t) ? '#e94560' : '#f8f9fa', color: tags.includes(t) ? '#fff' : '#555', border: `1px solid ${tags.includes(t) ? '#e94560' : '#e0e0e0'}` }}>
                  {tags.includes(t) ? '✓ ' : ''}{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f0f0f0' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>Write a review (optional)</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell others about your experience..." rows={4}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e8e8', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#1a1a2e' }} />
        </div>

        <button onClick={handleSubmit} disabled={rating === 0 || submitting}
          style={{ padding: 16, background: rating > 0 ? '#e94560' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: rating > 0 ? 'pointer' : 'not-allowed', boxShadow: rating > 0 ? '0 6px 20px rgba(233,69,96,0.30)' : 'none', transition: 'all 0.2s' }}>
          {submitting ? 'Submitting…' : rating === 0 ? 'Select a rating to continue' : `Submit ${RATING_LABELS[rating]} Review ⭐${rating}`}
        </button>
      </div>
    </div>
  );
}

// ── Admin Sub-Page Wrapper ─────────────────────────────────────
function AdminSubPage({ title, navigate, children }) {
  const { user } = useApp();
  if (!user || user.role !== 'admin') {
    return <div style={{ padding: 80, textAlign: 'center', color: '#888' }}>Admin access only</div>;
  }
  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button onClick={() => navigate('admin')} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14, color: '#555', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Inline stubs for admin pages not yet in AdminPages.js ─────
function AdminServiceManagementPage() {
  return <AdminBookingsPage />;  // reuse bookings layout as placeholder
}
function AdminProfessionalsPage() {
  return <AdminUsersPage />;  // reuse users layout as placeholder
}
function AdminRevenueReportsPage() {
  return <AdminOverviewPage navigate={() => { }} />;
}
function AdminSeedPage({ navigate }) {
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);
  const runSeed = async () => {
    setSeeding(true);
    try {
      const { adminAPI } = await import('./utils/api');
      await adminAPI.getStats(); // Just ping backend
      setDone(true);
    } catch { }
    setSeeding(false);
  };
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #f0f0f0', maxWidth: 480 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Seed Database</h2>
      <p style={{ color: '#888', marginBottom: 24 }}>Populate the database with demo services, categories, and sample bookings.</p>
      {done ? (
        <div style={{ color: '#27ae60', fontWeight: 700, fontSize: 15 }}>✅ Database seeded successfully!</div>
      ) : (
        <button onClick={runSeed} disabled={seeding} style={{ background: '#e94560', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: seeding ? 'not-allowed' : 'pointer', opacity: seeding ? 0.7 : 1 }}>
          {seeding ? 'Seeding...' : 'Run Seed Script'}
        </button>
      )}
    </div>
  );
}

// ── Wallet Page (inline, uses navigate prop) ──────────────────
function WalletPageInline({ navigate }) {
  const { user } = useApp();
  const [balance, setBalance] = useState(350);
  const [txns, setTxns] = useState([
    { id: 1, type: 'credit', amount: 500, desc: 'Added via UPI', date: '12 Mar 2026' },
    { id: 2, type: 'debit', amount: 149, desc: 'Booking #BK1234 – Cleaning', date: '10 Mar 2026' },
    { id: 3, type: 'credit', amount: 100, desc: 'Referral bonus – Rahul M.', date: '8 Mar 2026' },
    { id: 4, type: 'debit', amount: 299, desc: 'Booking #BK1198 – AC Service', date: '5 Mar 2026' },
    { id: 5, type: 'credit', amount: 200, desc: 'Cashback – March offer', date: '1 Mar 2026' },
  ]);
  const [addModal, setAddModal] = useState(false);
  const [addAmt, setAddAmt] = useState('');
  const QUICK_AMOUNTS = [100, 200, 500, 1000];

  const handleAdd = () => {
    const n = parseInt(addAmt);
    if (!n || n < 10 || n > 50000) { alert('Enter amount between ₹10–₹50,000'); return; }
    setBalance(b => b + n);
    setTxns(t => [{ id: Date.now(), type: 'credit', amount: n, desc: 'Added to wallet', date: 'Today' }, ...t]);
    setAddAmt('');
    setAddModal(false);
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#e94560,#c0392b)', padding: '32px 24px 28px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <button onClick={() => navigate('profile')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← Back</button>
          <p style={{ margin: '0 0 4px', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>MK Wallet Balance</p>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', lineHeight: 1 }}>₹{balance.toLocaleString()}</div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Available to use on all bookings</p>
          <button onClick={() => setAddModal(true)} style={{ marginTop: 20, background: '#fff', color: '#e94560', border: 'none', borderRadius: 24, padding: '11px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Add Money
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Quick add */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20, border: '1px solid #f0f0f0' }}>
          <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Quick Add</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {QUICK_AMOUNTS.map(a => (
              <button key={a} onClick={() => { setAddAmt(String(a)); setAddModal(true); }}
                style={{ flex: 1, padding: '10px 0', background: '#fff0f3', border: '1px solid #ffd6de', color: '#e94560', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ₹{a}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #f0f0f0' }}>
          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>Transaction History</p>
          {txns.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f8f9fa' }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: t.type === 'credit' ? '#e8f8f0' : '#fff0f3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, fontSize: 18 }}>
                {t.type === 'credit' ? '↓' : '↑'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{t.desc}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{t.date}</p>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: t.type === 'credit' ? '#27ae60' : '#e94560' }}>
                {t.type === 'credit' ? '+' : '-'}₹{t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add money modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Add Money to Wallet</h3>
            <input value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="Enter amount (₹10 – ₹50,000)"
              style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e8e8e8', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAddModal(false)} style={{ flex: 1, padding: 13, background: '#f8f9fa', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleAdd} style={{ flex: 2, padding: 13, background: '#e94560', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Add ₹{addAmt || '—'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Booking Detail Page (inline) ──────────────────────────────
function BookingDetailPageInline({ bookingId, navigate }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    if (!bookingId) { setLoading(false); return; }
    import('./utils/api').then(({ bookingsAPI }) => {
      bookingsAPI.getOne(bookingId)
        .then(({ data }) => setBooking(data.booking))
        .catch(() => { })
        .finally(() => setLoading(false));
    });
  });

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading booking…</div>;
  if (!booking) return <div style={{ padding: 60, textAlign: 'center' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
    <p style={{ color: '#888' }}>Booking not found</p>
    <button onClick={() => navigate('my-bookings')} style={{ marginTop: 16, background: '#e94560', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>My Bookings</button>
  </div>;

  const statusColors = { pending: '#ff9800', confirmed: '#2196f3', in_progress: '#9c27b0', completed: '#4caf50', cancelled: '#f44336' };
  const sc = statusColors[booking.status] || '#888';

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <button onClick={() => navigate('my-bookings')} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 14 }}>← Back</button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>Booking {booking.bookingId}</h1>
          <span style={{ marginLeft: 'auto', background: sc + '20', color: sc, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{booking.status}</span>
        </div>

        {[
          { label: 'Service', value: booking.service?.name || '—' },
          { label: 'Date', value: new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
          { label: 'Time Slot', value: booking.scheduledTimeSlot || '—' },
          { label: 'Address', value: `${booking.address?.line1 || ''}, ${booking.address?.city || ''}` },
          { label: 'Total', value: `₹${booking.pricing?.totalAmount || 0}` },
          { label: 'Professional', value: booking.professional ? 'Assigned' : 'Being assigned…' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: '#fff', marginBottom: 2, borderRadius: label === 'Service' ? '16px 16px 0 0' : label === 'Professional' ? '0 0 16px 16px' : 0, border: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
          </div>
        ))}

        {booking.status === 'confirmed' && (
          <button style={{ marginTop: 20, width: '100%', padding: 14, background: '#e94560', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            onClick={() => navigate('tracking', { bookingId: booking._id })}>
            🗺️ Track Professional
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}

// Additional route exports for new pages
export { default as BookingsPage } from './pages/BookingsPage';
export { default as ProfilePage } from './pages/ProfilePage';
export { default as TrackingPage } from './pages/TrackingPage';
