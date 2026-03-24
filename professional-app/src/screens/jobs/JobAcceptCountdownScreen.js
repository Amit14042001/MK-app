/**
 * Slot App Professional — Job Accept Countdown Screen (Full)
 * UC's signature real-time feature: 30-second window to accept/decline new jobs
 * Shows job details, earnings, distance, countdown ring
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Vibration, StatusBar, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_SECONDS = 30;

function CountdownRing({ seconds }) {
  const progress = seconds / TOTAL_SECONDS;
  const color = seconds > 15 ? '#27AE60' : seconds > 8 ? '#FF9800' : '#E94560';
  const animProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animProgress, { toValue: progress, duration: 950, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={RS.ringWrap}>
      <View style={[RS.ringTrack, { borderColor: color + '30' }]}>
        <View style={RS.ringInner}>
          <Text style={[RS.ringSeconds, { color }]}>{seconds}</Text>
          <Text style={RS.ringLabel}>seconds</Text>
        </View>
      </View>
      <Text style={[RS.urgency, { color }]}>
        {seconds > 20 ? 'New Job!' : seconds > 10 ? 'Hurry!' : 'Last chance!'}
      </Text>
    </View>
  );
}

export default function JobAcceptCountdownScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    job = {
      id: 'JOB12345', service: 'AC Service & Repair',
      category: 'ac_repair', icon: '❄️',
      customerName: 'Ravi Kumar', customerRating: 4.8, customerBookings: 12,
      address: 'Banjara Hills, Hyderabad',
      distance: '2.4 km', travelTime: '8 min',
      scheduledAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      amount: 599, proEarning: 509,
      estimatedDuration: 90,
      isInstant: false,
      notes: 'AC not cooling. Split AC, 1.5 ton.',
    },
  } = route?.params || {};

  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Slide in animation on mount
  useEffect(() => {
    Vibration.vibrate([0, 200, 100, 200]); // Alert vibration
    Animated.parallel([
      Animated.spring(slideInAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse when urgent
  useEffect(() => {
    if (seconds <= 8) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [seconds <= 8]);

  // Countdown timer
  useEffect(() => {
    if (accepted || declined) return;
    if (seconds <= 0) {
      // Auto-decline on timeout
      handleAutoDecline();
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, accepted, declined]);

  const handleAccept = () => {
    setAccepted(true);
    Vibration.vibrate([0, 100, 50, 100]);
    // Navigate to job detail / map navigation
    setTimeout(() => {
      navigation.replace('MapNavigation', { job });
    }, 800);
  };

  const handleDecline = () => {
    Alert.alert('Decline Job?', 'Declining jobs frequently may affect your acceptance rate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: () => {
          setDeclined(true);
          setTimeout(() => navigation.goBack(), 500);
        }
      },
    ]);
  };

  const handleAutoDecline = () => {
    setDeclined(true);
    Alert.alert('Job Expired', 'The job was not accepted in time and has been assigned to another professional.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (accepted) {
    return (
      <LinearGradient colors={['#1A1A2E', '#27AE60']} style={[RS.fullScreen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={RS.acceptedContainer}>
          <Text style={RS.acceptedCheck}>✓</Text>
          <Text style={RS.acceptedTitle}>Job Accepted!</Text>
          <Text style={RS.acceptedSub}>Navigating to customer location...</Text>
        </View>
      </LinearGradient>
    );
  }

  const scheduledTime = new Date(job.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const scheduledDate = new Date(job.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View style={[RS.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={RS.topSection}>
        <Text style={RS.newJobLabel}>🆕 NEW JOB REQUEST</Text>
        <CountdownRing seconds={seconds} />
      </LinearGradient>

      <Animated.View style={[RS.jobCard, { transform: [{ translateY: slideInAnim }], opacity: opacityAnim }]}>
        {/* Service */}
        <View style={RS.serviceRow}>
          <View style={[RS.serviceIconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Text style={RS.serviceIcon}>{job.icon}</Text>
          </View>
          <View style={RS.serviceInfo}>
            <Text style={RS.serviceName}>{job.service}</Text>
            {job.isInstant && <View style={RS.instantBadge}><Text style={RS.instantBadgeText}>⚡ INSTANT</Text></View>}
            <Text style={RS.serviceTime}>🕐 {scheduledDate} at {scheduledTime}</Text>
            <Text style={RS.serviceDuration}>⏱ Est. {job.estimatedDuration} min</Text>
          </View>
        </View>

        {/* Customer info */}
        <View style={RS.customerRow}>
          <Text style={RS.customerAvatar}>👤</Text>
          <View>
            <Text style={RS.customerName}>{job.customerName}</Text>
            <Text style={RS.customerMeta}>⭐ {job.customerRating} rating • {job.customerBookings} bookings on app</Text>
          </View>
        </View>

        {/* Location */}
        <View style={RS.locationRow}>
          <Text style={RS.locationIcon}>📍</Text>
          <View>
            <Text style={RS.locationAddress}>{job.address}</Text>
            <Text style={RS.locationDistance}>🚗 {job.distance} away • ~{job.travelTime} drive</Text>
          </View>
        </View>

        {/* Notes */}
        {job.notes && (
          <View style={RS.notesRow}>
            <Text style={RS.notesIcon}>📝</Text>
            <Text style={RS.notesText}>{job.notes}</Text>
          </View>
        )}

        {/* Earnings */}
        <View style={RS.earningsCard}>
          <View style={RS.earningsItem}>
            <Text style={RS.earningsLabel}>Customer Pays</Text>
            <Text style={RS.earningsCustomer}>₹{job.amount}</Text>
          </View>
          <View style={RS.earningsDivider} />
          <View style={RS.earningsItem}>
            <Text style={RS.earningsLabel}>Your Earning</Text>
            <Text style={RS.earningsYours}>₹{job.proEarning}</Text>
          </View>
          <View style={RS.earningsDivider} />
          <View style={RS.earningsItem}>
            <Text style={RS.earningsLabel}>Platform Fee</Text>
            <Text style={RS.earningsFee}>₹{job.amount - job.proEarning}</Text>
          </View>
        </View>

        {/* Actions */}
        <Animated.View style={[RS.actions, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity style={RS.declineBtn} onPress={handleDecline}>
            <Text style={RS.declineBtnText}>✕  Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={RS.acceptBtn} onPress={handleAccept}>
            <LinearGradient colors={['#27AE60', '#1E8449']} style={RS.acceptBtnGrad}>
              <Text style={RS.acceptBtnText}>✓  Accept Job</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={RS.footerNote}>Accepting this job will assign it to you. Customer will be notified immediately.</Text>
      </Animated.View>
    </View>
  );
}

const RS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  fullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topSection: { paddingBottom: 28, paddingTop: 16, alignItems: 'center' },
  newJobLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 16 },
  ringWrap: { alignItems: 'center' },
  ringTrack: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  ringInner: { alignItems: 'center' },
  ringSeconds: { fontSize: 36, fontWeight: '900' },
  ringLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  urgency: { fontSize: 14, fontWeight: '800', marginTop: 10 },
  jobCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, marginTop: -20 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  serviceIconWrap: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  serviceIcon: { fontSize: 28 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  instantBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4, marginBottom: 4 },
  instantBadgeText: { fontSize: 10, fontWeight: '800', color: '#FF9800' },
  serviceTime: { fontSize: 13, color: '#555', marginTop: 3 },
  serviceDuration: { fontSize: 12, color: '#888', marginTop: 2 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  customerAvatar: { fontSize: 32 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  customerMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  locationIcon: { fontSize: 20, marginTop: 2 },
  locationAddress: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  locationDistance: { fontSize: 12, color: '#2196F3', marginTop: 2, fontWeight: '600' },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFDE7', borderRadius: 12, padding: 12, marginBottom: 14, gap: 10 },
  notesIcon: { fontSize: 16 },
  notesText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
  earningsCard: { flexDirection: 'row', backgroundColor: '#F5F6FA', borderRadius: 16, padding: 16, marginBottom: 20 },
  earningsItem: { flex: 1, alignItems: 'center' },
  earningsLabel: { fontSize: 10, color: '#888', marginBottom: 4 },
  earningsCustomer: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  earningsYours: { fontSize: 18, fontWeight: '900', color: '#27AE60' },
  earningsFee: { fontSize: 14, fontWeight: '600', color: '#888' },
  earningsDivider: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: 8 },
  actions: { flexDirection: 'row', gap: 14 },
  declineBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  declineBtnText: { fontSize: 16, fontWeight: '700', color: '#888' },
  acceptBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  acceptBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  acceptBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  footerNote: { fontSize: 11, color: '#AAA', textAlign: 'center', marginTop: 12 },
  acceptedContainer: { alignItems: 'center' },
  acceptedCheck: { fontSize: 80, color: '#fff', fontWeight: '900', marginBottom: 20 },
  acceptedTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  acceptedSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
