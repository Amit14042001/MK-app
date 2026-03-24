import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useProfAuth } from '../../context/AuthContext';
import axios from 'axios';

const { width: W } = Dimensions.get('window');
const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const BENEFITS = [
  { icon: '💰', title: 'Earn More', desc: 'Keep up to 85% of every job' },
  { icon: '📅', title: 'Flexible Hours', desc: 'Work when you want to work' },
  { icon: '🏆', title: 'Top Rated Pros', desc: 'Join 50,000+ professionals' },
  { icon: '📱', title: 'Easy Payouts', desc: 'Daily bank transfers' },
];

export default function ProfLoginScreen() {
  const { login } = useProfAuth();
  const [step, setStep] = useState('splash'); // splash | phone | otp | register
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [isNewPro, setIsNewPro] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Splash to phone after 2s
    const t = setTimeout(() => {
      setStep('phone');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60 }),
      ]).start();
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(t => t - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) { shake(); setError('Enter valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/send-otp`, { phone, role: 'professional' });
      setIsNewPro(data.isNewUser);
      setStep('otp');
      setTimer(30);
      if (data.otp) setOtp(data.otp.split(''));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send OTP');
      shake();
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 4) { shake(); setError('Enter 4-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/verify-otp`, {
        phone, otp: code, role: 'professional',
        name: name || undefined,
      });
      await login(data.professional || data.user, data.accessToken, data.refreshToken);
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
      shake();
    } finally { setLoading(false); }
  };

  const handleOTPChange = (val, idx) => {
    const v = val.replace(/\D/, '').slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = v;
    setOtp(newOtp);
    if (v && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleOTPKeyDown = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0)
      otpRefs[idx - 1].current?.focus();
  };

  // ── Splash ─────────────────────────────────────────────────
  if (step === 'splash') {
    return (
      <LinearGradient colors={['#1A1A2E', '#0F3460', '#E94560']} style={styles.splash}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.splashIcon}>🛠️</Text>
        <Text style={styles.splashTitle}>Slot Pro</Text>
        <Text style={styles.splashSub}>Professional App</Text>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A1A2E', '#0F3460']} style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={styles.logoIcon}>🛠️</Text>
            <View>
              <Text style={styles.logoTitle}>Slot Pro</Text>
              <Text style={styles.logoSub}>Professional App</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>
            {step === 'phone' ? 'Start Earning Today' : step === 'otp' ? 'Verify Your Number' : 'Complete Profile'}
          </Text>
          <Text style={styles.headerSub}>
            {step === 'phone'
              ? 'Join 50,000+ professionals earning on Slot'
              : step === 'otp'
              ? `OTP sent to +91 ${phone}`
              : 'Tell us a bit about yourself'}
          </Text>
        </LinearGradient>

        {/* Benefits (only on phone step) */}
        {step === 'phone' && (
          <View style={styles.benefitsGrid}>
            {BENEFITS.map(b => (
              <View key={b.title} style={styles.benefitCard}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Form */}
        <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
          {step === 'phone' && (
            <>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  onSubmitEditing={handleSendOTP}
                  returnKeyType="next"
                  placeholderTextColor="#bbb"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity onPress={handleSendOTP} disabled={phone.length !== 10 || loading}
                activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
                <LinearGradient
                  colors={phone.length === 10 ? ['#E94560', '#C0392B'] : ['#ddd', '#ccc']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Get OTP →</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.disclaimer}>
                By continuing, you agree to Slot's{' '}
                <Text style={{ color: '#E94560' }}>Partner Terms</Text> &{' '}
                <Text style={{ color: '#E94560' }}>Privacy Policy</Text>
              </Text>
            </>
          )}

          {step === 'otp' && (
            <>
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(['','','','']); }} style={styles.back}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              {isNewPro && (
                <>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#bbb"
                  />
                </>
              )}

              <Text style={styles.label}>ENTER OTP</Text>
              <View style={styles.otpRow}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    value={d}
                    onChangeText={v => handleOTPChange(v, i)}
                    onKeyPress={e => handleOTPKeyDown(e, i)}
                    style={[styles.otpBox, d && styles.otpBoxFilled]}
                    maxLength={1}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                ))}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.timerRow}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend in <Text style={{ color: '#E94560', fontWeight: '700' }}>{timer}s</Text></Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOTP}>
                    <Text style={{ color: '#E94560', fontWeight: '700' }}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity onPress={handleVerifyOTP} disabled={otp.join('').length !== 4 || loading}
                activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
                <LinearGradient
                  colors={otp.join('').length === 4 ? ['#E94560', '#C0392B'] : ['#ddd', '#ccc']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.primaryBtnText}>
                      {isNewPro ? 'Create Account →' : 'Sign In →'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flexGrow: 1 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashIcon: { fontSize: 64, marginBottom: 12 },
  splashTitle: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  splashSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 4 },
  header: { padding: 24, paddingTop: 56, paddingBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoIcon: { fontSize: 28 },
  logoTitle: { color: '#fff', fontWeight: '900', fontSize: 20 },
  logoSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 34 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6, lineHeight: 20 },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  benefitCard: { width: (W - 44) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  benefitIcon: { fontSize: 26, marginBottom: 6 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  benefitDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
  form: { padding: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' },
  countryCode: { paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#E8E8E8' },
  countryText: { fontSize: 14, fontWeight: '600', color: '#333' },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#1A1A2E', fontWeight: '500' },
  input: { borderWidth: 1.5, borderColor: '#E8E8E8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A2E', backgroundColor: '#fff', marginBottom: 16 },
  error: { color: '#E94560', fontSize: 13, fontWeight: '500', marginTop: 6 },
  primaryBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  back: { marginBottom: 16 },
  backText: { color: '#888', fontSize: 14 },
  otpRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginBottom: 8 },
  otpBox: { width: 64, height: 64, borderWidth: 2, borderColor: '#E8E8E8', borderRadius: 12, fontSize: 26, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', backgroundColor: '#fafafa' },
  otpBoxFilled: { borderColor: '#E94560', backgroundColor: '#FFF0F3' },
  timerRow: { alignItems: 'center', marginTop: 8 },
  timerText: { color: '#888', fontSize: 14 },
});
