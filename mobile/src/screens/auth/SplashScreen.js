/**
 * MK App — Splash Screen (Full Production v2)
 * Animated logo reveal, pulse rings, particles, progress bar
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar, Dimensions, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');
const APP_VERSION = '2.1.0';

function PulseRing({ delay, size, color, duration }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: color, opacity, transform: [{ scale }],
    }} />
  );
}

function FloatParticle({ x, y, size, delay }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 3000, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.8, duration: 500, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, bottom: y, width: size, height: size,
      borderRadius: size / 2, backgroundColor: 'rgba(233,69,96,0.6)', opacity, transform: [{ translateY }],
    }} />
  );
}

const PARTICLES = [
  { x: W * 0.1, y: H * 0.15, size: 6, delay: 0 },
  { x: W * 0.85, y: H * 0.2, size: 4, delay: 500 },
  { x: W * 0.25, y: H * 0.35, size: 8, delay: 1000 },
  { x: W * 0.7, y: H * 0.1, size: 5, delay: 1500 },
  { x: W * 0.5, y: H * 0.05, size: 3, delay: 800 },
  { x: W * 0.15, y: H * 0.5, size: 7, delay: 300 },
  { x: W * 0.9, y: H * 0.4, size: 4, delay: 1200 },
];

const TAGLINES = ['Home services, simplified.', '200+ services at your doorstep.', 'Trusted professionals. Guaranteed.'];

export default function SplashScreen({ onFinish }) {
  const logoScale   = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate  = useRef(new Animated.Value(-0.05)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTransY  = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTransY  = useRef(new Animated.Value(15)).current;
  const dotScale     = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const versionOpacity = useRef(new Animated.Value(0)).current;
  const bottomOpacity  = useRef(new Animated.Value(0)).current;
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const tagTimer = setInterval(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 1500);
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoRotate, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleTransY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineTransY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(dotScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(versionOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(bottomOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(progressWidth, { toValue: W - 80, duration: 1200, useNativeDriver: false }),
      Animated.delay(200),
    ]).start(() => { clearInterval(tagTimer); onFinish?.(); });
    return () => clearInterval(tagTimer);
  }, []);

  const spinDeg = logoRotate.interpolate({ inputRange: [-0.05, 0], outputRange: ['-5deg', '0deg'] });

  return (
    <LinearGradient colors={['#0D0D1A', '#1A1A2E', '#0F3460']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" translucent />
      {PARTICLES.map((p, i) => <FloatParticle key={i} {...p} />)}
      <View style={styles.rings}>
        <PulseRing delay={0}    size={200} color="rgba(233,69,96,0.4)"  duration={2200} />
        <PulseRing delay={700}  size={280} color="rgba(233,69,96,0.25)" duration={2200} />
        <PulseRing delay={1400} size={360} color="rgba(233,69,96,0.15)" duration={2200} />
      </View>
      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: spinDeg }] }]}>
          <LinearGradient colors={['#E94560', '#C0392B']} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.logoLetter}>M</Text>
          </LinearGradient>
          <Animated.View style={[styles.logoDot, { transform: [{ scale: dotScale }] }]}>
            <Text style={{ fontSize: 8, color: '#fff' }}>●</Text>
          </Animated.View>
        </Animated.View>
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTransY }] }}>
          <Text style={styles.appName}>MK App</Text>
        </Animated.View>
        <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineTransY }] }}>
          <Text style={styles.tagline}>{TAGLINES[taglineIdx]}</Text>
        </Animated.View>
        <Animated.View style={[styles.iconsRow, { opacity: taglineOpacity }]}>
          {['🔧','💅','🧹','🌿','⚡'].map((icon, i) => (
            <View key={i} style={styles.iconBubble}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
          ))}
        </Animated.View>
        <Animated.View style={[styles.statsRow, { opacity: taglineOpacity }]}>
          {[['200+','Services'],['50k+','Pros'],['2M+','Bookings']].map(([val, lbl], i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statVal}>{val}</Text>
              <Text style={styles.statLbl}>{lbl}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[styles.bottom, { opacity: bottomOpacity }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Animated.View style={[styles.versionRow, { opacity: versionOpacity }]}>
          <Text style={styles.versionText}>v{APP_VERSION}</Text>
          <View style={styles.dot} />
          <Text style={styles.versionText}>© 2026 MK App</Text>
        </Animated.View>
        <Text style={styles.madeIn}>Made with ❤️ in India</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  rings: { position: 'absolute', top: '35%', alignItems: 'center', justifyContent: 'center', width: '100%', height: 400 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoWrap: { position: 'relative', marginBottom: 24 },
  logoGrad: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#E94560', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  logoLetter: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  logoDot: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#27AE60', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A2E' },
  appName: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 1, textAlign: 'center', marginBottom: 10 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', letterSpacing: 0.3, height: 22 },
  iconsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  bottom: { width: '100%', alignItems: 'center', paddingHorizontal: 40 },
  progressTrack: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E94560', borderRadius: 2 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  versionText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  madeIn: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
});
