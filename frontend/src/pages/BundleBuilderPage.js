/**
 * Slot Web — Bundle Builder Page
 * Customer builds a personalised home maintenance plan on web.
 * Mirrors the mobile BundleBuilderScreen.
 */
import { useState, useEffect } from 'react';
import { servicesAPI } from '../utils/api';

const BILLING = [
  { key: 'monthly', label: 'Monthly', save: '10%', months: 1 },
  { key: 'quarterly', label: 'Quarterly', save: '15%', months: 3 },
  { key: 'annual', label: 'Annual', save: '20%', months: 12 },
];

const CATALOG = [
  { id: 'deep-cleaning', name: 'Deep Cleaning', icon: '🧹', price: 1299, freq: 1 },
  { id: 'ac-service', name: 'AC Service', icon: '❄️', price: 699, freq: 0.5 },
  { id: 'pest-control', name: 'Pest Control', icon: '🪲', price: 999, freq: 0.25 },
  { id: 'plumbing', name: 'Plumbing Check', icon: '🔧', price: 399, freq: 0.5 },
  { id: 'electrical', name: 'Electrical Check', icon: '⚡', price: 399, freq: 0.5 },
  { id: 'sofa-cleaning', name: 'Sofa Cleaning', icon: '🛋️', price: 799, freq: 0.25 },
  { id: 'car-wash', name: 'Car Wash', icon: '🚗', price: 299, freq: 2 },
  { id: 'salon', name: 'Salon at Home', icon: '💄', price: 499, freq: 1 },
];

const FREQS = [
  { v: 2, l: '2×/mo' },
  { v: 1, l: '1×/mo' },
  { v: 0.5, l: 'Every 2mo' },
  { v: 0.25, l: 'Every 4mo' },
];

const B = 'var(--color-brand)';
const DARK = '#1a1a2e';

export default function BundleBuilderPage({ navigate }) {
  const [selected, setSelected] = useState([]);
  const [cycle, setCycle] = useState('monthly');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [myBundles, setMyBundles] = useState([]);
  const [tab, setTab] = useState('build');

  useEffect(() => { fetchBundles(); }, []);

  const fetchBundles = async () => {
    try {
      const token = localStorage.getItem('slot_token');
      if (!token) return;
      const res = await fetch('/api/v1/subscriptions/bundles', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setMyBundles(data.bundles || []);
    } catch { }
  };

  const toggle = (svc) => setSelected(p => {
    const ex = p.find(s => s.id === svc.id);
    if (ex) return p.filter(s => s.id !== svc.id);
    return [...p, { ...svc, freq: svc.freq }];
  });

  const setFreq = (id, v) => setSelected(p => p.map(s => s.id === id ? { ...s, freq: v } : s));

  const cycleData = BILLING.find(c => c.key === cycle);
  const pct = parseFloat(cycleData.save);
  const rawMonthly = selected.reduce((s, sv) => s + sv.price * sv.freq, 0);
  const monthly = Math.round(rawMonthly * (1 - pct / 100));
  const savings = Math.round(rawMonthly * cycleData.months * (pct / 100));

  const handleSave = async () => {
    if (!selected.length) return;
    try {
      const token = localStorage.getItem('slot_token');
      const res = await fetch('/api/v1/subscriptions/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name || 'My Home Plan', billingCycle: cycle,
          services: selected.map(s => ({ serviceId: s.id, frequency: s.freq })),
        }),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); fetchBundles(); setTimeout(() => { setSaved(false); setTab('my'); }, 1500); }
    } catch { }
  };

  const cancelBundle = async (bundleId) => {
    if (!window.confirm('Cancel this home maintenance plan?')) return;
    const token = localStorage.getItem('slot_token');
    await fetch(`/api/v1/subscriptions/bundles/${bundleId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchBundles();
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 80px', fontFamily: "'DM Sans',system-ui,sans-serif", color: DARK }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 0, marginBottom: 12 }}>← Back to Home</button>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>📦 Bundle Builder</h1>
        <p style={{ color: '#666', margin: 0 }}>Build your personalised home maintenance plan — up to 20% off on regular bookings.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 28 }}>
        {[['build', '➕ Build Plan'], ['my', `📦 My Plans (${myBundles.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: tab === k ? B : '#888', borderBottom: tab === k ? `2.5px solid ${B}` : '2.5px solid transparent', fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'my' ? (
        <div>
          {!myBundles.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
              <h3 style={{ fontWeight: 700 }}>No plans yet</h3>
              <p style={{ color: '#888', marginBottom: 20 }}>Build your first home maintenance plan to get started.</p>
              <button onClick={() => setTab('build')} style={{ background: B, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Build a Plan →</button>
            </div>
          ) : myBundles.map(b => (
            <div key={b.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 16 }}>{b.name}</strong>
                <span style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Active</span>
              </div>
              <p style={{ color: B, fontWeight: 700, margin: '4px 0 12px' }}>
                {b.billingCycle} · ₹{b.finalPrice?.toLocaleString('en-IN')}/{b.billingCycle === 'monthly' ? 'month' : b.billingCycle === 'quarterly' ? 'quarter' : 'year'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {b.services?.map((s, i) => (
                  <span key={i} style={{ background: '#f5f5f5', borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>{s.icon} {s.name}</span>
                ))}
              </div>
              <button onClick={() => cancelBundle(b.id)} style={{ background: 'none', border: '1px solid #e24b4a', color: '#e24b4a', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel Plan</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected.length ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Left: configurator */}
          <div>
            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Home Care Plan"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
            </div>

            {/* Billing cycle */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing cycle</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {BILLING.map(c => (
                  <button key={c.key} onClick={() => setCycle(c.key)}
                    style={{ flex: 1, padding: '10px', border: `2px solid ${cycle === c.key ? B : '#e8e8e8'}`, background: cycle === c.key ? B + '10' : '#fff', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: cycle === c.key ? B : '#333' }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: cycle === c.key ? B : '#888', marginTop: 2 }}>Save {c.save}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select services</label>
              {CATALOG.map(svc => {
                const sel = selected.find(s => s.id === svc.id);
                return (
                  <div key={svc.id} style={{ background: '#fff', border: `2px solid ${sel ? B : '#eee'}`, borderRadius: 12, padding: 14, marginBottom: 8, background: sel ? B + '05' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => toggle(svc)}>
                      <div style={{ width: 22, height: 22, border: `2px solid ${sel ? B : '#ccc'}`, borderRadius: 6, background: sel ? B : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800, flexShrink: 0 }}>{sel ? '✓' : ''}</div>
                      <span style={{ fontSize: 20 }}>{svc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{svc.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>₹{svc.price} per visit</div>
                      </div>
                    </div>
                    {sel && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                        {FREQS.map(f => (
                          <button key={f.v} onClick={() => setFreq(svc.id, f.v)}
                            style={{ padding: '4px 10px', border: 'none', borderRadius: 20, background: sel.freq === f.v ? B : '#f0f0f0', color: sel.freq === f.v ? '#fff' : '#555', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {f.l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: summary card (only when services selected) */}
          {selected.length > 0 && (
            <div style={{ position: 'sticky', top: 20, background: DARK, borderRadius: 16, padding: 24, color: '#fff' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Your Plan Summary</h3>
              <div style={{ marginBottom: 12 }}>
                {selected.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'rgba(255,255,255,0.8)' }}>
                    <span>{s.icon} {s.name}</span>
                    <span>₹{Math.round(s.price * s.freq * cycleData.months).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                  <span>Discount ({pct}%)</span>
                  <span>- ₹{savings.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 800, color: B, marginTop: 8 }}>
                  <span>₹{monthly.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 400, alignSelf: 'flex-end' }}>/month</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  Billed {cycle === 'monthly' ? 'monthly' : `₹${Math.round(monthly * cycleData.months).toLocaleString('en-IN')} per ${cycleData.key}`}
                </div>
              </div>
              <button onClick={handleSave} disabled={saved}
                style={{ width: '100%', padding: 14, background: saved ? '#27ae60' : B, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: saved ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                {saved ? '✅ Plan Created!' : 'Create My Plan →'}
              </button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '10px 0 0' }}>
                🔒 Price locked in. Cancel anytime.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
