import React, { useState } from 'react';

const STATS = [
  { value: '50L+', label: 'Services Delivered', icon: '✅' },
  { value: '4.8★', label: 'Average Rating', icon: '⭐' },
  { value: '1500+', label: 'Verified Professionals', icon: '👷' },
  { value: '12+', label: 'Cities', icon: '🏙️' },
  { value: '99%', label: 'Satisfaction Rate', icon: '😊' },
  { value: '24/7', label: 'Customer Support', icon: '📞' },
];

const VALUES = [
  { icon: '🔒', title: 'Verified & Trusted', desc: 'Every professional undergoes a thorough background check, skill test, and police verification.' },
  { icon: '💯', title: 'Quality Guaranteed', desc: 'Not happy? We redo the service for free. Our 30-day warranty covers all bookings.' },
  { icon: '💰', title: 'Transparent Pricing', desc: 'What you see is what you pay. No hidden charges, no surprise fees.' },
  { icon: '⚡', title: 'On-Time Guarantee', desc: 'Professionals arrive within the scheduled window. If they\'re late, you get a discount.' },
  { icon: '🌿', title: 'Safe Products', desc: 'We only use WHO-approved, child-safe, and eco-friendly cleaning products.' },
  { icon: '📱', title: 'Real-Time Tracking', desc: 'Track your professional in real-time from the moment they leave.' },
];

const FAQS = [
  { q: 'How does Slot verify its professionals?', a: 'Every professional undergoes Aadhaar verification, police verification, and skill testing before being onboarded.' },
  { q: 'Are your products safe for children and pets?', a: 'Yes. All our cleaning products are WHO-approved and eco-friendly.' },
  { q: 'What is your cancellation policy?', a: 'Cancel 4h before for full refund. 1-4h for 50%. Within 1h, no refund.' },
  { q: 'How do I become a pro on Slot?', a: 'Apply on our website, pass skill test, and complete training. Approval in 2-3 days.' },
];

export default function AboutPage({ navigate }) {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const sectionStyle = { padding: '80px 24px', maxWidth: 1200, margin: '0 auto' };
  const titleStyle = { fontSize: 32, fontWeight: 800, color: '#1a1a2e', marginBottom: 12, textAlign: 'center' };
  const subStyle = { fontSize: 16, color: '#666', marginBottom: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto 48px' };

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '100px 24px', textAlign: 'center', color: '#fff' }}>
        <div style={{ background: 'rgba(233,69,96,0.2)', border: '1px solid rgba(233,69,96,0.5)', padding: '6px 16px', borderRadius: 20, display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#ff8a80', marginBottom: 24 }}>
          🏠 India's Most Trusted Home Services
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, marginBottom: 20, lineHeight: 1.1 }}>
          Better Service.<br/><span style={{ color: 'var(--color-brand)' }}>Better Homes.</span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 700, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Slot Services connects you with verified, skilled professionals for all your home needs — from plumbing to salon, AC repair to cleaning.
        </p>
        <button onClick={() => navigate('services')} style={{ padding: '16px 36px', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 8px 24px rgba(233,69,96,0.4)' }}>
          Explore Services
        </button>
      </div>

      {/* Stats */}
      <div style={{ background: '#f8f9fa', padding: '60px 24px', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: '#fff', padding: 24, borderRadius: 20, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div style={sectionStyle}>
        <h2 style={titleStyle}>Why Choose Slot?</h2>
        <p style={subStyle}>We're committed to quality, safety, and transparency in every service we deliver.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ padding: 32, border: '1px solid #f0f0f0', borderRadius: 24, background: '#fff' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{v.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' }}>{v.title}</h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ ...sectionStyle, background: '#f8f9fa' }}>
        <h2 style={titleStyle}>Frequently Asked Questions</h2>
        <div style={{ maxWidth: 700, margin: '40px auto 0' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ marginBottom: 16, border: '1px solid #eee', borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
              <button 
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                style={{ width: '100%', padding: '20px 24px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 15 }}>{faq.q}</span>
                <span style={{ color: '#aaa' }}>{expandedFaq === i ? '−' : '+'}</span>
              </button>
              {expandedFaq === i && (
                <div style={{ padding: '0 24px 20px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'var(--color-brand)', padding: '80px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Ready to get started?</h2>
        <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>Join 11 million+ happy customers today.</p>
        <button onClick={() => navigate('services')} style={{ padding: '16px 40px', background: '#fff', color: 'var(--color-brand)', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
          Book Now
        </button>
      </div>
    </div>
  );
}
