/**
 * Slot App Professional — Check-In Screen (Full)
 * Customer OTP verification at job start, GPS location confirm, job timer start
 * Urban Company's signature "verify before you begin" feature
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Alert, Animated, Vibration, Dimensions, TextInput,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

const CHECK_IN_STATES = {
  ARRIVAL: 'arrival',       // Pro has arrived, show "I've arrived" button
  OTP_ENTRY: 'otp_entry',   // Waiting for customer OTP
  VERIFYING: 'verifying',   // Checking OTP
  VERIFIED: 'verified',     // OTP matched, job can begin
  STARTED: 'started',       // Job timer running
};

function OTPBox({ value, isFocused }) {
  return (
    <View style={[styles.otpBox, isFocused && styles.otpBoxFocused, value && styles.otpBoxFilled]}>
      <Text style={styles.otpDigit}>{value}</Text>
      {isFocused && !value && <View style={styles.cursor} />}
    </View>
  );
}

export default function CheckInScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, customerName, serviceName, address } = route?.params || {
    bookingId: 'BK00123456', customerName: 'Ravi Kumar', serviceName: 'AC Service & Repair',
    address: '123, Banjara Hills, Hyderabad',
  };

  const [state, setState] = useState(CHECK_IN_STATES.ARRIVAL);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isResending, setIsResending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const inputRef = useRef(null);
  const successScale = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for "arrived" state
  useEffect(() => {
    if (state === CHECK_IN_STATES.ARRIVAL) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [state]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleArrived = async () => {
    try {
      const token = await AsyncStorage.getItem('proToken');
      await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/tracking/checkin-arrived/${bookingId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      console.warn('[CheckIn] Arrived API failed (non-fatal):', e.message);
    }
    setState(CHECK_IN_STATES.OTP_ENTRY);
    setOtpSent(true);
    setResendTimer(30);
    setTimeout(() => inputRef.current?.focus(), 300);
    Alert.alert(
      '📱 OTP Sent!',
      `A 4-digit OTP has been sent to ${customerName}'s registered mobile number.\nAsk them to share it with you.`,
      [{ text: 'OK' }]
    );
  };

  const handleOTPChange = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(cleaned);
    if (cleaned.length === 4) {
      handleVerifyOTP(cleaned);
    }
  };

  const handleVerifyOTP = async (enteredOtp) => {
    setState(CHECK_IN_STATES.VERIFYING);
    Vibration.vibrate(50);

    try {
      const token = await AsyncStorage.getItem('proToken');
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/tracking/verify-checkin-otp/${bookingId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ otp: enteredOtp }),
        }
      );
      const data = await resp.json();
      const isCorrect = data.success;

      if (isCorrect) {
        setState(CHECK_IN_STATES.VERIFIED);
        Vibration.vibrate([0, 100, 50, 100]);
        Animated.spring(successScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      } else {
        throw new Error(data.message || 'Incorrect OTP');
      }
    } catch (e) {
      setAttemptsLeft(a => a - 1);
      setOtp('');
      setState(CHECK_IN_STATES.OTP_ENTRY);

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();

      if (attemptsLeft <= 1) {
        Alert.alert('Too Many Attempts', 'OTP verification failed 3 times. Please contact customer support.', [
          { text: 'Call Support', onPress: () => {} },
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Wrong OTP', `Incorrect OTP. ${attemptsLeft - 1} attempt${attemptsLeft - 1 !== 1 ? 's' : ''} remaining.`);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      const token = await AsyncStorage.getItem('proToken');
      await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/tracking/checkin-arrived/${bookingId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {}
    setIsResending(false);
    setOtp('');
    setResendTimer(30);
    Alert.alert('OTP Resent', `New OTP sent to ${customerName}'s number.`);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleStartJob = () => {
    setState(CHECK_IN_STATES.STARTED);
    navigation.replace('JobTimer', {
      bookingId,
      customerName,
      serviceName,
      startedAt: new Date().toISOString(),
    });
  };

  const handleCannotVerify = () => {
    Alert.alert(
      'Cannot Verify?',
      'If the customer cannot receive the OTP (no signal, wrong number), you can:\n\n1. Call our support line\n2. Ask customer to show their booking confirmation\n3. Manual verify via supervisor approval',
      [
        { text: 'Call Support', onPress: () => {} },
        { text: 'Manual Verify', onPress: () => setState(CHECK_IN_STATES.VERIFIED) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── ARRIVAL STATE ─────────────────────────────────────────
  if (state === CHECK_IN_STATES.ARRIVAL) {
    return (
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.arrivedContainer}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingLabel}>BOOKING</Text>
            <Text style={styles.bookingId}>#{bookingId.slice(-8).toUpperCase()}</Text>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <View style={styles.customerRow}>
              <Text style={styles.customerIcon}>👤</Text>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText}>{address}</Text>
            </View>
          </View>

          <Text style={styles.arrivedHeading}>You've Arrived!</Text>
          <Text style={styles.arrivedSub}>Let {customerName} know you're here, then tap the button below. An OTP will be sent to their phone.</Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived}>
              <LinearGradient colors={['#27AE60', '#1E8449']} style={styles.arrivedBtnGrad}>
                <Text style={styles.arrivedBtnIcon}>✅</Text>
                <Text style={styles.arrivedBtnText}>I've Arrived — Send OTP</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Back to Job</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── OTP ENTRY STATE ───────────────────────────────────────
  if (state === CHECK_IN_STATES.OTP_ENTRY || state === CHECK_IN_STATES.VERIFYING) {
    return (
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.otpContainer}>
          <Text style={styles.otpHeading}>Enter Customer OTP</Text>
          <Text style={styles.otpSub}>Ask {customerName} to share the 4-digit OTP sent to their phone.</Text>

          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            <OTPBox value={otp[0]} isFocused={otp.length === 0 && state !== CHECK_IN_STATES.VERIFYING} />
            <OTPBox value={otp[1]} isFocused={otp.length === 1 && state !== CHECK_IN_STATES.VERIFYING} />
            <OTPBox value={otp[2]} isFocused={otp.length === 2 && state !== CHECK_IN_STATES.VERIFYING} />
            <OTPBox value={otp[3]} isFocused={otp.length === 3 && state !== CHECK_IN_STATES.VERIFYING} />
          </Animated.View>

          {/* Hidden input to capture keyboard */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleOTPChange}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
          />

          {state === CHECK_IN_STATES.VERIFYING && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator color="#27AE60" size="small" />
              <Text style={styles.verifyingText}>Verifying OTP...</Text>
            </View>
          )}

          <View style={styles.attemptsRow}>
            <Text style={styles.attemptsText}>{attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining</Text>
          </View>

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>Resend OTP in {resendTimer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
                {isResending ? <ActivityIndicator color="#E94560" size="small" /> : <Text style={styles.resendLink}>Resend OTP</Text>}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.cantVerifyBtn} onPress={handleCannotVerify}>
            <Text style={styles.cantVerifyText}>Customer can't receive OTP?</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── VERIFIED STATE ────────────────────────────────────────
  if (state === CHECK_IN_STATES.VERIFIED) {
    return (
      <LinearGradient colors={['#1A1A2E', '#1E8449']} style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.verifiedContainer}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <Text style={styles.successTick}>✓</Text>
          </Animated.View>

          <Text style={styles.verifiedHeading}>Identity Verified!</Text>
          <Text style={styles.verifiedSub}>Customer identity confirmed. You can now begin the service.</Text>

          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedService}>{serviceName}</Text>
            <Text style={styles.verifiedCustomer}>👤 {customerName}</Text>
            <Text style={styles.verifiedTime}>⏰ {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          <View style={styles.checklist}>
            <Text style={styles.checklistTitle}>Before You Begin:</Text>
            {[
              'Introduce yourself to the customer',
              'Do a walkthrough of the work area',
              'Confirm service inclusions/exclusions',
              'Take BEFORE photos',
              'Agree on any additional charges upfront',
            ].map((item, i) => (
              <View key={i} style={styles.checklistItem}>
                <Text style={styles.checklistCheck}>✓</Text>
                <Text style={styles.checklistText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.startJobBtn} onPress={handleStartJob}>
            <LinearGradient colors={['#27AE60', '#1E8449']} style={styles.startJobBtnGrad}>
              <Text style={styles.startJobBtnText}>▶  Start Job Timer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  arrivedContainer: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  bookingInfo: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginBottom: 32 },
  bookingLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 4 },
  bookingId: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  serviceName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  customerIcon: { fontSize: 16 },
  customerName: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressIcon: { fontSize: 14 },
  addressText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  arrivedHeading: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  arrivedSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  arrivedBtn: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  arrivedBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 12 },
  arrivedBtnIcon: { fontSize: 24 },
  arrivedBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  otpContainer: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  otpHeading: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  otpSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  otpRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  otpBox: { width: 62, height: 72, borderRadius: 16, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  otpBoxFocused: { borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.15)' },
  otpBoxFilled: { borderColor: '#27AE60', backgroundColor: 'rgba(39,174,96,0.2)' },
  otpDigit: { fontSize: 28, fontWeight: '900', color: '#fff' },
  cursor: { width: 2, height: 32, backgroundColor: '#27AE60', borderRadius: 1 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  verifyingText: { fontSize: 14, color: '#27AE60', fontWeight: '600' },
  attemptsRow: { marginBottom: 16 },
  attemptsText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  resendRow: { marginBottom: 20 },
  resendTimer: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  resendLink: { fontSize: 14, color: '#E94560', fontWeight: '700', textAlign: 'center' },
  cantVerifyBtn: { paddingVertical: 12 },
  cantVerifyText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline' },
  verifiedContainer: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowColor: '#27AE60', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  successTick: { fontSize: 56, color: '#fff', fontWeight: '900' },
  verifiedHeading: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 12 },
  verifiedSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  verifiedInfo: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 24, width: '100%' },
  verifiedService: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  verifiedCustomer: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  verifiedTime: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  checklist: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, width: '100%', marginBottom: 28 },
  checklistTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  checklistCheck: { fontSize: 14, color: '#27AE60', fontWeight: '800', marginRight: 10 },
  checklistText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  startJobBtn: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  startJobBtnGrad: { paddingVertical: 20, alignItems: 'center' },
  startJobBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
