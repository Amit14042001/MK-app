/**
 * Slot App — FestivalBookingScreen
 * Pre-book Diwali / Eid / wedding-season services 45 days ahead
 * at today's price. Pros see confirmed future income.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

// Upcoming festivals (can be driven by backend too)
const FESTIVALS = [
  {
    id: 'diwali_2026', name: 'Diwali 2026', date: new Date('2026-10-20'),
    emoji: '🪔', daysOut: null,
    tagline: 'Get your home festival-ready',
    color: ['#FF6B35', '#F7C59F'],
    bundles: [
      {
        id: 'diwali_full',   name: 'Full Diwali Bundle',
        services: ['Deep Cleaning', 'Pest Control', 'AC Service'],
        originalPrice: 3997, discountPct: 20, finalPrice: 3197,
        tag: '🔥 Most popular',
      },
      {
        id: 'diwali_clean',  name: 'Cleaning + Pest',
        services: ['Deep Cleaning', 'Pest Control'],
        originalPrice: 1998, discountPct: 15, finalPrice: 1698,
        tag: '⚡ Quick deal',
      },
      {
        id: 'diwali_paint',  name: 'Fresh Coat Bundle',
        services: ['Interior Painting', 'Deep Cleaning'],
        originalPrice: 7999, discountPct: 10, finalPrice: 7199,
        tag: '✨ Premium',
      },
    ],
  },
  {
    id: 'eid_2026',   name: 'Eid 2026', date: new Date('2026-03-31'),
    emoji: '🌙', daysOut: null,
    tagline: 'Welcome guests with a spotless home',
    color: ['#1A1A2E', '#16213E'],
    bundles: [
      {
        id: 'eid_clean',    name: 'Eid Cleaning Bundle',
        services: ['Deep Cleaning', 'Carpet Cleaning'],
        originalPrice: 2498, discountPct: 15, finalPrice: 2123,
        tag: '🌙 Festival deal',
      },
    ],
  },
  {
    id: 'monsoon_prep', name: 'Monsoon Prep', date: new Date('2026-06-01'),
    emoji: '🌧️', daysOut: null,
    tagline: 'Waterproof and pest-proof before the rains',
    color: ['#1565C0', '#42A5F5'],
    bundles: [
      {
        id: 'monsoon_bundle', name: 'Monsoon Ready Bundle',
        services: ['Pest Control', 'AC Service', 'Waterproofing Check'],
        originalPrice: 3297, discountPct: 12, finalPrice: 2901,
        tag: '🌧️ Beat the rain',
      },
    ],
  },
];

// Compute days away
FESTIVALS.forEach(f => {
  const diff = Math.ceil((f.date - new Date()) / (1000 * 60 * 60 * 24));
  f.daysOut = diff;
});

export default function FestivalBookingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selected,  setSelected]  = useState(null); // { festival, bundle }
  const [booking,   setBooking]   = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    try {
      const { data } = await api.post('/bookings/festival-prebooking', {
        festivalId: selected.festival.id,
        bundleId:   selected.bundle.id,
        bundleName: selected.bundle.name,
        services:   selected.bundle.services,
        amount:     selected.bundle.finalPrice,
        festivalDate: selected.festival.date,
      });
      if (data.success) {
        setConfirmed({
          bookingId:  data.bookingId,
          festival:   selected.festival.name,
          bundle:     selected.bundle.name,
          price:      selected.bundle.finalPrice,
          date:       selected.festival.date,
        });
      } else throw new Error(data.message);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not complete booking. Please try again.');
    }
    setBooking(false);
  };

  if (confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top + 16 }}>
        <View style={S.successCard}>
          <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 16 }}>🎉</Text>
          <Text style={S.successTitle}>Pre-booking Confirmed!</Text>
          <Text style={S.successSub}>Booking #{confirmed.bookingId}</Text>
          <View style={S.successDetails}>
            <Text style={S.successLine}>📦 {confirmed.bundle}</Text>
            <Text style={S.successLine}>🪔 {confirmed.festival}</Text>
            <Text style={S.successLine}>💰 ₹{confirmed.price.toLocaleString('en-IN')} (price locked)</Text>
            <Text style={S.successLine}>📅 Service around {new Date(confirmed.date).toDateString()}</Text>
          </View>
          <Text style={S.successNote}>
            Your price is locked in. We'll contact you 7 days before the festival to confirm the exact slot.
          </Text>
          <TouchableOpacity
            style={S.successBtn}
            onPress={() => navigation.navigate('Bookings')}>
            <Text style={S.successBtnText}>View My Bookings →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={['#FF6B35', '#E94560']}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>🪔 Festival Pre-booking</Text>
          <Text style={S.headerSub}>Lock today's price · Save up to 20%</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
        <Text style={S.pageIntro}>
          Services get fully booked during festivals. Pre-book now at today's price — we'll schedule your slot closer to the date.
        </Text>

        {FESTIVALS.filter(f => f.daysOut > 0 && f.daysOut <= 180).map(festival => (
          <View key={festival.id} style={S.festivalSection}>
            <LinearGradient colors={festival.color} style={S.festivalHeader}>
              <Text style={S.festivalEmoji}>{festival.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.festivalName}>{festival.name}</Text>
                <Text style={S.festivalTagline}>{festival.tagline}</Text>
              </View>
              <View style={S.daysBox}>
                <Text style={S.daysNum}>{festival.daysOut}</Text>
                <Text style={S.daysLabel}>days away</Text>
              </View>
            </LinearGradient>

            {festival.bundles.map(bundle => {
              const isSelected = selected?.festival.id === festival.id && selected?.bundle.id === bundle.id;
              return (
                <TouchableOpacity
                  key={bundle.id}
                  style={[S.bundleCard, isSelected && S.bundleCardActive]}
                  onPress={() => setSelected({ festival, bundle })}>
                  <View style={S.bundleTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.bundleName}>{bundle.name}</Text>
                      <Text style={S.bundleServices}>{bundle.services.join(' + ')}</Text>
                    </View>
                    <View style={S.priceCol}>
                      <Text style={S.originalPrice}>₹{bundle.originalPrice.toLocaleString('en-IN')}</Text>
                      <Text style={S.finalPrice}>₹{bundle.finalPrice.toLocaleString('en-IN')}</Text>
                      <Text style={S.savingPct}>Save {bundle.discountPct}%</Text>
                    </View>
                  </View>
                  <View style={S.bundleBottom}>
                    <View style={S.tagBadge}>
                      <Text style={S.tagText}>{bundle.tag}</Text>
                    </View>
                    <View style={[S.radioCircle, isSelected && S.radioActive]}>
                      {isSelected && <View style={S.radioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Price lock banner */}
        <View style={S.lockBanner}>
          <Text style={S.lockIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.lockTitle}>Price lock guarantee</Text>
            <Text style={S.lockSub}>Pre-book today and pay the same price even if rates increase by festival time.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book CTA */}
      {selected && (
        <View style={[S.cta, { paddingBottom: insets.bottom + 16 }]}>
          <View style={S.ctaSummary}>
            <Text style={S.ctaName}>{selected.bundle.name}</Text>
            <Text style={S.ctaPrice}>₹{selected.bundle.finalPrice.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={[S.ctaBtn, booking && { opacity: 0.7 }]}
            onPress={handleBook}
            disabled={booking}>
            {booking
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.ctaBtnText}>Pre-book Now 🔒</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll:       { padding: 16, paddingBottom: 120 },
  pageIntro:    { fontSize: 13, color: Colors.textLight, lineHeight: 20, marginBottom: 20, textAlign: 'center' },

  festivalSection:{ marginBottom: 20 },
  festivalHeader: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  festivalEmoji:  { fontSize: 28 },
  festivalName:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  festivalTagline:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  daysBox:        { alignItems: 'center' },
  daysNum:        { fontSize: 24, fontWeight: '900', color: '#fff' },
  daysLabel:      { fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  bundleCard:     { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm },
  bundleCardActive:{ borderColor: Colors.primary, backgroundColor: '#FFF5F7' },
  bundleTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bundleName:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  bundleServices: { fontSize: 12, color: Colors.textLight, marginTop: 3, lineHeight: 18 },
  priceCol:       { alignItems: 'flex-end' },
  originalPrice:  { fontSize: 12, color: Colors.textLight, textDecorationLine: 'line-through' },
  finalPrice:     { fontSize: 18, fontWeight: '800', color: Colors.primary },
  savingPct:      { fontSize: 11, color: Colors.success, fontWeight: '600' },
  bundleBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  tagBadge:       { backgroundColor: '#FFF0E8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:        { fontSize: 11, color: '#E94560', fontWeight: '600' },
  radioCircle:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive:    { borderColor: Colors.primary },
  radioDot:       { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },

  lockBanner:     { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  lockIcon:       { fontSize: 24 },
  lockTitle:      { fontSize: 13, fontWeight: '700', color: Colors.text },
  lockSub:        { fontSize: 12, color: Colors.textLight, marginTop: 2, lineHeight: 18 },

  cta:            { backgroundColor: Colors.white, padding: 16, borderTopWidth: 0.5, borderTopColor: Colors.border, ...Shadows.top },
  ctaSummary:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ctaName:        { fontSize: 13, fontWeight: '600', color: Colors.text },
  ctaPrice:       { fontSize: 18, fontWeight: '800', color: Colors.primary },
  ctaBtn:         { backgroundColor: Colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  ctaBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  successCard:    { margin: 24, backgroundColor: Colors.white, borderRadius: 20, padding: 28, ...Shadows.card },
  successTitle:   { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  successSub:     { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  successDetails: { backgroundColor: Colors.bg, borderRadius: 12, padding: 14, gap: 8, marginBottom: 14 },
  successLine:    { fontSize: 14, color: Colors.text, lineHeight: 22 },
  successNote:    { fontSize: 12, color: Colors.textLight, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  successBtn:     { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  successBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
