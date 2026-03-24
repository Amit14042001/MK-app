import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { servicesAPI, categoriesAPI } from '../utils/api';
import { Spinner } from './UI';

const CITIES = [
  { name: 'Hyderabad' }, { name: 'Bangalore' }, { name: 'Mumbai' },
  { name: 'Delhi' }, { name: 'Chennai' }, { name: 'Pune' },
  { name: 'Kolkata' }, { name: 'Ahmedabad' }, { name: 'Jaipur' },
  { name: 'Bhubaneswar' }, { name: 'Berhampur' },
];

const NAV_ITEMS = [
  { label: 'Home', page: 'home' },
  { label: 'Services', page: 'services' },
  { label: 'Automotive', page: 'automotive', isNew: true },
  { label: 'Store', page: 'store', isNew: true },
  { label: 'Bundle Plans', page: 'bundle-builder' },
  { label: 'Become a Pro', page: 'become-pro' },
];

const POPULAR_SEARCHES = ['AC Repair', 'Deep Cleaning', 'Car Battery', 'Salon at Home', 'Electrician', 'Plumber'];

export default function Navbar({ navigate, currentPage }) {
  const { user, cartCount, unreadCount, selectedCity, setSelectedCity, logout } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await servicesAPI.search(searchQ);
        setSearchResults(data.services?.slice(0, 7) || []);
      } catch { } finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ]);

  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const openSearch = () => { setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 30); };

  const handleSelect = (s) => {
    setSearchOpen(false); setSearchQ(''); setSearchResults([]);
    navigate('service-detail', { serviceId: s.slug || s._id });
  };

  const iconBtn = (onClick, children, badge) => (
    <button onClick={onClick} style={{ position: 'relative', width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--dur-fast)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-ink-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
      {badge > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-full)', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, border: '2px solid #fff', lineHeight: 1 }}>{badge > 9 ? '9+' : badge}</span>}
    </button>
  );

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height: 'var(--nav-height)', background: '#fff',
        borderBottom: `1px solid ${scrolled ? 'var(--color-ink-100)' : 'transparent'}`,
        boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.08)' : 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px', height: '100%', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>

          {/* ── Hamburger (Mobile Only) ── */}
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} style={{ padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-900)" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
          )}

          {/* ── Logo ── */}
          <div onClick={() => navigate('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <img src="/logo.png" alt="Slot Logo" style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: 10, objectFit: 'cover' }} />
            {!isMobile && <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-ink-900)', letterSpacing: '-0.03em', lineHeight: 1, fontWeight: 800 }}>Slot Services</span>}
          </div>

          {/* ── City ── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setCityOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', border: `1.5px solid ${cityOpen ? 'var(--color-brand)' : 'var(--color-ink-100)'}`, borderRadius: 'var(--radius-full)', background: cityOpen ? 'var(--color-brand-light)' : 'var(--color-ink-50)', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--color-ink-700)', transition: 'all 0.18s' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
              {isMobile ? selectedCity.slice(0, 3) : selectedCity}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.4, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {cityOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', zIndex: 500, border: '1px solid var(--color-ink-100)', overflow: 'hidden', minWidth: 160, animation: 'slideDown 0.18s var(--ease-out)' }}>
                {CITIES.map(c => (
                  <div key={c.name} onClick={() => { setSelectedCity(c.name); setCityOpen(false); }}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: selectedCity === c.name ? 600 : 400, color: selectedCity === c.name ? 'var(--color-brand)' : 'var(--color-ink-700)', background: selectedCity === c.name ? 'var(--color-brand-light)' : 'transparent' }}>
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Search ── */}
          <div ref={searchRef} style={{ flex: 1, position: 'relative', maxWidth: isMobile ? 'none' : 400 }}>
            <div onClick={openSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-full)', border: `2px solid ${searchOpen ? 'var(--color-brand)' : 'var(--color-ink-100)'}`, background: searchOpen ? '#fff' : 'var(--color-ink-50)', cursor: 'text', transition: 'all 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={searchOpen ? 'var(--color-brand)' : 'var(--color-ink-400)'} strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input ref={inputRef} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={isMobile ? 'Search...' : "Search services..."} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-ink-900)', width: '100%' }} />
              {searching && <Spinner size={12} />}
            </div>

            {searchOpen && (
              <div style={{ position: 'fixed', top: 'var(--nav-height)', left: isMobile ? 0 : 'auto', right: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 400, background: '#fff', boxShadow: 'var(--shadow-xl)', zIndex: 500, borderBottom: '1px solid var(--color-ink-100)', maxHeight: '70vh', overflow: 'auto', animation: 'slideDown 0.15s ease-out' }}>
                {searchQ.length >= 2 && searchResults.map(s => (
                  <div key={s._id} onClick={() => handleSelect(s)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-ink-50)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>₹{s.startingPrice} onwards</div>
                    </div>
                  </div>
                ))}
                {searchQ.length < 2 && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-300)', textTransform: 'uppercase', marginBottom: 8 }}>Popular</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {POPULAR_SEARCHES.map(s => <button key={s} onClick={() => setSearchQ(s)} style={{ padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-ink-100)', fontSize: 12 }}>{s}</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Desktop Links ── */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {NAV_ITEMS.map(item => (
                <button key={item.page} onClick={() => navigate(item.page)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13, color: currentPage === item.page ? 'var(--color-brand)' : 'var(--color-ink-600)', background: currentPage === item.page ? 'var(--color-brand-light)' : 'transparent' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Icons ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, marginLeft: isMobile ? 0 : 8 }}>
            {iconBtn(() => navigate('cart'),
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>,
              cartCount
            )}

            {user ? (
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button onClick={() => setProfileOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: '50%', background: '#000', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </button>
                {profileOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 220, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-ink-100)', zIndex: 600 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-ink-100)', fontWeight: 700 }}>{user.name}</div>
                    {user?.role === 'admin' && (
                      <div onClick={() => { navigate('admin'); setProfileOpen(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-ink-100)', cursor: 'pointer', fontWeight: 600, color: 'var(--color-brand)' }}>Admin Dashboard</div>
                    )}
                    {user?.role === 'professional' && (
                      <div onClick={() => { navigate('professional-dashboard'); setProfileOpen(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-ink-100)', cursor: 'pointer', fontWeight: 600, color: 'var(--color-brand)' }}>Pro Dashboard</div>
                    )}
                    <div onClick={() => { navigate('my-bookings'); setProfileOpen(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-ink-100)', cursor: 'pointer' }}>My Bookings</div>
                    <div onClick={() => { logout(); navigate('home'); }} style={{ padding: '12px 16px', color: 'var(--color-error)', cursor: 'pointer' }}>Sign Out</div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('login')} style={{ padding: isMobile ? '7px 14px' : '9px 20px', background: '#000', color: '#fff', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: isMobile ? 12 : 13 }}>
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Sidebar Drawer ── */}
      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: '#fff', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/logo.png" style={{ width: 32, height: 32, borderRadius: 8 }} />
                <span style={{ fontWeight: 800, fontSize: 18 }}>Slot Services</span>
              </div>
              <button onClick={() => setMenuOpen(false)} style={{ fontSize: 24 }}>×</button>
            </div>
            {NAV_ITEMS.map(item => (
              <button key={item.page} onClick={() => { navigate(item.page); setMenuOpen(false); }} style={{ textAlign: 'left', padding: '14px 0', borderBottom: '1px solid var(--color-ink-50)', fontWeight: 600, color: currentPage === item.page ? 'var(--color-brand)' : 'var(--color-ink-900)' }}>
                {item.label}
              </button>
            ))}
            {user?.role === 'admin' && <button onClick={() => { navigate('admin'); setMenuOpen(false); }} style={{ textAlign: 'left', padding: '14px 0', fontWeight: 800, color: 'var(--color-brand)' }}>Admin Panel</button>}
          </div>
        </div>
      )}

      <div style={{ height: 'var(--nav-height)' }} />
    </>
  );
}
