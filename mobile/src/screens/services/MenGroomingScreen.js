/**
 * MK App — Men's Grooming at Home Screen (Full)
 * Haircut, beard styling, hair color, facial, head massage, full grooming packages
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

const MEN_SERVICES = [
  {
    id: 'haircut-styling',
    name: 'Haircut & Styling',
    icon: '✂️',
    desc: 'Professional haircut, wash, blow-dry and styling by expert male grooming specialists. Bring your reference photo!',
    startingPrice: 299, originalPrice: 499, duration: 45,
    rating: 4.8, totalBookings: 38400,
    warranty: 'Style satisfaction guaranteed',
    inclusions: ['Consultation', 'Shampoo & conditioning', 'Haircut to preference', 'Blow dry & styling', 'Hair product finish'],
    exclusions: ['Hair color', 'Scalp treatment'],
    styles: ['Classic Taper', 'Fade', 'Undercut', 'Crop', 'Pompadour', 'Textured Quiff'],
    faq: [
      { q: 'Can I show a reference photo?', a: 'Absolutely! Show the stylist your desired look and they\'ll match it as closely as possible.' },
      { q: 'Do you bring your own tools?', a: 'Yes. Professional clippers, scissors, and styling products are all brought to your doorstep.' },
    ],
    isBestseller: true,
  },
  {
    id: 'beard-styling',
    name: 'Beard Trim & Styling',
    icon: '🧔',
    desc: 'Full beard shaping, trimming, line-up and hot towel shave. Classic barbershop experience at home.',
    startingPrice: 199, originalPrice: 349, duration: 30,
    rating: 4.9, totalBookings: 29600,
    warranty: 'Style satisfaction guaranteed',
    inclusions: ['Beard consultation', 'Shape & line-up', 'Trim to preferred length', 'Hot towel treatment', 'Beard oil application'],
    exclusions: ['Scalp haircut', 'Color'],
    styles: ['Full Beard', 'Stubble', 'Goatee', 'French Fork', 'Corporate trim'],
    faq: [
      { q: 'Can you do a fade from head to beard?', a: 'Yes. Book Haircut + Beard combo for a seamless fade from scalp to chin.' },
    ],
    isBestseller: true,
    isQuick: true,
  },
  {
    id: 'hair-color-men',
    name: 'Hair Color (Men)',
    icon: '🎨',
    desc: 'Natural black, highlights, salt & pepper coverage, bleach — all hair color services for men at home.',
    startingPrice: 499, originalPrice: 899, duration: 90,
    rating: 4.7, totalBookings: 12300,
    warranty: 'Color satisfaction guaranteed',
    inclusions: ['Color consultation', 'Strand test', 'Professional hair color', 'Post-color conditioning', 'Styling finish'],
    exclusions: ['Color product cost (charged extra as per usage)', 'Bleaching included only in platinum/highlights packages'],
    styles: ['Natural Black', 'Brown', 'Grey Coverage', 'Highlights', 'Bleach & Tone', 'Ombre'],
    faq: [
      { q: 'Is the color material included in ₹499?', a: 'Basic color application labor starts at ₹499. Product cost is extra depending on brand and quantity used.' },
    ],
  },
  {
    id: 'mens-facial',
    name: "Men's Facial",
    icon: '🧖‍♂️',
    desc: 'Deep cleansing facial for men. Removes blackheads, reduces tan, brightens skin and unclogs pores.',
    startingPrice: 399, originalPrice: 699, duration: 60,
    rating: 4.7, totalBookings: 16800,
    warranty: 'Skin satisfaction guaranteed',
    inclusions: ['Double cleanse', 'Steam', 'Exfoliation', 'Blackhead extraction', 'Face mask', 'Moisturizer & SPF finish'],
    exclusions: ['Chemical peels', 'Laser treatment'],
    styles: ['Basic Cleanup', 'Deep Clean', 'Brightening', 'Anti-Tan', 'Charcoal Facial'],
    faq: [
      { q: 'Is facial suitable for oily/acne-prone skin?', a: 'Yes! Inform the aesthetician. They\'ll adjust the products for your skin type.' },
    ],
    isBestseller: false,
  },
  {
    id: 'head-massage-men',
    name: 'Head & Scalp Massage',
    icon: '💆‍♂️',
    desc: 'Stimulating scalp massage with oil to improve hair growth, reduce dandruff and relieve stress.',
    startingPrice: 299, originalPrice: 499, duration: 30,
    rating: 4.8, totalBookings: 21400,
    warranty: 'Relaxation guaranteed',
    inclusions: ['30 min scalp massage', 'Warm oil treatment', 'Acupressure points', 'Neck & shoulder release', 'Dandruff treatment option'],
    exclusions: ['Haircut', 'Color'],
    styles: ['Coconut Oil', 'Argan Oil', 'Anti-Dandruff', 'Hair Growth Oil', 'Keratin Oil'],
    faq: [
      { q: 'Does head massage reduce hair fall?', a: 'Regular scalp massage improves circulation and can reduce stress-induced hair fall over time.' },
    ],
    isQuick: true,
  },
  {
    id: 'full-grooming-package',
    name: 'Full Grooming Package',
    icon: '👑',
    desc: 'Complete men\'s grooming — haircut, beard, facial, head massage and eyebrow shaping. Total transformation.',
    startingPrice: 999, originalPrice: 1799, duration: 120,
    rating: 4.9, totalBookings: 9800,
    warranty: 'Full satisfaction or redo',
    inclusions: ['Haircut & styling', 'Beard trim & hot towel', 'Basic facial', 'Head & neck massage', 'Eyebrow threading', 'Ear cleaning'],
    exclusions: ['Hair color', 'Scalp treatment add-ons'],
    styles: ['Standard Package', 'Groom Package', 'Executive Package'],
    faq: [
      { q: 'How long does the full package take?', a: 'Approximately 2 hours for the complete service.' },
      { q: 'Can I split across 2 days?', a: 'Yes, with 2 separate booking slots. The package rate applies.' },
    ],
    isBestseller: true,
    isPackage: true,
  },
  {
    id: 'detan-cleanup',
    name: 'De-Tan & Body Cleanup',
    icon: '☀️',
    desc: 'Full face, neck and hand de-tan treatment. Removes tan lines and brightens skin with natural bleach.',
    startingPrice: 349, originalPrice: 599, duration: 45,
    rating: 4.6, totalBookings: 8400,
    warranty: 'Brightness guaranteed',
    inclusions: ['Skin analysis', 'De-tan scrub', 'Bleach application', 'Whitening mask', 'Toning & moisturizer'],
    exclusions: ['Full body treatment', 'Chemical peels'],
    styles: ['Face Only', 'Face + Neck', 'Face + Neck + Hands'],
    faq: [
      { q: 'How many sessions to remove severe tan?', a: 'Moderate tan: 2-3 sessions. Deep tan: 5-6 sessions monthly.' },
    ],
  },
  {
    id: 'eyebrows-ear-nose',
    name: 'Eyebrow + Ear + Nose',
    icon: '✨',
    desc: 'Quick cleanup — eyebrow shaping, ear and nose hair removal. The finishing touches of proper grooming.',
    startingPrice: 99, originalPrice: 199, duration: 20,
    rating: 4.8, totalBookings: 18700,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['Eyebrow shaping (thread/wax)', 'Ear hair removal', 'Nose hair trimming', 'Neck shave line-up'],
    exclusions: ['Full facial', 'Beard service'],
    styles: ['Basic', 'Shaped', 'Arch'],
    faq: [
      { q: 'Do you use thread or wax for eyebrows?', a: 'Threading is default for precision. Wax option available on request.' },
    ],
    isQuick: true,
    isCheapest: true,
  },
];

const COMBO_DEALS = [
  {
    id: 'weekday-combo',
    name: 'Weekday Special',
    services: ['Haircut', 'Beard Trim'],
    originalPrice: 498, discountedPrice: 349,
    savings: 149, color: ['#1A1A2E', '#0F3460'],
  },
  {
    id: 'grooming-plus',
    name: 'Grooming Plus',
    services: ['Full Package', 'Head Massage'],
    originalPrice: 1298, discountedPrice: 899,
    savings: 399, color: ['#b8860b', '#DAA520'],
  },
  {
    id: 'groom-prep',
    name: 'Wedding / Event Prep',
    services: ['Full Package', 'Color', 'Facial'],
    originalPrice: 1898, discountedPrice: 1299,
    savings: 599, color: ['#6A0572', '#E91E8C'],
  },
];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const discount = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.ribbon}><Text style={styles.ribbonText}>BESTSELLER</Text></View>}
      {service.isPackage && <View style={[styles.ribbon, { backgroundColor: '#b8860b' }]}><Text style={styles.ribbonText}>BEST VALUE</Text></View>}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDuration}>⏱ {service.duration} min</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {service.rating}</Text>
            <Text style={styles.bkText}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.stylesRow}>
        {service.styles.slice(0, 3).map((s, i) => (
          <View key={i} style={styles.styleChip}><Text style={styles.styleChipText}>{s}</Text></View>
        ))}
        {service.styles.length > 3 && <Text style={styles.moreStyles}>+{service.styles.length - 3} more</Text>}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.priceArea}>
          <Text style={styles.price}>₹{service.startingPrice}</Text>
          <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
          <View style={styles.discBadge}><Text style={styles.discText}>{discount}% off</Text></View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnActive]} onPress={() => onAdd(service)}>
          <Text style={[styles.addBtnText, inCart && styles.addBtnTextActive]}>{inCart ? '✓ Added' : 'Add'}</Text>
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
        <View style={styles.modalTopBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={{ fontSize: 16, color: Colors.gray }}>✕</Text></TouchableOpacity>
          <Text style={styles.modalTopTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1A1A2E', '#2C3E50']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⏱ {service.duration} min</Text>
            <View style={styles.modalHeroStats}>
              <Text style={styles.modalHeroStat}>⭐ {service.rating}</Text>
              <Text style={styles.modalHeroStat}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
            </View>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <View style={styles.stylesList}>
              <Text style={styles.sectionLabel}>Available Styles</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {service.styles.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.styleOption}>
                    <Text style={styles.styleOptionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.tabBar}>
              {['inclusions', 'exclusions', 'faq'].map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'inclusions' && service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.checkMark}>✓</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {tab === 'exclusions' && service.exclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.crossMark}>✗</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {tab === 'faq' && service.faq.map((item, i) => (
              <View key={i} style={styles.faqCard}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
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

export default function MenGroomingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'hair', label: 'Hair' },
    { key: 'beard', label: 'Beard' },
    { key: 'skin', label: 'Skin' },
    { key: 'packages', label: 'Packages' },
  ];

  const filtered = MEN_SERVICES.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'hair') return ['haircut-styling', 'hair-color-men', 'head-massage-men'].includes(s.id);
    if (filter === 'beard') return s.id === 'beard-styling';
    if (filter === 'skin') return ['mens-facial', 'detan-cleanup', 'eyebrows-ear-nose'].includes(s.id);
    if (filter === 'packages') return s.isPackage;
    return true;
  });

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'grooming', duration: service.duration, icon: service.icon });
    Alert.alert('Added! ✂️', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Men's Grooming</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#2C3E50', '#34495E']} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBack}>
            <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>💈</Text>
          <Text style={styles.heroTitle}>Men's Grooming at Home</Text>
          <Text style={styles.heroSub}>Expert barbers • All tools included • Your schedule</Text>
          <View style={styles.heroStatsRow}>
            {[['4.9★', 'Rating'], ['3L+', 'Bookings'], ['30 min', 'Arrival']].map(([v, l], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Trust Badges */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {[
            ['🏅', 'Certified Barbers'],
            ['🧴', 'Premium Products'],
            ['🧹', 'Clean & Hygienic'],
            ['⏰', '30 min Arrival'],
            ['💯', 'Satisfaction Guaranteed'],
          ].map(([icon, label], i) => (
            <View key={i} style={styles.trustBadge}>
              <Text style={styles.trustIcon}>{icon}</Text>
              <Text style={styles.trustLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Combo Deals */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>🔥 Combo Deals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {COMBO_DEALS.map(deal => (
              <TouchableOpacity key={deal.id} style={styles.comboCard} onPress={() => Alert.alert('Combo Booked!', `${deal.name} added to cart!`)}>
                <LinearGradient colors={deal.color} style={styles.comboGradient}>
                  <Text style={styles.comboName}>{deal.name}</Text>
                  <Text style={styles.comboServices}>{deal.services.join(' + ')}</Text>
                  <View style={styles.comboPriceRow}>
                    <Text style={styles.comboPrice}>₹{deal.discountedPrice}</Text>
                    <Text style={styles.comboOrig}>₹{deal.originalPrice}</Text>
                  </View>
                  <Text style={styles.comboSave}>You save ₹{deal.savings}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 24 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services */}
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv) => { setDetail(sv); setShowDetail(true); }} />
          ))}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          {[
            ['Do barbers bring their own tools?', 'Yes. Professional clippers, scissors, shaving kits, and styling products are all carried.'],
            ['Is it safe to have a barber at home?', 'Yes. All professionals are background-verified and use sanitized tools for every customer.'],
            ['Can I book a slot for same day?', 'Yes! Slots are often available within 2-3 hours for most areas.'],
          ].map(([q, a], i) => (
            <View key={i} style={styles.faqCard}>
              <Text style={styles.faqQ}>{q}</Text>
              <Text style={styles.faqA}>{a}</Text>
            </View>
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
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2C3E50' },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', paddingTop: 16 },
  heroBack: { alignSelf: 'flex-start', marginBottom: 12 },
  heroEmoji: { fontSize: 56, marginBottom: 10 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  heroStatsRow: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, gap: 16 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  trustBadge: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, alignItems: 'center', ...Shadows.sm },
  trustIcon: { fontSize: 22, marginBottom: 4 },
  trustLabel: { fontSize: 11, fontWeight: '600', color: Colors.black, textAlign: 'center' },
  comboCard: { width: 210, marginRight: 14 },
  comboGradient: { borderRadius: 18, padding: 18 },
  comboName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  comboServices: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  comboPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  comboPrice: { fontSize: 22, fontWeight: '900', color: '#fff' },
  comboOrig: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  comboSave: { fontSize: 12, fontWeight: '700', color: '#FFD700', marginTop: 6 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card, overflow: 'hidden' },
  ribbon: { position: 'absolute', top: 14, right: 14, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ribbonText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cardDuration: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bkText: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 10 },
  stylesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  styleChip: { backgroundColor: Colors.offWhite, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  styleChipText: { fontSize: 11, fontWeight: '600', color: Colors.gray },
  moreStyles: { fontSize: 11, color: Colors.midGray, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  origPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: { backgroundColor: '#ECEFF1', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1.5, borderColor: '#2C3E50' },
  addBtnActive: { backgroundColor: '#2C3E50' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#2C3E50' },
  addBtnTextActive: { color: '#fff' },
  faqSection: { margin: 16 },
  faqCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.sm },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalTopTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDur: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  modalHeroStats: { flexDirection: 'row', gap: 20, marginTop: 12 },
  modalHeroStat: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  stylesList: { marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 10 },
  styleOption: { backgroundColor: Colors.offWhite, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10 },
  styleOptionText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', ...Shadows.sm },
  tabBtnText: { fontSize: 12, color: Colors.midGray, fontWeight: '600' },
  tabBtnTextActive: { color: '#2C3E50', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkMark: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  crossMark: { fontSize: 14, color: Colors.error, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  modalBookBtn: { backgroundColor: '#2C3E50', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  modalBookText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
