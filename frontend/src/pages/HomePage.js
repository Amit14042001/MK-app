import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { servicesAPI, categoriesAPI } from '../utils/api';
import { ServiceCard, SectionHeader, Chip, StarRating, Skeleton } from '../components/UI';

const QUICK_SEARCHES = ['AC Repair', 'Deep Cleaning', 'Electrician', 'Plumber', 'Salon at Home', 'Pest Control', 'Painting', 'Car Wash'];

function SearchBar({ navigate }) {
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState([]);
  const [open,     setOpen]    = useState(false);
  const [loading,  setLoading] = useState(false);

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
          style={{ padding: '16px 24px', background: '#e94560', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
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
            style={{ width: '100%', padding: '11px 16px', background: '#f5f5f5', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#e94560', fontWeight: 600 }}>
            See all results for "{query}" →
          </button>
        </div>
      )}
    </div>
  );
}

const HERO_SLIDES = [
  { title: 'Professional Services,', titleAccent: 'At Your Doorstep', subtitle: 'Verified experts for home, beauty & auto care across India.', cta: 'Explore Services', ctaPage: 'services', accent: '#f15c22', badge: '🔥 2-hr service available' },
  { title: 'New: Automotive', titleAccent: 'Care at Home', subtitle: 'Battery, oil change, jump start — certified mechanics at your gate.', cta: 'Explore Automotive', ctaPage: 'automotive', accent: '#0a84ff', badge: '🚗 5,000+ cars serviced' },
  { title: 'Salon & Spa', titleAccent: 'At Your Home', subtitle: 'Certified beauticians with premium products. Rated 4.9★ by 500k+ customers.', cta: 'Book Salon', ctaPage: 'services', accent: '#bf5af2', badge: '💄 Women professionals available' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', city: 'Hyderabad', service: 'Salon', rating: 5, text: 'Incredibly skilled beautician. Will book every month!', avatar: 'PS', bg: '#f15c22' },
  { name: 'Rahul Mehta', city: 'Bangalore', service: 'Car Battery', rating: 5, text: 'Battery died at midnight. MK came in 28 min. Lifesaver!', avatar: 'RM', bg: '#0a84ff' },
  { name: 'Anita K.', city: 'Mumbai', service: 'AC Service', rating: 5, text: 'AC works like new. Punctual and professional.', avatar: 'AK', bg: '#30d158' },
  { name: 'Vikram S.', city: 'Delhi', service: 'Jump Start', rating: 5, text: '7am, came in 20 mins. Fast and fairly priced.', avatar: 'VS', bg: '#bf5af2' },
  { name: 'Sneha P.', city: 'Pune', service: 'Cleaning', rating: 5, text: 'My apartment has never been this clean!', avatar: 'SP', bg: '#ff9f0a' },
];

function HeroCarousel({ navigate }) {
  const [idx, setIdx] = useState(0);
  const slide = HERO_SLIDES[idx];
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ background: 'linear-gradient(135deg, #1c1c1e 0%, #2d2d30 50%, #120808 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `${slide.accent}12`, pointerEvents: 'none', transition: 'background 0.8s' }} />
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '72px 24px 60px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, animation: 'fadeUp 0.5s var(--ease-out)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: `1px solid ${slide.accent}40`, color: '#fff', padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
              {slide.badge}
            </div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(30px, 4vw, 50px)', fontFamily: 'var(--font-display)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 4 }}>{slide.title}</h1>
            <h1 style={{ color: slide.accent, fontSize: 'clamp(30px, 4vw, 50px)', fontFamily: 'var(--font-display)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 18, transition: 'color 0.6s' }}>{slide.titleAccent}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.7, marginBottom: 30, maxWidth: 460 }}>{slide.subtitle}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(slide.ctaPage)} style={{ padding: '13px 28px', background: slide.accent, color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: `0 6px 20px ${slide.accent}50`, fontFamily: 'inherit', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                {slide.cta} →
              </button>
              <button onClick={() => navigate('services')} style={{ padding: '13px 22px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>All Services</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
            {[['11M+','Happy Customers'],['50K+','Professionals'],['4.8★','Avg Rating'],['200+','Services']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${slide.accent}18`, padding: '16px 20px', borderRadius: 'var(--radius-xl)', backdropFilter: 'blur(8px)', minWidth: 105 }}>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{v}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 36 }}>
          {HERO_SLIDES.map((_,i) => <button key={i} onClick={() => setIdx(i)} style={{ width: i===idx?24:8, height: 8, borderRadius: 'var(--radius-full)', background: i===idx?slide.accent:'rgba(255,255,255,0.25)', border:'none', cursor:'pointer', transition: 'all 0.3s', padding: 0 }} />)}
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
  const [services, setServices]     = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [selectedCity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([categoriesAPI.getAll(), servicesAPI.getFeatured(selectedCity)]);
      setCategories(cRes.data.categories || []);
      setServices(sRes.data.services || []);
    } catch {} finally { setLoading(false); }
  };

  const handleFilter = async (slug) => {
    setActiveCategory(slug);
    if (slug === 'all') { loadData(); return; }
    setLoading(true);
    try { const { data } = await servicesAPI.getAll({ category: slug }); setServices(data.services || []); } catch {} finally { setLoading(false); }
  };

  return (
    <div style={{ background: 'var(--color-ink-50)', minHeight: '100vh' }}>
      <HeroCarousel navigate={navigate} />
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 24px' }}>

        {/* Category Filter */}
        <div style={{ paddingTop: 36, paddingBottom: 4, overflowX: 'auto', display: 'flex', gap: 10 }}>
          <Chip active={activeCategory==='all'} onClick={() => handleFilter('all')} icon="🌟">All</Chip>
          {categories.map(c => <Chip key={c._id} active={activeCategory===c.slug} onClick={() => handleFilter(c.slug)} icon={c.icon}>{c.name}</Chip>)}
        </div>

        {/* Services */}
        <section style={{ paddingTop: 36, paddingBottom: 56 }}>
          <SectionHeader title={activeCategory==='all'?'Popular Services':categories.find(c=>c.slug===activeCategory)?.name||'Services'} subtitle="Verified, insured & background-checked professionals" cta="View all" onCtaClick={() => navigate('services')} />
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 16 }}>
              {Array(8).fill(0).map((_,i) => <div key={i} style={{ background:'#fff', borderRadius:'var(--radius-xl)', overflow:'hidden' }}><Skeleton height={120} style={{ borderRadius:0 }} /><div style={{ padding:'12px 14px' }}><Skeleton height={14} style={{ marginBottom:8, width:'70%' }} /><Skeleton height={12} style={{ marginBottom:8, width:'50%' }} /><Skeleton height={16} style={{ width:'40%' }} /></div></div>)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 16 }}>
              {services.map(s => <ServiceCard key={s._id} service={s} navigate={navigate} />)}
            </div>
          )}
        </section>

        {/* ── New Features: AR Try-On + MK Store ──────────────── */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* AR Beauty card */}
            <div
              onClick={() => navigate('services')}
              style={{ background:'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius:'var(--radius-2xl)', padding:'28px 24px', cursor:'pointer', position:'relative', overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform='none'}
            >
              <div style={{ position:'absolute', top:-30, right:-30, fontSize:110, opacity:0.12, userSelect:'none' }}>💄</div>
              <div style={{ fontSize:32, marginBottom:10 }}>💄</div>
              <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:'#fff' }}>AR Beauty Try-On</p>
              <p style={{ margin:'0 0 16px', fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.5 }}>Preview hair color, makeup & nails before you book</p>
              <span style={{ display:'inline-block', background:'#f15c22', color:'#fff', fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:24 }}>Try Now →</span>
            </div>
            {/* Store card */}
            <div
              onClick={() => navigate('store')}
              style={{ background:'linear-gradient(135deg,#f15c22,#d94f1a)', borderRadius:'var(--radius-2xl)', padding:'28px 24px', cursor:'pointer', position:'relative', overflow:'hidden' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform='none'}
            >
              <div style={{ position:'absolute', top:-30, right:-30, fontSize:110, opacity:0.12, userSelect:'none' }}>🛍️</div>
              <div style={{ fontSize:32, marginBottom:10 }}>🛍️</div>
              <p style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color:'#fff' }}>MK Store</p>
              <p style={{ margin:'0 0 16px', fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>Professional cleaning, beauty & home products</p>
              <span style={{ display:'inline-block', background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:24, border:'1px solid rgba(255,255,255,0.3)' }}>Shop Now →</span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section style={{ background: '#fff', borderRadius: 'var(--radius-2xl)', padding: '52px 48px', marginBottom: 56, border: '1px solid var(--color-ink-100)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 400, color: 'var(--color-ink-900)', letterSpacing: '-0.02em', marginBottom: 8 }}>How MK Works</h2>
            <p style={{ color: 'var(--color-ink-400)', fontSize: 16 }}>Quality service in 4 simple steps</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 36 }}>
            {[['📱','Choose a Service','Browse 200+ services with transparent pricing.'],['📅','Pick a Slot','Select date & time — same-day available.'],['👷','Expert Arrives','Your verified pro arrives on time, fully equipped.'],['⭐','Rate & Review','Feedback keeps our quality high.']].map(([icon,title,desc],i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-light), var(--color-brand-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 6px 20px rgba(241,92,34,0.18)' }}>{icon}</div>
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-ink-900)', marginBottom: 8 }}>{title}</div>
                <div style={{ color: 'var(--color-ink-400)', fontSize: 13, lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ marginBottom: 56 }}>
          <SectionHeader title="What Customers Say" subtitle="Trusted by 11M+ across 50+ Indian cities" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {TESTIMONIALS.map((t,i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 22, border: '1px solid var(--color-ink-100)', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{t.avatar}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div><div style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>{t.city} · {t.service}</div></div>
                </div>
                <StarRating rating={t.rating} size="xs" showCount={false} />
                <p style={{ fontSize: 13, color: 'var(--color-ink-600)', lineHeight: 1.7, marginTop: 10, fontStyle: 'italic' }}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14 }}>
            {[['🛡️','Verified Pros','Background-checked & trained'],['💰','Clear Pricing','No hidden charges, ever'],['🔄','Guarantee','Not happy? Free redo'],['📱','Live Tracking','GPS-track your expert'],['⚡','Same-Day','Book now, served today'],['⭐','4.8★ Rating','11M+ happy customers']].map(([icon,title,sub]) => (
              <div key={title} style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '16px 18px', border: '1px solid var(--color-ink-100)', display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                <div><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-ink-900)' }}>{title}</div><div style={{ fontSize: 12, color: 'var(--color-ink-400)', marginTop: 3 }}>{sub}</div></div>
              </div>
            ))}
          </div>
        </section>

        {/* App Download */}
        <div style={{ background: 'linear-gradient(135deg, #1c1c1e 0%, #2d2d30 60%, #3a1a0a 100%)', borderRadius: 'var(--radius-2xl)', padding: '52px', marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(241,92,34,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ color: 'var(--color-brand)', fontWeight: 700, fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📱 Download the App</div>
            <h2 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, marginBottom: 10, lineHeight: 1.2 }}>Book Services Anywhere</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>Real-time tracking, exclusive deals, 24/7 support in your pocket.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[['🍎','App Store'],['🤖','Google Play']].map(([ico,nm]) => (
                <div key={nm} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '11px 16px', borderRadius: 'var(--radius-xl)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
                  <span style={{ fontSize: 26 }}>{ico}</span>
                  <div><div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Download on</div><div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{nm}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 90, filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.4))' }}>📲</div>
        </div>
      </div>
    </div>
  );
}
