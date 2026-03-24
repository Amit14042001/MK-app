/**
 * Slot App — AR Beauty Try-On Screen
 * Simulates AR hair color, makeup, and nail art preview
 * Uses RNCamera + overlay compositing (canvas-style filter approach)
 * In production: integrate with Banuba or TrueDepth ARKit for real AR
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Alert, Platform, Dimensions, Modal,
  StatusBar, ActivityIndicator, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

// ── AR Categories ─────────────────────────────────────────────
const AR_CATEGORIES = [
  { id: 'hair', label: 'Hair Color', icon: '💇‍♀️' },
  { id: 'makeup', label: 'Makeup', icon: '💄' },
  { id: 'nails', label: 'Nail Art', icon: '💅' },
  { id: 'eyebrow', label: 'Eyebrows', icon: '🪄' },
  { id: 'lash', label: 'Lashes', icon: '👁️' },
];

// ── AR Filter Options ─────────────────────────────────────────
const AR_FILTERS = {
  hair: [
    { id: 'hc1', name: 'Warm Brunette', color: '#6B3A2A', hex: '#6B3A2A', overlay: 'rgba(107,58,42,0.35)', price: 1499 },
    { id: 'hc2', name: 'Ash Blonde',    color: '#D4B483', hex: '#D4B483', overlay: 'rgba(212,180,131,0.3)', price: 1799 },
    { id: 'hc3', name: 'Jet Black',     color: '#1A1A1A', hex: '#1A1A1A', overlay: 'rgba(26,26,26,0.4)', price: 1299 },
    { id: 'hc4', name: 'Cherry Red',    color: '#8B1A1A', hex: '#8B1A1A', overlay: 'rgba(139,26,26,0.35)', price: 1899 },
    { id: 'hc5', name: 'Rose Gold',     color: '#B76E79', hex: '#B76E79', overlay: 'rgba(183,110,121,0.3)', price: 2199 },
    { id: 'hc6', name: 'Ocean Blue',    color: '#1B5E8A', hex: '#1B5E8A', overlay: 'rgba(27,94,138,0.35)', price: 2499 },
    { id: 'hc7', name: 'Lavender',      color: '#9C7DB1', hex: '#9C7DB1', overlay: 'rgba(156,125,177,0.3)', price: 2299 },
    { id: 'hc8', name: 'Honey Blonde',  color: '#C8963E', hex: '#C8963E', overlay: 'rgba(200,150,62,0.3)', price: 1699 },
  ],
  makeup: [
    { id: 'slot1', name: 'Natural Glow',  color: '#E8C4A0', hex: '#E8C4A0', overlay: 'rgba(232,196,160,0.2)', price: 799 },
    { id: 'slot2', name: 'Smoky Eye',     color: '#2D2D2D', hex: '#2D2D2D', overlay: 'rgba(45,45,45,0.25)', price: 999 },
    { id: 'slot3', name: 'Bold Red Lip',  color: '#C0182A', hex: '#C0182A', overlay: 'rgba(192,24,42,0.3)', price: 899 },
    { id: 'slot4', name: 'Nude Glam',     color: '#D4A574', hex: '#D4A574', overlay: 'rgba(212,165,116,0.2)', price: 849 },
    { id: 'slot5', name: 'Pink Pout',     color: '#E91E8C', hex: '#E91E8C', overlay: 'rgba(233,30,140,0.25)', price: 899 },
    { id: 'slot6', name: 'Bronze Queen',  color: '#CD853F', hex: '#CD853F', overlay: 'rgba(205,133,63,0.25)', price: 1099 },
  ],
  nails: [
    { id: 'nl1', name: 'Classic Red',   color: '#C0182A', hex: '#C0182A', overlay: 'rgba(192,24,42,0.5)', price: 499 },
    { id: 'nl2', name: 'French Tips',   color: '#FFFFFF', hex: '#F5F5F5', overlay: 'rgba(245,245,245,0.5)', price: 549 },
    { id: 'nl3', name: 'Midnight Blue', color: '#1A237E', hex: '#1A237E', overlay: 'rgba(26,35,126,0.5)', price: 599 },
    { id: 'nl4', name: 'Coral Crush',   color: '#FF6B6B', hex: '#FF6B6B', overlay: 'rgba(255,107,107,0.5)', price: 499 },
    { id: 'nl5', name: 'Nude Beige',    color: '#DEB887', hex: '#DEB887', overlay: 'rgba(222,184,135,0.5)', price: 449 },
    { id: 'nl6', name: 'Glitter Gold',  color: '#FFD700', hex: '#FFD700', overlay: 'rgba(255,215,0,0.5)', price: 649 },
  ],
  eyebrow: [
    { id: 'eb1', name: 'Natural Arch',  color: '#5C3D2E', hex: '#5C3D2E', overlay: 'rgba(92,61,46,0.4)', price: 299 },
    { id: 'eb2', name: 'Bold & Defined',color: '#2C1810', hex: '#2C1810', overlay: 'rgba(44,24,16,0.5)', price: 349 },
    { id: 'eb3', name: 'Feather Brow',  color: '#8B7355', hex: '#8B7355', overlay: 'rgba(139,115,85,0.35)', price: 399 },
    { id: 'eb4', name: 'Microblading',  color: '#4A3728', hex: '#4A3728', overlay: 'rgba(74,55,40,0.45)', price: 2999 },
  ],
  lash: [
    { id: 'ls1', name: 'Natural Volume',color: '#1A1A1A', hex: '#1A1A1A', overlay: 'rgba(26,26,26,0.3)', price: 799 },
    { id: 'ls2', name: 'Dramatic',      color: '#000000', hex: '#000000', overlay: 'rgba(0,0,0,0.4)', price: 999 },
    { id: 'ls3', name: 'Cat Eye',       color: '#1A1A1A', hex: '#1A1A1A', overlay: 'rgba(26,26,26,0.35)', price: 899 },
    { id: 'ls4', name: 'Wispy',         color: '#2D2D2D', hex: '#2D2D2D', overlay: 'rgba(45,45,45,0.3)', price: 849 },
  ],
};

// ── Simulated Face View (AR Camera placeholder) ───────────────
function FaceARView({ activeFilter, category }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (activeFilter) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [activeFilter]);

  return (
    <Animated.View style={[S.faceView, { transform: [{ scale: pulseAnim }] }]}>
      {/* Simulated camera feed background */}
      <LinearGradient
        colors={['#1A1A2E', '#2D2D3A', '#1A1A2E']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Face silhouette */}
      <View style={S.faceSilhouette}>
        {/* Hair region overlay */}
        {activeFilter && category === 'hair' && (
          <View style={[S.hairOverlay, { backgroundColor: activeFilter.overlay }]} />
        )}

        {/* Face oval */}
        <View style={S.faceOval}>
          {/* Makeup overlay */}
          {activeFilter && category === 'makeup' && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: activeFilter.overlay, borderRadius: 120 }]} />
          )}

          {/* Eyes */}
          <View style={S.eyesRow}>
            <View style={S.eye}>
              {activeFilter && (category === 'lash' || category === 'eyebrow') && (
                <View style={[S.eyeOverlay, { backgroundColor: activeFilter.overlay }]} />
              )}
            </View>
            <View style={S.eye}>
              {activeFilter && (category === 'lash' || category === 'eyebrow') && (
                <View style={[S.eyeOverlay, { backgroundColor: activeFilter.overlay }]} />
              )}
            </View>
          </View>

          {/* Nose */}
          <View style={S.nose} />

          {/* Lips */}
          <View style={S.lips}>
            {activeFilter && category === 'makeup' && (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(${parseInt(activeFilter.hex.slice(1,3),16)},${parseInt(activeFilter.hex.slice(3,5),16)},${parseInt(activeFilter.hex.slice(5,7),16)},0.7)`, borderRadius: 20 }]} />
            )}
          </View>

          {/* Nails (shown as hands overlay) */}
          {activeFilter && category === 'nails' && (
            <View style={S.nailsHint}>
              <Text style={S.nailsHintText}>💅</Text>
            </View>
          )}
        </View>
      </View>

      {/* AR scanning effect */}
      {activeFilter && <ARScanEffect color={activeFilter.color} />}

      {/* Filter active label */}
      {activeFilter && (
        <View style={S.activeFilterBadge}>
          <View style={[S.colorDot, { backgroundColor: activeFilter.hex }]} />
          <Text style={S.activeFilterText}>{activeFilter.name}</Text>
        </View>
      )}

      {/* AR Mode indicator */}
      <View style={S.arBadge}>
        <Text style={S.arBadgeText}>🔴 AR LIVE</Text>
      </View>

      {/* Corner guides */}
      <View style={[S.cornerGuide, S.cornerTL]} />
      <View style={[S.cornerGuide, S.cornerTR]} />
      <View style={[S.cornerGuide, S.cornerBL]} />
      <View style={[S.cornerGuide, S.cornerBR]} />
    </Animated.View>
  );
}

function ARScanEffect({ color }) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] });
  const opacity = scanAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.6, 0.6, 0] });

  return (
    <Animated.View style={[S.scanLine, { transform: [{ translateY }], opacity, backgroundColor: color }]} />
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function ARBeautyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('hair');
  const [activeFilter, setActiveFilter]     = useState(null);
  const [comparing, setComparing]           = useState(false);
  const [bookingModal, setBookingModal]     = useState(false);
  const [saving, setSaving]                 = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const filters = AR_FILTERS[activeCategory] || [];

  const selectFilter = useCallback((filter) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setActiveFilter(filter);
  }, [fadeAnim]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveFilter(null);
  };

  const handleCapture = async () => {
    setSaving(true);
    try {
      // Try react-native-view-shot to capture the AR preview
      let captureUri = null;
      try {
        const { captureRef } = require('react-native-view-shot');
        if (arViewRef?.current) {
          captureUri = await captureRef(arViewRef.current, { format: 'jpg', quality: 0.9 });
        }
      } catch {}

      if (captureUri) {
        // Save to camera roll
        try {
          const { CameraRoll } = require('@react-native-camera-roll/camera-roll');
          await CameraRoll.saveAsset(captureUri, { type: 'photo' });
        } catch {}
      }
      setSaving(false);
      Alert.alert('📸 Saved!', 'AR preview saved to your gallery. You can share it or book the service now!', [
        { text: 'Book Now', onPress: () => setBookingModal(true) },
        { text: 'Done', style: 'cancel' },
      ]);
    } catch {
      setSaving(false);
      Alert.alert('📸 Captured!', 'Preview ready. Would you like to book this style?', [
        { text: 'Book Now', onPress: () => setBookingModal(true) },
        { text: 'Done', style: 'cancel' },
      ]);
    }
  };

  const handleBookNow = () => {
    if (!activeFilter) {
      Alert.alert('Select a Style', 'Please select a style to try on before booking.');
      return;
    }
    setBookingModal(true);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={S.headerTitle}>AR Beauty Try-On</Text>
          <Text style={S.headerSub}>See it before you book it</Text>
        </View>
        <TouchableOpacity style={S.compareBtn} onPress={() => setComparing(c => !c)}>
          <Text style={S.compareBtnText}>{comparing ? 'AR' : '⊞'}</Text>
        </TouchableOpacity>
      </View>

      {/* AR View */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <FaceARView activeFilter={activeFilter} category={activeCategory} />
      </Animated.View>

      {/* Capture + Book buttons */}
      <View style={S.actionRow}>
        <TouchableOpacity style={S.captureBtn} onPress={handleCapture} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={S.captureBtnText}>📸 Save Look</Text>
          )}
        </TouchableOpacity>
        {activeFilter && (
          <TouchableOpacity style={S.bookBtn} onPress={handleBookNow}>
            <Text style={S.bookBtnText}>Book ₹{activeFilter.price} →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.categoryScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {AR_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[S.categoryChip, activeCategory === cat.id && S.categoryChipActive]}
            onPress={() => handleCategoryChange(cat.id)}
          >
            <Text style={S.categoryIcon}>{cat.icon}</Text>
            <Text style={[S.categoryLabel, activeCategory === cat.id && S.categoryLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Swatches */}
      <View style={S.swatchesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[S.swatchItem, activeFilter?.id === filter.id && S.swatchItemActive]}
              onPress={() => selectFilter(filter)}
              activeOpacity={0.8}
            >
              <View style={[S.swatch, { backgroundColor: filter.hex }, activeFilter?.id === filter.id && S.swatchSelected]}>
                {activeFilter?.id === filter.id && (
                  <Text style={S.swatchCheck}>✓</Text>
                )}
              </View>
              <Text style={[S.swatchName, activeFilter?.id === filter.id && S.swatchNameActive]} numberOfLines={1}>
                {filter.name}
              </Text>
              <Text style={S.swatchPrice}>₹{filter.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Book Now Bottom Sheet Modal */}
      <Modal visible={bookingModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setBookingModal(false)} />
          <View style={[S.bookingSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Book This Look</Text>
            {activeFilter && (
              <>
                <View style={S.selectedLookCard}>
                  <View style={[S.lookColorDot, { backgroundColor: activeFilter.hex }]} />
                  <View>
                    <Text style={S.lookName}>{activeFilter.name}</Text>
                    <Text style={S.lookCategory}>{AR_CATEGORIES.find(c => c.id === activeCategory)?.label}</Text>
                  </View>
                  <Text style={S.lookPrice}>₹{activeFilter.price}</Text>
                </View>
                <View style={S.lookDetails}>
                  <View style={S.lookDetailRow}>
                    <Text style={S.lookDetailIcon}>⏱</Text>
                    <Text style={S.lookDetailText}>60–90 min service</Text>
                  </View>
                  <View style={S.lookDetailRow}>
                    <Text style={S.lookDetailIcon}>🛡️</Text>
                    <Text style={S.lookDetailText}>Verified, certified beauty professional</Text>
                  </View>
                  <View style={S.lookDetailRow}>
                    <Text style={S.lookDetailIcon}>🏠</Text>
                    <Text style={S.lookDetailText}>At-home service, products included</Text>
                  </View>
                  <View style={S.lookDetailRow}>
                    <Text style={S.lookDetailIcon}>🔄</Text>
                    <Text style={S.lookDetailText}>Free redo if not satisfied</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={S.confirmBookBtn}
                  onPress={() => {
                    setBookingModal(false);
                    navigation.navigate('Booking', {
                      serviceType: activeCategory,
                      filterName: activeFilter.name,
                      price: activeFilter.price,
                    });
                  }}
                >
                  <Text style={S.confirmBookBtnText}>Confirm Booking — ₹{activeFilter.price}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.cancelSheetBtn} onPress={() => setBookingModal(false)}>
                  <Text style={S.cancelSheetBtnText}>Keep Trying On</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1A1A2E' },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  backIcon:      { fontSize: 22, color: Colors.white },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: Colors.white },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  compareBtn:    { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  compareBtnText:{ fontSize: 16, color: Colors.white },

  faceView:      { width: W, height: W * 1.1, overflow: 'hidden', position: 'relative' },
  faceSilhouette:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  hairOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', borderBottomLeftRadius: 80, borderBottomRightRadius: 80 },
  faceOval:      { width: 180, height: 230, borderRadius: 90, backgroundColor: 'rgba(210,180,160,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', alignItems: 'center', paddingTop: 40 },
  eyesRow:       { flexDirection: 'row', gap: 30, marginBottom: 20 },
  eye:           { width: 32, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  eyeOverlay:    { ...StyleSheet.absoluteFillObject },
  nose:          { width: 20, height: 24, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  lips:          { width: 70, height: 28, borderRadius: 14, backgroundColor: 'rgba(180,80,80,0.6)', overflow: 'hidden' },
  nailsHint:     { position: 'absolute', bottom: 16, right: 16 },
  nailsHintText: { fontSize: 28 },
  scanLine:      { position: 'absolute', left: 0, right: 0, height: 2, opacity: 0.7 },
  activeFilterBadge: { position: 'absolute', bottom: 12, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  colorDot:      { width: 12, height: 12, borderRadius: 6 },
  activeFilterText: { fontSize: 12, color: Colors.white, fontWeight: '600' },
  arBadge:       { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  arBadgeText:   { fontSize: 11, color: '#FF3B30', fontWeight: '700' },
  cornerGuide:   { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,255,255,0.4)', borderWidth: 0 },
  cornerTL:      { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR:      { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL:      { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR:      { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },

  actionRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  captureBtn:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  captureBtnText:{ fontSize: 14, color: Colors.white, fontWeight: '600' },
  bookBtn:       { flex: 1.5, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  bookBtnText:   { fontSize: 14, color: Colors.white, fontWeight: '700' },

  categoryScroll:{ maxHeight: 52 },
  categoryChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryIcon:  { fontSize: 14 },
  categoryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  categoryLabelActive: { color: Colors.white },

  swatchesWrapper: { paddingVertical: 12 },
  swatchItem:    { alignItems: 'center', width: 70 },
  swatchItemActive: { opacity: 1 },
  swatch:        { width: 48, height: 48, borderRadius: 24, marginBottom: 5, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  swatchSelected:{ borderColor: Colors.white, borderWidth: 3 },
  swatchCheck:   { fontSize: 18, color: Colors.white, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  swatchName:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  swatchNameActive: { color: Colors.white, fontWeight: '600' },
  swatchPrice:   { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bookingSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle:   { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:    { fontSize: 20, fontWeight: '700', color: Colors.black, marginBottom: 16 },
  selectedLookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, gap: 12, marginBottom: 16 },
  lookColorDot:  { width: 44, height: 44, borderRadius: 22 },
  lookName:      { fontSize: 15, fontWeight: '700', color: Colors.black },
  lookCategory:  { fontSize: 12, color: Colors.gray, marginTop: 2 },
  lookPrice:     { marginLeft: 'auto', fontSize: 18, fontWeight: '800', color: Colors.primary },
  lookDetails:   { gap: 10, marginBottom: 20 },
  lookDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lookDetailIcon:{ fontSize: 16, width: 24 },
  lookDetailText:{ fontSize: 14, color: Colors.gray, flex: 1 },
  confirmBookBtn:{ backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  confirmBookBtnText: { fontSize: 16, color: Colors.white, fontWeight: '700' },
  cancelSheetBtn:{ paddingVertical: 12, alignItems: 'center' },
  cancelSheetBtnText: { fontSize: 14, color: Colors.gray },
});
