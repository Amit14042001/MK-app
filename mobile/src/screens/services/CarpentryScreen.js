/**
 * MK App — Carpentry & Woodwork Services Screen (Full)
 * Door repair, furniture assembly, custom woodwork, wardrobe fitting, window repair
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

const CARPENTRY_SERVICES = [
  {
    id: 'door-repair',
    name: 'Door Repair & Fitting',
    icon: '🚪',
    desc: 'Squeaky hinges, stuck doors, damaged frames, lock replacement — all door issues fixed at home.',
    startingPrice: 299, originalPrice: 499, duration: 60,
    rating: 4.8, totalBookings: 14600,
    warranty: '30-day warranty',
    inclusions: ['Door inspection', 'Hinge adjustment/replacement', 'Frame repair', 'Door planing (if sticking)', 'Lock fitting', 'Alignment check'],
    exclusions: ['Complete door replacement', 'Door painting'],
    steps: ['Book in 60 sec', 'Carpenter arrives with tools', 'Door assessment', 'Repair & fix', 'Final check'],
    faq: [
      { q: 'Can you replace just the door lock?', a: 'Yes. We carry standard Yale, Godrej and mortise locks. Bring your preferred brand if needed.' },
      { q: 'My door drags on the floor. Can you fix it?', a: 'Yes, we plane or shave the door bottom. Takes 30-45 minutes.' },
    ],
    isEmergency: false,
    isBestseller: true,
  },
  {
    id: 'furniture-assembly',
    name: 'Furniture Assembly',
    icon: '🛋️',
    desc: 'Wardrobes, beds, TV units, chairs, tables — we assemble flat-pack and knocked-down furniture from any brand.',
    startingPrice: 399, originalPrice: 699, duration: 90,
    rating: 4.9, totalBookings: 22800,
    warranty: 'Assembly guarantee',
    inclusions: ['All brands (IKEA, Pepperfry, Urban Ladder etc.)', 'Full assembly with tools', 'Proper alignment', 'Spare parts placement', 'Debris removal after'],
    exclusions: ['Purchases of furniture', 'Wall mounting (priced separately)'],
    steps: ['Book & mention furniture type', 'Carpenter arrives', 'Unpack & lay out pieces', 'Systematic assembly', 'Final quality check'],
    faq: [
      { q: 'Can you assemble IKEA furniture?', a: 'Yes! IKEA, Pepperfry, Amazon Basics, Urban Ladder — all brands handled.' },
      { q: 'What if parts are missing?', a: 'We help you identify missing parts and can order them. Assembly fee is charged for work done.' },
    ],
    isBestseller: true,
  },
  {
    id: 'wardrobe-repair',
    name: 'Wardrobe Repair & Fitting',
    icon: '🗄️',
    desc: 'Wardrobe hinge replacement, sliding door track repair, drawer fixing, shelf installation and more.',
    startingPrice: 349, originalPrice: 599, duration: 60,
    rating: 4.7, totalBookings: 9200,
    warranty: '30-day warranty',
    inclusions: ['Hinge inspection & replacement', 'Sliding track repair', 'Drawer mechanism fix', 'Shelf adjustment', 'Handle replacement'],
    exclusions: ['Full wardrobe replacement', 'Laminate repair'],
    steps: ['Book', 'Carpenter arrives', 'Assess wardrobe issues', 'Repair all identified problems', 'Final test'],
    faq: [
      { q: 'My wardrobe door is sagging. Can it be fixed?', a: 'Yes. Sagging is usually a hinge or top rail issue. Fixed in 30-45 minutes.' },
    ],
  },
  {
    id: 'wall-shelves',
    name: 'Wall Shelves & TV Unit',
    icon: '📺',
    desc: 'Install floating shelves, TV units, display racks, and mounting solutions. Stud-finder used for safe installation.',
    startingPrice: 249, originalPrice: 399, duration: 45,
    rating: 4.8, totalBookings: 18300,
    warranty: 'Load-test guaranteed',
    inclusions: ['Wall inspection & marking', 'Stud/anchor identification', 'Drilling & mounting', 'Level alignment', 'Weight test'],
    exclusions: ['Shelf/bracket purchase', 'Plastering after mounting'],
    steps: ['Book & specify shelf type', 'Carpenter arrives', 'Mark & measure', 'Drill & mount', 'Level check'],
    faq: [
      { q: 'Can you mount on all wall types?', a: 'Brick, concrete, drywall and tile — yes. Very old walls may need extra anchors.' },
    ],
    isBestseller: false,
  },
  {
    id: 'window-repair',
    name: 'Window Repair & Fitting',
    icon: '🪟',
    desc: 'Window hinge repair, grille fitting, glass pane replacement, mosquito mesh installation.',
    startingPrice: 349, originalPrice: 549, duration: 60,
    rating: 4.7, totalBookings: 7800,
    warranty: '30-day warranty',
    inclusions: ['Window frame inspection', 'Hinge & latch repair', 'Frame alignment', 'Mosquito mesh fitting', 'Sealant application'],
    exclusions: ['Glass cutting (need specialist)', 'Full window replacement'],
    steps: ['Book', 'Carpenter arrives', 'Inspect issue', 'Repair/replace parts', 'Seal & test'],
    faq: [
      { q: 'Do you install mosquito mesh?', a: 'Yes. We measure, cut and fit mesh for all standard window sizes.' },
    ],
  },
  {
    id: 'bed-repair',
    name: 'Bed & Sofa Repair',
    icon: '🛏️',
    desc: 'Bed slat replacement, joint tightening, sofa frame repair, squeaky bed fix.',
    startingPrice: 349, originalPrice: 599, duration: 60,
    rating: 4.8, totalBookings: 12400,
    warranty: '30-day warranty',
    inclusions: ['Full bed/sofa inspection', 'Joint tightening & gluing', 'Slat repair/replacement', 'Leg levelling', 'Structural reinforcement'],
    exclusions: ['Upholstery work', 'Foam replacement'],
    steps: ['Book', 'Carpenter arrives', 'Inspect frame', 'Repair squeaks & joints', 'Final check'],
    faq: [
      { q: 'My bed frame broke. Can it be repaired?', a: 'Most broken joints can be repaired with wood glue and clamps. Splits longer than 20cm may need replacement parts.' },
    ],
    isBestseller: false,
  },
  {
    id: 'kitchen-cabinet',
    name: 'Kitchen Cabinet Repair',
    icon: '🍳',
    desc: 'Modular kitchen hinge fixing, soft-close mechanism, drawer slide replacement, cabinet door alignment.',
    startingPrice: 399, originalPrice: 699, duration: 60,
    rating: 4.8, totalBookings: 11100,
    warranty: '30-day warranty',
    inclusions: ['All cabinet hinges checked', 'Soft-close mechanism repair', 'Drawer slide lubrication/replacement', 'Door levelling', 'Handle tightening'],
    exclusions: ['Full cabinet replacement', 'Counter-top repair'],
    steps: ['Book', 'Carpenter arrives', 'Open all cabinets for inspection', 'Repair identified issues', 'Test & certify'],
    faq: [
      { q: 'How long does modular kitchen repair take?', a: 'Typically 1-2 hours for a full kitchen of 10-15 cabinets.' },
    ],
    isBestseller: false,
  },
  {
    id: 'custom-woodwork',
    name: 'Custom Woodwork',
    icon: '🪵',
    desc: 'Small custom carpentry — shelves cut to size, wooden boxes, photo frames, partition panels.',
    startingPrice: 599, originalPrice: 999, duration: 120,
    rating: 4.6, totalBookings: 3400,
    warranty: 'As per quote',
    inclusions: ['Site measurement', 'Material estimation', 'Cutting & shaping on-site', 'Finishing work', 'Installation'],
    exclusions: ['Large furniture manufacture', 'Material cost'],
    steps: ['Book for consultation', 'Carpenter visits & quotes', 'Confirm & schedule', 'Work done on-site', 'Delivery/installation'],
    faq: [
      { q: 'Can I get a custom bookshelf made?', a: 'Yes! Share your dimensions and we\'ll provide a quote. Usually 1-2 days for standard custom work.' },
    ],
  },
];

const EMERGENCY_SERVICES = [
  { icon: '🔒', name: 'Emergency Lock Repair', time: '60 min', price: 499 },
  { icon: '🚪', name: 'Broken Door Fix', time: '90 min', price: 599 },
  { icon: '🪟', name: 'Window Lock Fix', time: '60 min', price: 449 },
];

const PROCESS_STEPS = [
  { icon: '📱', title: 'Book in 60 sec', desc: 'Select service and time slot' },
  { icon: '🔔', title: 'Confirmation', desc: 'Carpenter assigned within minutes' },
  { icon: '🛠️', title: 'Expert arrives', desc: 'Fully equipped with professional tools' },
  { icon: '✅', title: 'Job done', desc: 'Quality checked and warranty given' },
];

function ServiceCard({ service, onAddToCart, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const discount = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.92}>
      {service.isBestseller && (
        <View style={styles.cardBestsellerRibbon}><Text style={styles.cardRibbonText}>⭐ BESTSELLER</Text></View>
      )}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDuration}>⏱ ~{service.duration} min • {service.warranty}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {service.rating}</Text>
            <Text style={styles.bookingsText}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>₹{service.startingPrice}</Text>
          <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
          <View style={styles.discBadge}><Text style={styles.discText}>{discount}% off</Text></View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnAdded]} onPress={() => onAddToCart(service)}>
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
      <View style={styles.modalWrap}>
        <View style={styles.modalHead}>
          <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
            <Text style={{ fontSize: 16, color: Colors.gray }}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalHeadTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1A1A2E', '#5D4037', '#8D6E63']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroName}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⏱ {service.duration} min  |  🛡️ {service.warranty}</Text>
            <View style={styles.modalHeroStats}>
              <Text style={styles.modalHeroStat}>⭐ {service.rating}</Text>
              <Text style={styles.modalHeroStat}>  📦 {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
            </View>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <View style={styles.modalPriceBox}>
              <Text style={styles.modalPriceLbl}>Starting at</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text style={styles.modalPrice}>₹{service.startingPrice}</Text>
                <Text style={styles.modalOrigPrice}>₹{service.originalPrice}</Text>
              </View>
            </View>
            <View style={styles.tabBar}>
              {['inclusions', 'exclusions', 'steps', 'faq'].map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'inclusions' && service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.checkIcon}>✓</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {tab === 'exclusions' && service.exclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.crossIcon}>✗</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {tab === 'steps' && service.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
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
          <TouchableOpacity style={styles.modalAddBtn} onPress={() => { onAdd(service); onClose(); }}>
            <Text style={styles.modalAddText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CarpentryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'repair', label: 'Repair' },
    { key: 'assembly', label: 'Assembly' },
    { key: 'installation', label: 'Installation' },
    { key: 'custom', label: 'Custom' },
  ];

  const filtered = CARPENTRY_SERVICES.filter(s => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'repair') return ['door-repair', 'wardrobe-repair', 'window-repair', 'bed-repair', 'kitchen-cabinet'].includes(s.id);
    if (activeFilter === 'assembly') return s.id === 'furniture-assembly';
    if (activeFilter === 'installation') return s.id === 'wall-shelves';
    if (activeFilter === 'custom') return s.id === 'custom-woodwork';
    return true;
  });

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'carpentry', duration: service.duration, icon: service.icon });
    Alert.alert('Added! 🔨', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange: [0, 100], outputRange: ['transparent', '#5D4037'], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carpentry</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#5D4037', '#8D6E63']} style={styles.hero}>
          <Text style={styles.heroIcon}>🪵</Text>
          <Text style={styles.heroTitle}>Carpentry at Your Doorstep</Text>
          <Text style={styles.heroSub}>Expert woodwork • Tools included • 30-day warranty</Text>
          <View style={styles.heroStatsRow}>
            {[['4.8★', 'Rating'], ['80k+', 'Jobs done'], ['45 min', 'Avg arrival']].map(([v, l], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyTitle}>⚡ Emergency Services — Arrives in 60 min</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {EMERGENCY_SERVICES.map((e, i) => (
              <TouchableOpacity key={i} style={styles.emergencyCard} onPress={() => Alert.alert('Emergency Booked', `${e.name} — carpenter on the way!`)}>
                <Text style={styles.emergencyIcon}>{e.icon}</Text>
                <Text style={styles.emergencyName}>{e.name}</Text>
                <Text style={styles.emergencyTime}>Arrives in {e.time}</Text>
                <Text style={styles.emergencyPrice}>₹{e.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* How it works */}
        <View style={styles.processSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.processSteps}>
            {PROCESS_STEPS.map((step, i) => (
              <View key={i} style={styles.processStep}>
                <View style={styles.processIconWrap}><Text style={styles.processIcon}>{step.icon}</Text></View>
                <Text style={styles.processTitle}>{step.title}</Text>
                <Text style={styles.processDesc}>{step.desc}</Text>
                {i < PROCESS_STEPS.length - 1 && <View style={styles.processArrow}><Text style={styles.processArrowText}>→</Text></View>}
              </View>
            ))}
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services */}
        <View style={{ padding: 16, paddingTop: 12 }}>
          <Text style={styles.sectionTitle}>{filtered.length} Services Available</Text>
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onAddToCart={handleAdd} onPress={(sv) => { setDetail(sv); setShowDetail(true); }} />
          ))}
        </View>

        {/* Safety */}
        <View style={styles.safetyBox}>
          <Text style={styles.safetyTitle}>🛡️ Professionally Verified Carpenters</Text>
          <Text style={styles.safetyText}>Every carpenter is background verified, tool-trained and carries professional-grade equipment. All work is covered by our 30-day repair warranty.</Text>
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
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroIcon: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  heroStatsRow: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 16 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  emergencyBanner: { margin: 16, backgroundColor: '#FFF3E0', borderRadius: 18, padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  emergencyTitle: { fontSize: 15, fontWeight: '700', color: Colors.warning },
  emergencyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginRight: 12, width: 160, ...Shadows.sm },
  emergencyIcon: { fontSize: 26, marginBottom: 6 },
  emergencyName: { fontSize: 13, fontWeight: '700', color: Colors.black },
  emergencyTime: { fontSize: 11, color: Colors.midGray, marginTop: 2 },
  emergencyPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary, marginTop: 6 },

  processSection: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 14 },
  processSteps: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  processStep: { flex: 1, alignItems: 'center', position: 'relative' },
  processIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FBE9E7', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  processIcon: { fontSize: 24 },
  processTitle: { fontSize: 11, fontWeight: '700', color: Colors.black, textAlign: 'center' },
  processDesc: { fontSize: 10, color: Colors.midGray, textAlign: 'center', marginTop: 2, lineHeight: 14 },
  processArrow: { position: 'absolute', right: -8, top: 16 },
  processArrowText: { fontSize: 18, color: Colors.lightGray },

  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: '#5D4037', borderColor: '#5D4037' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card, overflow: 'hidden' },
  cardBestsellerRibbon: { position: 'absolute', top: 14, right: 14, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardRibbonText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cardDuration: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bookingsText: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  origPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: { backgroundColor: '#FBE9E7', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1.5, borderColor: '#5D4037' },
  addBtnAdded: { backgroundColor: '#5D4037' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  addBtnAddedText: { color: '#fff' },

  safetyBox: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FBE9E7', borderRadius: 16, padding: 18 },
  safetyTitle: { fontSize: 15, fontWeight: '700', color: '#5D4037', marginBottom: 6 },
  safetyText: { fontSize: 13, color: Colors.gray, lineHeight: 18 },

  // Modal
  modalWrap: { flex: 1, backgroundColor: Colors.bg },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalHeadTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroName: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDur: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  modalHeroStats: { flexDirection: 'row', marginTop: 10 },
  modalHeroStat: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  modalPriceBox: { backgroundColor: '#FBE9E7', borderRadius: 14, padding: 16, marginBottom: 20 },
  modalPriceLbl: { fontSize: 12, color: '#5D4037' },
  modalPrice: { fontSize: 26, fontWeight: '900', color: '#5D4037' },
  modalOrigPrice: { fontSize: 15, color: Colors.midGray, textDecorationLine: 'line-through' },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', ...Shadows.sm },
  tabBtnText: { fontSize: 12, color: Colors.midGray, fontWeight: '600' },
  tabBtnTextActive: { color: '#5D4037', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkIcon: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  crossIcon: { fontSize: 14, color: Colors.error, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#5D4037', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNum: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: Colors.gray },
  faqCard: { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  modalAddBtn: { backgroundColor: '#5D4037', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  modalAddText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
