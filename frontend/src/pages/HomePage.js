import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { servicesAPI, categoriesAPI } from '../utils/api';
import { ServiceCard, SectionHeader, Chip, StarRating, Skeleton } from '../components/UI';

const QUICK_SEARCHES = ['AC Repair', 'Deep Cleaning', 'Electrician', 'Plumber', 'Salon at Home', 'Pest Control', 'Painting', 'Car Wash'];

function SearchBar({ navigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await servicesAPI.search(query);
        setResults(data.services?.slice(0, 6) || []);
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (query.trim()) navigate('services', { search: query });
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', marginTop: 28, maxWidth: 680 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search services — AC repair, salon, plumber..."
          style={{ flex: 1, padding: '16px 20px', fontSize: 15, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', color: '#1a1a2e' }}
        />
        <button type="submit"
          style={{ padding: '16px 24px', background: 'var(--color-brand)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {/* Quick search chips */}
      {!open && !query && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {QUICK_SEARCHES.map(s => (
            <button key={s} onClick={() => { setQuery(s); navigate('services', { search: s }); }}
              style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', marginTop: 4 }}>
          {results.map(svc => (
            <button key={svc._id} onClick={() => { navigate('service-detail', { serviceId: svc.slug || svc._id }); setOpen(false); setQuery(''); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f8f8'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ fontSize: 20 }}>{svc.icon || '🔧'}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{svc.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>From ₹{svc.startingPrice} · ★ {svc.rating || 4.8}</div>
              </div>
            </button>
          ))}
          <button onClick={handleSubmit}
            style={{ width: '100%', padding: '11px 16px', background: '#f5f5f5', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--color-brand)', fontWeight: 600 }}>
            See all results for "{query}" →
          </button>
        </div>
      )}
    </div>
  );
}

const HERO_SLIDES = [
  { title: 'Trusted Professional Services,', titleAccent: 'At Your Doorstep', subtitle: 'Verified experts for home, beauty & auto care across India. Premium service guaranteed.', cta: 'Explore Services', ctaPage: 'services', accent: 'var(--color-brand)', badge: '💎 Top-Rated Professionals', image: '/images/services/home-cleaning.png' },
  { title: 'Precision Automotive &', titleAccent: 'AC Care at Home', subtitle: 'Battery, oil change, jump start — certified experts at your gate with specialized tools.', cta: 'Explore Automotive', ctaPage: 'automotive', accent: 'var(--color-brand)', badge: '🛡️ 100% Genuine Spares', image: '/images/services/ac-repair.png' },
  { title: 'Elite Salon & Spa', titleAccent: 'Experience at Home', subtitle: 'Certified beauticians with premium products. Transform your space into a private salon.', cta: 'Book Salon', ctaPage: 'services', accent: 'var(--color-brand)', badge: '✨ Luxury Home Treatments', image: '/images/services/beauty-salon-women.png' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', city: 'Hyderabad', service: 'Salon', rating: 5, text: 'Incredibly skilled beautician. Will book every month!', avatar: 'PS', bg: 'var(--color-brand)' },
  { name: 'Rahul Mehta', city: 'Bangalore', service: 'Car Battery', rating: 5, text: 'Battery died at midnight. Slot came in 28 min. Lifesaver!', avatar: 'RM', bg: '#0a84ff' },
  { name: 'Anita K.', city: 'Mumbai', service: 'AC Service', rating: 5, text: 'AC works like new. Punctual and professional.', avatar: 'AK', bg: '#30d158' },
  { name: 'Vikram S.', city: 'Delhi', service: 'Jump Start', rating: 5, text: '7am, came in 20 mins. Fast and fairly priced.', avatar: 'VS', bg: '#bf5af2' },
  { name: 'Sneha P.', city: 'Pune', service: 'Cleaning', rating: 5, text: 'My apartment has never been this clean!', avatar: 'SP', bg: '#ff9f0a' },
];

function HeroCarousel({ navigate }) {
  const [idx, setIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const slide = HERO_SLIDES[idx];

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div style={{ background: 'linear-gradient(135deg, #1c1c1e 0%, #2d2d30 50%, #120808 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `${slide.accent}12`, pointerEvents: 'none', transition: 'background 0.8s' }} />
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: isMobile ? '48px 20px 48px' : '72px 24px 60px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: isMobile ? 32 : 60, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ flex: 1, minWidth: isMobile ? 'none' : 320, animation: 'fadeUp 0.5s var(--ease-out)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: `1px solid ${slide.accent}40`, color: '#fff', padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, marginBottom: 20 }}>
              {slide.badge}
            </div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? '32px' : 'clamp(36px, 4.5vw, 56px)', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 6 }}>{slide.title}</h1>
            <h1 style={{ color: slide.accent, fontSize: isMobile ? '32px' : 'clamp(36px, 4.5vw, 56px)', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 24, transition: 'color 0.6s' }}>{slide.titleAccent}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.7, marginBottom: 32, maxWidth: 480, margin: isMobile ? '0 auto 32px' : '0 0 32px' }}>{slide.subtitle}</p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', marginBottom: 32 }}>
              <button onClick={() => navigate(slide.ctaPage)} style={{ padding: '14px 32px', background: slide.accent, color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: `0 10px 30px ${slide.accent}40`, fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                {slide.cta} <span>→</span>
              </button>
              <button onClick={() => navigate('services')} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>All Services</button>
            </div>

            {!isMobile && (
              <div style={{ display: 'flex', gap: 32, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
                {[['11M+', 'Users'], ['50K+', 'Pros'], ['4.8★', 'Rating']].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{v}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1.2, position: 'relative', perspective: '1000px', display: 'flex', justifyContent: 'center' }}>
            {/* Glow Effect */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: slide.accent, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15, pointerEvents: 'none' }} />

            <img
              src={slide.image}
              alt={slide.title}
              style={{
                width: '100%',
                maxWidth: 580,
                borderRadius: '32px',
                boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'fadeUp 0.8s var(--ease-out)',
                transform: 'rotateY(-5deg) rotateX(5deg)',
                objectFit: 'cover',
                aspectRatio: '16/10'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: isMobile ? 32 : 48, justifyContent: isMobile ? 'center' : 'flex-start' }}>
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 32 : 12,
                height: 4,
                borderRadius: 4,
                background: i === idx ? slide.accent : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0
              }}
            />
          ))}
        </div>

        {/* ── Search bar ── */}
        <SearchBar navigate={navigate} />

      </div>
    </div>
  );
}

export default function HomePage({ navigate }) {
  const { selectedCity } = useApp();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => { loadData(); }, [selectedCity]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([categoriesAPI.getAll(), servicesAPI.getFeatured(selectedCity)]);
      setCategories(cRes.data.categories || []);
      setServices(sRes.data.services || []);
    } catch { } finally { setLoading(false); }
  };

  const handleFilter = async (slug) => {
    setActiveCategory(slug);
    if (slug === 'all') { loadData(); return; }
    setLoading(true);
    try { const { data } = await servicesAPI.getAll({ category: slug }); setServices(data.services || []); } catch { } finally { setLoading(false); }
  };

  return (
    <div style={{ background: 'var(--color-ink-50)', minHeight: '100vh' }}>
      <HeroCarousel navigate={navigate} />
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>

        {/* Category Filter */}
        <div style={{ paddingTop: 36, paddingBottom: 4, overflowX: 'auto', display: 'flex', gap: 10, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <Chip active={activeCategory === 'all'} onClick={() => handleFilter('all')} icon="🌟">All</Chip>
          {categories.map(c => <Chip key={c._id} active={activeCategory === c.slug} onClick={() => handleFilter(c.slug)} icon={c.icon}>{c.name}</Chip>)}
        </div>

        {/* Services */}
        <section style={{ paddingTop: 24, paddingBottom: 48 }}>
          <SectionHeader title={activeCategory === 'all' ? 'Popular Services' : categories.find(c => c.slug === activeCategory)?.name || 'Services'} subtitle="Verified experts at your gate" cta="See all" onCtaClick={() => navigate('services')} />
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: isMobile ? 12 : 16 }}>
              {Array(6).fill(0).map((_, i) => <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}><Skeleton height={120} style={{ borderRadius: 0 }} /><div style={{ padding: '12px' }}><Skeleton height={14} style={{ marginBottom: 8, width: '70%' }} /><Skeleton height={12} style={{ width: '40%' }} /></div></div>)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: isMobile ? 12 : 16 }}>
              {services.map(s => <ServiceCard key={s._id} service={s} navigate={navigate} />)}
            </div>
          )}
        </section>

        {/* ── Features Card Grid ──────────────── */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div onClick={() => navigate('services')} style={{ background: 'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius: 'var(--radius-2xl)', padding: isMobile ? '24px' : '28px 24px', cursor: 'pointer', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.1 }}>💄</div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>AR Beauty Try-On</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Preview looks before you book</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', borderBottom: '2px solid var(--color-brand)', paddingBottom: 2 }}>Try Now</span>
            </div>
            <div onClick={() => navigate('store')} style={{ background: 'linear-gradient(135deg,var(--color-brand),#d94f1a)', borderRadius: 'var(--radius-2xl)', padding: isMobile ? '24px' : '28px 24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.1 }}>🛍️</div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>Slot Store</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Shop professional products</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', borderBottom: '2px solid #fff', paddingBottom: 2 }}>Shop Now</span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section style={{ background: '#fff', borderRadius: 'var(--radius-2xl)', padding: isMobile ? '32px 24px' : '52px 48px', marginBottom: 48, border: '1px solid var(--color-ink-100)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 24 : 32, textAlign: 'center', marginBottom: isMobile ? 32 : 44 }}>How Slot Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 32 }}>
            {[['📱', 'Choose a Service', 'Browse 200+ services'], ['📅', 'Pick a Slot', 'Select date & time'], ['👷', 'Expert Arrives', 'Verified pro at door'], ['⭐', 'Rate Pro', 'Feedback matters']].map(([icon, title, desc], i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{title}</div>
                <div style={{ color: 'var(--color-ink-400)', fontSize: 13 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* App Download */}
        <div style={{ background: 'linear-gradient(135deg, #1c1c1e, #2d2d30)', borderRadius: 'var(--radius-2xl)', padding: isMobile ? '32px 24px' : '48px 64px', marginBottom: 56, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 48, alignItems: 'center', textAlign: isMobile ? 'center' : 'left', overflow: 'hidden' }}>
          <div style={{ flex: 1.2 }}>
            <h2 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: isMobile ? 24 : 36, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Book Anytime, Anywhere</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32, fontSize: 16, lineHeight: 1.6 }}>Get the Slot App for real-time tracking, exclusive deals & 24/7 priority support. Experience professional services at your fingertips.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
              <button style={{ padding: '12px 24px', borderRadius: 12, background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.89 1.22-2.13 1.08-3.37-1.07.04-2.36.71-3.13 1.6-.68.79-1.28 2.05-1.12 3.25 1.19.09 2.39-.55 3.17-1.48z" /></svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9 }}>Download on</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>App Store</div>
                </div>
              </button>
              <button style={{ padding: '12px 24px', borderRadius: 12, background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M7 6.4v35.2c0 1.2 1 2.2 2.2 2.2c0.4 0 0.8-0.1 1.1-0.3l17.7-17.5L7 6.4z" /><path fill="#34A853" d="M36.3 19.8l-8.3 6.2L7 6.4c0.5-0.3 1.1-0.4 1.7-0.1l27.6 13.5z" /><path fill="#FBBC04" d="M41 24c0 1.2-0.7 2.3-1.8 2.9l-2.9 1.7l-8.3-8.6l8.3-6.2l2.9 1.7C40.3 21.7 41 22.8 41 24z" /><path fill="#EA4335" d="M36.3 28.2L8.7 41.7c-0.6 0.3-1.2 0.2-1.7-0.1l21-19.6l8.3 6.2z" /></svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9 }}>GET IT ON</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Google Play</div>
                </div>
              </button>
            </div>
          </div>
          <div style={{ flex: 0.8, display: 'flex', justifyContent: 'center' }}>
            <img src="/assets/banners/app_mockup.png" alt="App Download" style={{ width: '100%', maxWidth: 320, borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
