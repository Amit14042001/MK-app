/**
 * MK App — Bundle Booking Screen (Full)
 * Book multiple services together with smart scheduling and bundle discounts
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Switch, FlatList, Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const BUNDLE_CATEGORIES = [
  {
    id: 'home-care',
    name: 'Home Care Bundle',
    icon: '🏠',
    services: [
      { id: 'deep-clean', name: 'Deep Cleaning', duration: 120, price: 649, icon: '🧹' },
      { id: 'pest-control', name: 'Pest Control', duration: 60, price: 299, icon: '🪳' },
    ],
    totalDuration: 180,
    bundlePrice: 799,
    originalTotal: 948,
    savings: 149,
    gradient: ['#1565C0', '#0D47A1'],
    description: 'Get a sparkling clean home and pest-free environment in one visit.',
    popular: true,
  },
  {
    id: 'beauty-wellness',
    name: 'Beauty & Wellness',
    icon: '💆',
    services: [
      { id: 'salon', name: "Women's Salon", duration: 60, price: 399, icon: '💅' },
      { id: 'massage', name: 'Swedish Massage', duration: 60, price: 799, icon: '💆' },
    ],
    totalDuration: 120,
    bundlePrice: 999,
    originalTotal: 1198,
    savings: 199,
    gradient: ['#880E4F', '#E91E8C'],
    description: 'Complete pampering — salon and relaxing massage in one booking.',
    popular: true,
  },
  {
    id: 'ac-electrical',
    name: 'AC + Electrician',
    icon: '❄️',
    services: [
      { id: 'ac-service', name: 'AC Service', duration: 90, price: 599, icon: '❄️' },
      { id: 'electrician', name: 'Electrical Checkup', duration: 60, price: 349, icon: '⚡' },
    ],
    totalDuration: 150,
    bundlePrice: 799,
    originalTotal: 948,
    savings: 149,
    gradient: ['#1A1A2E', '#E94560'],
    description: 'Get your AC serviced and full electrical checkup in one visit.',
    popular: false,
  },
  {
    id: 'men-grooming-wellness',
    name: "Men's Grooming + Physio",
    icon: '👨',
    services: [
      { id: 'grooming', name: "Men's Grooming", duration: 60, price: 299, icon: '✂️' },
      { id: 'physio', name: 'Physiotherapy', duration: 60, price: 799, icon: '🏥' },
    ],
    totalDuration: 120,
    bundlePrice: 899,
    originalTotal: 1098,
    savings: 199,
    gradient: ['#2C3E50', '#34495E'],
    description: 'Look good and feel great — haircut and physio session together.',
    popular: false,
  },
];

export default function BundleBookingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [samePro, setSamePro] = useState(true);
  const [consecutiveSlots, setConsecutiveSlots] = useState(true);
  const { addToCart } = useCart();

  const handleSelectBundle = (bundle) => {
    setSelectedBundle(bundle);
    setShowDetail(true);
  };

  const handleBookBundle = () => {
    if (!selectedBundle) return;
    addToCart({
      id: selectedBundle.id,
      name: selectedBundle.name,
      price: selectedBundle.bundlePrice,
      category: 'bundle',
      icon: selectedBundle.icon,
      isBundle: true,
      services: selectedBundle.services,
    });
    setShowDetail(false);
    Alert.alert('Bundle Added! 🎁', `${selectedBundle.name} added to cart. You save ₹${selectedBundle.savings}!`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  return (
    <View style={[BS.screen, { paddingTop: insets.top }]}>
      <View style={BS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={BS.headerTitle}>Bundle Bookings</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Text style={{ fontSize: 22 }}>🛒</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={['#1A1A2E', '#E94560']} style={BS.hero}>
          <Text style={BS.heroTitle}>Book Multiple Services Together</Text>
          <Text style={BS.heroSub}>Save up to 20% when you bundle services. One visit. One payment.</Text>
          <View style={BS.heroBadges}>
            {['💰 Save Money', '⏱️ One Visit', '👷 Same Pro'].map((b, i) => (
              <View key={i} style={BS.heroBadge}><Text style={BS.heroBadgeText}>{b}</Text></View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ padding: 16 }}>
          <Text style={BS.sectionTitle}>🔥 Popular Bundles</Text>
          {BUNDLE_CATEGORIES.filter(b => b.popular).map(bundle => (
            <TouchableOpacity key={bundle.id} style={BS.bundleCard} onPress={() => handleSelectBundle(bundle)} activeOpacity={0.93}>
              <LinearGradient colors={bundle.gradient} style={BS.bundleCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View style={BS.bundleCardTop}>
                  <Text style={BS.bundleCardIcon}>{bundle.icon}</Text>
                  <View style={BS.savingsBadge}><Text style={BS.savingsBadgeText}>Save ₹{bundle.savings}</Text></View>
                </View>
                <Text style={BS.bundleCardName}>{bundle.name}</Text>
                <View style={BS.bundleServices}>
                  {bundle.services.map((s, i) => (
                    <View key={i} style={BS.bundleServiceChip}>
                      <Text style={BS.bundleServiceChipText}>{s.icon} {s.name}</Text>
                    </View>
                  ))}
                </View>
                <View style={BS.bundlePriceRow}>
                  <Text style={BS.bundlePrice}>₹{bundle.bundlePrice}</Text>
                  <Text style={BS.bundleOrig}>₹{bundle.originalTotal}</Text>
                  <Text style={BS.bundleDur}>⏱ {bundle.totalDuration} min total</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          <Text style={[BS.sectionTitle, { marginTop: 10 }]}>More Bundles</Text>
          {BUNDLE_CATEGORIES.filter(b => !b.popular).map(bundle => (
            <TouchableOpacity key={bundle.id} style={BS.bundleCardSmall} onPress={() => handleSelectBundle(bundle)}>
              <View style={[BS.bundleSmallIcon, { backgroundColor: bundle.gradient[0] + '20' }]}>
                <Text style={{ fontSize: 28 }}>{bundle.icon}</Text>
              </View>
              <View style={BS.bundleSmallInfo}>
                <Text style={BS.bundleSmallName}>{bundle.name}</Text>
                <Text style={BS.bundleSmallServices}>{bundle.services.map(s => s.name).join(' + ')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <Text style={BS.bundleSmallPrice}>₹{bundle.bundlePrice}</Text>
                  <Text style={BS.bundleSmallOrig}>₹{bundle.originalTotal}</Text>
                  <Text style={BS.bundleSmallSave}>Save ₹{bundle.savings}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 20, color: Colors.midGray }}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={BS.buildOwnCard}>
            <Text style={BS.buildOwnTitle}>🛠️ Build Your Own Bundle</Text>
            <Text style={BS.buildOwnSub}>Select any 2+ services and get automatic bundle discount</Text>
            <TouchableOpacity style={BS.buildOwnBtn} onPress={() => navigation.navigate('Cart')}>
              <Text style={BS.buildOwnBtnText}>View Cart & Bundle →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetail(false)}>
        {selectedBundle && (
          <View style={BS.modal}>
            <View style={BS.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={BS.closeBtn}>
                <Text style={{ fontSize: 16, color: Colors.gray }}>✕</Text>
              </TouchableOpacity>
              <Text style={BS.modalHeaderTitle}>{selectedBundle.name}</Text>
              <View style={{ width: 36 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <LinearGradient colors={selectedBundle.gradient} style={BS.modalHero}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>{selectedBundle.icon}</Text>
                <Text style={BS.modalHeroTitle}>{selectedBundle.name}</Text>
                <Text style={BS.modalHeroDesc}>{selectedBundle.description}</Text>
              </LinearGradient>
              <View style={{ padding: 20 }}>
                <Text style={BS.modalSectionTitle}>Services Included</Text>
                {selectedBundle.services.map((s, i) => (
                  <View key={i} style={BS.serviceDetailRow}>
                    <Text style={{ fontSize: 32, marginRight: 14 }}>{s.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={BS.serviceDetailName}>{s.name}</Text>
                      <Text style={BS.serviceDetailMeta}>⏱ {s.duration} min • ₹{s.price} individually</Text>
                    </View>
                    <View style={BS.serviceDetailCheck}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text></View>
                  </View>
                ))}

                <View style={BS.bundleOptions}>
                  <View style={BS.bundleOptionRow}>
                    <View>
                      <Text style={BS.bundleOptionLabel}>Same professional for all services</Text>
                      <Text style={BS.bundleOptionSub}>One pro handles all services (if qualified)</Text>
                    </View>
                    <Switch value={samePro} onValueChange={setSamePro} trackColor={{ true: Colors.primary }} />
                  </View>
                  <View style={BS.bundleOptionRow}>
                    <View>
                      <Text style={BS.bundleOptionLabel}>Consecutive time slots</Text>
                      <Text style={BS.bundleOptionSub}>Services done back-to-back</Text>
                    </View>
                    <Switch value={consecutiveSlots} onValueChange={setConsecutiveSlots} trackColor={{ true: Colors.primary }} />
                  </View>
                </View>

                <View style={BS.priceSummary}>
                  {selectedBundle.services.map((s, i) => (
                    <View key={i} style={BS.priceSummaryRow}>
                      <Text style={BS.priceSummaryLabel}>{s.name}</Text>
                      <Text style={BS.priceSummaryValue}>₹{s.price}</Text>
                    </View>
                  ))}
                  <View style={[BS.priceSummaryRow, { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0' }]}>
                    <Text style={{ fontSize: 13, color: Colors.gray }}>Subtotal</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.black }}>₹{selectedBundle.originalTotal}</Text>
                  </View>
                  <View style={BS.priceSummaryRow}>
                    <Text style={{ fontSize: 13, color: Colors.success }}>Bundle Discount</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.success }}>- ₹{selectedBundle.savings}</Text>
                  </View>
                  <View style={[BS.priceSummaryRow, { marginTop: 8 }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.black }}>Total</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primary }}>₹{selectedBundle.bundlePrice}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={BS.modalFooter}>
              <View>
                <Text style={{ fontSize: 11, color: Colors.midGray }}>Bundle Price</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: Colors.black }}>₹{selectedBundle.bundlePrice}</Text>
                <Text style={{ fontSize: 12, color: Colors.success, fontWeight: '600' }}>You save ₹{selectedBundle.savings}</Text>
              </View>
              <TouchableOpacity style={BS.bookBundleBtn} onPress={handleBookBundle}>
                <LinearGradient colors={selectedBundle.gradient} style={BS.bookBundleBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={BS.bookBundleBtnText}>Book Bundle →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const BS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1A1A2E' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { padding: 28, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  heroBadges: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 14 },
  bundleCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16, ...Shadows.card },
  bundleCardGrad: { padding: 22 },
  bundleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bundleCardIcon: { fontSize: 36 },
  savingsBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  savingsBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  bundleCardName: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 12 },
  bundleServices: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  bundleServiceChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  bundleServiceChipText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  bundlePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bundlePrice: { fontSize: 24, fontWeight: '900', color: '#fff' },
  bundleOrig: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  bundleDur: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginLeft: 'auto' },
  bundleCardSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...Shadows.sm },
  bundleSmallIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bundleSmallInfo: { flex: 1 },
  bundleSmallName: { fontSize: 14, fontWeight: '700', color: Colors.black },
  bundleSmallServices: { fontSize: 12, color: Colors.midGray, marginTop: 2 },
  bundleSmallPrice: { fontSize: 16, fontWeight: '800', color: Colors.black },
  bundleSmallOrig: { fontSize: 12, color: Colors.midGray, textDecorationLine: 'line-through' },
  bundleSmallSave: { fontSize: 11, fontWeight: '700', color: Colors.success },
  buildOwnCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginTop: 8, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  buildOwnTitle: { fontSize: 16, fontWeight: '800', color: Colors.black, marginBottom: 6 },
  buildOwnSub: { fontSize: 13, color: Colors.gray, marginBottom: 16, lineHeight: 18 },
  buildOwnBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buildOwnBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  modalHeroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 14 },
  serviceDetailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 14, padding: 14, marginBottom: 10 },
  serviceDetailName: { fontSize: 14, fontWeight: '700', color: Colors.black },
  serviceDetailMeta: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  serviceDetailCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  bundleOptions: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 16, ...Shadows.sm },
  bundleOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  bundleOptionLabel: { fontSize: 14, fontWeight: '700', color: Colors.black },
  bundleOptionSub: { fontSize: 12, color: Colors.midGray, marginTop: 2 },
  priceSummary: { backgroundColor: Colors.offWhite, borderRadius: 16, padding: 18 },
  priceSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceSummaryLabel: { fontSize: 13, color: Colors.gray },
  priceSummaryValue: { fontSize: 13, fontWeight: '600', color: Colors.black },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  bookBundleBtn: { borderRadius: 16, overflow: 'hidden', flex: 1, marginLeft: 20 },
  bookBundleBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  bookBundleBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
