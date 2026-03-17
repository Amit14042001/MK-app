import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { servicesAPI, categoriesAPI } from '../utils/api';
import { Spinner } from './UI';

const CITIES = [
  { name: 'Hyderabad' }, { name: 'Bangalore' }, { name: 'Mumbai' },
  { name: 'Delhi' }, { name: 'Chennai' }, { name: 'Pune' },
  { name: 'Kolkata' }, { name: 'Ahmedabad' }, { name: 'Jaipur' },
];

const NAV_ITEMS = [
  { label: 'Home',          page: 'home' },
  { label: 'Services',      page: 'services' },
  { label: 'Automotive',    page: 'automotive', isNew: true },
  { label: 'Store',         page: 'store',      isNew: true },
  { label: 'Bundle Plans',  page: 'bundle-builder' },
  { label: 'Become a Pro',  page: 'become-pro' },
];

const POPULAR_SEARCHES = ['AC Repair', 'Deep Cleaning', 'Car Battery', 'Salon at Home', 'Electrician', 'Plumber'];

export default function Navbar({ navigate, currentPage }) {
  const { user, cartCount, unreadCount, selectedCity, setSelectedCity, logout } = useApp();
  const [scrolled, setScrolled]           = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [cityOpen, setCityOpen]           = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);

  const searchRef  = useRef(null);
  const profileRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await servicesAPI.search(searchQ);
        setSearchResults(data.services?.slice(0, 7) || []);
      } catch {} finally { setSearching(false); }
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
    <button onClick={onClick} style={{ position: 'relative', width: 44, height: 44, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background var(--dur-fast)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-ink-50)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
      {badge > 0 && <span style={{ position: 'absolute', top: 5, right: 5, background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-full)', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, border: '2px solid #fff', lineHeight: 1 }}>{badge > 9 ? '9+' : badge}</span>}
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
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* ── Logo ── */}
          <div onClick={() => navigate('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <img src="/logo.png" alt="MK Logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-ink-900)', letterSpacing: '-0.03em', lineHeight: 1, fontWeight: 800 }}>MK Services</span>
          </div>

          {/* ── City ── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setCityOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: `1.5px solid ${cityOpen ? 'var(--color-brand)' : 'var(--color-ink-100)'}`, borderRadius: 'var(--radius-full)', background: cityOpen ? 'var(--color-brand-light)' : 'var(--color-ink-50)', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--color-ink-700)', transition: 'all 0.18s', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              {selectedCity}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.4, transform: cityOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {cityOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', zIndex: 500, border: '1px solid var(--color-ink-100)', overflow: 'hidden', minWidth: 190, animation: 'slideDown 0.18s var(--ease-out)' }}>
                <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, color: 'var(--color-ink-300)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choose City</div>
                {CITIES.map(c => (
                  <div key={c.name} onClick={() => { setSelectedCity(c.name); setCityOpen(false); }}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, fontWeight: selectedCity === c.name ? 600 : 400, color: selectedCity === c.name ? 'var(--color-brand)' : 'var(--color-ink-700)', display: 'flex', justifyContent: 'space-between', background: 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-ink-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {c.name}
                    {selectedCity === c.name && <span style={{ color: 'var(--color-brand)', fontWeight: 800 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Search ── */}
          <div ref={searchRef} style={{ flex: 1, position: 'relative', maxWidth: 500 }}>
            <div onClick={openSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: `2px solid ${searchOpen ? 'var(--color-brand)' : 'var(--color-ink-100)'}`, background: searchOpen ? '#fff' : 'var(--color-ink-50)', cursor: 'text', boxShadow: searchOpen ? '0 0 0 4px rgba(241,92,34,0.09)' : 'none', transition: 'all 0.2s' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchOpen ? 'var(--color-brand)' : 'var(--color-ink-400)'} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input ref={inputRef} value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search for 'AC service', 'cleaning'…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--color-ink-900)', fontFamily: 'inherit' }} />
              {searchQ && <button onClick={() => { setSearchQ(''); setSearchResults([]); }} style={{ color: 'var(--color-ink-400)', fontSize: 19, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>×</button>}
              {searching && <Spinner size={13} />}
            </div>

            {searchOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', zIndex: 500, border: '1px solid var(--color-ink-100)', overflow: 'hidden', animation: 'slideDown 0.18s var(--ease-out)' }}>
                {searchQ.length < 2 ? (
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-ink-300)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Popular</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {POPULAR_SEARCHES.map(s => (
                        <div key={s} onClick={() => setSearchQ(s)}
                          style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'var(--color-ink-50)', border: '1.5px solid var(--color-ink-100)', fontSize: 12, cursor: 'pointer', fontWeight: 500, color: 'var(--color-ink-600)', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-brand-light)'; e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.color = 'var(--color-brand)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-ink-50)'; e.currentTarget.style.borderColor = 'var(--color-ink-100)'; e.currentTarget.style.color = 'var(--color-ink-600)'; }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length === 0 && !searching ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-400)', fontSize: 14 }}>No services found for "{searchQ}"</div>
                ) : (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-ink-300)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{searchResults.length} Results</div>
                    {searchResults.map(s => (
                      <div key={s._id} onClick={() => handleSelect(s)}
                        style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-ink-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--color-brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-ink-400)', marginTop: 1 }}>{s.category?.name} · From ₹{s.startingPrice}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#f5a623', fontWeight: 700 }}>★ {s.rating}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Nav Links ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.page} onClick={() => navigate(item.page)} style={{ position: 'relative', padding: '8px 13px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14, color: currentPage === item.page ? 'var(--color-brand)' : 'var(--color-ink-600)', background: currentPage === item.page ? 'var(--color-brand-light)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.18s' }}
                onMouseEnter={e => { if (currentPage !== item.page) { e.currentTarget.style.background = 'var(--color-ink-50)'; e.currentTarget.style.color = 'var(--color-ink-900)'; } }}
                onMouseLeave={e => { if (currentPage !== item.page) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-ink-600)'; } }}>
                {item.label}
                {item.isNew && <span style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-brand)', border: '1.5px solid #fff' }} />}
              </button>
            ))}
            {user?.role === 'admin' && (
              <button onClick={() => navigate('admin')} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 13, color: '#fff', background: '#000', border: 'none', cursor: 'pointer', transition: 'all 0.18s', marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                Admin Panel
              </button>
            )}
          </div>

          {/* ── Right Icons ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {iconBtn(() => navigate('cart'),
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
              cartCount
            )}
            {user && iconBtn(() => navigate('notifications'),
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
              unreadCount
            )}

            {user ? (
              <div ref={profileRef} style={{ position: 'relative', marginLeft: 4 }}>
                <button onClick={() => setProfileOpen(o => !o)} style={{ width: 37, height: 37, borderRadius: '50%', background: '#000', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'transform 0.2s var(--ease-spring)' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {user.name?.charAt(0).toUpperCase()}
                </button>

                {profileOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 255, background: '#fff', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-xl)', zIndex: 600, border: '1px solid var(--color-ink-100)', overflow: 'hidden', animation: 'slideDown 0.18s var(--ease-out)' }}>
                    {/* Header */}
                    <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg, var(--color-brand-light) 0%, #fff 100%)', borderBottom: '1px solid var(--color-ink-100)' }}>
                      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>{user.name?.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-ink-400)', marginTop: 1 }}>{user.phone}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--color-brand-light)', color: 'var(--color-brand)', padding: '3px 11px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
                        ⭐ {user.membershipTier || 'Standard'} Member
                      </div>
                    </div>
                    {/* Items */}
                    {[
                      { icon: '📋', label: 'My Bookings', page: 'my-bookings' },
                      { icon: '👤', label: 'My Profile', page: 'profile' },
                      { icon: '📍', label: 'Saved Addresses', page: 'addresses' },
                      { icon: '👛', label: 'Wallet & Coins', page: 'wallet' },
                      { icon: '❓', label: 'Help & Support', page: 'help' },
                    ].map(item => (
                      <div key={item.page} onClick={() => { navigate(item.page); setProfileOpen(false); }}
                        style={{ padding: '11px 18px', display: 'flex', gap: 11, alignItems: 'center', cursor: 'pointer', fontSize: 13.5, color: 'var(--color-ink-700)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-ink-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>
                        {item.label}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-200)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto' }}><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    ))}
                    {user.role === 'admin' && (
                      <div onClick={() => { navigate('admin'); setProfileOpen(false); }}
                        style={{ padding: '11px 18px', display: 'flex', gap: 11, alignItems: 'center', cursor: 'pointer', fontSize: 13.5, color: 'var(--color-brand)', transition: 'background 0.1s', borderTop: '1px solid var(--color-ink-100)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ width: 18, textAlign: 'center' }}>⚙️</span>
                        Admin Panel
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 'auto' }}><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--color-ink-100)' }}>
                      <div onClick={() => { logout(); setProfileOpen(false); navigate('home'); }}
                        style={{ padding: '12px 18px', display: 'flex', gap: 11, alignItems: 'center', cursor: 'pointer', fontSize: 13.5, color: 'var(--color-error)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-error-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span>🚪</span> Sign Out
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('login')} style={{ marginLeft: 4, padding: '9px 22px', background: '#000', color: '#fff', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}>
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </nav>
      <div style={{ height: 'var(--nav-height)' }} />
    </>
  );
}
