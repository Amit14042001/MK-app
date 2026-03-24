import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '🏠',
    title: 'Home Services\nat Your Doorstep',
    subtitle: 'Book AC repair, cleaning, electricians and 200+ more services — all from your phone.',
    bg: ['#1A1A2E', '#0F3460'],
    accent: '#E94560',
  },
  {
    id: '2',
    icon: '🛡️',
    title: 'Verified &\nTrusted Professionals',
    subtitle: 'Every pro is background-checked, skill-tested and rated by thousands of real customers.',
    bg: ['#1A1A2E', '#1B5E20'],
    accent: '#4CAF50',
  },
  {
    id: '3',
    icon: '📱',
    title: 'Real-Time\nLive Tracking',
    subtitle: 'Watch your professional arrive on a live map. Chat, call, and manage everything in-app.',
    bg: ['#1A1A2E', '#1A237E'],
    accent: '#3F51B5',
  },
  {
    id: '4',
    icon: '🚗',
    title: 'Now: Automotive\nServices Too',
    subtitle: 'Car battery, jump start, oil change and tyre service — right at your gate, 24/7.',
    bg: ['#1A1A2E', '#B71C1C'],
    accent: '#E94560',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0);
  const flatRef  = useRef(null);
  const dotScale = useRef(SLIDES.map(() => new Animated.Value(1))).current;

  const goTo = (idx) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrent(idx);
    // Bounce active dot
    Animated.sequence([
      Animated.timing(dotScale[idx], { toValue: 1.5, duration: 150, useNativeDriver: true }),
      Animated.spring(dotScale[idx],  { toValue: 1,   useNativeDriver: true, tension: 200 }),
    ]).start();
  };

  const next = () => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else onDone?.();
  };

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== current) setCurrent(idx);
  };

  const slide = SLIDES[current];

  return (
    <LinearGradient colors={slide.bg} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip */}
      <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Icon bubble */}
            <View style={[styles.iconBubble, { borderColor: item.accent + '40' }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            onTouchEnd={() => goTo(i)}
            style={[
              styles.dot,
              {
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? slide.accent : 'rgba(255,255,255,0.3)',
                transform: [{ scale: dotScale[i] }],
              },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        {current < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={next} style={[styles.nextBtn, { backgroundColor: slide.accent }]}>
            <Text style={styles.nextText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onDone} activeOpacity={0.85} style={styles.startBtnWrap}>
            <LinearGradient colors={['#E94560', '#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
              style={styles.startBtn}>
              <Text style={styles.startText}>Get Started 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn:   { position: 'absolute', top: 56, right: 24, zIndex: 10, padding: 8 },
  skipText:  { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  slide: {
    width: W, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, paddingTop: 80,
  },
  iconBubble: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 44,
  },
  icon:     { fontSize: 72 },
  title:    { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 38, marginBottom: 18 },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 16, textAlign: 'center', lineHeight: 25, fontWeight: '400' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 32 },
  dot:  { height: 8, borderRadius: 4, transition: 'width 0.3s' },
  footer: { paddingHorizontal: 28, paddingBottom: 52 },
  nextBtn: { borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  startBtnWrap: { borderRadius: 28, overflow: 'hidden' },
  startBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 28 },
  startText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.3 },
});

// ── Permission Request Screen (shown after onboarding) ────────
export function PermissionScreen({ onAllow, onSkip }) {
  const insets = useSafeAreaInsets();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const slideUp = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const requestLocation = async () => {
    try {
      const { PermissionsAndroid, Platform } = require('react-native');
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Location Permission', message: 'Slot App needs your location to find professionals near you.', buttonPositive: 'Allow' }
        );
        setLocationGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // iOS — react-native-permissions
        try {
          const { request, PERMISSIONS: PERMS, RESULTS } = require('react-native-permissions');
          const result = await request(PERMS.IOS.LOCATION_WHEN_IN_USE);
          setLocationGranted(result === RESULTS.GRANTED);
        } catch { setLocationGranted(true); }
      }
    } catch { setLocationGranted(true); }
  };

  const requestNotifications = async () => {
    try {
      const { PermissionsAndroid, Platform } = require('react-native');
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          { title: 'Notification Permission', message: 'Enable notifications to get booking updates and offers.', buttonPositive: 'Allow' }
        );
        setNotifGranted(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else if (Platform.OS === 'ios') {
        try {
          const messaging = require('@react-native-firebase/messaging').default;
          const status = await messaging().requestPermission();
          setNotifGranted([1,2].includes(status));
        } catch { setNotifGranted(true); }
      } else {
        setNotifGranted(true);
      }
    } catch { setNotifGranted(true); }
  };

  const PERMISSIONS = [
    {
      id: 'location',
      icon: '📍',
      title: 'Location Access',
      desc: 'Needed to show professionals near you and track their arrival in real-time.',
      required: true,
      granted: locationGranted,
      onRequest: requestLocation,
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Push Notifications',
      desc: 'Get real-time updates on your booking status, professional arrival and special offers.',
      required: false,
      granted: notifGranted,
      onRequest: requestNotifications,
    },
  ];

  return (
    <LinearGradient colors={['#1A1A2E', '#0F3460']} style={{ flex: 1, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
      <Animated.View style={{ flex: 1, paddingHorizontal: 28, opacity, transform: [{ translateY: slideUp }] }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 }}>Almost there! 🎉</Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 22 }}>
          Allow these permissions for the best experience. You can change them anytime in Settings.
        </Text>
        {PERMISSIONS.map(perm => (
          <TouchableOpacity
            key={perm.id}
            style={{
              backgroundColor: perm.granted ? 'rgba(39,174,96,0.2)' : 'rgba(255,255,255,0.1)',
              borderRadius: 18, padding: 20, marginBottom: 16,
              borderWidth: 1.5, borderColor: perm.granted ? '#27AE60' : 'rgba(255,255,255,0.2)',
              flexDirection: 'row', alignItems: 'center',
            }}
            onPress={perm.granted ? undefined : perm.onRequest}
            activeOpacity={perm.granted ? 1 : 0.85}
          >
            <Text style={{ fontSize: 32, marginRight: 16 }}>{perm.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{perm.title}</Text>
                {perm.required && (
                  <View style={{ backgroundColor: '#E94560', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>REQUIRED</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17 }}>{perm.desc}</Text>
            </View>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: perm.granted ? '#27AE60' : 'rgba(255,255,255,0.15)',
              justifyContent: 'center', alignItems: 'center', marginLeft: 12,
            }}>
              <Text style={{ fontSize: 16, color: '#fff' }}>{perm.granted ? '✓' : '→'}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={{
            backgroundColor: locationGranted ? '#E94560' : 'rgba(255,255,255,0.2)',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12,
          }}
          onPress={() => locationGranted && onAllow?.()}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>
            {locationGranted ? 'Get Started →' : 'Allow Location to Continue'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}
