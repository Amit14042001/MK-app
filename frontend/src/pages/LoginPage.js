import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { authAPI } from '../utils/api';
import { socialSignIn } from '../utils/firebase';

const SERVICES = ['AC Service','Salon','Cleaning','Plumber','Car Battery','Oil Change','Spa','Electrician'];

export default function LoginPage({ navigate }) {
  const { login, showToast } = useApp();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['','','','']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [shake, setShake] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  // Handle Firebase redirect result
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const { getAuth, getRedirectResult } = await import('firebase/auth');
        const auth = getAuth();
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const idToken = await result.user.getIdToken();
          const provider = result.providerId.includes('google') ? 'google' : 'facebook';
          const { data } = await authAPI.socialLogin({ provider, idToken });
          login(data.user, data.accessToken, data.refreshToken);
          showToast(`Welcome ${data.user.name || 'User'}! 🎉`, 'success');
          navigate('home');
        }
      } catch (err) {
        console.error('Redirect result error:', err);
        showToast('Social login failed. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    checkRedirect();
  }, []);

  // service ticker

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) { triggerShake(); showToast('Enter valid 10-digit number', 'error'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.sendOTP(phone);
      setIsNewUser(data.isNewUser);
      setStep('otp');
      setTimer(30);
      if (data.otp) setOtp(data.otp.split(''));
      setTimeout(() => otpRefs[0].current?.focus(), 300);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send OTP', 'error');
      triggerShake();
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 4) { triggerShake(); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP({ phone, otp: code, name: name || undefined, email: email || undefined });
      login(data.user, data.accessToken, data.refreshToken);
      showToast(`Welcome${data.user.name ? ', ' + data.user.name : ''}! 🎉`, 'success');
      navigate('home');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid OTP', 'error');
      setOtp(['','','','']);
      otpRefs[0].current?.focus();
      triggerShake();
    } finally { setLoading(false); }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    try {
      await socialSignIn(provider, true); // true = useRedirect for more direct experience
      // Note: Code execution stops here as browser redirects to Google/FB
    } catch (err) {
      console.error('Social login error:', err);
      let msg = err.response?.data?.message || `${provider} login failed.`;
      if (err.code === 'auth/operation-not-allowed') {
        msg = `${provider} login is not enabled in Firebase.`;
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Login popup was closed.';
      }
      showToast(msg, 'error');
      triggerShake();
    } finally { setLoading(false); }
  };

  const handleOTPInput = (val, idx) => {
    const v = val.replace(/\D/, '').slice(-1);
    const next = [...otp]; next[idx] = v; setOtp(next);
    if (v && idx < 3) otpRefs[idx + 1].current?.focus();
    if (v && idx === 3) setTimeout(handleVerifyOTP, 200);
  };

  const handleOTPKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
    if (e.key === 'Enter') handleVerifyOTP();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #fff0f3 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { font-family: inherit; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker { from{opacity:0;transform:translateY(10px)} 15%,85%{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-10px)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .shake { animation: shake 0.4s ease; }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .input-field:focus { border-color: #e94560 !important; box-shadow: 0 0 0 3px rgba(233,69,96,0.12) !important; }
        .otp-box:focus { border-color: #e94560 !important; background: #fff0f3 !important; }
        .social-btn:hover { border-color: #e94560 !important; background: #fff8f9 !important; }
        .tab-btn:hover { background: rgba(255,255,255,0.15) !important; }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div style={{
        width: 480, background: 'linear-gradient(160deg, #1a1a2e 0%, #0f3460 55%, #16213e 100%)',
        padding: '52px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Bg circles */}
        {[{s:320,t:-100,r:-100,o:0.04},{s:200,b:-60,l:-60,o:0.06},{s:150,t:'40%',r:-40,o:0.05}].map((c,i) => (
          <div key={i} style={{ position:'absolute', width:c.s, height:c.s, borderRadius:'50%',
            background:'rgba(233,69,96,0.15)', top:c.t, right:c.r, bottom:c.b, left:c.l, opacity:c.o }} />
        ))}

        {/* Logo */}
        <div>
          <div onClick={() => navigate('home')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:48 }}>
            <img src="/logo.png" alt="MK Logo" style={{ width:50, height:50, borderRadius:12, objectFit:'cover' }} />
            <span style={{ color:'#fff', fontWeight:800, fontSize:24, letterSpacing:-0.5 }}>MK Services</span>
          </div>

          <h2 style={{ color:'#fff', fontSize:36, fontWeight:900, lineHeight:1.2, letterSpacing:-1, marginBottom:14 }}>
            India's Most Trusted<br />Home Services
          </h2>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:15, lineHeight:1.7, marginBottom:32 }}>
            Book verified professionals for
          </p>

          {/* Service ticker */}
          <div style={{ height:36, overflow:'hidden', marginBottom:40 }}>
            <div key={tickerIdx} style={{ animation:'ticker 2s ease', color:'#e94560', fontSize:20, fontWeight:700 }}>
              {SERVICES[tickerIdx]}
            </div>
          </div>
        </div>

        {/* Trust items */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {[
            ['🛡️','100% Verified Professionals','Background-checked & trained experts'],
            ['⭐','4.8★ Average Rating','Rated by 11M+ happy customers'],
            ['💰','Transparent Pricing','Zero hidden charges, ever'],
            ['📱','Real-Time Tracking','Live GPS tracking of your professional'],
          ].map(([icon, title, sub]) => (
            <div key={title} style={{ display:'flex', gap:14, alignItems:'center' }}>
              <div style={{ width:42, height:42, borderRadius:11, background:'rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0,
                backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)' }}>{icon}</div>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{title}</div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:1 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>
        <div style={{ width:'100%', maxWidth:420 }} className={shake ? 'shake' : ''}>

          {step === 'phone' ? (
            <div className="fade-up">
              {/* Mode toggle */}
              <div style={{ display:'flex', background:'#f0f0f0', borderRadius:14, padding:4, marginBottom:36 }}>
                {['login','signup'].map(m => (
                  <button key={m} onClick={() => setMode(m)} className="tab-btn" style={{
                    flex:1, padding:'12px 0', borderRadius:11, border:'none', cursor:'pointer', fontWeight:700, fontSize:14,
                    background: mode===m ? '#fff' : 'transparent',
                    color: mode===m ? '#e94560' : '#888',
                    boxShadow: mode===m ? '0 2px 12px rgba(0,0,0,0.1)' : 'none',
                    transition:'all 0.2s',
                  }}>{m === 'login' ? 'Login' : 'Sign Up'}</button>
                ))}
              </div>

              <h2 style={{ fontSize:26, fontWeight:900, color:'#1a1a2e', letterSpacing:-0.5, marginBottom:6 }}>
                {mode === 'login' ? 'Welcome back 👋' : 'Create your account'}
              </h2>
              <p style={{ color:'#aaa', fontSize:14, marginBottom:28 }}>
                {mode === 'login' ? 'Sign in to continue booking services' : 'Join 11M+ satisfied customers'}
              </p>

              {/* Primary Social Login */}
              <button 
                onClick={() => handleSocialLogin('google')} 
                className="social-btn" 
                style={{
                  width: '100%', padding: '15px', border: '1.5px solid #e8e8e8', borderRadius: 14, background: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, transition: 'all 0.15s', marginBottom: 20
                }} 
                disabled={loading}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: 20, height: 20 }} />
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#efefef' }} />
                <span style={{ color: '#ccc', fontSize: 13 }}>or use phone number</span>
                <div style={{ flex: 1, height: 1, background: '#efefef' }} />
              </div>

              {mode === 'signup' && (
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:12 }}>
                  <input placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)}
                    className="input-field" style={{ ...inputStyle }} />
                  <input placeholder="Email Address (optional)" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} className="input-field" style={{ ...inputStyle }} />
                </div>
              )}

              {/* Phone input */}
              <div style={{ display:'flex', border:'1.5px solid #e8e8e8', borderRadius:12, overflow:'hidden',
                background:'#fafafa', marginBottom:20, transition:'all 0.2s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px',
                  borderRight:'1.5px solid #e8e8e8', background:'#f4f4f4' }}>
                  <span>🇮🇳</span>
                  <span style={{ fontWeight:700, color:'#333', fontSize:14 }}>+91</span>
                </div>
                <input
                  value={phone} maxLength={10} placeholder="Mobile number"
                  onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  onKeyDown={e => e.key==='Enter' && handleSendOTP()}
                  className="input-field"
                  style={{ flex:1, padding:'14px 16px', border:'none', outline:'none', fontSize:15,
                    fontWeight:600, background:'transparent', color:'#1a1a2e', letterSpacing:1 }}
                />
              </div>

              <button onClick={handleSendOTP} disabled={phone.length !== 10 || loading}
                style={{
                  width:'100%', padding:'15px', borderRadius:14, border:'none', cursor: phone.length===10 ? 'pointer' : 'not-allowed',
                  background: phone.length===10 ? 'linear-gradient(135deg,#e94560,#c0392b)' : '#f0f0f0',
                  color: phone.length===10 ? '#fff' : '#bbb', fontWeight:800, fontSize:16, marginBottom:20,
                  boxShadow: phone.length===10 ? '0 6px 20px rgba(233,69,96,0.35)' : 'none',
                  transition:'all 0.2s', letterSpacing:-0.3,
                }}>{loading ? 'Sending…' : 'Get OTP →'}</button>

              {/* Other Options */}
              <div style={{ display:'flex', justifyContent: 'center' }}>
                <button onClick={() => handleSocialLogin('facebook')} className="social-btn" style={{
                  padding:'10px 24px', border:'1.5px solid #e8e8e8', borderRadius:12, background:'#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
                  gap:8, transition:'all 0.15s',
                }} disabled={loading}><span style={{ fontSize:15 }}>🔷</span> Facebook Login</button>
              </div>

              <p style={{ textAlign:'center', fontSize:11, color:'#ccc', marginTop:24, lineHeight:1.8 }}>
                By continuing, you agree to our{' '}
                <span style={{ color:'#e94560', cursor:'pointer', fontWeight:600 }}>Terms of Service</span>{' '}
                and{' '}
                <span style={{ color:'#e94560', cursor:'pointer', fontWeight:600 }}>Privacy Policy</span>
              </p>
            </div>
          ) : (
            <div className="fade-up">
              <button onClick={() => { setStep('phone'); setOtp(['','','','']); }}
                style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:14,
                  display:'flex', alignItems:'center', gap:6, marginBottom:32, padding:0 }}>
                ← Back
              </button>

              <h2 style={{ fontSize:26, fontWeight:900, color:'#1a1a2e', letterSpacing:-0.5, marginBottom:6 }}>
                Verify number
              </h2>
              <p style={{ color:'#aaa', fontSize:14, marginBottom:32, lineHeight:1.6 }}>
                OTP sent to{' '}
                <strong style={{ color:'#333' }}>+91 {phone}</strong>
                <button onClick={() => setStep('phone')}
                  style={{ background:'none', border:'none', color:'#e94560', cursor:'pointer', fontSize:13,
                    fontWeight:700, marginLeft:8, padding:0 }}>Change</button>
              </p>

              {/* OTP boxes */}
              <div style={{ display:'flex', gap:12, marginBottom:24, justifyContent:'center' }}>
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} value={d} maxLength={1}
                    onChange={e => handleOTPInput(e.target.value, i)}
                    onKeyDown={e => handleOTPKey(e, i)}
                    className="otp-box"
                    style={{ width:68, height:72, textAlign:'center', fontSize:28, fontWeight:900,
                      border:`2.5px solid ${d ? '#e94560' : '#e8e8e8'}`,
                      borderRadius:14, outline:'none', background: d ? '#fff0f3' : '#fafafa',
                      color:'#1a1a2e', transition:'all 0.15s', cursor:'text',
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <div style={{ textAlign:'center', marginBottom:24, fontSize:14 }}>
                {timer > 0 ? (
                  <span style={{ color:'#aaa' }}>
                    Resend OTP in{' '}
                    <span style={{ color:'#e94560', fontWeight:700 }}>{timer}s</span>
                  </span>
                ) : (
                  <button onClick={handleSendOTP} style={{ background:'none', border:'none',
                    color:'#e94560', cursor:'pointer', fontWeight:700, fontSize:14, padding:0 }}>
                    Resend OTP
                  </button>
                )}
              </div>

              <button onClick={handleVerifyOTP} disabled={otp.join('').length !== 4 || loading}
                style={{
                  width:'100%', padding:'15px', borderRadius:14, border:'none',
                  cursor: otp.join('').length===4 ? 'pointer' : 'not-allowed',
                  background: otp.join('').length===4 ? 'linear-gradient(135deg,#e94560,#c0392b)' : '#f0f0f0',
                  color: otp.join('').length===4 ? '#fff' : '#bbb', fontWeight:800, fontSize:16,
                  boxShadow: otp.join('').length===4 ? '0 6px 20px rgba(233,69,96,0.35)' : 'none',
                  transition:'all 0.2s',
                }}>{loading ? 'Verifying…' : isNewUser ? 'Create Account' : 'Sign In'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width:'100%', padding:'13px 16px', border:'1.5px solid #e8e8e8',
  borderRadius:12, fontSize:14, outline:'none', background:'#fafafa',
  color:'#1a1a2e', transition:'all 0.2s', fontFamily:'inherit',
};
