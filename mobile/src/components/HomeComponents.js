/**
 * MK App — HomeScreen v2 (Additional Components)
 * Reusable widgets: ServiceCard, BannerCarousel, CategoryGrid, PromoCard
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Image, Animated, Dimensions, RefreshControl,
  ActivityIndicator, TextInput,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

// ── ServiceCard Component ─────────────────────────────────────
export function ServiceCard({ service, onPress, style }) {
  const [imgError, setImgError] = useState(false);
  return (
    <TouchableOpacity
      style={[SC.card, style]}
      onPress={() => onPress?.(service)}
      activeOpacity={0.88}
    >
      <View style={SC.imageContainer}>
        {service.images?.[0] && !imgError ? (
          <Image
            source={{ uri: service.images[0] }}
            style={SC.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[SC.imagePlaceholder, { backgroundColor: service.iconBg || Colors.primaryLight }]}>
            <Text style={SC.imageIcon}>{service.icon || '🔧'}</Text>
          </View>
        )}
        {service.discount > 0 && (
          <View style={SC.discountBadge}>
            <Text style={SC.discountText}>{service.discount}% OFF</Text>
          </View>
        )}
        {service.isNew && (
          <View style={SC.newBadge}>
            <Text style={SC.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <View style={SC.info}>
        <Text style={SC.name} numberOfLines={2}>{service.name}</Text>
        <View style={SC.ratingRow}>
          <Text style={SC.star}>⭐</Text>
          <Text style={SC.rating}>{service.rating?.toFixed(1) || '4.5'}</Text>
          <Text style={SC.reviews}>({service.reviewCount || 0})</Text>
        </View>
        <View style={SC.priceRow}>
          {service.discountedPrice ? (
            <>
              <Text style={SC.priceOriginal}>₹{service.startingPrice}</Text>
              <Text style={SC.priceDiscounted}>₹{service.discountedPrice}</Text>
            </>
          ) : (
            <Text style={SC.price}>₹{service.startingPrice}</Text>
          )}
          <Text style={SC.duration}>· {service.duration} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── BannerCarousel Component ──────────────────────────────────
export function BannerCarousel({ banners = [], onPress }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      const next = (current + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: next * (W - 32), animated: true });
      setCurrent(next);
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [current, banners.length]);

  if (!banners.length) return null;

  return (
    <View style={BC.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (W - 32));
          setCurrent(idx);
        }}
        style={BC.scroll}
      >
        {banners.map((banner, i) => (
          <TouchableOpacity
            key={banner._id || i}
            style={BC.banner}
            onPress={() => onPress?.(banner)}
            activeOpacity={0.92}
          >
            <View style={[BC.bannerContent, { backgroundColor: banner.bgColor || Colors.primary }]}>
              <View style={BC.bannerLeft}>
                <Text style={BC.bannerTag}>{banner.tag || 'OFFER'}</Text>
                <Text style={BC.bannerTitle} numberOfLines={2}>{banner.title}</Text>
                <Text style={BC.bannerSub} numberOfLines={2}>{banner.subtitle}</Text>
                {banner.cta && (
                  <View style={BC.ctaBtn}>
                    <Text style={BC.ctaText}>{banner.cta} →</Text>
                  </View>
                )}
              </View>
              <Text style={BC.bannerEmoji}>{banner.emoji || '🏠'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {banners.length > 1 && (
        <View style={BC.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[BC.dot, i === current && BC.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── CategoryGrid Component ────────────────────────────────────
export function CategoryGrid({ categories = [], onPress, columns = 4 }) {
  const itemW = (W - 32 - (columns - 1) * 10) / columns;
  return (
    <View style={CG.grid}>
      {categories.slice(0, columns * 2).map((cat, i) => (
        <TouchableOpacity
          key={cat._id || i}
          style={[CG.item, { width: itemW }]}
          onPress={() => onPress?.(cat)}
          activeOpacity={0.8}
        >
          <View style={[CG.iconBox, { backgroundColor: cat.bgColor || Colors.primaryLight }]}>
            <Text style={CG.icon}>{cat.icon || '🔧'}</Text>
          </View>
          <Text style={CG.name} numberOfLines={2}>{cat.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── PromoStrip Component ──────────────────────────────────────
export function PromoStrip({ offers = [], onPress }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={PS.scroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
      {offers.map((offer, i) => (
        <TouchableOpacity
          key={offer.id || i}
          style={[PS.card, { backgroundColor: offer.bgColor || Colors.primaryLight, borderColor: offer.color || Colors.primary }]}
          onPress={() => onPress?.(offer)}
          activeOpacity={0.85}
        >
          <Text style={PS.offerIcon}>{offer.icon || '🎁'}</Text>
          <View>
            <Text style={[PS.discount, { color: offer.color || Colors.primary }]}>{offer.discount}</Text>
            <Text style={[PS.code, { color: offer.color || Colors.primary }]}>{offer.code}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── ProfessionalCard Component ────────────────────────────────
export function ProfessionalCard({ professional, onPress, style }) {
  const pro  = professional;
  const user = pro.user || {};
  return (
    <TouchableOpacity style={[PC.card, style]} onPress={() => onPress?.(pro)} activeOpacity={0.88}>
      <View style={PC.header}>
        <View style={PC.avatar}>
          <Text style={PC.avatarText}>{(user.name || 'P')[0]}</Text>
        </View>
        {pro.isCurrentlyAvailable && <View style={PC.onlineDot} />}
      </View>
      <Text style={PC.name} numberOfLines={1}>{user.name || 'Professional'}</Text>
      <View style={PC.ratingRow}>
        <Text style={PC.star}>⭐</Text>
        <Text style={PC.rating}>{pro.rating?.toFixed(1) || '4.5'}</Text>
      </View>
      <Text style={PC.bookings}>{pro.totalBookings || 0} jobs</Text>
      <Text style={PC.exp}>{pro.experience || 0}yr exp</Text>
      <View style={PC.verifiedBadge}>
        <Text style={PC.verifiedText}>✓ Verified</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── SearchBar Component ───────────────────────────────────────
export function HomeSearchBar({ onPress, placeholder = 'Search for services...' }) {
  return (
    <TouchableOpacity style={SB.bar} onPress={onPress} activeOpacity={0.85}>
      <Text style={SB.icon}>🔍</Text>
      <Text style={SB.placeholder}>{placeholder}</Text>
      <View style={SB.micBtn}><Text style={SB.micIcon}>🎤</Text></View>
    </TouchableOpacity>
  );
}

// ── SectionHeader Component ───────────────────────────────────
export function SectionHeader({ title, subtitle, onSeeAll, emoji }) {
  return (
    <View style={SH.row}>
      <View style={SH.left}>
        {emoji && <Text style={SH.emoji}>{emoji}</Text>}
        <View>
          <Text style={SH.title}>{title}</Text>
          {subtitle && <Text style={SH.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={SH.seeAll}>
          <Text style={SH.seeAllText}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const SC = StyleSheet.create({
  card:             { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', ...Shadows.sm, width: (W - 48) / 2 },
  imageContainer:   { height: 130, position: 'relative' },
  image:            { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageIcon:        { fontSize: 42 },
  discountBadge:    { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  discountText:     { ...Typography.small, color: Colors.white, fontWeight: '800' },
  newBadge:         { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  newBadgeText:     { ...Typography.small, color: Colors.white, fontWeight: '800' },
  info:             { padding: 10 },
  name:             { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  ratingRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  star:             { fontSize: 11 },
  rating:           { ...Typography.caption, color: Colors.black, fontWeight: '700' },
  reviews:          { ...Typography.caption, color: Colors.gray },
  priceRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price:            { ...Typography.body, color: Colors.primary, fontWeight: '800' },
  priceOriginal:    { ...Typography.caption, color: Colors.midGray, textDecorationLine: 'line-through' },
  priceDiscounted:  { ...Typography.body, color: Colors.primary, fontWeight: '800' },
  duration:         { ...Typography.caption, color: Colors.gray },
});

const BC = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 8 },
  scroll:    { borderRadius: 18, overflow: 'hidden' },
  banner:    { width: W - 32 },
  bannerContent: { height: 140, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderRadius: 18, overflow: 'hidden' },
  bannerLeft:  { flex: 1, paddingRight: 10 },
  bannerTag:   { ...Typography.small, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  bannerTitle: { ...Typography.h3, color: Colors.white, marginBottom: 4 },
  bannerSub:   { ...Typography.caption, color: 'rgba(255,255,255,0.85)', marginBottom: 10, lineHeight: 18 },
  ctaBtn:      { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  ctaText:     { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  bannerEmoji: { fontSize: 64 },
  dots:        { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lightGray },
  dotActive:   { width: 18, backgroundColor: Colors.primary },
});

const CG = StyleSheet.create({
  grid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  item:    { alignItems: 'center', marginBottom: 4 },
  iconBox: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6, ...Shadows.sm },
  icon:    { fontSize: 28 },
  name:    { ...Typography.small, color: Colors.darkGray, textAlign: 'center', fontWeight: '600', lineHeight: 16 },
});

const PS = StyleSheet.create({
  scroll: { marginBottom: 8 },
  card:   { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 130 },
  offerIcon: { fontSize: 24 },
  discount: { ...Typography.body, fontWeight: '800' },
  code:   { ...Typography.caption, fontWeight: '700', letterSpacing: 0.5 },
});

const PC = StyleSheet.create({
  card:         { backgroundColor: Colors.white, borderRadius: 16, padding: 14, width: 130, alignItems: 'center', ...Shadows.sm },
  header:       { position: 'relative', marginBottom: 8 },
  avatar:       { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { ...Typography.bodyLarge, color: Colors.white, fontWeight: '800' },
  onlineDot:    { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.white },
  name:         { ...Typography.caption, color: Colors.black, fontWeight: '700', marginBottom: 3, textAlign: 'center' },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  star:         { fontSize: 11 },
  rating:       { ...Typography.caption, color: Colors.black, fontWeight: '700' },
  bookings:     { ...Typography.small, color: Colors.gray },
  exp:          { ...Typography.small, color: Colors.gray, marginBottom: 6 },
  verifiedBadge:{ backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedText: { ...Typography.small, color: Colors.success, fontWeight: '700' },
});

const SB = StyleSheet.create({
  bar:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 10, ...Shadows.sm },
  icon:        { fontSize: 16 },
  placeholder: { flex: 1, ...Typography.body, color: Colors.lightGray },
  micBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  micIcon:     { fontSize: 14 },
});

const SH = StyleSheet.create({
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji:    { fontSize: 22 },
  title:    { ...Typography.h3, color: Colors.black },
  subtitle: { ...Typography.caption, color: Colors.gray, marginTop: 1 },
  seeAll:   { paddingVertical: 4, paddingLeft: 12 },
  seeAllText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});
