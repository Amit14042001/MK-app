import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { servicesAPI, reviewsAPI } from '../utils/api';

const TIMES = ['08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM'];
const TABS = ['Overview','Inclusions','Reviews','FAQ'];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; }
  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-thumb { background:#e94560; border-radius:3px; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation:fadeIn 0.3s ease forwards; }
  .sub-row:hover { background:#fff8f9 !important; }
  .time-chip:hover:not(.selected) { border-color:#e94560 !important; color:#e94560 !important; }
  .tab-btn:hover { color:#e94560 !important; }
  .action-primary:hover { opacity:0.92; transform:translateY(-1px); }
  .action-secondary:hover { background:#fff0f3 !important; }
`;

function Stars({ rating, count, size = 14 }) {
  const full = Math.floor(rating);
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
      <span style={{ color:'#f5a623', fontSize:size }}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </span>
      <span style={{ color:'#888', fontSize:size - 1 }}>{rating}</span>
      {count != null && <span style={{ color:'#ccc', fontSize:size - 1 }}>({count?.toLocaleString()})</span>}
    </span>
  );
}

function SubServiceRow({ sub, selected, onClick }) {
  const disc = sub.originalPrice ? Math.round((1 - sub.price / sub.originalPrice) * 100) : 0;
  return (
    <div onClick={onClick} className="sub-row" style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'16px 20px', cursor:'pointer', borderBottom:'1px solid #f5f5f5',
      background: selected ? '#fff8f9' : '#fff',
      borderLeft: selected ? '3px solid #e94560' : '3px solid transparent',
      transition:'all 0.15s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:14, flex:1 }}>
        <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${selected ? '#e94560' : '#ddd'}`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2,
          background: selected ? '#e94560' : 'transparent' }}>
          {selected && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:'#1a1a2e', marginBottom:3 }}>{sub.name}</div>
          {sub.description && <div style={{ fontSize:12, color:'#888', marginBottom:3 }}>{sub.description}</div>}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {sub.duration && <span style={{ fontSize:11, color:'#aaa' }}>⏱ ~{sub.duration} mins</span>}
            {sub.warranty && <span style={{ fontSize:11, color:'#aaa' }}>🛡️ {sub.warranty}</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:16, color: selected ? '#e94560' : '#1a1a2e' }}>₹{sub.price}</div>
        {sub.originalPrice && (
          <div style={{ fontSize:12, color:'#bbb', textDecoration:'line-through' }}>₹{sub.originalPrice}</div>
        )}
        {disc > 0 && (
          <div style={{ fontSize:10, fontWeight:700, color:'#27ae60', background:'#e8f5e9',
            padding:'2px 6px', borderRadius:20, marginTop:2 }}>{disc}% off</div>
        )}
      </div>
    </div>
  );
}

export default function ServiceDetailPage({ serviceId, navigate }) {
  const { addToCart, user, showToast } = useApp();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const today = new Date();
  const dates = Array.from({length:7}, (_,i) => { const d = new Date(today); d.setDate(today.getDate()+i); return d; });

  useEffect(() => { if (serviceId) load(); }, [serviceId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await servicesAPI.getOne(serviceId);
      setService(data.service);
      if (data.service.subServices?.length) setSelectedSub(data.service.subServices[0]);
      setReviews(data.recentReviews || []);
    } catch { showToast('Service not found','error'); }
    finally { setLoading(false); }
  };

  const price = selectedSub?.price || service?.startingPrice || 0;
  const origPrice = selectedSub?.originalPrice;
  const disc = origPrice ? Math.round((1 - price/origPrice)*100) : 0;

  const handleAddToCart = () => {
    if (!selectedDate || !selectedTime) { showToast('Please select date & time','warning'); return; }
    addToCart({ serviceId:service._id, serviceName:service.name, serviceIcon:service.icon,
      subServiceName:selectedSub?.name, price, date:selectedDate, time:selectedTime });
  };

  const handleBookNow = () => {
    if (!user) { navigate('login'); return; }
    handleAddToCart();
    navigate('checkout');
  };

  if (loading) return (
    <div style={{ maxWidth:1280, margin:'40px auto', padding:'0 24px', display:'grid',
      gridTemplateColumns:'1fr 380px', gap:28 }}>
      {[0,1].map(i => <div key={i} style={{ height:400, background:'#fff', borderRadius:20,
        animation:'pulse 1.5s ease infinite alternate' }} />)}
      <style>{'@keyframes pulse{from{opacity:1}to{opacity:0.4}}'}</style>
    </div>
  );
  if (!service) return <div style={{ textAlign:'center', padding:80, color:'#888', fontSize:18 }}>Service not found</div>;

  return (
    <>
      <style>{css}</style>
      <div style={{ background:'#f8f9fa', minHeight:'100vh', fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px' }}>

          {/* Breadcrumb */}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:24, fontSize:13, color:'#aaa' }}>
            {['Home','Services',service.name].map((b,i,arr) => (
              <span key={b} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span onClick={() => i === 0 ? navigate('home') : i === 1 ? navigate('services') : null}
                  style={{ cursor: i < arr.length-1 ? 'pointer' : 'default',
                    color: i < arr.length-1 ? '#e94560' : '#333',
                    fontWeight: i === arr.length-1 ? 600 : 400 }}>{b}</span>
                {i < arr.length-1 && <span>›</span>}
              </span>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:28, alignItems:'start' }}>
            {/* LEFT */}
            <div>
              {/* Hero card */}
              <div style={{ background:'linear-gradient(135deg,#1a1a2e 0%,#0f3460 50%,#1a1a2e 100%)',
                borderRadius:20, padding:'32px 28px', marginBottom:20, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%',
                  background:'rgba(233,69,96,0.1)' }} />
                <div style={{ position:'relative' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                    {service.isNew && <span style={{ background:'rgba(33,150,243,0.2)', color:'#90caf9',
                      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>NEW</span>}
                    {service.isPopular && <span style={{ background:'rgba(76,175,80,0.2)', color:'#a5d6a7',
                      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>Popular</span>}
                    {service.warranty && <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.85)',
                      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>🛡️ {service.warranty}</span>}
                  </div>
                  <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
                    <div style={{ fontSize:64 }}>{service.icon}</div>
                    <div style={{ flex:1 }}>
                      <h1 style={{ color:'#fff', fontSize:28, fontWeight:900, letterSpacing:-0.5,
                        lineHeight:1.2, marginBottom:10 }}>{service.name}</h1>
                      <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                        <Stars rating={service.rating||4.8} count={service.totalRatings} size={15} />
                        <span style={{ color:'rgba(255,255,255,0.6)', fontSize:13 }}>
                          📦 {service.totalBookings?.toLocaleString()||'10K+'} bookings
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:20,
                border:'1px solid #f0f0f0' }}>
                <p style={{ color:'#555', fontSize:15, lineHeight:1.75, margin:0 }}>{service.description}</p>
              </div>

              {/* Sub-services */}
              {service.subServices?.filter(s => s.isActive !== false).length > 0 && (
                <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', marginBottom:20,
                  border:'1px solid #f0f0f0' }}>
                  <div style={{ padding:'18px 20px', borderBottom:'1px solid #f5f5f5' }}>
                    <h3 style={{ fontWeight:800, fontSize:16, color:'#1a1a2e', margin:0 }}>Choose Package</h3>
                    <p style={{ fontSize:13, color:'#aaa', margin:'4px 0 0' }}>Select the service that fits your needs</p>
                  </div>
                  {service.subServices.filter(s => s.isActive !== false).map(sub => (
                    <SubServiceRow key={sub._id||sub.name} sub={sub}
                      selected={selectedSub?.name === sub.name}
                      onClick={() => setSelectedSub(sub)} />
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #f0f0f0' }}>
                <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0' }}>
                  {TABS.map((t,i) => (
                    <button key={t} onClick={() => setActiveTab(i)} className="tab-btn" style={{
                      flex:1, padding:'16px 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                      background: activeTab===i ? '#fff8f9' : '#fff',
                      color: activeTab===i ? '#e94560' : '#777',
                      borderBottom: activeTab===i ? '2px solid #e94560' : '2px solid transparent',
                      transition:'all 0.15s',
                    }}>{t}</button>
                  ))}
                </div>
                <div style={{ padding:24 }} className="fade-in">
                  {activeTab === 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      {[['🛡️','Verified Pros','Background-checked & trained'],
                        ['💰','Fixed Prices','No hidden charges ever'],
                        ['⭐','100% Guarantee','Free redo if not satisfied'],
                        ['📱','Live Tracking','GPS track your professional'],
                        ['⏰','On Time Always','Or ₹50 off your next service'],
                        ['🔧','Pro Equipment','Professional-grade tools only']
                      ].map(([icon,t,s]) => (
                        <div key={t} style={{ display:'flex', gap:12, padding:'14px', background:'#f8f9fa',
                          borderRadius:12, alignItems:'flex-start' }}>
                          <span style={{ fontSize:22 }}>{icon}</span>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:'#1a1a2e', marginBottom:2 }}>{t}</div>
                            <div style={{ fontSize:12, color:'#888' }}>{s}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div>
                      {service.inclusions?.length > 0 && (
                        <div style={{ marginBottom:20 }}>
                          <h4 style={{ fontWeight:700, marginBottom:12, color:'#1a1a2e' }}>✅ What's Included</h4>
                          {service.inclusions.map((item,i) => (
                            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:14 }}>
                              <span style={{ color:'#27ae60', fontWeight:700 }}>✓</span>
                              <span style={{ color:'#444' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {service.exclusions?.length > 0 && (
                        <div>
                          <h4 style={{ fontWeight:700, marginBottom:12, color:'#1a1a2e' }}>❌ Not Included</h4>
                          {service.exclusions.map((item,i) => (
                            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, fontSize:14 }}>
                              <span style={{ color:'#e94560', fontWeight:700 }}>✗</span>
                              <span style={{ color:'#666' }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 2 && (
                    <div>
                      <div style={{ display:'flex', gap:20, alignItems:'center', marginBottom:24,
                        padding:'16px', background:'#f8f9fa', borderRadius:14 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:48, fontWeight:900, color:'#1a1a2e', lineHeight:1 }}>
                            {service.rating||4.8}
                          </div>
                          <div style={{ color:'#f5a623', fontSize:20, margin:'4px 0 2px' }}>{'★'.repeat(5)}</div>
                          <div style={{ fontSize:12, color:'#888' }}>{service.totalRatings?.toLocaleString()||'1K+'} reviews</div>
                        </div>
                      </div>
                      {reviews.length === 0
                        ? <p style={{ color:'#aaa', textAlign:'center', padding:'20px 0' }}>No reviews yet</p>
                        : reviews.map((r,i) => (
                          <div key={i} style={{ borderBottom:'1px solid #f5f5f5', paddingBottom:16, marginBottom:16 }}>
                            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
                              <div style={{ width:38, height:38, borderRadius:'50%', background:'#e94560',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>
                                {r.customer?.name?.charAt(0)||'U'}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:14 }}>{r.customer?.name||'Customer'}</div>
                                <div style={{ fontSize:12, color:'#aaa' }}>
                                  {new Date(r.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
                                </div>
                              </div>
                              <Stars rating={r.rating} size={13} />
                            </div>
                            <p style={{ fontSize:14, color:'#555', lineHeight:1.65, margin:0 }}>{r.comment}</p>
                          </div>
                        ))}
                    </div>
                  )}

                  {activeTab === 3 && (
                    <div>
                      {(service.faqs?.length > 0 ? service.faqs : [
                        {question:'How do I book?', answer:'Select package, pick date & time, and checkout. Pay online or cash after service.'},
                        {question:'Are professionals verified?', answer:'Yes — all undergo background checks, skill tests and MK training before joining.'},
                        {question:'Service guarantee?', answer:"If you're not satisfied, we'll send a professional back free of charge."},
                        {question:'Can I reschedule?', answer:'Yes — up to 3 hours before appointment. Full refund for cancellations 24+ hours before.'},
                      ]).map((faq,i) => (
                        <div key={i} style={{ background:'#f8f9fa', borderRadius:12, padding:'16px 18px', marginBottom:10 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:'#1a1a2e', marginBottom:7 }}>Q: {faq.question}</div>
                          <div style={{ fontSize:13, color:'#666', lineHeight:1.65 }}>A: {faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — sticky booking card */}
            <div style={{ position:'sticky', top:80 }}>
              <div style={{ background:'#fff', borderRadius:20, border:'1px solid #f0f0f0',
                boxShadow:'0 12px 48px rgba(0,0,0,0.09)', overflow:'hidden' }}>

                {/* Price */}
                <div style={{ padding:'22px 22px 18px', borderBottom:'1px solid #f5f5f5' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:30, fontWeight:900, color:'#1a1a2e', lineHeight:1 }}>₹{price}</div>
                      {origPrice && (
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:5 }}>
                          <span style={{ textDecoration:'line-through', color:'#ccc', fontSize:14 }}>₹{origPrice}</span>
                          <span style={{ background:'#e8f5e9', color:'#27ae60', padding:'2px 8px',
                            borderRadius:20, fontSize:11, fontWeight:700 }}>{disc}% OFF</span>
                        </div>
                      )}
                    </div>
                    <Stars rating={service.rating||4.8} size={13} />
                  </div>
                  <div style={{ marginTop:10, fontSize:12, color:'#888', display:'flex', gap:14 }}>
                    <span>📦 {service.totalBookings?.toLocaleString()||'10K+'} booked</span>
                    <span>⏱ Typically {selectedSub?.duration||60} mins</span>
                  </div>
                </div>

                <div style={{ padding:'0 20px 20px' }}>
                  {/* Date picker */}
                  <div style={{ marginTop:18 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase',
                      letterSpacing:1, marginBottom:10 }}>Select Date</div>
                    <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                      {dates.map((d,i) => {
                        const val = d.toISOString().split('T')[0];
                        const sel = selectedDate === val;
                        return (
                          <div key={i} onClick={() => setSelectedDate(val)}
                            style={{ minWidth:52, padding:'10px 0', borderRadius:12, textAlign:'center',
                              cursor:'pointer', flexShrink:0, transition:'all 0.15s',
                              border:`2px solid ${sel ? '#e94560' : '#f0f0f0'}`,
                              background: sel ? '#e94560' : '#fff',
                              color: sel ? '#fff' : '#333' }}>
                            <div style={{ fontSize:10, fontWeight:500 }}>
                              {i === 0 ? 'Today' : d.toLocaleDateString('en',{weekday:'short'})}
                            </div>
                            <div style={{ fontSize:18, fontWeight:900, lineHeight:1.3 }}>{d.getDate()}</div>
                            <div style={{ fontSize:10 }}>{d.toLocaleDateString('en',{month:'short'})}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time picker */}
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase',
                      letterSpacing:1, marginBottom:10 }}>Select Time</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {TIMES.map(t => (
                        <div key={t} onClick={() => setSelectedTime(t)} className={`time-chip ${selectedTime===t?'selected':''}`}
                          style={{ padding:'7px 10px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:600,
                            border:`1.5px solid ${selectedTime===t ? '#e94560' : '#f0f0f0'}`,
                            background: selectedTime===t ? '#e94560' : '#fff',
                            color: selectedTime===t ? '#fff' : '#666',
                            transition:'all 0.12s' }}>{t}</div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  {(selectedDate || selectedTime) && (
                    <div style={{ marginTop:14, background:'#f0fdf4', borderRadius:10, padding:'11px 14px' }}>
                      {selectedDate && <div style={{ fontSize:13, color:'#27ae60', fontWeight:600 }}>
                        📅 {new Date(selectedDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                      </div>}
                      {selectedTime && <div style={{ fontSize:13, color:'#27ae60', fontWeight:600, marginTop:3 }}>
                        ⏰ {selectedTime}
                      </div>}
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ marginTop:18, display:'flex', flexDirection:'column', gap:10 }}>
                    <button onClick={handleBookNow} className="action-primary"
                      style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#e94560,#c0392b)',
                        color:'#fff', border:'none', borderRadius:12, cursor:'pointer',
                        fontWeight:800, fontSize:15, boxShadow:'0 6px 20px rgba(233,69,96,0.32)',
                        transition:'all 0.18s' }}>
                      {user ? `Book Now — ₹${price}` : 'Login to Book'}
                    </button>
                    <button onClick={handleAddToCart} className="action-secondary"
                      style={{ width:'100%', padding:'13px', background:'#fff', color:'#e94560',
                        border:'2px solid #e94560', borderRadius:12, cursor:'pointer',
                        fontWeight:700, fontSize:14, transition:'all 0.15s' }}>
                      Add to Cart
                    </button>
                  </div>

                  <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:14, fontSize:11, color:'#ccc' }}>
                    <span>🔒 Secure booking</span>
                    <span>💯 Satisfaction guarantee</span>
                  </div>
                </div>
              </div>

              {/* Similar services hint */}
              <div style={{ background:'#fff', borderRadius:16, padding:'16px 18px', marginTop:16,
                border:'1px solid #f0f0f0' }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:'#1a1a2e' }}>🔗 Related Services</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['AC Service','Electrician','Plumber','Cleaning'].filter(s => s !== service.name).slice(0,3).map(s => (
                    <button key={s} onClick={() => navigate('services')}
                      style={{ padding:'6px 12px', border:'1px solid #f0f0f0', borderRadius:20,
                        background:'#f8f9fa', fontSize:12, color:'#555', cursor:'pointer',
                        fontWeight:500, transition:'all 0.15s' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
