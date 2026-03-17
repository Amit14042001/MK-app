/**
 * MK App — Salon at Home Screen (Full Production)
 * Women's salon — haircut, blow-dry, hair color, keratin, styling at home
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Modal, Animated, Dimensions, FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const { width: W } = Dimensions.get('window');

const SALON_SERVICES = [
  {
    id: 'womens-haircut',
    name: "Women's Haircut & Styling",
    icon: '✂️',
    desc: 'Expert haircut with wash, blow-dry and style. From trims to full transformations, bring your reference photo.',
    startingPrice: 399, originalPrice: 699, duration: 60,
    rating: 4.9, totalBookings: 41200,
    warranty: 'Style satisfaction guaranteed',
    types: ['Trim & Clean-up', 'U-Cut', 'V-Cut', 'Layer Cut', 'Step Cut', 'Feather Cut', 'Bob Cut', 'Fringe / Bangs'],
    inclusions: ['Consultation', 'Hair wash', 'Conditioning', 'Precision cut', 'Blow-dry', 'Styling product finish'],
    exclusions: ['Hair color', 'Treatment'],
    faq: [
      { q: 'Can I show a reference photo?', a: 'Absolutely! Show our stylist the exact style you want.' },
      { q: 'Does the stylist bring professional tools?', a: 'Yes. Scissors, thinning shears, blow dryer, straightener — all brought to your home.' },
    ],
    isBestseller: true,
  },
  {
    id: 'blowdry-styling',
    name: 'Blow-Dry & Hair Styling',
    icon: '💨',
    desc: 'Professional blow-dry, straightening, curling or waves. Perfect for events and daily styling.',
    startingPrice: 299, originalPrice: 499, duration: 45,
    rating: 4.9, totalBookings: 33800,
    warranty: 'Style satisfaction guaranteed',
    types: ['Blow-dry (straight)', 'Blowout (volume)', 'Curls / Waves', 'Crimping', 'Sleek & Smooth', 'Braids'],
    inclusions: ['Hair wash', 'Conditioning spray', 'Heat protection', 'Blow-dry / style', 'Finishing spray'],
    exclusions: ['Haircut', 'Color'],
    faq: [
      { q: 'How long does a blowout last?', a: 'Typically 2-4 days depending on hair type. Avoid washing during this period.' },
    ],
    isBestseller: true,
  },
  {
    id: 'hair-color-salon',
    name: 'Hair Color (Global / Highlights)',
    icon: '🎨',
    desc: 'Full color, highlights, balayage, ombre — all professional hair coloring services at home.',
    startingPrice: 799, originalPrice: 1399, duration: 120,
    rating: 4.8, totalBookings: 19600,
    warranty: 'Color satisfaction guaranteed',
    types: ['Global Color', 'Root Touch-Up', 'Highlights', 'Balayage', 'Ombre', 'Fashion Colors', 'Grey Coverage'],
    inclusions: ['Color consultation & strand test', 'Application', 'Processing time', 'Post-color wash', 'Deep conditioning', 'Blow-dry'],
    exclusions: ['Color product cost (charged extra)', 'Haircut'],
    faq: [
      { q: 'Are the colors professional grade?', a: 'Yes. We use Schwarzkopf, Wella, L\'Oreal Professional — same brands as premium salons.' },
      { q: 'Is bleaching included?', a: 'Bleach is charged separately as it requires additional processing and expertise.' },
    ],
    isBestseller: false,
  },
  {
    id: 'keratin-treatment',
    name: 'Keratin & Smoothening',
    icon: '✨',
    desc: 'Frizz-free, smooth, silky hair for 3-6 months. Keratin treatment done by certified stylists.',
    startingPrice: 1999, originalPrice: 3499, duration: 180,
    rating: 4.8, totalBookings: 12400,
    warranty: 'Smoothness guaranteed',
    types: ['Keratin Treatment (3 months)', 'Cysteine Treatment (6 months)', 'Smoothening (2-3 months)', 'Botox Treatment'],
    inclusions: ['Pre-wash', 'Strand test', 'Product application', 'Flat iron sealing', 'Post treatment conditioning', 'Blow-dry & style'],
    exclusions: ['Haircut', 'Color'],
    faq: [
      { q: 'Can I wash hair after keratin?', a: 'Wait 72 hours after treatment before washing. Our stylist will give you complete aftercare instructions.' },
      { q: 'Is it suitable for colored hair?', a: 'Yes. Inform the stylist about color history for the right product selection.' },
    ],
    isBestseller: false,
    isLuxury: true,
  },
  {
    id: 'hair-spa-salon',
    name: 'Hair Spa & Deep Conditioning',
    icon: '🌸',
    desc: 'Nourishing hair spa with hot oil, mask and steam. Repairs damage, reduces breakage and adds shine.',
    startingPrice: 599, originalPrice: 999, duration: 75,
    rating: 4.8, totalBookings: 24100,
    warranty: 'Shine satisfaction guaranteed',
    types: ['Basic Hair Spa', 'Moroccan Oil Spa', 'Protein Spa', 'Repair Treatment', 'Scalp Detox', 'Colour Care Spa'],
    inclusions: ['Shampoo & prep', 'Hot oil massage (15 min)', 'Hair mask application', 'Steam treatment', 'Rinse & condition', 'Blow-dry'],
    exclusions: ['Haircut', 'Color'],
    faq: [
      { q: 'How often should I do a hair spa?', a: 'Once a month for normal hair, every 2 weeks for damaged or color-treated hair.' },
    ],
    isBestseller: false,
  },
  {
    id: 'bridal-hair',
    name: 'Bridal / Event Hair Styling',
    icon: '👰',
    desc: 'Stunning bridal updos, party hairdos, buns and more. Certified bridal hairstylists at your venue.',
    startingPrice: 1499, originalPrice: 2499, duration: 90,
    rating: 4.9, totalBookings: 8700,
    warranty: 'Look satisfaction guaranteed',
    types: ['Bridal Bun', 'Mehendi Look', 'Reception Updo', 'Engagement Style', 'Party Blow-dry', 'Half-up Look'],
    inclusions: ['Hair consultation', 'Trial session available', 'Wash & prep', 'Styling & setting', 'Accessories (flowers/pins) placement', 'Finishing spray'],
    exclusions: ['Hair accessories purchase', 'Makeup'],
    faq: [
      { q: 'Can I book a trial session first?', a: 'Yes! We strongly recommend a trial 1 week before the event. Book trial as a separate session.' },
    ],
    isBestseller: false,
    isSpecial: true,
  },
  {
    id: 'scalp-treatment',
    name: 'Scalp Treatment & Head Massage',
    icon: '💆‍♀️',
    desc: 'Scalp analysis, oil treatment, dandruff treatment and relaxing head massage for healthy hair growth.',
    startingPrice: 399, originalPrice: 699, duration: 45,
    rating: 4.8, totalBookings: 18300,
    warranty: 'Scalp health guaranteed',
    types: ['Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox', 'Oil Massage', 'Ayurvedic Treatment', 'PRP Simulation'],
    inclusions: ['Scalp analysis', 'Treatment product application', 'Scalp massage (30 min)', 'Acupressure points', 'Rinse & dry'],
    exclusions: ['Full hair spa', 'Color or cut'],
    faq: [
      { q: 'Does scalp massage help with hair loss?', a: 'Regular scalp massage improves blood circulation which can help slow down stress-related hair loss.' },
    ],
    isBestseller: false,
  },
  {
    id: 'hair-extension',
    name: 'Hair Extension Service',
    icon: '💇',
    desc: 'Clip-in, tape-in or fusion extensions. Add length and volume instantly with professional fitting.',
    startingPrice: 2999, originalPrice: 4999, duration: 120,
    rating: 4.7, totalBookings: 4200,
    warranty: 'Application guarantee',
    types: ['Clip-in Extensions', 'Tape-in Extensions', 'Micro Ring', 'Fusion/Bond', 'Halo Extension'],
    inclusions: ['Consultation', 'Color matching', 'Professional application', 'Blending & styling', 'Aftercare guide'],
    exclusions: ['Extension hair cost (charged extra)', 'Color'],
    faq: [
      { q: 'Do I need to buy extensions separately?', a: 'Extensions (hair) are charged extra based on length and grams required. Service fee covers application.' },
    ],
    isBestseller: false,
    isLuxury: true,
  },
];

const COMBOS = [
  { id: 'c1', name: 'Haircut + Blow-dry', icons: ['✂️','💨'], originalPrice: 698, price: 549, savings: 149, color: ['#E91E8C','#880E4F'] },
  { id: 'c2', name: 'Color + Spa',        icons: ['🎨','🌸'], originalPrice: 1398, price: 999, savings: 399, color: ['#7B1FA2','#4A148C'] },
  { id: 'c3', name: 'Full Salon Package', icons: ['✂️','🎨','✨'], originalPrice: 3197, price: 1999, savings: 1198, color: ['#00BCD4','#006064'] },
];

const STEPS = [
  { icon: '📱', label: 'Book online' },
  { icon: '👩', label: 'Stylist assigned' },
  { icon: '🚗', label: 'Arrives with kit' },
  { icon: '💄', label: 'Salon service done' },
];

function ServiceCard({ service, onAdd, onViewDetail }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onViewDetail(service)} activeOpacity={0.93}>
      {service.isBestseller && (
        <View style={styles.ribbon}><Text style={styles.ribbonText}>BESTSELLER</Text></View>
      )}
      {service.isSpecial && (
        <View style={[styles.ribbon, { backgroundColor: '#b8860b' }]}><Text style={styles.ribbonText}>SPECIAL</Text></View>
      )}
      {service.isLuxury && (
        <View style={[styles.ribbon, { backgroundColor: '#7B1FA2' }]}><Text style={styles.ribbonText}>LUXURY</Text></View>
      )}
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDur}>⏱ {service.duration} min</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingTxt}>⭐ {service.rating}</Text>
            <Text style={styles.bookingsTxt}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
        {service.types.slice(0, 4).map((t, i) => (
          <View key={i} style={styles.typeChip}><Text style={styles.typeChipTxt}>{t}</Text></View>
        ))}
        {service.types.length > 4 && <Text style={styles.moreTypes}>+{service.types.length - 4} more</Text>}
      </ScrollView>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.startsAt}>Starts at</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{service.startingPrice}</Text>
            <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
            <View style={styles.discBadge}><Text style={styles.discTxt}>{disc}% off</Text></View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, inCart && styles.addBtnActive]}
          onPress={() => onAdd(service)}
        >
          <Text style={[styles.addBtnTxt, inCart && styles.addBtnTxtActive]}>
            {inCart ? '✓ Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function DetailModal({ service, visible, onClose, onAdd }) {
  const [activeTab, setActiveTab] = useState('inclusions');
  if (!service) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#880E4F', '#E91E8C', '#F48FB1']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroName}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⏱ {service.duration} min  •  ⭐ {service.rating}  •  {(service.totalBookings/1000).toFixed(1)}k bookings</Text>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDescTxt}>{service.desc}</Text>
            <Text style={styles.modalSection}>Available Styles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {service.types.map((t, i) => (
                <View key={i} style={styles.styleOption}>
                  <Text style={styles.styleOptionTxt}>{t}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.tabs}>
              {['inclusions', 'exclusions', 'faq'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {activeTab === 'inclusions' && service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.listTxt}>{item}</Text>
              </View>
            ))}
            {activeTab === 'exclusions' && service.exclusions.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.crossIcon}>✗</Text>
                <Text style={styles.listTxt}>{item}</Text>
              </View>
            ))}
            {activeTab === 'faq' && service.faq.map((item, i) => (
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
          <TouchableOpacity
            style={styles.modalAddBtn}
            onPress={() => { onAdd(service); onClose(); }}
          >
            <Text style={styles.modalAddTxt}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SalonScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'haircut', label: 'Haircut' },
    { key: 'color', label: 'Color' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'event', label: 'Event' },
  ];

  const filtered = SALON_SERVICES.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'haircut') return ['womens-haircut', 'blowdry-styling', 'hair-extension'].includes(s.id);
    if (filter === 'color') return ['hair-color-salon'].includes(s.id);
    if (filter === 'treatment') return ['keratin-treatment', 'hair-spa-salon', 'scalp-treatment'].includes(s.id);
    if (filter === 'event') return ['bridal-hair'].includes(s.id);
    return true;
  });

  const handleAdd = (service) => {
    addToCart({
      id: service.id,
      name: service.name,
      price: service.startingPrice,
      category: 'salon',
      duration: service.duration,
      icon: service.icon,
    });
    Alert.alert('Added! 💅', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['transparent', '#880E4F'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salon at Home</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#880E4F', '#E91E8C']} style={styles.hero}>
          <Text style={styles.heroEmoji}>💇‍♀️</Text>
          <Text style={styles.heroTitle}>Salon at Your Doorstep</Text>
          <Text style={styles.heroSub}>Certified female stylists • Premium brands • Your schedule</Text>
          <View style={styles.heroStats}>
            {[['4.9★', 'Rating'], ['5L+', 'Sessions'], ['100%', 'Female Pros']].map(([v, l], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* How it works */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsRow}>
            {STEPS.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepIconWrap}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                </View>
                <Text style={styles.stepLabel}>{step.label}</Text>
                {i < STEPS.length - 1 && <View style={styles.stepArrow}><Text style={styles.stepArrowTxt}>→</Text></View>}
              </View>
            ))}
          </View>
        </View>

        {/* Combo Deals */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>🔥 Combo Deals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
            {COMBOS.map(c => (
              <TouchableOpacity key={c.id} style={styles.comboCard} onPress={() => Alert.alert('Combo Added!', `${c.name} — ₹${c.price}`)}>
                <LinearGradient colors={c.color} style={styles.comboGrad}>
                  <View style={styles.comboIconRow}>
                    {c.icons.map((ico, i) => <Text key={i} style={styles.comboIcon}>{ico}</Text>)}
                  </View>
                  <Text style={styles.comboName}>{c.name}</Text>
                  <View style={styles.comboPriceRow}>
                    <Text style={styles.comboPrice}>₹{c.price}</Text>
                    <Text style={styles.comboOrig}>₹{c.originalPrice}</Text>
                  </View>
                  <Text style={styles.comboSave}>Save ₹{c.savings}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 24 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterTxt, filter === f.key && styles.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services */}
        <View style={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s => (
            <ServiceCard
              key={s.id}
              service={s}
              onAdd={handleAdd}
              onViewDetail={(sv) => { setDetail(sv); setShowDetail(true); }}
            />
          ))}
        </View>

        {/* Trust signals */}
        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>🛡️ Our Safety Promise</Text>
          {[
            '100% certified female beauticians',
            'All tools sanitized before every session',
            'Professional-grade products only (Wella, Schwarzkopf, L\'Oreal)',
            'Transparent pricing — no surprise charges',
            'Satisfaction guarantee or free redo',
          ].map((item, i) => (
            <View key={i} style={styles.trustRow}>
              <Text style={styles.trustCheck}>✓</Text>
              <Text style={styles.trustItem}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      <DetailModal
        service={detail}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backTxt: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center', lineHeight: 18 },
  heroStats: {
    flexDirection: 'row', marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, gap: 16,
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  stepsSection: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 14 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  step: { flex: 1, alignItems: 'center', position: 'relative' },
  stepIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  stepIcon: { fontSize: 24 },
  stepLabel: { fontSize: 11, fontWeight: '600', color: Colors.black, textAlign: 'center' },
  stepArrow: { position: 'absolute', right: -8, top: 14 },
  stepArrowTxt: { fontSize: 18, color: Colors.lightGray },
  comboCard: { width: 200, borderRadius: 18, overflow: 'hidden' },
  comboGrad: { borderRadius: 18, padding: 18 },
  comboIconRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  comboIcon: { fontSize: 24 },
  comboName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 8 },
  comboPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  comboPrice: { fontSize: 22, fontWeight: '900', color: '#fff' },
  comboOrig: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  comboSave: { fontSize: 12, fontWeight: '700', color: '#FFD700', marginTop: 4 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.lightGray,
  },
  filterChipActive: { backgroundColor: '#880E4F', borderColor: '#880E4F' },
  filterTxt: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTxtActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 16, ...Shadows.card, overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  ribbonText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cardDur: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingTxt: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bookingsTxt: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 10 },
  typesScroll: { marginBottom: 12 },
  typeChip: {
    backgroundColor: '#FCE4EC', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
  },
  typeChipTxt: { fontSize: 11, fontWeight: '600', color: '#880E4F' },
  moreTypes: { fontSize: 11, color: Colors.midGray, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  startsAt: { fontSize: 11, color: Colors.midGray },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  origPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: {
    backgroundColor: '#FCE4EC', borderRadius: 14,
    paddingHorizontal: 22, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#E91E8C',
  },
  addBtnActive: { backgroundColor: '#E91E8C' },
  addBtnTxt: { fontSize: 14, fontWeight: '700', color: '#E91E8C' },
  addBtnTxtActive: { color: '#fff' },
  trustCard: {
    margin: 16, backgroundColor: '#FCE4EC',
    borderRadius: 18, padding: 20,
  },
  trustTitle: { fontSize: 15, fontWeight: '700', color: '#880E4F', marginBottom: 14 },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  trustCheck: { fontSize: 14, fontWeight: '700', color: '#880E4F', marginRight: 10 },
  trustItem: { flex: 1, fontSize: 13, color: Colors.gray, lineHeight: 18 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center',
  },
  closeTxt: { fontSize: 16, color: Colors.gray },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroName: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDur: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  modalBody: { padding: 20 },
  modalDescTxt: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  modalSection: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 10 },
  styleOption: {
    backgroundColor: '#FCE4EC', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 10,
  },
  styleOptionTxt: { fontSize: 13, fontWeight: '600', color: '#880E4F' },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.offWhite,
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', ...Shadows.sm },
  tabTxt: { fontSize: 12, color: Colors.midGray, fontWeight: '600' },
  tabTxtActive: { color: '#880E4F', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkIcon: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  crossIcon: { fontSize: 14, color: Colors.error, fontWeight: '700', marginRight: 10 },
  listTxt: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  faqCard: { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff',
  },
  modalAddBtn: { backgroundColor: '#880E4F', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  modalAddTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
