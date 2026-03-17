/**
 * MK App — PaymentRetryScreen (Feature #19) + CancellationPolicyScreen (Feature #20)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Animated, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
// FEATURE #19 — Payment Failure / Retry Screen
// ══════════════════════════════════════════════════════════════
export function PaymentRetryScreen({ navigation, route }) {
  const { bookingId, amount, reason, orderId } = route?.params || {
    bookingId: 'BK12345', amount: 619, reason: 'Payment declined by bank', orderId: 'order_123',
  };

  const [retrying, setRetrying]     = useState(false);
  const [selectedMethod, setMethod] = useState('upi');
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const PAYMENT_METHODS = [
    { id: 'upi',     icon: '💳', label: 'UPI',             sub: 'GPay, PhonePe, Paytm' },
    { id: 'card',    icon: '💰', label: 'Credit/Debit Card',sub: 'Visa, Mastercard, RuPay' },
    { id: 'netbank', icon: '🏦', label: 'Net Banking',      sub: 'All major banks' },
    { id: 'wallet',  icon: '👛', label: 'MK Wallet',        sub: 'Balance: ₹200' },
    { id: 'cash',    icon: '💵', label: 'Pay at Service',   sub: 'Cash on delivery' },
  ];

  const FAILURE_REASONS: Record<string, string> = {
    'insufficient_funds': '💳 Insufficient balance in your account',
    'card_declined':      '🚫 Your card was declined by the bank',
    'network_error':      '🌐 Network error during payment',
    'timeout':            '⏰ Payment timed out',
    'default':            '⚠️ Payment could not be processed',
  };

  const displayReason = FAILURE_REASONS[reason] || FAILURE_REASONS.default;

  const retryPayment = async () => {
    setRetrying(true);
    try {
      const { paymentsAPI } = require('../../utils/api');
      const RazorpayCheckout = require('react-native-razorpay').default;
      // Create a fresh Razorpay order for retry
      const { data: orderData } = await paymentsAPI.createOrder({ bookingId, amount });
      const paymentData = await RazorpayCheckout.open({
        description:    'MK App Payment Retry',
        image:          'https://mkapp.in/logo.png',
        currency:       'INR',
        key:            process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx',
        amount:         amount * 100,
        name:           'MK Services',
        order_id:       orderData.orderId,
        theme:          { color: '#E94560' },
      });
      await paymentsAPI.verify({
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
        bookingId,
      });
      Alert.alert('Payment Successful!', `Booking ${bookingId} confirmed.`, [
        { text: 'View Booking', onPress: () => navigation.replace('BookingDetail', { bookingId }) },
      ]);
    } catch (e) {
      if (e?.code !== 0) {
        Alert.alert('Payment Failed', e?.description || 'Please try a different payment method.');
      }
    }
    setRetrying(false);
  };

  return (
    <View style={PR.container}>
      <View style={PR.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={PR.backBtn}>
          <Text style={PR.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={PR.headerTitle}>Payment Failed</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Failure banner */}
        <Animated.View style={[PR.failureBanner, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={PR.failureIcon}>❌</Text>
          <Text style={PR.failureTitle}>Payment Failed</Text>
          <Text style={PR.failureReason}>{displayReason}</Text>
          <View style={PR.bookingInfo}>
            <Text style={PR.bookingInfoText}>Booking: {bookingId} · ₹{amount}</Text>
          </View>
        </Animated.View>

        {/* What happens next */}
        <View style={PR.infoBox}>
          <Text style={PR.infoTitle}>ℹ️ What happens now?</Text>
          <Text style={PR.infoText}>• Your booking is on hold — not cancelled</Text>
          <Text style={PR.infoText}>• No amount has been deducted</Text>
          <Text style={PR.infoText}>• Your booking will be confirmed once payment is successful</Text>
          <Text style={PR.infoText}>• Booking is reserved for 30 minutes</Text>
        </View>

        {/* Choose payment method */}
        <Text style={PR.sectionTitle}>Try a different payment method</Text>

        {PAYMENT_METHODS.map(method => (
          <TouchableOpacity
            key={method.id}
            style={[PR.methodCard, selectedMethod === method.id && PR.methodCardSelected]}
            onPress={() => setMethod(method.id)}
            activeOpacity={0.85}
          >
            <Text style={PR.methodIcon}>{method.icon}</Text>
            <View style={PR.methodInfo}>
              <Text style={PR.methodLabel}>{method.label}</Text>
              <Text style={PR.methodSub}>{method.sub}</Text>
            </View>
            <View style={[PR.radio, selectedMethod === method.id && PR.radioSelected]}>
              {selectedMethod === method.id && <View style={PR.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Retry button */}
        <TouchableOpacity
          style={[PR.retryBtn, retrying && PR.retryBtnLoading]}
          onPress={retryPayment}
          disabled={retrying}
        >
          {retrying
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={PR.retryBtnText}>Retry Payment ₹{amount} →</Text>
          }
        </TouchableOpacity>

        {/* Cancel option */}
        <TouchableOpacity
          style={PR.cancelBtn}
          onPress={() => Alert.alert('Cancel Booking?', 'This will cancel your booking. Continue?', [
            { text: 'Keep Booking', style: 'cancel' },
            { text: 'Cancel Booking', style: 'destructive', onPress: () => navigation.navigate('HomeTab') },
          ])}
        >
          <Text style={PR.cancelBtnText}>Cancel Booking</Text>
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity style={PR.helpBtn} onPress={() => navigation.navigate('Help')}>
          <Text style={PR.helpBtnText}>Need help? Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #20 — Cancellation Policy Screen
// ══════════════════════════════════════════════════════════════
export function CancellationPolicyScreen({ navigation, route }) {
  const booking = route?.params?.booking || {
    bookingId: 'BK12345',
    service: { name: 'AC Service' },
    scheduledDate: new Date(Date.now() + 6 * 3600000), // 6 hours from now
    pricing: { totalAmount: 619, amountPaid: 619 },
    payment: { status: 'paid' },
  };

  const [agreeing, setAgreeing] = useState(false);
  const [agreed, setAgreed]     = useState(false);

  const hoursUntil = Math.max(0, (new Date(booking.scheduledDate) - new Date()) / 3600000);
  const refundAmt  = hoursUntil > 24 ? booking.pricing.amountPaid : hoursUntil > 4 ? Math.round(booking.pricing.amountPaid * 0.5) : 0;
  const refundPct  = hoursUntil > 24 ? 100 : hoursUntil > 4 ? 50 : 0;

  const POLICY_TIERS = [
    { timeframe: 'More than 24 hours before', refund: '100% refund', icon: '✅', active: hoursUntil > 24 },
    { timeframe: '4–24 hours before',         refund: '50% refund',  icon: '🟡', active: hoursUntil > 4 && hoursUntil <= 24 },
    { timeframe: 'Less than 4 hours before',  refund: 'No refund',   icon: '❌', active: hoursUntil <= 4 },
  ];

  const confirmCancel = async () => {
    if (!agreed) { Alert.alert('Agreement Required', 'Please agree to the cancellation policy.'); return; }
    setAgreeing(true);
    try {
      const { bookingsAPI } = require('../../utils/api');
      await bookingsAPI.cancel(bookingId, 'Payment failure — customer cancelled');
      setAgreeing(false);
      Alert.alert(
        'Booking Cancelled',
        refundAmt > 0
          ? `₹${refundAmt} will be refunded to your MK Wallet within 24 hours.`
          : 'No refund is applicable as per our cancellation policy.',
        [{ text: 'OK', onPress: () => navigation.navigate('BookingsTab') }]
      );
    } catch (e) {
      setAgreeing(false);
      Alert.alert('Error', e?.response?.data?.message || 'Could not cancel booking. Please contact support.');
    }
  };

  return (
    <View style={CP.container}>
      <View style={CP.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={CP.backBtn}>
          <Text style={CP.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={CP.headerTitle}>Cancellation Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Booking summary */}
        <View style={CP.bookingCard}>
          <Text style={CP.bookingTitle}>{booking.service?.name}</Text>
          <Text style={CP.bookingId}>Booking: {booking.bookingId}</Text>
          <Text style={CP.bookingDate}>
            Scheduled: {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <View style={CP.timeLeft}>
            <Text style={[CP.timeLeftText, { color: hoursUntil > 24 ? Colors.success : hoursUntil > 4 ? Colors.warning : Colors.error }]}>
              ⏱ {hoursUntil > 24 ? `${Math.floor(hoursUntil / 24)} days` : `${Math.round(hoursUntil)} hours`} until service
            </Text>
          </View>
        </View>

        {/* Policy tiers */}
        <Text style={CP.sectionTitle}>Our Cancellation Policy</Text>
        {POLICY_TIERS.map((tier, i) => (
          <View key={i} style={[CP.policyRow, tier.active && CP.policyRowActive]}>
            <Text style={CP.policyIcon}>{tier.icon}</Text>
            <View style={CP.policyInfo}>
              <Text style={[CP.policyTimeframe, tier.active && CP.policyTextActive]}>{tier.timeframe}</Text>
              <Text style={[CP.policyRefund, tier.active && CP.policyTextActive]}>{tier.refund}</Text>
            </View>
            {tier.active && (
              <View style={CP.activeBadge}><Text style={CP.activeBadgeText}>Current</Text></View>
            )}
          </View>
        ))}

        {/* Refund summary */}
        <View style={[CP.refundCard, { backgroundColor: refundAmt > 0 ? Colors.successLight : Colors.errorLight }]}>
          <Text style={CP.refundTitle}>Your Refund</Text>
          <Text style={[CP.refundAmount, { color: refundAmt > 0 ? Colors.success : Colors.error }]}>
            ₹{refundAmt} ({refundPct}% of ₹{booking.pricing.amountPaid})
          </Text>
          {refundAmt > 0 ? (
            <Text style={CP.refundNote}>💰 Credited to MK Wallet within 24 hours</Text>
          ) : (
            <Text style={[CP.refundNote, { color: Colors.error }]}>⚠️ No refund applicable — too close to scheduled time</Text>
          )}
        </View>

        {/* Alternatives */}
        <View style={CP.alternatives}>
          <Text style={CP.altTitle}>💡 Consider These Alternatives</Text>
          <TouchableOpacity
            style={CP.altCard}
            onPress={() => navigation.navigate('Reschedule', { bookingId: booking.bookingId })}
          >
            <Text style={CP.altIcon}>📅</Text>
            <View style={CP.altInfo}>
              <Text style={CP.altLabel}>Reschedule Instead</Text>
              <Text style={CP.altDesc}>Free rescheduling up to 2 times</Text>
            </View>
            <Text style={CP.altArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Agreement */}
        <TouchableOpacity style={CP.agreeRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
          <View style={[CP.checkbox, agreed && CP.checkboxChecked]}>
            {agreed && <Text style={CP.checkboxCheck}>✓</Text>}
          </View>
          <Text style={CP.agreeText}>
            I understand the cancellation policy and accept that {refundAmt > 0 ? `₹${refundAmt} will be refunded` : 'no refund will be issued'}.
          </Text>
        </TouchableOpacity>

        {/* Cancel button */}
        <TouchableOpacity
          style={[CP.cancelBtn, (!agreed || agreeing) && CP.cancelBtnDisabled]}
          onPress={confirmCancel}
          disabled={!agreed || agreeing}
        >
          {agreeing
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={CP.cancelBtnText}>Confirm Cancellation</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={CP.keepBtn} onPress={() => navigation.goBack()}>
          <Text style={CP.keepBtnText}>← Keep My Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const PR = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  failureBanner:{ backgroundColor: Colors.errorLight, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  failureIcon:  { fontSize: 52, marginBottom: 10 },
  failureTitle: { ...Typography.h2, color: Colors.error, marginBottom: 6 },
  failureReason:{ ...Typography.body, color: Colors.error, textAlign: 'center', marginBottom: 12 },
  bookingInfo:  { backgroundColor: 'rgba(231,76,60,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookingInfoText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },
  infoBox:      { backgroundColor: Colors.infoLight, borderRadius: 14, padding: 14, marginBottom: 16 },
  infoTitle:    { ...Typography.body, color: Colors.info, fontWeight: '700', marginBottom: 8 },
  infoText:     { ...Typography.caption, color: Colors.info, marginBottom: 4, lineHeight: 18 },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  methodCard:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm },
  methodCardSelected: { borderColor: Colors.primary },
  methodIcon:   { fontSize: 26 },
  methodInfo:   { flex: 1 },
  methodLabel:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  methodSub:    { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  radioSelected:{ borderColor: Colors.primary },
  radioInner:   { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  retryBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  retryBtnLoading: { opacity: 0.7 },
  retryBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:{ ...Typography.body, color: Colors.error },
  helpBtn:      { paddingVertical: 10, alignItems: 'center' },
  helpBtnText:  { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
});

const CP = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  bookingCard:  { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, ...Shadows.sm },
  bookingTitle: { ...Typography.h3, color: Colors.black, marginBottom: 4 },
  bookingId:    { ...Typography.caption, color: Colors.gray },
  bookingDate:  { ...Typography.body, color: Colors.darkGray, marginTop: 4, marginBottom: 8 },
  timeLeft:     { backgroundColor: Colors.offWhite, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  timeLeftText: { ...Typography.body, fontWeight: '700' },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  policyRow:    { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...Shadows.sm, borderWidth: 1.5, borderColor: 'transparent' },
  policyRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  policyIcon:   { fontSize: 24 },
  policyInfo:   { flex: 1 },
  policyTimeframe: { ...Typography.body, color: Colors.black, fontWeight: '600' },
  policyRefund: { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  policyTextActive: { color: Colors.primary },
  activeBadge:  { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { ...Typography.small, color: Colors.white, fontWeight: '700' },
  refundCard:   { borderRadius: 16, padding: 16, marginVertical: 12, alignItems: 'center' },
  refundTitle:  { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 6, letterSpacing: 0.8 },
  refundAmount: { fontSize: 32, fontWeight: '800', marginBottom: 6 },
  refundNote:   { ...Typography.caption, color: Colors.gray },
  alternatives: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12, ...Shadows.sm },
  altTitle:     { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 10 },
  altCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 12, gap: 10 },
  altIcon:      { fontSize: 24 },
  altInfo:      { flex: 1 },
  altLabel:     { ...Typography.body, color: Colors.black, fontWeight: '600' },
  altDesc:      { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  altArrow:     { fontSize: 20, color: Colors.midGray },
  agreeRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxCheck:{ fontSize: 12, color: Colors.white, fontWeight: '800' },
  agreeText:    { ...Typography.body, color: Colors.darkGray, flex: 1, lineHeight: 22 },
  cancelBtn:    { backgroundColor: Colors.error, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  keepBtn:      { paddingVertical: 12, alignItems: 'center' },
  keepBtnText:  { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});
