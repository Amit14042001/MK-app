/**
 * Slot App — Become a Professional Landing Page
 * UC equivalent: /become-a-pro
 * Earnings calculator, benefits, how it works, FAQ, registration CTA
 */
import { useState } from 'react';

const BRAND = 'var(--color-brand)';
const DARK = '#1a1a2e';
const LIGHT = '#f8f9fa';

const BENEFITS = [
  { icon: '💰', title: 'Earn ₹40,000–₹80,000/month', desc: 'Top professionals earn over ₹1 lakh. You set your own schedule.' },
  { icon: '📅', title: 'Work when you want', desc: 'Full flexibility. Choose your days, hours, and service area.' },
  { icon: '🎓', title: 'Free training & certification', desc: 'Learn from industry experts. Get certified. Earn more.' },
  { icon: '🛡️', title: 'Insurance & safety', desc: 'Every job is insured. Emergency SOS on the app. We have your back.' },
  { icon: '📱', title: 'Dedicated pro app', desc: 'Manage jobs, earnings, and schedule from one powerful app.' },
  { icon: '🏆', title: 'Performance rewards', desc: 'Top pros get bonuses, priority jobs, and Platinum tier perks.' },
];

const STEPS = [
  { num: 1, title: 'Apply online', desc: 'Fill in your details and skills. Takes 5 minutes.' },
  { num: 2, title: 'Submit documents', desc: 'Aadhaar, PAN, and skill certificate. All done in-app.' },
  { num: 3, title: 'Complete training', desc: 'Watch our free video training and pass the skill test.' },
  { num: 4, title: 'Start earning', desc: 'Get verified in 2–3 days and start receiving bookings.' },
];

const CATEGORIES = [
  { icon: '❄️', name: 'AC & Appliances', avg: '₹52,000' },
  { icon: '💄', name: 'Salon & Beauty', avg: '₹38,000' },
  { icon: '🧹', name: 'Home Cleaning', avg: '₹34,000' },
  { icon: '🔌', name: 'Electrician', avg: '₹48,000' },
  { icon: '🚰', name: 'Plumbing', avg: '₹44,000' },
  { icon: '🖌️', name: 'Painting', avg: '₹56,000' },
  { icon: '🚗', name: 'Automotive', avg: '₹46,000' },
  { icon: '💆', name: 'Massage & Spa', avg: '₹42,000' },
];

const FAQS = [
  { q: 'Do I need prior experience?', a: 'Basic skill is required, but we offer free training to upskill you for certification. Most pros reach full earning potential within 30 days.' },
  { q: 'How do I get paid?', a: 'Earnings are credited to your bank account every week. Minimum payout is ₹100. No delays — transparent real-time earnings tracking in the app.' },
  { q: 'What documents do I need?', a: 'Aadhaar card, PAN card, a recent selfie, and your bank account details. Skill certificates are a plus but not mandatory.' },
  { q: 'Can I work part-time?', a: 'Absolutely. Many Slot professionals work part-time alongside other jobs. You control your availability in the app.' },
  { q: 'Is there a joining fee?', a: 'Zero joining fee. No subscription, no commissions on training. We only earn when you earn — 20% platform fee on each completed job.' },
  { q: 'What if a customer cancels?', a: 'If a customer cancels within 2 hours of your arrival, you are paid a cancellation compensation.' },
];

export default function BecomeProfessionalPage({ navigate }) {
  const [jobs, setJobs] = useState(20);
  const [rate, setRate] = useState(499);
  const [form, setForm] = useState({ name: '', phone: '', city: '', skill: '' });
  const [submitted, setSubmit] = useState(false);
  const [openFaq, setFaq] = useState(null);

  const monthlyEst = Math.round(jobs * rate * 0.80);   // 80% after platform fee
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleApply = async () => {
    if (!form.name || !form.phone || !form.skill) {
      alert('Please fill name, phone, and skill category.');
      return;
    }
    try {
      await fetch('/api/v1/professionals/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch { }
    setSubmit(true);
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: DARK }}>

      {/* ── Hero ── */}
      <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0f3460 100%)`, padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Branded Logo with PRO Badge */}
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 24px' }}>
            <img src="/logo.png" alt="Slot Pro Logo" style={{ width: '100%', height: '100%', borderRadius: 22, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--color-brand)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 8px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' }}>PRO</span>
          </div>
          <span style={{ background: BRAND, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', width: 'fit-content', margin: '0 auto' }}>
            Now hiring in 30+ cities
          </span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, color: '#fff', margin: '20px 0 16px', lineHeight: 1.15 }}>
            Turn your skills into<br />
            <span style={{ color: BRAND }}>₹40,000+/month</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Join 50,000+ professionals already earning on Slot App. Free training, weekly payouts, full flexibility.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#apply"
              style={{ display: 'inline-block', padding: '16px 32px', background: BRAND, color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              Apply Now — Free
            </a>
            <a href="#calculator"
              style={{ display: 'inline-block', padding: '16px 32px', background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 14, fontWeight: 700, fontSize: 16, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.25)' }}>
              Calculate Earnings
            </a>
          </div>
          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
            {[['50,000+', 'Active professionals'], ['₹62,000', 'Avg monthly earnings'], ['4.8★', 'Pro app rating'], ['2-3 days', 'Verification time']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Benefits ── */}
      <div style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Why join Slot?</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 16 }}>Everything you need to succeed, in one place.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ background: LIGHT, borderRadius: 16, padding: '24px 20px', borderLeft: `4px solid ${BRAND}` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{b.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{b.title}</div>
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Earnings by category ── */}
      <div style={{ background: LIGHT, padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Earnings by skill</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 16 }}>Average monthly earnings for top professionals in each category.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {CATEGORIES.map(c => (
              <div key={c.name} style={{ background: '#fff', borderRadius: 14, padding: '20px 16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: BRAND }}>{c.avg}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>avg / month</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Earnings Calculator ── */}
      <div id="calculator" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: LIGHT, borderRadius: 20, padding: '40px 32px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>💰 Earnings Calculator</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 32, fontSize: 14 }}>Estimate your monthly income on Slot App.</p>

          <label style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>
            Jobs per month: <strong style={{ color: BRAND }}>{jobs}</strong>
          </label>
          <input type="range" min={5} max={60} value={jobs} onChange={e => setJobs(+e.target.value)}
            style={{ width: '100%', marginBottom: 24, accentColor: BRAND }} />

          <label style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>
            Avg job value: <strong style={{ color: BRAND }}>₹{rate}</strong>
          </label>
          <input type="range" min={199} max={2999} step={50} value={rate} onChange={e => setRate(+e.target.value)}
            style={{ width: '100%', marginBottom: 32, accentColor: BRAND }} />

          <div style={{ background: DARK, borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Your estimated monthly take-home</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: BRAND }}>₹{monthlyEst.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
              {jobs} jobs × ₹{rate} avg − 20% platform fee
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12 }}>
            *Estimates based on platform averages. Actual earnings vary by skill, city, and availability.
          </p>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ background: DARK, padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 48 }}>Start earning in 4 steps</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 24 }}>
            {STEPS.map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 28, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, fontWeight: 900, color: '#fff' }}>{s.num}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Application Form ── */}
      <div id="apply" style={{ background: LIGHT, padding: '64px 24px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Start your application</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>Free to apply. No joining fee. Get approved in 2–3 days.</p>

          {submitted ? (
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Application Received!</h3>
              <p style={{ color: '#666', lineHeight: 1.7 }}>
                Hi {form.name}! Our team will call you at <strong>{form.phone}</strong> within 24 hours to guide you through the next steps.
              </p>
              <button onClick={() => navigate('home')}
                style={{ marginTop: 24, padding: '14px 32px', background: BRAND, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back to Home
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'Your full name', type: 'text' },
                { key: 'phone', label: 'Mobile Number *', placeholder: '10-digit mobile number', type: 'tel' },
                { key: 'city', label: 'Your City', placeholder: 'e.g. Hyderabad', type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Skill Category *</label>
                <select value={form.skill} onChange={e => set('skill', e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                  <option value="">Select your skill…</option>
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <button onClick={handleApply}
                style={{ width: '100%', padding: '15px', background: BRAND, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
                Apply Now — It's Free ✓
              </button>
              <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
                By applying you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ background: '#fff', padding: '64px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 40 }}>Frequently asked questions</h2>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 0 }}>
              <button onClick={() => setFaq(openFaq === i ? null : i)}
                style={{ width: '100%', textAlign: 'left', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: DARK, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {f.q}
                <span style={{ color: BRAND, fontSize: 20, fontWeight: 900, flexShrink: 0, marginLeft: 12 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8, paddingBottom: 18 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
