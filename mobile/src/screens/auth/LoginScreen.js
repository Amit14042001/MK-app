import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Dimensions,
  ActivityIndicator, Animated, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Common } from '../../utils/theme';
import { authAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');

const SERVICES_PREVIEW = ['AC Service', 'Salon', 'Cleaning', 'Plumber', 'Car Battery', 'Oil Change'];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [step, setStep] = useState('phone'); // phone | otp | name
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError('Enter valid 10-digit mobile number');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.sendOTP(phone);
      setIsNewUser(data.isNewUser);
      setStep('otp');
      setTimer(30);
      // In dev, auto-fill OTP
      if (data.otp) setOtp(data.otp.split(''));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      shake();
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 4) {
      setError('Enter complete 4-digit OTP');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP({
        phone,
        otp: code,
        name: name || undefined,
        email: email || undefined,
      });
      await login(data.user, data.accessToken, data.refreshToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Try again.');
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

  const handleOTPKeyPress = ({ nativeEvent }, idx) => {
    if (nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: Colors.white }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />

      {/* Top hero */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={styles.hero}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Logo */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>Slot</Text>
          </View>
          <Text style={styles.heroTitle}>Home Services{'\n'}At Your Doorstep</Text>
          <Text style={styles.heroSub}>Verified professionals for 200+ services</Text>

          {/* Services chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            {SERVICES_PREVIEW.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </LinearGradient>

      {/* Form card */}
      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled">

        {step === 'phone' && (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Text style={styles.formTitle}>Login / Sign Up</Text>
            <Text style={styles.formSub}>Enter your mobile number to continue</Text>

            {/* Phone Input */}
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.dialCode}>+91</Text>
                <View style={styles.divider} />
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="Mobile Number"
                placeholderTextColor={Colors.lightGray}
                returnKeyType="done"
                onSubmitEditing={handleSendOTP}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={phone.length !== 10 || loading}
              style={[styles.btn, phone.length !== 10 && styles.btnDisabled]}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Get OTP</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or continue with</Text>
              <View style={styles.orLine} />
            </View>

            {/* Social */}
            <View style={styles.socialRow}>
              {[['G', '#EA4335', 'Google'], ['f', '#1877F2', 'Facebook']].map(([ic, col, nm]) => (
                <TouchableOpacity key={nm} style={styles.socialBtn}>
                  <Text style={[styles.socialIcon, { color: col }]}>{ic}</Text>
                  <Text style={styles.socialText}>{nm}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.terms}>
              By continuing you agree to our{' '}
              <Text style={styles.link}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        )}

        {step === 'otp' && (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(['','','','']); }} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.formTitle}>Verify OTP</Text>
            <Text style={styles.formSub}>
              Sent to +91 {phone}{' '}
              <Text onPress={() => setStep('phone')} style={styles.link}>Change</Text>
            </Text>

            {/* OTP boxes */}
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={otpRefs[i]}
                  style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  value={digit}
                  onChangeText={(v) => handleOTPChange(v, i)}
                  onKeyPress={(e) => handleOTPKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Timer / Resend */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              {timer > 0 ? (
                <Text style={styles.formSub}>Resend in <Text style={{ color: Colors.primary, fontWeight: '700' }}>{timer}s</Text></Text>
              ) : (
                <TouchableOpacity onPress={handleSendOTP}>
                  <Text style={[styles.link, { fontSize: 15 }]}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {isNewUser && (
              <View style={styles.nameSection}>
                <Text style={styles.nameSectionTitle}>Create your profile</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your Name *"
                  placeholderTextColor={Colors.lightGray}
                />
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email (optional)"
                  keyboardType="email-address"
                  placeholderTextColor={Colors.lightGray}
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleVerifyOTP}
              disabled={otp.join('').length !== 4 || loading}
              style={[styles.btn, otp.join('').length !== 4 && styles.btnDisabled]}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Verify & Continue</Text>}
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logo: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: { color: Colors.white, fontWeight: '900', fontSize: 20 },
  heroTitle: {
    color: Colors.white, fontSize: 28, fontWeight: '800',
    lineHeight: 36, letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14,
    marginTop: 8, lineHeight: 20,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  formContainer: { padding: 24, paddingBottom: 48 },
  formTitle: { ...Typography.h2, marginBottom: 6 },
  formSub: { ...Typography.body, marginBottom: 24 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.lightGray,
    borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 16,
    backgroundColor: Colors.offWhite,
  },
  countryCode: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
  },
  flag: { fontSize: 18, marginRight: 6 },
  dialCode: { ...Typography.bodyMed, marginRight: 8 },
  divider: { width: 1, height: 20, backgroundColor: Colors.lightGray },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '600', color: Colors.black,
  },

  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { backgroundColor: Colors.lightGray, shadowOpacity: 0 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  error: {
    color: Colors.error, fontSize: 13, fontWeight: '600',
    marginBottom: 12, textAlign: 'center',
  },

  orRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.offWhite },
  orText: { ...Typography.small, marginHorizontal: 12 },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.lightGray, borderRadius: Radius.lg,
    paddingVertical: 12, gap: 8,
  },
  socialIcon: { fontSize: 18, fontWeight: '900' },
  socialText: { ...Typography.bodyMed, color: Colors.gray },

  terms: { ...Typography.small, textAlign: 'center', lineHeight: 18 },
  link: { color: Colors.primary, fontWeight: '600' },

  back: { marginBottom: 16 },
  backText: { color: Colors.midGray, fontSize: 14 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpBox: {
    width: (W - 48 - 36) / 4,
    height: 64, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.lightGray,
    fontSize: 28, fontWeight: '800', color: Colors.black,
    backgroundColor: Colors.offWhite,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },

  nameSection: {
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg,
    padding: 16, marginBottom: 20,
  },
  nameSectionTitle: { ...Typography.h4, marginBottom: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.lightGray,
    borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.black, backgroundColor: Colors.white,
  },
});
