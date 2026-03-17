/**
 * MK App — Beauty at Home Screen (Full)
 * Women's beauty services — facial, waxing, threading, makeup, mani-pedi
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Modal, Animated, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const { width: W } = Dimensions.get('window');

const BEAUTY_SERVICES = [
  {
    id: 'facial-cleanup',
    name: 'Facial & Cleanup',
    icon: '✨',
    desc: 'Professional facial treatments for glowing skin. Deep cleanse, brightening, anti-tan, hydrating and more.',
    startingPrice: 349, originalPrice: 599, duration: 60,
    rating: 4.9, totalBookings: 42300,
    types: ['Basic Cleanup (30 min)', 'Fruit Facial', 'Gold Facial', 'Diamond Facial', 'Anti-Tan', 'Brightening', 'Hydra Facial'],
    inclusions: ['Double cleanse', 'Steam', 'Scrubbing', 'Mask', 'Toning', 'Moisturizer + SPF'],
    warranty: 'Glow guaranteed',
    isBestseller: true,
  },
  {
    id: 'waxing',
    name: 'Waxing',
    icon: '🌿',
    desc: 'Full body, half body, Rica or chocolate wax. Smooth skin with professional after-care.',
    startingPrice: 199, originalPrice: 349, duration: 45,
    rating: 4.8, totalBookings: 38900,
    types: ['Full Arms', 'Full Legs', 'Underarms', 'Half Body', 'Full Body', 'Bikini', 'Rica Wax'],
    inclusions: ['Skin prep', 'Wax application', 'Post-wax soothing', 'After-wax oil'],
    warranty: 'Clean removal guaranteed',
    isBestseller: true,
  },
  {
    id: 'threading-eyebrows',
    name: 'Threading & Eyebrows',
    icon: '👁️',
    desc: 'Eyebrow shaping, upper lip, forehead, chin and full face threading by expert artists.',
    startingPrice: 79, originalPrice: 149, duration: 20,
    rating: 4.8, totalBookings: 56100,
    types: ['Eyebrows', 'Upper Lip', 'Full Face', 'Forehead', 'Chin', 'Eyebrow Tint', 'Eyebrow Lamination'],
    inclusions: ['Pre-threading prep', 'Precise shaping', 'Soothing lotion after'],
    warranty: 'Shape satisfaction guaranteed',
    isBestseller: true,
    isQuick: true,
  },
  {
    id: 'mani-pedi',
    name: 'Manicure & Pedicure',
    icon: '💅',
    desc: 'Spa manicure and pedicure with nail care, cuticle work, massage and nail color of your choice.',
    startingPrice: 299, originalPrice: 499, duration: 60,
    rating: 4.8, totalBookings: 29400,
    types: ['Basic Manicure', 'Spa Manicure', 'Gel Manicure', 'Basic Pedicure', 'Spa Pedicure', 'Gel Pedicure', 'Combo M+P'],
    inclusions: ['Soak & soften', 'Cuticle care', 'File & shape', 'Hand/foot massage', 'Nail color application'],
    warranty: 'Nail finish guaranteed',
    isBestseller: false,
  },
  {
    id: 'hair-color-women',
    name: 'Hair Color & Treatment',
    icon: '🎨',
    desc: 'Global color, highlights, balayage, keratin treatment, smoothening — all salon services at home.',
    startingPrice: 699, originalPrice: 1199, duration: 120,
    rating: 4.7, totalBookings: 18700,
    types: ['Global Color', 'Highlights', 'Balayage', 'Root Touch-up', 'Keratin Treatment', 'Smoothening', 'Rebonding'],
    inclusions: ['Color consultation', 'Strand test', 'Application', 'Post-color conditioning', 'Styling'],
    warranty: 'Color satisfaction guaranteed',
    isBestseller: false,
  },
  {
    id: 'makeup',
    name: 'Makeup Services',
    icon: '💄',
    desc: 'Party makeup, bridal, engagement, reception — certified makeup artists at your home.',
    startingPrice: 999, originalPrice: 1699, duration: 90,
    rating: 4.9, totalBookings: 14200,
    types: ['Party Makeup', 'Bridal Makeup', 'Reception Look', 'Engagement Look', 'Airbrush Makeup', 'Mehendi Look'],
    inclusions: ['Skin prep', 'Base application', 'Eyes + lips', 'Contouring', 'Setting spray', 'Touch-up kit'],
    warranty: 'Look satisfaction guaranteed',
    isBestseller: false,
    isSpecial: true,
  },
  {
    id: 'hair-spa',
    name: 'Hair Spa & Treatment',
    icon: '🌸',
    desc: 'Nourishing hair spa for damaged, frizzy, or thin hair. Head massage, mask and blow-dry included.',
    startingPrice: 499, originalPrice: 799, duration: 75,
    rating: 4.8, totalBookings: 22100,
    types: ['Basic Hair Spa', 'Repair Hair Spa', 'Moroccan Oil Spa', 'Protein Treatment', 'Scalp Treatment', 'Dandruff Treatment'],
    inclusions: ['Shampoo', 'Hair mask application', 'Steam treatment', 'Head massage', 'Blow-dry', 'Serum finish'],
    warranty: 'Shine satisfaction guaranteed',
    isBestseller: false,
  },
  {
    id: 'full-beauty-package',
    name: 'Full Beauty Package',
    icon: '👸',
    desc: 'Total transformation — facial, waxing, manicure, pedicure, threading and hair spa. Perfect for events.',
    startingPrice: 1499, originalPrice: 2699, duration: 180,
    rating: 4.9, totalBookings: 8900,
    types: ['Standard Package', 'Premium Package', 'Bridal Package'],
    inclusions: ['Facial (45 min)', 'Full body waxing', 'Manicure + pedicure', 'Threading', 'Hair spa', 'Blow-dry & styling'],
    warranty: 'Full satisfaction or redo',
    isBestseller: true,
    isPackage: true,
  },
];

const TRENDING = [
  { name: 'Bridal Makeup', icon: '👰', bookings: '2.1k this week' },
  { name: 'Keratin Treatment', icon: '✨', bookings: '1.8k this week' },
  { name: 'Gold Facial', icon: '🌟', bookings: '3.4k this week' },
  { name: 'Rica Wax', icon: '🌿', bookings: '4.2k this week' },
];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.bsBadge}><Text style={styles.bsBadgeText}>✨ BESTSELLER</Text></View>}
      {service.isPackage && <View style={[styles.bsBadge, { backgroundColor: '#b8860b' }]}><Text style={styles.bsBadgeText}>👑 BEST VALUE</Text></View>}
      <View style={styles.cardHead}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDur}>⏱ {service.duration} min</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {service.rating}</Text>
            <Text style={styles.bkText}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.typesRow}>
        {service.types.slice(0, 3).map((t, i) => (
          <View key={i} style={styles.typeChip}><Text style={styles.typeChipText}>{t}</Text></View>
        ))}
        {service.types.length > 3 && <Text style={styles.moreTypes}>+{service.types.length - 3}</Text>}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{service.startingPrice}</Text>
          <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
          <View style={styles.discBadge}><Text style={styles.discText}>{disc}% off</Text></View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnAdded]} onPress={() => onAdd(service)}>
          <Text style={[styles.addBtnText, inCart && styles.addBtnAddedText]}>{inCart ? '✓ Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function DetailModal({ service, visible, onClose, onAdd }) {
  const [tab, setTab] = useState('inclusions');
  if (!service) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={{ fontSize: 16, color: Colors.gray }}>✕</Text></TouchableOpacity>
          <Text style={styles.modalBarTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#880E4F', '#E91E8C', '#F48FB1']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⏱ {service.duration} min  •  ⭐ {service.rating}  •  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <Text style={styles.subTitle}>Available Types</Text>
            <View style={styles.typesWrap}>
              {service.types.map((t, i) => (
                <TouchableOpacity key={i} style={styles.typeOption}><Text style={styles.typeOptionText}>{t}</Text></TouchableOpacity>
              ))}
            </View>
            <View style={styles.tabRow}>
              {['inclusions', 'faq'].map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'inclusions' && service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.checkMark}>✓</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {tab === 'faq' && (
              <View style={styles.faqCard}>
                <Text style={styles.faqQ}>Is this hygienic?</Text>
                <Text style={styles.faqA}>All tools are sanitized before each session. Disposable items are single-use.</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <View>
            <Text style={{ fontSize: 12, color: Colors.midGray }}>Starting at</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.black }}>₹{service.startingPrice}</Text>
          </View>
          <TouchableOpacity style={styles.modalBookBtn} onPress={() => { onAdd(service); onClose(); }}>
            <Text style={styles.modalBookText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function BeautyAtHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'skin', label: 'Skin' },
    { key: 'hair', label: 'Hair' },
    { key: 'nails', label: 'Nails' },
    { key: 'packages', label: 'Packages' },
  ];

  const filtered = BEAUTY_SERVICES.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'skin') return ['facial-cleanup', 'waxing', 'threading-eyebrows'].includes(s.id);
    if (filter === 'hair') return ['hair-color-women', 'hair-spa'].includes(s.id);
    if (filter === 'nails') return s.id === 'mani-pedi';
    if (filter === 'packages') return s.isPackage || s.id === 'makeup';
    return true;
  });

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'beauty', duration: service.duration, icon: service.icon });
    Alert.alert('Added! 💅', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange: [0, 100], outputRange: ['transparent', '#880E4F'], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beauty at Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <LinearGradient colors={['#1A1A2E', '#880E4F', '#E91E8C']} style={styles.hero}>
          <Text style={styles.heroEmoji}>💄</Text>
          <Text style={styles.heroTitle}>Beauty at Your Doorstep</Text>
          <Text style={styles.heroSub}>Certified beauticians • Premium products • Only female professionals</Text>
          <View style={styles.heroStats}>
            {[['4.9★', 'Rating'], ['10L+', 'Sessions'], ['100%', 'Female Pros']].map(([v, l], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Trending */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {TRENDING.map((t, i) => (
              <View key={i} style={styles.trendCard}>
                <Text style={styles.trendIcon}>{t.icon}</Text>
                <Text style={styles.trendName}>{t.name}</Text>
                <Text style={styles.trendBk}>{t.bookings}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Safety Promise */}
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyIcon}>🛡️</Text>
          <View style={styles.safetyText}>
            <Text style={styles.safetyTitle}>100% Female Professionals</Text>
            <Text style={styles.safetyDesc}>All our beauty professionals are verified females. Safe, hygienic, and trusted.</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv) => { setDetail(sv); setShowDetail(true); }} />
          ))}
        </View>

        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      <DetailModal service={detail} visible={showDetail} onClose={() => setShowDetail(false)} onAdd={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center', lineHeight: 18 },
  heroStats: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 16 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 14 },
  trendCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', width: 130, ...Shadows.sm },
  trendIcon: { fontSize: 30, marginBottom: 6 },
  trendName: { fontSize: 13, fontWeight: '700', color: Colors.black, textAlign: 'center' },
  trendBk: { fontSize: 10, color: '#E91E8C', fontWeight: '600', marginTop: 4 },
  safetyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCE4EC', marginHorizontal: 16, marginTop: 20, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#E91E8C' },
  safetyIcon: { fontSize: 30, marginRight: 14 },
  safetyText: {},
  safetyTitle: { fontSize: 15, fontWeight: '700', color: '#880E4F' },
  safetyDesc: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: '#880E4F', borderColor: '#880E4F' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card, overflow: 'hidden' },
  bsBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: '#E91E8C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bsBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardHead: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cardDur: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bkText: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 10 },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  typeChip: { backgroundColor: '#FCE4EC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  typeChipText: { fontSize: 11, fontWeight: '600', color: '#880E4F' },
  moreTypes: { fontSize: 11, color: Colors.midGray, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  origPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: { backgroundColor: '#FCE4EC', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E91E8C' },
  addBtnAdded: { backgroundColor: '#E91E8C' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#E91E8C' },
  addBtnAddedText: { color: '#fff' },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalBarTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDur: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  subTitle: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 10 },
  typesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeOption: { backgroundColor: '#FCE4EC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  typeOptionText: { fontSize: 13, fontWeight: '600', color: '#880E4F' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { fontSize: 12, color: Colors.midGray, fontWeight: '600' },
  tabBtnTextActive: { color: '#880E4F', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkMark: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  faqCard: { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  modalBookBtn: { backgroundColor: '#880E4F', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  modalBookText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
