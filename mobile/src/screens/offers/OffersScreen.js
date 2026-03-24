/**
 * Slot App — OffersScreen
 * Coupons, deals, flash sales, referral offers, membership perks
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput, Alert, Clipboard,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows, Radius } from '../utils/theme';
import { api } from '../utils/api';

const { width: W } = Dimensions.get('window');

const OFFERS = [
  {
    id: 'o1', code: 'FIRST50', title: 'First Booking 50% Off',
    description: 'Get 50% off on your first booking. Valid for new users only.',
    discount: '50%', maxDiscount: 300, minOrder: 199,
    validTill: '2025-03-31', category: 'all', isNew: true,
    color: '#E94560', bgColor: '#FFF0F3', icon: '🎉',
    usageLimit: 1, type: 'percentage',
  },
  {
    id: 'o2', code: 'CLEAN200', title: '₹200 Off Cleaning',
    description: 'Flat ₹200 off on all home cleaning services above ₹799.',
    discount: '₹200', maxDiscount: 200, minOrder: 799,
    validTill: '2025-02-28', category: 'cleaning', isNew: false,
    color: '#2980B9', bgColor: '#EAF4FB', icon: '🧹',
    usageLimit: 3, type: 'flat',
  },
  {
    id: 'o3', code: 'GOLD10', title: 'Gold Member 10% Off',
    description: '10% off on all services. Exclusive for Gold subscribers.',
    discount: '10%', maxDiscount: 500, minOrder: 299,
    validTill: '2025-12-31', category: 'all', isNew: false,
    color: '#F5A623', bgColor: '#FEF9E7', icon: '🏅',
    usageLimit: -1, type: 'percentage', memberOnly: true,
  },
  {
    id: 'o4', code: 'ACSERVICE', title: 'AC Service Special',
    description: '₹150 off on AC service. Beat the heat with a discount!',
    discount: '₹150', maxDiscount: 150, minOrder: 499,
    validTill: '2025-04-30', category: 'hvac', isNew: true,
    color: '#27AE60', bgColor: '#E8F8F0', icon: '❄️',
    usageLimit: 2, type: 'flat',
  },
  {
    id: 'o5', code: 'REFER100', title: 'Referral Reward ₹100',
    description: 'Share Slot App with friends. Earn ₹100 wallet credit per referral.',
    discount: '₹100', maxDiscount: 100, minOrder: 0,
    validTill: '2025-12-31', category: 'referral', isNew: false,
    color: '#9B59B6', bgColor: '#F3E5F5', icon: '🤝',
    usageLimit: -1, type: 'flat', isReferral: true,
  },
  {
    id: 'o6', code: 'WEEKEND20', title: 'Weekend Special 20%',
    description: '20% off on all services booked on Saturday & Sunday.',
    discount: '20%', maxDiscount: 400, minOrder: 399,
    validTill: '2025-03-31', category: 'all', isNew: false,
    color: '#E67E22', bgColor: '#FEF9E7', icon: '🎪',
    usageLimit: 1, type: 'percentage', weekendOnly: true,
  },
];

const CATEGORIES = ['All', 'New', 'Cleaning', 'HVAC', 'Electrical', 'Member'];

export default function OffersScreen({ navigation }) {
  const [offers, setOffers]       = useState(OFFERS);
  const [filter, setFilter]       = useState('All');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [searchCode, setSearch]   = useState('');
  const [applying, setApplying]   = useState(null);
  const [successModal, setSuccess]= useState(null);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try {
      const resp = await api.get('/payments/coupons');
      if (resp.data?.success && resp.data.coupons?.length > 0) {
        setOffers(resp.data.coupons);
      }
    } catch { /* keep OFFERS fallback */ }
    finally { setLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  }, []);

  const filteredOffers = offers.filter(o => {
    if (filter === 'New')   return o.isNew;
    if (filter === 'Member') return o.memberOnly;
    if (filter === 'All')   return true;
    return o.category.toLowerCase() === filter.toLowerCase();
  }).filter(o =>
    !searchCode || o.code.includes(searchCode.toUpperCase()) || o.title.toLowerCase().includes(searchCode.toLowerCase())
  );

  const copyCode = (code) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', `Coupon code "${code}" copied to clipboard.`);
  };

  const applyOffer = async (offer) => {
    setApplying(offer.id || offer._id);
    try {
      await api.post('/payments/apply-coupon', { code: offer.code });
      setApplying(null);
      setSuccess(offer);
    } catch (e) {
      setApplying(null);
      Alert.alert('Cannot Apply', e.response?.data?.message || 'Coupon could not be applied right now.');
    }
  };

  const daysLeft = (validTill) => {
    const diff = Math.ceil((new Date(validTill) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return 'Expired';
    if (diff === 0) return 'Last day!';
    if (diff <= 3)  return `${diff}d left`;
    return `Valid till ${new Date(validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  const isExpiringSoon = (validTill) => {
    const diff = Math.ceil((new Date(validTill) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 3;
  };

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Offers & Coupons</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={S.searchBar}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search or enter coupon code..."
          placeholderTextColor={Colors.lightGray}
          value={searchCode}
          onChangeText={setSearch}
          autoCapitalize="characters"
        />
        {searchCode.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={S.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[S.filterChip, filter === cat && S.filterChipActive]}
            onPress={() => setFilter(cat)}
          >
            <Text style={[S.filterLabel, filter === cat && S.filterLabelActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Flash Sale Banner */}
        <View style={S.flashBanner}>
          <Text style={S.flashIcon}>⚡</Text>
          <View style={S.flashText}>
            <Text style={S.flashTitle}>Flash Sale — Today Only!</Text>
            <Text style={S.flashSub}>Use code FLASH30 for extra 30% off</Text>
          </View>
          <TouchableOpacity style={S.flashBtn} onPress={() => copyCode('FLASH30')}>
            <Text style={S.flashBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Offers Count */}
        <Text style={S.offersCount}>{filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} available</Text>

        {/* Offers List */}
        {filteredOffers.length === 0 ? (
          <View style={S.emptyBox}>
            <Text style={S.emptyIcon}>🎁</Text>
            <Text style={S.emptyTitle}>No Offers Found</Text>
            <Text style={S.emptyDesc}>Check back later for new deals and discounts.</Text>
          </View>
        ) : (
          filteredOffers.map(offer => (
            <View key={offer.id} style={[S.offerCard, { borderLeftColor: offer.color }]}>
              {/* Top row */}
              <View style={S.offerTop}>
                <View style={[S.offerIconBg, { backgroundColor: offer.bgColor }]}>
                  <Text style={S.offerEmoji}>{offer.icon}</Text>
                </View>
                <View style={S.offerInfo}>
                  <View style={S.offerTitleRow}>
                    <Text style={S.offerTitle} numberOfLines={1}>{offer.title}</Text>
                    {offer.isNew && <View style={S.newBadge}><Text style={S.newBadgeText}>NEW</Text></View>}
                    {isExpiringSoon(offer.validTill) && <View style={S.urgentBadge}><Text style={S.urgentBadgeText}>⏰ Soon</Text></View>}
                  </View>
                  <Text style={S.offerDesc} numberOfLines={2}>{offer.description}</Text>
                </View>
              </View>

              {/* Discount highlight */}
              <View style={[S.discountRow, { backgroundColor: offer.bgColor }]}>
                <Text style={[S.discountText, { color: offer.color }]}>Save {offer.discount}</Text>
                {offer.maxDiscount && <Text style={S.maxDiscount}>up to ₹{offer.maxDiscount}</Text>}
              </View>

              {/* Details */}
              <View style={S.offerDetails}>
                <Text style={S.detailItem}>✓ Min order: ₹{offer.minOrder}</Text>
                <Text style={S.detailItem}>✓ {offer.usageLimit === -1 ? 'Unlimited uses' : `Use ${offer.usageLimit}x`}</Text>
                <Text style={[S.detailItem, isExpiringSoon(offer.validTill) && { color: Colors.error }]}>
                  ⏱ {daysLeft(offer.validTill)}
                </Text>
              </View>

              {/* Code + Actions */}
              <View style={S.offerFooter}>
                <View style={[S.codeBox, { borderColor: offer.color + '50', backgroundColor: offer.bgColor }]}>
                  <Text style={[S.codeText, { color: offer.color }]}>{offer.code}</Text>
                  <TouchableOpacity onPress={() => copyCode(offer.code)} style={S.copyBtn}>
                    <Text style={S.copyBtnText}>📋 Copy</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[S.applyBtn, { backgroundColor: offer.color }]}
                  onPress={() => applyOffer(offer)}
                  disabled={applying === offer.id}
                >
                  {applying === offer.id
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Text style={S.applyBtnText}>Apply →</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Terms note */}
        <Text style={S.termsNote}>* All offers subject to terms and conditions. Discounts applied at checkout.</Text>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={!!successModal} transparent animationType="fade">
        <View style={S.modalOverlay}>
          <View style={S.successModal}>
            <Text style={S.successEmoji}>{successModal?.icon}</Text>
            <Text style={S.successTitle}>Offer Applied! 🎉</Text>
            <Text style={S.successDesc}>
              Code <Text style={S.successCode}>{successModal?.code}</Text> will be applied at checkout.{'\n'}
              You'll save {successModal?.discount}!
            </Text>
            <TouchableOpacity
              style={[S.successBtn, { backgroundColor: successModal?.color }]}
              onPress={() => { setSuccess(null); navigation.navigate('HomeTab'); }}
            >
              <Text style={S.successBtnText}>Book a Service →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.successClose} onPress={() => setSuccess(null)}>
              <Text style={S.successCloseText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  searchBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, margin: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8, ...Shadows.sm },
  searchIcon: { fontSize: 16 },
  searchInput:{ flex: 1, ...Typography.body, color: Colors.black },
  clearIcon:  { fontSize: 16, color: Colors.midGray, padding: 4 },

  filterScroll:     { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  filterChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.offWhite, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterLabel:      { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  filterLabelActive:{ color: Colors.primary, fontWeight: '700' },

  flashBanner:  { flexDirection: 'row', backgroundColor: Colors.black, borderRadius: 16, padding: 14, marginTop: 16, marginBottom: 8, alignItems: 'center', gap: 10 },
  flashIcon:    { fontSize: 24 },
  flashText:    { flex: 1 },
  flashTitle:   { ...Typography.body, color: Colors.white, fontWeight: '700' },
  flashSub:     { ...Typography.caption, color: Colors.lightGray, marginTop: 2 },
  flashBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  flashBtnText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },

  offersCount: { ...Typography.caption, color: Colors.gray, marginBottom: 8, marginTop: 4 },

  offerCard:       { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderLeftWidth: 4, ...Shadows.sm },
  offerTop:        { flexDirection: 'row', padding: 14, gap: 12 },
  offerIconBg:     { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  offerEmoji:      { fontSize: 26 },
  offerInfo:       { flex: 1 },
  offerTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  offerTitle:      { ...Typography.body, color: Colors.black, fontWeight: '700', flex: 1 },
  newBadge:        { backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  newBadgeText:    { ...Typography.small, color: Colors.white, fontWeight: '800' },
  urgentBadge:     { backgroundColor: Colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  urgentBadgeText: { ...Typography.small, color: Colors.error, fontWeight: '700' },
  offerDesc:       { ...Typography.caption, color: Colors.gray, lineHeight: 18 },

  discountRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  discountText:  { ...Typography.bodyLarge, fontWeight: '800' },
  maxDiscount:   { ...Typography.caption, color: Colors.gray },

  offerDetails:  { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 12, flexWrap: 'wrap' },
  detailItem:    { ...Typography.caption, color: Colors.gray },

  offerFooter:   { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  codeBox:       { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  codeText:      { ...Typography.body, fontWeight: '800', letterSpacing: 1 },
  copyBtn:       { },
  copyBtnText:   { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  applyBtn:      { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, justifyContent: 'center' },
  applyBtnText:  { ...Typography.body, color: Colors.white, fontWeight: '700' },

  emptyBox:    { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { ...Typography.h3, color: Colors.black, marginBottom: 6 },
  emptyDesc:   { ...Typography.body, color: Colors.gray, textAlign: 'center' },

  termsNote:   { ...Typography.small, color: Colors.midGray, textAlign: 'center', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successModal: { backgroundColor: Colors.white, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  successEmoji: { fontSize: 56, marginBottom: 12 },
  successTitle: { ...Typography.h2, color: Colors.black, marginBottom: 8 },
  successDesc:  { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  successCode:  { ...Typography.body, color: Colors.primary, fontWeight: '800' },
  successBtn:   { width: '100%', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  successBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  successClose: { paddingVertical: 10 },
  successCloseText: { ...Typography.body, color: Colors.gray },
});
