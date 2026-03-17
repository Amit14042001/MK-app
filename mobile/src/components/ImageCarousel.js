/**
 * MK App — BeforeAfterPhotos + ImageCarousel Components
 * Feature #4: Before/After service photos
 * Feature #5: Service photos carousel
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Modal, Dimensions, Animated, FlatList,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
// IMAGE CAROUSEL (Feature #5 — Service Photos)
// ══════════════════════════════════════════════════════════════
export function ImageCarousel({
  images = [],
  height = 240,
  showDots = true,
  autoPlay = false,
  onImagePress,
}) {
  const [current, setCurrent]   = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLbIdx] = useState(0);
  const scrollRef = useRef(null);

  // Auto-play
  React.useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    const timer = setInterval(() => {
      const next = (current + 1) % images.length;
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
      setCurrent(next);
    }, 3000);
    return () => clearInterval(timer);
  }, [current, autoPlay, images.length]);

  const openLightbox = (idx) => {
    setLbIdx(idx);
    setLightbox(true);
    onImagePress?.(idx);
  };

  if (!images.length) {
    return (
      <View style={[IC.placeholder, { height }]}>
        <Text style={IC.placeholderIcon}>🏠</Text>
        <Text style={IC.placeholderText}>No photos available</Text>
      </View>
    );
  }

  return (
    <View style={IC.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={{ height }}
      >
        {images.map((img, idx) => (
          <TouchableOpacity key={idx} activeOpacity={0.95} onPress={() => openLightbox(idx)}>
            {typeof img === 'string' ? (
              <Image source={{ uri: img }} style={[IC.image, { width: W, height }]} resizeMode="cover" />
            ) : (
              <View style={[IC.imagePlaceholder, { width: W, height }]}>
                <Text style={IC.imagePlaceholderIcon}>{img.icon || '🏠'}</Text>
                <Text style={IC.imagePlaceholderLabel}>{img.label || ''}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Counter badge */}
      <View style={IC.counter}>
        <Text style={IC.counterText}>{current + 1}/{images.length}</Text>
      </View>

      {/* Dots */}
      {showDots && images.length > 1 && (
        <View style={IC.dots}>
          {images.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => {
              scrollRef.current?.scrollTo({ x: i * W, animated: true });
              setCurrent(i);
            }}>
              <View style={[IC.dot, i === current && IC.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Lightbox */}
      <Modal visible={lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(false)}>
        <View style={IC.lightboxOverlay}>
          <TouchableOpacity style={IC.lightboxClose} onPress={() => setLightbox(false)}>
            <Text style={IC.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxIdx * W, y: 0 }}
          >
            {images.map((img, idx) => (
              <View key={idx} style={IC.lightboxSlide}>
                {typeof img === 'string' ? (
                  <Image source={{ uri: img }} style={IC.lightboxImage} resizeMode="contain" />
                ) : (
                  <View style={IC.lightboxPlaceholder}>
                    <Text style={{ fontSize: 80 }}>{img.icon || '🏠'}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <Text style={IC.lightboxCounter}>{lightboxIdx + 1} / {images.length}</Text>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// BEFORE/AFTER PHOTOS VIEWER (Feature #4)
// ══════════════════════════════════════════════════════════════
export function BeforeAfterPhotos({ bookingId, photos }) {
  const [showBefore, setShowBefore] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const mockPhotos = photos || {
    before: [
      { id: 'b1', uri: null, icon: '🔧', label: 'Before cleaning' },
      { id: 'b2', uri: null, icon: '❄️', label: 'Filter condition' },
    ],
    after: [
      { id: 'a1', uri: null, icon: '✨', label: 'After cleaning' },
      { id: 'a2', uri: null, icon: '🌟', label: 'Clean filter' },
    ],
  };

  const toggle = (before) => {
    setShowBefore(before);
    Animated.timing(slideAnim, { toValue: before ? 0 : 1, duration: 250, useNativeDriver: true }).start();
  };

  const currentPhotos = showBefore ? mockPhotos.before : mockPhotos.after;

  return (
    <View style={BA.container}>
      <Text style={BA.title}>Work Photos</Text>

      {/* Toggle */}
      <View style={BA.toggle}>
        <TouchableOpacity
          style={[BA.toggleBtn, showBefore && BA.toggleBtnActive]}
          onPress={() => toggle(true)}
        >
          <Text style={[BA.toggleText, showBefore && BA.toggleTextActive]}>📷 Before</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[BA.toggleBtn, !showBefore && BA.toggleBtnActive]}
          onPress={() => toggle(false)}
        >
          <Text style={[BA.toggleText, !showBefore && BA.toggleTextActive]}>✨ After</Text>
        </TouchableOpacity>
      </View>

      {/* Photos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={BA.photosScroll}>
        {currentPhotos.map(photo => (
          <TouchableOpacity key={photo.id} style={BA.photoCard} activeOpacity={0.85}>
            {photo.uri ? (
              <Image source={{ uri: photo.uri }} style={BA.photoImage} resizeMode="cover" />
            ) : (
              <View style={[BA.photoPlaceholder, { backgroundColor: showBefore ? '#FEF9E7' : '#E8F8F0' }]}>
                <Text style={BA.photoIcon}>{photo.icon}</Text>
                <Text style={BA.photoLabel}>{photo.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Comparison note */}
      <View style={BA.note}>
        <Text style={BA.noteText}>
          {showBefore
            ? '📷 Photos taken before service started'
            : '✅ Photos taken after work completion — guaranteed quality'}
        </Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// SERVICE PHOTOS GRID (compact version for lists)
// ══════════════════════════════════════════════════════════════
export function ServicePhotoGrid({ photos = [], maxShow = 4 }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? photos : photos.slice(0, maxShow);
  const remaining = photos.length - maxShow;

  return (
    <View style={PG.grid}>
      {displayed.map((photo, i) => (
        <View key={i} style={PG.photoCell}>
          {typeof photo === 'string' ? (
            <Image source={{ uri: photo }} style={PG.photo} resizeMode="cover" />
          ) : (
            <View style={[PG.photoPlaceholder, { backgroundColor: photo.bg || Colors.offWhite }]}>
              <Text style={PG.photoEmoji}>{photo.icon || '🏠'}</Text>
            </View>
          )}
          {/* Overlay for "+N more" */}
          {!showAll && i === maxShow - 1 && remaining > 0 && (
            <TouchableOpacity style={PG.moreOverlay} onPress={() => setShowAll(true)}>
              <Text style={PG.moreText}>+{remaining}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const IC = StyleSheet.create({
  container:          { position: 'relative' },
  image:              {},
  imagePlaceholder:   { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite },
  imagePlaceholderIcon: { fontSize: 56 },
  imagePlaceholderLabel:{ ...Typography.body, color: Colors.gray, marginTop: 8 },
  placeholder:        { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 16 },
  placeholderIcon:    { fontSize: 40, marginBottom: 8 },
  placeholderText:    { ...Typography.body, color: Colors.gray },
  counter:            { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  counterText:        { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  dots:               { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:                { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:          { width: 18, backgroundColor: Colors.white },
  lightboxOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  lightboxClose:      { position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  lightboxCloseText:  { fontSize: 18, color: Colors.white, fontWeight: '700' },
  lightboxSlide:      { width: W, height: H, justifyContent: 'center', alignItems: 'center' },
  lightboxImage:      { width: W, height: H * 0.7 },
  lightboxPlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  lightboxCounter:    { position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center', ...Typography.body, color: 'rgba(255,255,255,0.7)' },
});

const BA = StyleSheet.create({
  container:    { backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.sm },
  title:        { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  toggle:       { flexDirection: 'row', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 4, marginBottom: 12, gap: 4 },
  toggleBtn:    { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText:   { ...Typography.body, color: Colors.gray, fontWeight: '600' },
  toggleTextActive: { color: Colors.white },
  photosScroll: { marginBottom: 10 },
  photoCard:    { width: 160, height: 120, borderRadius: 14, overflow: 'hidden', marginRight: 10 },
  photoImage:   { width: 160, height: 120 },
  photoPlaceholder:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  photoIcon:    { fontSize: 32 },
  photoLabel:   { ...Typography.caption, color: Colors.gray, textAlign: 'center' },
  note:         { backgroundColor: Colors.offWhite, borderRadius: 10, padding: 10 },
  noteText:     { ...Typography.caption, color: Colors.gray, lineHeight: 18 },
});

const PG = StyleSheet.create({
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoCell:       { width: (W - 48) / 4 - 4, height: (W - 48) / 4 - 4, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photo:           { width: '100%', height: '100%' },
  photoPlaceholder:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoEmoji:      { fontSize: 24 },
  moreOverlay:     { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  moreText:        { ...Typography.h3, color: Colors.white },
});
