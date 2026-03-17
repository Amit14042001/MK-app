import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { bookingsAPI, paymentsAPI, usersAPI } from '../utils/api';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes success-pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  .fade-in { animation:fadeIn 0.3s ease forwards; }
  .success-icon { animation:success-pop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
  .input-field:focus { border-color:#e94560 !important; box-shadow:0 0 0 3px rgba(233,69,96,0.1) !important; }
  .addr-card:hover { border-color:#e94560 !important; }
  .pay-method:hover { border-color:#e94560 !important; }
  .checkout-btn:hover { opacity:0.92; transform:translateY(-1px); }
  .time-chip:hover { border-color:#e94560 !important; color:#e94560 !important; }
`;

const STEPS = [{n:1,label:'Address',icon:'📍'},{n:2,label:'Payment',icon:'💳'},{n:3,label:'Confirm',icon:'✅'}];

const inputStyle = {
  width:'100%', padding:'12px 14px', border:'1.5px solid #e8e8e8',
  borderRadius:10, fontSize:14, outline:'none', background:'#fafafa',
  fontFamily:'inherit', transition:'all 0.2s', color:'#1a1a2e',
};

export default function CheckoutPage({ navigate }) {
  const { cart, clearCart, user, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newAddr, setNewAddr] = useState({label:'Home',line1:'',line2:'',area:'',city:'',state:'Telangana',pincode:'',landmark:''});
  const [payMethod, setPayMethod] = useState('online');
  const [coupon, setCoupon] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [placedBooking, setPlacedBooking] = useState(null);
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((s,i) => s + (i.price||0), 0);
  const discount = couponData?.discount || 0;
  const taxes = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + taxes;

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const { data } = await usersAPI.getProfile();
      const addrs = data.user?.addresses || [];
      setAddresses(addrs);
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (def) setSelectedAddr(def); else setAddingNew(true);
    } catch {}
  };

  const handleSaveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city || !newAddr.pincode) {
      showToast('Fill required fields','warning'); return;
    }
    try {
      const { data } = await usersAPI.addAddress(newAddr);
      // Backend returns { success: true, address: ... }
      // We need to either reload all or update local state
      const updatedAddrs = [...addresses, data.address];
      setAddresses(updatedAddrs);
      setSelectedAddr(data.address);
      setAddingNew(false);
      showToast('Address saved!','success');
    } catch (err) {
      console.error('Save Address Error:', err);
      showToast(err.response?.data?.message || 'Failed to save address','error');
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon) return;
    try {
      const { data } = await paymentsAPI.applyCoupon(coupon, subtotal);
      setCouponData(data);
      showToast(data.message,'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid coupon','error');
      setCouponData(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddr) { showToast('Select a delivery address','warning'); return; }
    setLoading(true);
    try {
      const bRes = await bookingsAPI.create({
        service: cart[0]?.serviceId,
        subServiceName: cart[0]?.subServiceName,
        scheduledDate: cart[0]?.date,
        scheduledTime: cart[0]?.time,
        address: selectedAddr,
        payment: { method: payMethod },
        couponCode: couponData?.coupon?.code,
      });
      const bookingId = bRes.data.booking._id;

      if (payMethod === 'online') {
        const oRes = await paymentsAPI.createOrder({ bookingId });
        const { order, key, prefill } = oRes.data;
        if (typeof window.Razorpay !== 'undefined') {
          new window.Razorpay({
            key, amount:order.amount, currency:order.currency,
            name:'MK App', description:cart[0]?.serviceName,
            order_id: order.id, prefill, theme:{ color:'#e94560' },
            handler: async (resp) => {
              try {
                await paymentsAPI.verify({ razorpayOrderId:resp.razorpay_order_id,
                  razorpayPaymentId:resp.razorpay_payment_id,
                  razorpaySignature:resp.razorpay_signature, bookingId });
                setPlacedBooking(bRes.data.booking);
                clearCart(); setStep(3);
              } catch { showToast('Payment verification failed','error'); }
            },
            modal:{ ondismiss:() => showToast('Payment cancelled','info') },
          }).open();
        } else {
          // Razorpay not loaded (dev) — treat as COD
          setPlacedBooking(bRes.data.booking); clearCart(); setStep(3);
        }
      } else {
        setPlacedBooking(bRes.data.booking); clearCart(); setStep(3);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Booking failed','error');
    } finally { setLoading(false); }
  };

  if (cart.length === 0 && step !== 3) return (
    <div style={{ textAlign:'center', padding:'100px 24px', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ fontSize:72, marginBottom:16 }}>🛒</div>
      <h2 style={{ fontWeight:800, color:'#1a1a2e', marginBottom:8 }}>Your cart is empty</h2>
      <p style={{ color:'#888', marginBottom:24 }}>Add a service first</p>
      <button onClick={() => navigate('services')} style={{ background:'#e94560', color:'#fff', border:'none',
        padding:'12px 32px', borderRadius:24, cursor:'pointer', fontWeight:700, fontSize:15 }}>Browse Services</button>
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ background:'#f8f9fa', minHeight:'100vh', padding:'32px 24px',
        fontFamily:"'Inter',system-ui,sans-serif" }}>
        <div style={{ maxWidth:1020, margin:'0 auto' }}>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#1a1a2e', marginBottom:32, letterSpacing:-0.5 }}>Checkout</h1>

          {/* Stepper */}
          <div style={{ display:'flex', alignItems:'center', marginBottom:36 }}>
            {STEPS.map((s,i) => (
              <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : undefined }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18, fontWeight:700, transition:'all 0.3s',
                    background: step > s.n ? '#27ae60' : step === s.n ? '#e94560' : '#f0f0f0',
                    color: step >= s.n ? '#fff' : '#bbb',
                    boxShadow: step === s.n ? '0 4px 14px rgba(233,69,96,0.35)' : 'none',
                  }}>{step > s.n ? '✓' : s.icon}</div>
                  <span style={{ fontWeight:700, fontSize:14,
                    color: step >= s.n ? '#1a1a2e' : '#bbb' }}>{s.label}</span>
                </div>
                {i < STEPS.length-1 && (
                  <div style={{ flex:1, height:2, margin:'0 16px',
                    background: step > s.n ? '#27ae60' : '#f0f0f0', transition:'all 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
            {/* MAIN */}
            <div>
              {/* STEP 1 — ADDRESS */}
              {step === 1 && (
                <div style={{ background:'#fff', borderRadius:20, padding:28, border:'1px solid #f0f0f0' }}
                  className="fade-in">
                  <h3 style={{ fontWeight:800, fontSize:18, color:'#1a1a2e', marginBottom:20 }}>📍 Service Address</h3>

                  {addresses.map(addr => (
                    <div key={addr._id} onClick={() => { setSelectedAddr(addr); setAddingNew(false); }}
                      className="addr-card"
                      style={{ padding:16, borderRadius:14, marginBottom:12, cursor:'pointer', transition:'all 0.15s',
                        border:`2px solid ${selectedAddr?._id === addr._id ? '#e94560' : '#f0f0f0'}`,
                        background: selectedAddr?._id === addr._id ? '#fff8f9' : '#fafafa',
                        display:'flex', gap:14, alignItems:'flex-start' }}>
                      <span style={{ fontSize:24, marginTop:2 }}>
                        {addr.label==='Home' ? '🏠' : addr.label==='Work' ? '🏢' : '📍'}
                      </span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{addr.label}</div>
                        <div style={{ fontSize:13, color:'#666', lineHeight:1.5, marginTop:2 }}>
                          {addr.line1}{addr.area ? `, ${addr.area}` : ''}, {addr.city} — {addr.pincode}
                        </div>
                        {addr.landmark && <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>Landmark: {addr.landmark}</div>}
                      </div>
                      {selectedAddr?._id === addr._id && (
                        <span style={{ color:'#e94560', fontWeight:800, fontSize:18 }}>●</span>
                      )}
                    </div>
                  ))}

                  <button onClick={() => setAddingNew(o => !o)}
                    style={{ width:'100%', padding:'13px', border:'2px dashed #e0e0e0', borderRadius:12,
                      background:'none', cursor:'pointer', color:'#e94560', fontWeight:700, fontSize:14,
                      marginBottom: addingNew ? 16 : 0, transition:'all 0.15s' }}>
                    + Add New Address
                  </button>

                  {addingNew && (
                    <div className="fade-in">
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                        <select value={newAddr.label} onChange={e => setNewAddr(a=>({...a,label:e.target.value}))}
                          style={{ ...inputStyle }}>
                          {['Home','Work','Other'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <input placeholder="Pincode *" value={newAddr.pincode}
                          onChange={e => setNewAddr(a=>({...a,pincode:e.target.value}))}
                          style={{ ...inputStyle }} className="input-field" />
                      </div>
                      {[
                        ['line1','House/Flat, Building, Street *'],
                        ['line2','Apartment / Floor (optional)'],
                        ['area','Area / Locality'],
                        ['city','City *'],
                        ['landmark','Landmark (optional)'],
                      ].map(([k,ph]) => (
                        <input key={k} placeholder={ph} value={newAddr[k]}
                          onChange={e => setNewAddr(a=>({...a,[k]:e.target.value}))}
                          style={{ ...inputStyle, marginBottom:10 }} className="input-field" />
                      ))}
                      <button onClick={handleSaveAddress}
                        style={{ background:'#1a1a2e', color:'#fff', border:'none', padding:'12px 24px',
                          borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 }}>
                        Save Address
                      </button>
                    </div>
                  )}

                  <button onClick={() => { if (!selectedAddr) { showToast('Select address','warning'); return; } setStep(2); }}
                    className="checkout-btn"
                    style={{ width:'100%', marginTop:20, background:'linear-gradient(135deg,#e94560,#c0392b)',
                      color:'#fff', border:'none', padding:'15px', borderRadius:12, cursor:'pointer',
                      fontWeight:800, fontSize:15, boxShadow:'0 6px 20px rgba(233,69,96,0.3)', transition:'all 0.18s' }}>
                    Continue to Payment →
                  </button>
                </div>
              )}

              {/* STEP 2 — PAYMENT */}
              {step === 2 && (
                <div style={{ background:'#fff', borderRadius:20, padding:28, border:'1px solid #f0f0f0' }}
                  className="fade-in">
                  <h3 style={{ fontWeight:800, fontSize:18, color:'#1a1a2e', marginBottom:20 }}>💳 Payment Method</h3>

                  {[{id:'online',icon:'💳',title:'Pay Online',sub:'UPI, Cards, Net Banking, Wallets'},
                    {id:'cash',icon:'💵',title:'Pay After Service',sub:'Cash or card on completion'}
                  ].map(m => (
                    <div key={m.id} onClick={() => setPayMethod(m.id)} className="pay-method"
                      style={{ padding:16, borderRadius:14, marginBottom:12, cursor:'pointer', transition:'all 0.15s',
                        border:`2px solid ${payMethod===m.id ? '#e94560' : '#f0f0f0'}`,
                        background: payMethod===m.id ? '#fff8f9' : '#fafafa',
                        display:'flex', gap:14, alignItems:'center' }}>
                      <span style={{ fontSize:28 }}>{m.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15 }}>{m.title}</div>
                        <div style={{ fontSize:13, color:'#888' }}>{m.sub}</div>
                      </div>
                      <div style={{ width:20, height:20, borderRadius:'50%',
                        border:`2px solid ${payMethod===m.id ? '#e94560' : '#ddd'}`,
                        background: payMethod===m.id ? '#e94560' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {payMethod===m.id && <div style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }} />}
                      </div>
                    </div>
                  ))}

                  {/* Coupon */}
                  <div style={{ background:'#f8f9fa', borderRadius:12, padding:16, marginTop:20 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>🎟️ Apply Coupon</div>
                    <div style={{ display:'flex', gap:10 }}>
                      <input placeholder="Coupon code" value={coupon}
                        onChange={e => setCoupon(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key==='Enter' && handleApplyCoupon()}
                        style={{ ...inputStyle, flex:1, letterSpacing:1.5, fontWeight:600 }}
                        className="input-field" />
                      <button onClick={handleApplyCoupon}
                        style={{ background:'#e94560', color:'#fff', border:'none', padding:'12px 20px',
                          borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14, whiteSpace:'nowrap' }}>
                        Apply
                      </button>
                    </div>
                    {couponData && (
                      <div style={{ marginTop:10, color:'#27ae60', fontSize:13, fontWeight:600 }}>
                        ✅ {couponData.message}
                      </div>
                    )}
                    <div style={{ marginTop:8, fontSize:12, color:'#bbb' }}>
                      Try: MKWELCOME · MK100 · AUTOCARE
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={() => setStep(1)}
                      style={{ flex:1, padding:'14px', background:'#f0f0f0', color:'#555',
                        border:'none', borderRadius:12, cursor:'pointer', fontWeight:700, fontSize:14 }}>
                      ← Back
                    </button>
                    <button onClick={() => setStep(3)} className="checkout-btn"
                      style={{ flex:2, padding:'14px', background:'linear-gradient(135deg,#e94560,#c0392b)',
                        color:'#fff', border:'none', borderRadius:12, cursor:'pointer',
                        fontWeight:800, fontSize:15, boxShadow:'0 6px 20px rgba(233,69,96,0.3)',
                        transition:'all 0.18s' }}>
                      Review Order →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — CONFIRM / SUCCESS */}
              {step === 3 && (
                <div style={{ background:'#fff', borderRadius:20, padding:28, border:'1px solid #f0f0f0' }}
                  className="fade-in">
                  {placedBooking ? (
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <div className="success-icon" style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 20px',
                        background:'linear-gradient(135deg,#27ae60,#1e8449)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:36, boxShadow:'0 8px 28px rgba(39,174,96,0.35)' }}>🎉</div>
                      <h2 style={{ fontWeight:900, fontSize:26, color:'#1a1a2e', marginBottom:8 }}>Booking Confirmed!</h2>
                      <p style={{ color:'#888', marginBottom:20 }}>
                        Booking ID: <strong style={{ color:'#e94560' }}>{placedBooking.bookingId}</strong>
                      </p>
                      <div style={{ background:'#f8f9fa', borderRadius:14, padding:'16px 20px',
                        marginBottom:24, textAlign:'left' }}>
                        {selectedAddr && (
                          <div style={{ fontSize:14, color:'#555', marginBottom:8 }}>
                            📍 {selectedAddr.line1}, {selectedAddr.city}
                          </div>
                        )}
                        {cart[0]?.date && <div style={{ fontSize:14, color:'#555', marginBottom:4 }}>
                          📅 {new Date(cart[0].date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                        </div>}
                        {cart[0]?.time && <div style={{ fontSize:14, color:'#555' }}>⏰ {cart[0].time}</div>}
                      </div>
                      <div style={{ display:'flex', gap:12 }}>
                        <button onClick={() => navigate('tracking',{bookingId:placedBooking._id})}
                          style={{ flex:1, background:'linear-gradient(135deg,#e94560,#c0392b)', color:'#fff',
                            border:'none', padding:'14px', borderRadius:12, cursor:'pointer', fontWeight:700 }}>
                          📍 Track Booking
                        </button>
                        <button onClick={() => navigate('home')}
                          style={{ flex:1, background:'#f0f0f0', color:'#333',
                            border:'none', padding:'14px', borderRadius:12, cursor:'pointer', fontWeight:700 }}>
                          Go Home
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ fontWeight:800, fontSize:18, color:'#1a1a2e', marginBottom:20 }}>
                        ✅ Review & Confirm
                      </h3>
                      {cart.map(item => (
                        <div key={item.cartId} style={{ padding:'14px 0', borderBottom:'1px solid #f5f5f5',
                          display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15 }}>{item.serviceName}</div>
                            {item.subServiceName && <div style={{ fontSize:13, color:'#888' }}>{item.subServiceName}</div>}
                            {item.date && <div style={{ fontSize:12, color:'#27ae60', marginTop:4 }}>
                              📅 {item.date} · {item.time}
                            </div>}
                          </div>
                          <div style={{ fontWeight:800, fontSize:16 }}>₹{item.price}</div>
                        </div>
                      ))}
                      {selectedAddr && (
                        <div style={{ marginTop:14, padding:'12px 14px', background:'#e3f2fd',
                          borderRadius:10, fontSize:13, color:'#1565c0' }}>
                          📍 {selectedAddr.line1}, {selectedAddr.area||''}, {selectedAddr.city} — {selectedAddr.pincode}
                        </div>
                      )}
                      <div style={{ marginTop:14, padding:'12px 14px', background:'#f8f9fa',
                        borderRadius:10, fontSize:13, color:'#555' }}>
                        💳 {payMethod === 'online' ? 'Online Payment (Razorpay)' : 'Cash/Card after service'}
                      </div>
                      <div style={{ display:'flex', gap:10, marginTop:20 }}>
                        <button onClick={() => setStep(2)}
                          style={{ flex:1, padding:'14px', background:'#f0f0f0', color:'#555',
                            border:'none', borderRadius:12, cursor:'pointer', fontWeight:700 }}>
                          ← Back
                        </button>
                        <button onClick={handlePlaceOrder} disabled={loading} className="checkout-btn"
                          style={{ flex:2, padding:'14px', background:'linear-gradient(135deg,#e94560,#c0392b)',
                            color:'#fff', border:'none', borderRadius:12, cursor:'pointer',
                            fontWeight:800, fontSize:15, boxShadow:'0 6px 20px rgba(233,69,96,0.3)',
                            transition:'all 0.18s' }}>
                          {loading ? 'Placing Order…' : `🎉 Place Order — ₹${total}`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ORDER SUMMARY */}
            <div style={{ position:'sticky', top:80, alignSelf:'start' }}>
              <div style={{ background:'#fff', borderRadius:20, padding:22, border:'1px solid #f0f0f0',
                boxShadow:'0 4px 20px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontWeight:800, marginBottom:18, color:'#1a1a2e', fontSize:16 }}>Order Summary</h3>
                {cart.map(item => (
                  <div key={item.cartId} style={{ display:'flex', justifyContent:'space-between',
                    marginBottom:10, fontSize:14 }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{item.serviceName}</div>
                      {item.subServiceName && <div style={{ fontSize:12, color:'#888' }}>{item.subServiceName}</div>}
                    </div>
                    <div style={{ fontWeight:700 }}>₹{item.price}</div>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid #f0f0f0', marginTop:12, paddingTop:12 }}>
                  {[['Subtotal', subtotal, '#555'],
                    ...(discount > 0 ? [['Coupon Discount', -discount, '#27ae60']] : []),
                    ['GST (18%)', taxes, '#555'],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ display:'flex', justifyContent:'space-between',
                      fontSize:13, marginBottom:8, color:c }}>
                      <span>{l}</span>
                      <span>{v < 0 ? `-₹${Math.abs(v)}` : `₹${v}`}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900,
                    fontSize:20, borderTop:'2px solid #f0f0f0', paddingTop:12, marginTop:4 }}>
                    <span>Total</span>
                    <span style={{ color:'#e94560' }}>₹{total}</span>
                  </div>
                </div>
                {discount > 0 && (
                  <div style={{ background:'#e8f5e9', borderRadius:10, padding:'10px 14px',
                    marginTop:12, fontSize:13, color:'#27ae60', fontWeight:700 }}>
                    🎉 Saving ₹{discount} on this order
                  </div>
                )}
                <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:6 }}>
                  {['🔒 100% Secure Checkout','🛡️ Verified Professionals','💯 Satisfaction Guaranteed'].map(t => (
                    <div key={t} style={{ fontSize:12, color:'#aaa', display:'flex', alignItems:'center', gap:6 }}>{t}</div>
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
