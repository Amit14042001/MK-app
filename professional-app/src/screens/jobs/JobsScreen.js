import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Platform, RefreshControl,
  Animated, Vibration,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Radius, Shadows, Common, Spacing } from '../utils/theme';
import { api } from '../context/AuthContext';

const API_URL = __DEV__ ? 'http://10.0.2.2:5000' : 'https://api.slotapp.in';

const STATUS_FLOW = {
  confirmed: { next: 'professional_arriving', label: 'Start Heading', icon: '🚗', color: Colors.info },
  professional_arriving: { next: 'professional_arrived', label: 'Mark Arrived', icon: '🏠', color: Colors.warning },
  professional_arrived: { next: 'in_progress', label: 'Start Service', icon: '⚡', color: Colors.primary },
  in_progress: { next: 'completed', label: 'Complete Service', icon: '✅', color: Colors.success },
};

const STATUS_LABELS = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  professional_arriving: '🚗 You\'re Heading',
  professional_arrived: '🏠 Arrived',
  in_progress: '⚡ In Progress',
  completed: '🎉 Completed',
  cancelled: '❌ Cancelled',
};

function BookingCard({ booking, onAction, onViewDetail }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [updating, setUpdating] = useState(false);
  const action = STATUS_FLOW[booking.status];

  const handleAction = async () => {
    if (!action) return;
    setUpdating(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    await onAction(booking._id, action.next);
    setUpdating(false);
  };

  const isUpcoming = ['confirmed'].includes(booking.status);
  const isActive = ['professional_arriving', 'professional_arrived', 'in_progress'].includes(booking.status);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => onViewDetail(booking)}
        style={[styles.card, isActive && styles.cardActive]}>

        {isActive && (
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillText}>ACTIVE NOW</Text>
          </View>
        )}

        {/* Service info */}
        <View style={[Common.rowBetween, { marginBottom: 12 }]}>
          <View style={Common.row}>
            <Text style={{ fontSize: 32, marginRight: 12 }}>{booking.service?.icon || '🔧'}</Text>
            <View>
              <Text style={styles.serviceName}>{booking.service?.name}</Text>
              {booking.subService?.name && (
                <Text style={styles.subService}>{booking.subService.name}</Text>
              )}
            </View>
          </View>
          <View style={styles.earningsChip}>
            <Text style={styles.earningsText}>₹{booking.professional?.earnings?.toFixed(0) || booking.pricing?.professionalEarnings?.toFixed(0) || 0}</Text>
          </View>
        </View>

        {/* Customer info */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {booking.customer?.name?.charAt(0) || 'C'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{booking.customer?.name}</Text>
            <Text style={styles.customerPhone}>📱 {booking.customer?.phone}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {/* Linking.openURL(`tel:+91${booking.customer?.phone}`) */}}
            style={styles.callBtn}>
            <Text style={styles.callBtnText}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule & address */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>📅 {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'N/A'} · ⏰ {booking.scheduledTime}</Text>
        </View>
        {booking.address && (
          <Text style={styles.addressText} numberOfLines={1}>
            📍 {booking.address.line1}, {booking.address.area || ''}, {booking.address.city}
          </Text>
        )}

        {/* Status */}
        <View style={[Common.rowBetween, { marginTop: 12 }]}>
          <View style={[styles.statusChip, isActive && styles.statusChipActive]}>
            <Text style={[styles.statusChipText, isActive && { color: Colors.primary }]}>
              {STATUS_LABELS[booking.status] || booking.status}
            </Text>
          </View>

          {action && (
            <TouchableOpacity
              onPress={handleAction}
              disabled={updating}
              style={[styles.actionBtn, { backgroundColor: action.color }]}>
              {updating
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.actionBtnText}>{action.icon} {action.label}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function JobsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [earnings, setEarnings] = useState({ today: 0, week: 0 });
  const socketRef = useRef();
  const locationIntervalRef = useRef();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    setupSocket();
    if (isOnline) startLocationSharing();
    return () => cleanup();
  }, [activeTab]);

  useEffect(() => {
    if (isOnline) {
      startLocationSharing();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      stopLocationSharing();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  const cleanup = () => {
    socketRef.current?.disconnect();
    clearInterval(locationIntervalRef.current);
  };

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const statusFilter = {
        upcoming: 'confirmed',
        active: 'professional_arriving,professional_arrived,in_progress',
        completed: 'completed',
      };
      const { data } = await api.get('/professionals/my-bookings', {
        params: { status: statusFilter[activeTab] },
      });
      setBookings(data.bookings || []);

      // Load earnings
      const earningsRes = await api.get('/professionals/earnings/summary');
      setEarnings(earningsRes.data.summary || { today: 0, week: 0 });
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const setupSocket = async () => {
    const token = await AsyncStorage.getItem('slot_access_token');
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    // New booking assignment
    socket.on('booking_assigned', (data) => {
      Vibration.vibrate([0, 300, 100, 300]);
      Alert.alert(
        '🔔 New Booking!',
        `${data.serviceName} — ₹${data.earnings}\n${data.address}`,
        [
          { text: 'View', onPress: () => loadData() },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
      loadData();
    });

    socket.on('booking_cancelled', (data) => {
      Alert.alert('Booking Cancelled', `Booking ${data.bookingId} has been cancelled.`);
      loadData();
    });
  };

  const startLocationSharing = async () => {
    const permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    const result = await request(permission);
    if (result !== RESULTS.GRANTED) return;

    setLocationSharing(true);
    const sendLocation = () => {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          socketRef.current?.emit('professional_location', { lat: latitude, lng: longitude });
          api.post('/tracking/location', { lat: latitude, lng: longitude }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };
    sendLocation();
    locationIntervalRef.current = setInterval(sendLocation, 8000);
  };

  const stopLocationSharing = () => {
    setLocationSharing(false);
    clearInterval(locationIntervalRef.current);
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, {
        status: newStatus,
        note: `Status updated to ${newStatus} by professional`,
      });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleToggleOnline = () => {
    const newStatus = !isOnline;
    Alert.alert(
      newStatus ? 'Go Online' : 'Go Offline',
      newStatus ? 'You will start receiving job requests.' : 'You will stop receiving new requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Go Online' : 'Go Offline',
          onPress: async () => {
            setIsOnline(newStatus);
            await api.put('/professionals/availability', { isAvailable: newStatus }).catch(() => {});
          },
        },
      ]
    );
  };

  const TABS = [
    { key: 'upcoming', label: 'Upcoming', icon: '📋' },
    { key: 'active', label: 'Active', icon: '⚡' },
    { key: 'completed', label: 'Done', icon: '✅' },
  ];

  return (
    <View style={Common.container}>
      {/* Top bar with online toggle */}
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.topBar}>
        <View>
          <Text style={styles.topGreet}>My Jobs</Text>
          <Text style={styles.topEarnings}>Today: ₹{earnings.today} · Week: ₹{earnings.week}</Text>
        </View>

        <TouchableOpacity onPress={handleToggleOnline} style={styles.onlineToggle}>
          <Animated.View style={[
            styles.onlinePulse,
            isOnline && { transform: [{ scale: pulseAnim }] },
            { backgroundColor: isOnline ? 'rgba(39,174,96,0.3)' : 'transparent' },
          ]} />
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? Colors.success : Colors.midGray }]} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jobs list */}
      {loading ? (
        <View style={Common.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onAction={handleStatusUpdate}
              onViewDetail={(b) => navigation.navigate('JobDetail', { booking: b })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming' ? 'No upcoming jobs.\nStay online to receive bookings!' : `No ${activeTab} jobs`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  topGreet: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  topEarnings: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },

  onlineToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.pill,
    paddingHorizontal: 16, paddingVertical: 10, position: 'relative',
  },
  onlinePulse: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    left: -4,
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabIcon: { fontSize: 16 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.midGray },
  tabTextActive: { color: Colors.primary },

  list: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16,
    marginBottom: 14, ...Shadows.card, borderWidth: 1, borderColor: Colors.offWhite,
  },
  cardActive: {
    borderColor: Colors.primary, borderWidth: 1.5,
    ...Shadows.md,
  },

  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: 10,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  activePillText: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  serviceName: { ...Typography.bodyMed, fontSize: 16 },
  subService: { ...Typography.small, marginTop: 2 },

  earningsChip: {
    backgroundColor: Colors.successLight, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  earningsText: { color: Colors.success, fontWeight: '800', fontSize: 15 },

  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: 10, marginBottom: 10,
  },
  customerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  customerName: { ...Typography.bodyMed },
  customerPhone: { ...Typography.small, marginTop: 1 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  callBtnText: { fontSize: 18 },

  infoRow: { marginBottom: 4 },
  infoText: { fontSize: 13, color: Colors.gray },
  addressText: { fontSize: 12, color: Colors.midGray },

  statusChip: {
    backgroundColor: Colors.offWhite, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill,
  },
  statusChipActive: { backgroundColor: Colors.primaryLight },
  statusChipText: { fontSize: 12, fontWeight: '600', color: Colors.midGray },

  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
});
