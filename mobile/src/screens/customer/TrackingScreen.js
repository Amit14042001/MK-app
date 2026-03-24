import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Platform, ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Typography, Spacing, Radius, Shadows, Common, Screen } from '../../utils/theme';
import { trackingAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ ? 'http://10.0.2.2:5000' : 'https://api.slotapp.in';

const STATUS_STEPS = [
  { status: 'confirmed', label: 'Booking Confirmed', icon: '✅' },
  { status: 'professional_assigned', label: 'Pro Assigned', icon: '👷' },
  { status: 'professional_arriving', label: 'Pro On The Way', icon: '🚗' },
  { status: 'professional_arrived', label: 'Pro Arrived', icon: '🏠' },
  { status: 'in_progress', label: 'In Progress', icon: '⚡' },
  { status: 'completed', label: 'Completed', icon: '🎉' },
];
const STATUS_ORDER = STATUS_STEPS.map(s => s.status);

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f0' }] },
];

export default function TrackingScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const [tracking, setTracking] = useState(null);
  const [proLocation, setProLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [eta, setEta] = useState(null);
  const mapRef = useRef();
  const socketRef = useRef();
  const slideAnim = useRef(new Animated.Value(Screen.H)).current;

  useEffect(() => {
    loadTracking();
    setupSocket();
    return () => socketRef.current?.disconnect();
  }, [bookingId]);

  useEffect(() => {
    if (chatOpen) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: Screen.H, duration: 250, useNativeDriver: true }).start();
    }
  }, [chatOpen]);

  const loadTracking = async () => {
    try {
      const { data } = await trackingAPI.getBookingTracking(bookingId);
      setTracking(data.tracking);
      if (data.tracking?.professional?.currentLocation) {
        setProLocation(data.tracking.professional.currentLocation);
      }
    } catch {}
    setLoading(false);
  };

  const setupSocket = async () => {
    const token = await AsyncStorage.getItem('slot_access_token');
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.emit('join_booking', bookingId);

    socket.on('location_update', ({ lat, lng, eta: etaMin }) => {
      const coords = { latitude: lat, longitude: lng };
      setProLocation(coords);
      setEta(etaMin);
      mapRef.current?.animateCamera({ center: coords }, { duration: 800 });
    });

    socket.on('status_update', ({ status }) => {
      setTracking(t => t ? { ...t, status } : t);
      if (status === 'completed') {
        // Check if user has completed 3+ bookings — show In-App Review prompt
        (async () => {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const countStr = await AsyncStorage.getItem('slot_completed_bookings');
            const count = parseInt(countStr || '0') + 1;
            await AsyncStorage.setItem('slot_completed_bookings', String(count));
            // Trigger native In-App Review on 3rd, 10th, 25th booking
            if ([3, 10, 25].includes(count)) {
              try {
                const InAppReview = require('react-native-in-app-review');
                if (InAppReview.isAvailable()) {
                  InAppReview.RequestInAppReview()
                    .catch(() => {}); // silently ignore
                }
              } catch {} // package not installed — skip
            }
          } catch {}
        })();
        Alert.alert('Service Completed! 🎉', 'Your service has been completed successfully.', [
          { text: 'Rate Service', onPress: () => navigation.navigate('ReviewScreen', { bookingId }) },
          { text: 'Done', style: 'cancel' },
        ]);
      }
    });

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    const msg = { bookingId, senderId: user?._id, senderType: 'customer', message: chatInput.trim() };
    socketRef.current.emit('send_message', msg);
    setMessages(prev => [...prev, { ...msg, timestamp: new Date() }]);
    setChatInput('');
  };

  const currentStatusIdx = tracking ? STATUS_ORDER.indexOf(tracking.status) : 0;

  const customerCoords = tracking?.address?.coordinates
    ? { latitude: tracking.address.coordinates.lat, longitude: tracking.address.coordinates.lng }
    : { latitude: 17.385, longitude: 78.4867 }; // Default Hyderabad

  if (loading) {
    return (
      <View style={[Common.center, { flex: 1, backgroundColor: Colors.white }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[Typography.body, { marginTop: 12 }]}>Loading tracking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Google Maps */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={MAP_STYLE}
        initialRegion={{
          latitude: proLocation?.latitude || customerCoords.latitude,
          longitude: proLocation?.longitude || customerCoords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        showsUserLocation
        showsMyLocationButton={false}>

        {/* Professional marker */}
        {proLocation && (
          <Marker coordinate={proLocation} title="Your Professional">
            <View style={styles.proMarker}>
              <Text style={{ fontSize: 22 }}>👷</Text>
            </View>
          </Marker>
        )}

        {/* Customer marker */}
        <Marker coordinate={customerCoords} title="Your Location">
          <View style={styles.customerMarker}>
            <Text style={{ fontSize: 18 }}>🏠</Text>
          </View>
        </Marker>

        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.primary}
            strokeWidth={3}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* My location */}
      <TouchableOpacity
        style={styles.myLocationBtn}
        onPress={() => mapRef.current?.animateToRegion({ ...customerCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500)}>
        <Text>📍</Text>
      </TouchableOpacity>

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        {/* Status header */}
        <View style={styles.statusHeader}>
          <Text style={styles.statusIcon}>
            {STATUS_STEPS.find(s => s.status === tracking?.status)?.icon || '📋'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>
              {STATUS_STEPS.find(s => s.status === tracking?.status)?.label || 'Processing'}
            </Text>
            {eta && (
              <Text style={styles.etaText}>ETA: ~{eta} min</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setChatOpen(true)} style={styles.chatBtn}>
            <Text>💬</Text>
            {messages.filter(m => m.senderType !== 'customer').length > 0 && (
              <View style={styles.chatBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Status timeline (horizontal) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStatusIdx;
            const active = i === currentStatusIdx;
            return (
              <View key={step.status} style={styles.timelineStep}>
                <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                  <Text style={{ fontSize: active ? 16 : 12 }}>{done ? step.icon : '○'}</Text>
                </View>
                <Text style={[styles.timelineLabel, active && { color: Colors.primary, fontWeight: '700' }]} numberOfLines={2}>
                  {step.label}
                </Text>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineConnector, { backgroundColor: done && i < currentStatusIdx ? Colors.success : Colors.lightGray }]} />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Professional card */}
        {tracking?.professional && (
          <View style={styles.proCard}>
            <View style={styles.proAvatar}>
              <Text style={styles.proAvatarText}>
                {tracking.professional.user?.name?.charAt(0) || 'P'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proName}>{tracking.professional.user?.name}</Text>
              <Text style={styles.proMeta}>★ {tracking.professional.rating} · {tracking.professional.totalBookings}+ jobs</Text>
            </View>
            <TouchableOpacity
              onPress={() => { Linking.openURL(`tel:+91${tracking.professional.user?.phone}`); }}
              style={styles.callBtn}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Chat Sheet */}
      <Animated.View style={[styles.chatSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Chat</Text>
          <TouchableOpacity onPress={() => setChatOpen(false)}>
            <Text style={{ fontSize: 22, color: Colors.midGray }}>×</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.chatMessages} contentContainerStyle={{ padding: 16 }}>
          {messages.length === 0 ? (
            <Text style={[Typography.small, { textAlign: 'center', marginTop: 40 }]}>No messages yet</Text>
          ) : (
            messages.map((m, i) => (
              <View key={i} style={[styles.chatBubble, m.senderType === 'customer' ? styles.chatBubbleSelf : styles.chatBubbleOther]}>
                <Text style={[styles.chatBubbleText, m.senderType === 'customer' && { color: Colors.white }]}>
                  {m.message}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.lightGray}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.chatSend}>
            <Text style={{ color: Colors.white, fontWeight: '700' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 40, left: 16,
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.md,
  },
  backBtnText: { fontSize: 20, color: Colors.black },
  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 340,
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.md,
  },

  proMarker: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary, ...Shadows.md,
  },
  customerMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.success, ...Shadows.sm,
  },

  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, ...Shadows.lg,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusIcon: { fontSize: 32, marginRight: 12 },
  statusLabel: { ...Typography.h4, lineHeight: 22 },
  etaText: { color: Colors.success, fontSize: 13, fontWeight: '600', marginTop: 2 },
  chatBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.offWhite,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  chatBadge: {
    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.primary,
  },

  timeline: { marginBottom: 16, marginHorizontal: -4 },
  timelineStep: { alignItems: 'center', width: 80, paddingHorizontal: 4, position: 'relative' },
  timelineDot: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  timelineDotDone: { backgroundColor: Colors.successLight },
  timelineDotActive: { backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primary },
  timelineLabel: { fontSize: 10, color: Colors.midGray, textAlign: 'center', lineHeight: 13 },
  timelineConnector: { position: 'absolute', top: 18, right: -20, width: 20, height: 2 },

  proCard: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1,
    borderTopColor: Colors.offWhite, paddingTop: 16, gap: 12,
  },
  proAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  proAvatarText: { color: Colors.white, fontWeight: '800', fontSize: 20 },
  proName: { ...Typography.bodyMed, fontSize: 16 },
  proMeta: { color: Colors.star, fontSize: 13, marginTop: 2 },
  callBtn: {
    backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  callBtnText: { color: Colors.success, fontWeight: '700', fontSize: 13 },

  chatSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: Screen.H * 0.65, backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, ...Shadows.lg,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
  },
  chatTitle: { ...Typography.h4 },
  chatMessages: { flex: 1 },
  chatBubble: {
    padding: 12, borderRadius: Radius.lg, marginBottom: 8, maxWidth: '80%',
  },
  chatBubbleSelf: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  chatBubbleOther: { backgroundColor: Colors.offWhite, alignSelf: 'flex-start' },
  chatBubbleText: { fontSize: 14, color: Colors.black },
  chatInputRow: {
    flexDirection: 'row', padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: Colors.offWhite,
  },
  chatInput: {
    flex: 1, backgroundColor: Colors.offWhite, borderRadius: Radius.xl,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.black,
  },
  chatSend: {
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
    paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
  },
});
