/**
 * MK App — FlashSaleTimer (Feature #25)
 * VideoPlayer (Feature #13 — Pro intro video)
 * AccessibilityHelpers (Feature #33)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, AccessibilityInfo, Platform,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

// Real react-native-video — graceful fallback to animated progress bar
let Video = null;
try { Video = require('react-native-video').default; } catch {}


const { width: W } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
// FEATURE #25 — Flash Sale Countdown Timer
// ══════════════════════════════════════════════════════════════
export function FlashSaleTimer({ endTime, title, discount, couponCode, onPress, style }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired]   = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const end  = new Date(endTime);
      const diff = end - now;

      if (diff <= 0) { setExpired(true); return; }

      const hours   = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  useEffect(() => {
    if (timeLeft.hours === 0 && timeLeft.minutes < 10) {
      // Urgent pulse when < 10 mins left
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [timeLeft.minutes]);

  const pad = (n) => String(n).padStart(2, '0');
  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  if (expired) return null;

  return (
    <Animated.View
      style={[FS.container, isUrgent && FS.containerUrgent, style, { transform: [{ scale: pulseAnim }] }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Flash sale: ${discount} off with code ${couponCode}. Ends in ${timeLeft.hours} hours ${timeLeft.minutes} minutes`}
    >
      <TouchableOpacity style={FS.inner} onPress={onPress} activeOpacity={0.9}>
        <View style={FS.left}>
          <Text style={FS.flashIcon}>⚡</Text>
          <View>
            <Text style={FS.title}>{title || 'Flash Sale!'}</Text>
            <Text style={FS.discount}>{discount} OFF — Code: {couponCode}</Text>
          </View>
        </View>
        <View style={FS.timerBox}>
          <TimeUnit value={pad(timeLeft.hours)}   label="HRS" urgent={isUrgent} />
          <Text style={[FS.colon, isUrgent && FS.colonUrgent]}>:</Text>
          <TimeUnit value={pad(timeLeft.minutes)} label="MIN" urgent={isUrgent} />
          <Text style={[FS.colon, isUrgent && FS.colonUrgent]}>:</Text>
          <TimeUnit value={pad(timeLeft.seconds)} label="SEC" urgent={isUrgent} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TimeUnit({ value, label, urgent }) {
  return (
    <View style={[FS.timeUnit, urgent && FS.timeUnitUrgent]}>
      <Text style={[FS.timeValue, urgent && FS.timeValueUrgent]}>{value}</Text>
      <Text style={FS.timeLabel}>{label}</Text>
    </View>
  );
}

// ── Mini version for home screen strip ───────────────────────
export function FlashSaleStrip({ sales = [], onPressSale }) {
  return (
    <View style={FS.strip}>
      <Text style={FS.stripTitle}>⚡ Flash Deals</Text>
      {sales.map(sale => (
        <TouchableOpacity key={sale.id} style={FS.stripItem} onPress={() => onPressSale?.(sale)}>
          <Text style={FS.stripEmoji}>{sale.icon}</Text>
          <View style={FS.stripInfo}>
            <Text style={FS.stripService}>{sale.service}</Text>
            <Text style={FS.stripDiscount}>{sale.discount}</Text>
          </View>
          <FlashSaleTimer
            endTime={sale.endTime}
            discount=""
            couponCode=""
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #13 — Professional Intro Video Player
// ══════════════════════════════════════════════════════════════
export function ProVideoPlayer({ videoUrl, thumbnail, proName, style }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const togglePlay = () => setPlaying(p => !p);

  // Animated progress bar used only when Video SDK not linked
  useEffect(() => {
    if (Video || !playing) { progressAnim.stopAnimation(); return; }
    Animated.timing(progressAnim, { toValue: 1, duration: 30000, useNativeDriver: false })
      .start(({ finished }) => { if (finished) { setPlaying(false); progressAnim.setValue(0); } });
    return () => progressAnim.stopAnimation();
  }, [playing]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[VP.container, style]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Watch ${proName}'s introduction video`}
    >
      {/* Real video when SDK linked, thumbnail fallback otherwise */}
      {Video && videoUrl ? (
        <Video
          source={{ uri: videoUrl }}
          style={VP.thumbnail}
          paused={!playing}
          resizeMode="cover"
          onEnd={() => { setPlaying(false); }}
          onError={() => { setPlaying(false); }}
          repeat={false}
        />
      ) : (
        <View style={VP.thumbnail}>
          <Text style={VP.thumbnailIcon}>👨‍🔧</Text>
          <Text style={VP.thumbnailName}>{proName}'s Intro</Text>
        </View>
      )}

      {/* Play overlay */}
      <TouchableOpacity style={VP.playOverlay} onPress={togglePlay} activeOpacity={0.85}>
        {!playing && (
          <View style={VP.playBtn}>
            <Text style={VP.playIcon}>▶</Text>
          </View>
        )}
        {playing && (
          <View style={VP.pauseBtn}>
            <Text style={VP.pauseIcon}>❚❚</Text>
          </View>
        )}
        <View style={VP.durationBadge}>
          <Text style={VP.durationText}>0:30</Text>
        </View>
      </TouchableOpacity>

      {/* Progress bar */}
      {playing && (
        <View style={VP.progressBar}>
          <Animated.View style={[VP.progressFill, { width: progressWidth }]} />
        </View>
      )}

      {/* Info */}
      <View style={VP.info}>
        <Text style={VP.infoText}>🎥 Meet {proName} — 30 sec intro</Text>
        <Text style={VP.infoSub}>Tap to {playing ? 'pause' : 'watch'}</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #33 — Accessibility Helpers
// ══════════════════════════════════════════════════════════════

// Accessible button wrapper
export function A11yButton({ children, label, hint, onPress, style, disabled }) {
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
}

// Screen reader announcement helper
export function announceForA11y(message) {
  AccessibilityInfo.announceForAccessibility(message);
}

// Accessible price display
export function A11yPrice({ price, discountedPrice, currency = '₹' }) {
  const label = discountedPrice
    ? `Original price ${currency}${price}, discounted to ${currency}${discountedPrice}`
    : `Price: ${currency}${price}`;

  return (
    <View accessible accessibilityLabel={label}>
      {discountedPrice ? (
        <View style={A11Y.priceRow}>
          <Text style={A11Y.originalPrice}>{currency}{price}</Text>
          <Text style={A11Y.discountedPrice}>{currency}{discountedPrice}</Text>
        </View>
      ) : (
        <Text style={A11Y.price}>{currency}{price}</Text>
      )}
    </View>
  );
}

// Accessible rating stars
export function A11yRating({ rating, reviewCount }) {
  return (
    <View
      accessible
      accessibilityLabel={`Rated ${rating} out of 5 stars, based on ${reviewCount} reviews`}
      style={A11Y.ratingRow}
    >
      <Text style={A11Y.star}>⭐</Text>
      <Text style={A11Y.ratingValue}>{rating}</Text>
      <Text style={A11Y.ratingCount}>({reviewCount})</Text>
    </View>
  );
}

// Skip to content link (web accessibility pattern adapted for mobile)
export function SkipToContent({ onPress }) {
  const [focused, setFocused] = useState(false);
  if (!focused) return null;
  return (
    <TouchableOpacity
      style={A11Y.skipBtn}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Skip to main content"
    >
      <Text style={A11Y.skipText}>Skip to content</Text>
    </TouchableOpacity>
  );
}

// Accessible loading state
export function A11yLoader({ message = 'Loading, please wait' }) {
  useEffect(() => {
    announceForA11y(message);
  }, []);
  return (
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel={message} style={A11Y.loader}>
      <Text style={A11Y.loaderIcon}>⟳</Text>
      <Text style={A11Y.loaderText}>{message}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const FS = StyleSheet.create({
  container:      { backgroundColor: Colors.black, borderRadius: 16, overflow: 'hidden' },
  containerUrgent:{ backgroundColor: Colors.error },
  inner:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  left:           { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  flashIcon:      { fontSize: 28 },
  title:          { ...Typography.body, color: Colors.white, fontWeight: '700' },
  discount:       { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  timerBox:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeUnit:       { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', minWidth: 40 },
  timeUnitUrgent: { backgroundColor: 'rgba(255,255,255,0.25)' },
  timeValue:      { ...Typography.h3, color: Colors.white, lineHeight: 24 },
  timeValueUrgent:{ color: Colors.warning },
  timeLabel:      { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.5 },
  colon:          { ...Typography.h3, color: Colors.white },
  colonUrgent:    { color: Colors.warning },
  strip:          { backgroundColor: Colors.white, padding: 16, borderRadius: 16, ...Shadows.sm },
  stripTitle:     { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 10 },
  stripItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 10 },
  stripEmoji:     { fontSize: 24 },
  stripInfo:      { flex: 1 },
  stripService:   { ...Typography.body, color: Colors.black, fontWeight: '600' },
  stripDiscount:  { ...Typography.caption, color: Colors.success, fontWeight: '700' },
});

const VP = StyleSheet.create({
  container:   { backgroundColor: Colors.black, borderRadius: 16, overflow: 'hidden' },
  thumbnail:   { height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E' },
  thumbnailIcon: { fontSize: 56, marginBottom: 8 },
  thumbnailName: { ...Typography.body, color: Colors.white },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 40, justifyContent: 'center', alignItems: 'center' },
  playBtn:     { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  playIcon:    { fontSize: 22, color: Colors.primary, marginLeft: 4 },
  pauseBtn:    { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  pauseIcon:   { fontSize: 16, color: Colors.white },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  durationText:  { ...Typography.small, color: Colors.white },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill:{ height: 3, backgroundColor: Colors.primary },
  info:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  infoText:    { ...Typography.caption, color: Colors.white },
  infoSub:     { ...Typography.small, color: 'rgba(255,255,255,0.6)' },
});

const A11Y = StyleSheet.create({
  priceRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  originalPrice:   { ...Typography.body, color: Colors.midGray, textDecorationLine: 'line-through' },
  discountedPrice: { ...Typography.bodyLarge, color: Colors.primary, fontWeight: '800' },
  price:           { ...Typography.bodyLarge, color: Colors.primary, fontWeight: '800' },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star:            { fontSize: 14 },
  ratingValue:     { ...Typography.body, color: Colors.black, fontWeight: '700' },
  ratingCount:     { ...Typography.caption, color: Colors.gray },
  skipBtn:         { position: 'absolute', top: 0, left: 0, backgroundColor: Colors.primary, padding: 8, zIndex: 999 },
  skipText:        { ...Typography.body, color: Colors.white },
  loader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  loaderIcon:      { fontSize: 20, color: Colors.primary },
  loaderText:      { ...Typography.body, color: Colors.gray },
});
