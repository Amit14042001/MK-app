/**
 * MK App — Physiotherapy at Home Screen (Full)
 * Back pain, joint pain, sports injury, post-surgery rehab, elderly care physio
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

const PHYSIO_SERVICES = [
  {
    id: 'back-pain',
    name: 'Back Pain Relief',
    icon: '🦴',
    desc: 'Targeted physiotherapy for lower back, upper back and sciatica. Manual therapy + exercise prescription.',
    startingPrice: 799, originalPrice: 1299, duration: 60,
    rating: 4.9, totalBookings: 21300,
    conditions: ['Lower back pain', 'Sciatica', 'Disc bulge', 'Muscle spasm', 'Postural pain'],
    inclusions: ['Assessment & pain mapping', 'Manual therapy', 'Dry needling (if needed)', 'Exercise prescription', 'Postural correction advice', 'Home exercise guide'],
    faq: [{ q: 'How many sessions for back pain?', a: 'Acute pain: 3-5 sessions. Chronic pain: 8-12 sessions for lasting relief.' }],
    isBestseller: true,
    isUrgent: true,
  },
  {
    id: 'joint-pain',
    name: 'Joint Pain & Arthritis',
    icon: '🦵',
    desc: 'Knee, hip, shoulder, ankle — all joint conditions managed with evidence-based physiotherapy.',
    startingPrice: 799, originalPrice: 1299, duration: 60,
    rating: 4.8, totalBookings: 16700,
    conditions: ['Knee arthritis', 'Hip pain', 'Shoulder pain', 'Frozen shoulder', 'Ankle sprain', 'Plantar fasciitis'],
    inclusions: ['Joint assessment', 'Mobilization techniques', 'Strengthening exercises', 'Heat/cold therapy', 'Taping if required', 'Functional training'],
    faq: [{ q: 'Can physio help avoid knee replacement?', a: 'In mild-moderate cases, consistent physiotherapy can delay or avoid surgery significantly.' }],
    isBestseller: true,
  },
  {
    id: 'sports-injury',
    name: 'Sports Injury Rehab',
    icon: '⚽',
    desc: 'Ligament tears, muscle strains, tendinopathy — get back to sport faster with professional sports physio.',
    startingPrice: 899, originalPrice: 1499, duration: 60,
    rating: 4.8, totalBookings: 9400,
    conditions: ['ACL/MCL sprain', 'Hamstring strain', 'Tennis elbow', 'Rotator cuff', 'Shin splints', 'Stress fracture rehab'],
    inclusions: ['Injury assessment & grading', 'RICE protocol guidance', 'Manual therapy', 'Sport-specific rehab', 'Return-to-sport testing', 'Prevention program'],
    faq: [{ q: 'I play cricket. Can you do sports-specific rehab?', a: 'Yes. We tailor rehab to your sport — cricket, football, badminton, running, gym etc.' }],
  },
  {
    id: 'post-surgery',
    name: 'Post-Surgery Rehabilitation',
    icon: '🏥',
    desc: 'Structured rehab after orthopaedic surgery. Knee replacement, hip replacement, fracture surgery — we handle it all.',
    startingPrice: 999, originalPrice: 1599, duration: 60,
    rating: 4.9, totalBookings: 8200,
    conditions: ['Knee replacement rehab', 'Hip replacement', 'ACL reconstruction', 'Fracture fixation', 'Spinal surgery'],
    inclusions: ['Surgeon report review', 'Stage-wise rehab program', 'Scar mobilization', 'Gait retraining', 'Strengthening protocol', 'Daily progress logs'],
    faq: [{ q: 'When can physio start after knee replacement?', a: 'Typically within 24-48 hours post-op, with gentle exercises. We follow surgical team protocols.' }],
    isSpecial: true,
  },
  {
    id: 'elderly-physio',
    name: 'Elderly Care Physiotherapy',
    icon: '👴',
    desc: 'Gentle physiotherapy for seniors — fall prevention, strength building, and mobility improvement at home.',
    startingPrice: 699, originalPrice: 1099, duration: 60,
    rating: 4.9, totalBookings: 12800,
    conditions: ['Fall prevention', 'Parkinson\'s', 'Stroke rehab', 'Age-related weakness', 'Balance issues', 'Osteoporosis'],
    inclusions: ['Functional assessment', 'Balance training', 'Strength exercises', 'Walking aid training', 'Caregiver training', 'Home safety assessment'],
    faq: [{ q: 'Can the physiotherapist train the caregiver too?', a: 'Yes. We train family members and caregivers in safe handling, positioning and exercise assistance.' }],
    isBestseller: false,
  },
  {
    id: 'neck-shoulder',
    name: 'Neck & Shoulder Pain',
    icon: '💆‍♂️',
    desc: 'Cervical spondylosis, trapezitis, tech neck — all neck and shoulder conditions treated at home.',
    startingPrice: 699, originalPrice: 1099, duration: 50,
    rating: 4.8, totalBookings: 18900,
    conditions: ['Cervical spondylosis', 'Tech neck', 'Trapezitis', 'Headaches from neck', 'Shoulder impingement'],
    inclusions: ['Cervical assessment', 'Traction techniques', 'Trigger point therapy', 'Neck strengthening', 'Ergonomic advice', 'Neck exercises guide'],
    faq: [{ q: 'I work at a computer all day. Is this for me?', a: 'Absolutely. Tech neck is one of the most common conditions we treat. Ergonomics guidance included.' }],
    isBestseller: true,
  },
  {
    id: 'neurological-physio',
    name: 'Neurological Rehabilitation',
    icon: '🧠',
    desc: 'Physiotherapy for stroke, Parkinson\'s, MS, cerebral palsy and other neurological conditions.',
    startingPrice: 1099, originalPrice: 1799, duration: 60,
    rating: 4.8, totalBookings: 4600,
    conditions: ['Stroke rehab', 'Parkinson\'s', 'Multiple sclerosis', 'Bell\'s palsy', 'Guillain-Barré', 'Cerebral palsy'],
    inclusions: ['Neurological assessment', 'Movement re-education', 'Balance & coordination', 'Gait training', 'Spasticity management', 'ADL (daily activities) training'],
    faq: [{ q: 'When should stroke rehab start?', a: 'The sooner the better. Early intervention (within days) dramatically improves recovery outcomes.' }],
    isSpecial: true,
  },
  {
    id: 'women-health-physio',
    name: "Women's Health Physio",
    icon: '🤱',
    desc: 'Pelvic floor therapy, prenatal/postnatal physiotherapy, diastasis recti rehabilitation.',
    startingPrice: 899, originalPrice: 1499, duration: 60,
    rating: 4.9, totalBookings: 7200,
    conditions: ['Pelvic floor weakness', 'Prenatal back pain', 'Postnatal recovery', 'Diastasis recti', 'Urinary incontinence'],
    inclusions: ['Pelvic floor assessment', 'Internal/external therapy (consent-based)', 'Core strengthening', 'Posture correction', 'Return-to-exercise guidance'],
    faq: [{ q: 'Is this service done by female physiotherapists?', a: 'Yes, always. Women\'s health physiotherapy is provided exclusively by female certified specialists.' }],
    isWomensOnly: true,
  },
];

const PACKAGES = [
  { id: 'session-6', label: '6 Session Pack', price: 3999, original: 5394, perSession: 666, validity: '30 days' },
  { id: 'session-12', label: '12 Session Pack', price: 6999, original: 10788, perSession: 583, validity: '60 days', isPopular: true },
  { id: 'session-24', label: '24 Session Pack', price: 11999, original: 21576, perSession: 499, validity: '90 days' },
];

const CONDITIONS_LIST = [
  '🦴 Back Pain', '🦵 Knee Pain', '💪 Shoulder Pain', '🧠 Stroke Rehab',
  '⚽ Sports Injury', '🤰 Prenatal', '👴 Elderly Care', '🏥 Post-Surgery',
];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>TOP BOOKED</Text></View>}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDuration}>⏱ {service.duration} min session</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {service.rating}</Text>
            <Text style={styles.bkText}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.conditionsRow}>
        {service.conditions.slice(0, 3).map((c, i) => (
          <View key={i} style={styles.conditionChip}><Text style={styles.conditionText}>{c}</Text></View>
        ))}
        {service.conditions.length > 3 && <Text style={styles.moreText}>+{service.conditions.length - 3} more</Text>}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>₹{service.startingPrice}</Text>
          <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
          <View style={styles.discBadge}><Text style={styles.discText}>{disc}% off</Text></View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnAdded]} onPress={() => onAdd(service)}>
          <Text style={[styles.addBtnText, inCart && styles.addBtnAddedText]}>{inCart ? '✓ Added' : 'Book'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function DetailModal({ service, visible, onClose, onAdd }) {
  if (!service) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalTopBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={{ fontSize: 16, color: Colors.gray }}>✕</Text></TouchableOpacity>
          <Text style={styles.modalTopTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1A1A2E', '#1565C0', '#0D47A1']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⏱ {service.duration} min | ⭐ {service.rating} | {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <View style={styles.conditionsCard}>
              <Text style={styles.conditionsTitle}>Conditions We Treat</Text>
              <View style={styles.conditionsGrid}>
                {service.conditions.map((c, i) => (
                  <View key={i} style={styles.conditionItem}><Text style={styles.conditionItemText}>✓ {c}</Text></View>
                ))}
              </View>
            </View>
            <Text style={styles.inclTitle}>What's Included</Text>
            {service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.checkMark}>✓</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            <Text style={styles.inclTitle}>FAQs</Text>
            {service.faq.map((item, i) => (
              <View key={i} style={styles.faqCard}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <View>
            <Text style={{ fontSize: 12, color: Colors.midGray }}>Per session</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.black }}>₹{service.startingPrice}</Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => { onAdd(service); onClose(); }}>
            <Text style={styles.bookBtnText}>Book Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PhysiotherapyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pain', label: 'Pain Relief' },
    { key: 'injury', label: 'Injury & Sports' },
    { key: 'rehab', label: 'Rehabilitation' },
    { key: 'speciality', label: 'Speciality' },
  ];

  const filtered = PHYSIO_SERVICES.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'pain') return ['back-pain', 'joint-pain', 'neck-shoulder'].includes(s.id);
    if (filter === 'injury') return ['sports-injury', 'post-surgery'].includes(s.id);
    if (filter === 'rehab') return ['post-surgery', 'elderly-physio', 'neurological-physio'].includes(s.id);
    if (filter === 'speciality') return ['women-health-physio', 'neurological-physio'].includes(s.id);
    return true;
  });

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'physiotherapy', duration: service.duration, icon: service.icon });
    Alert.alert('Session Booked! 🏥', `${service.name} added. Our physiotherapist will arrive at your preferred time.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange: [0, 100], outputRange: ['transparent', '#1565C0'], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Physiotherapy</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#1565C0', '#0D47A1']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🏥</Text>
          <Text style={styles.heroTitle}>Physiotherapy at Home</Text>
          <Text style={styles.heroSub}>Certified physiotherapists • Evidence-based treatment</Text>
          <View style={styles.heroStatsRow}>
            {[['4.9★', 'Rating'], ['1L+', 'Sessions done'], ['MPT', 'Qualified physios']].map(([v, l], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Credentials */}
        <View style={styles.credSection}>
          <Text style={styles.sectionTitle}>🎓 Our Physiotherapists</Text>
          <View style={styles.credGrid}>
            {[
              ['MPT/BPT', 'Qualified'],
              ['Background', 'Verified'],
              ['AIPTA', 'Registered'],
              ['5+ Years', 'Experience'],
            ].map(([val, lbl], i) => (
              <View key={i} style={styles.credCard}>
                <Text style={styles.credVal}>{val}</Text>
                <Text style={styles.credLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Conditions */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Conditions We Treat</Text>
          <View style={styles.conditionsWrap}>
            {CONDITIONS_LIST.map((c, i) => (
              <TouchableOpacity key={i} style={styles.condBubble}>
                <Text style={styles.condBubbleText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Packages */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle}>📦 Session Packages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {PACKAGES.map(pkg => (
              <TouchableOpacity key={pkg.id} style={styles.pkgCard} onPress={() => Alert.alert('Package Selected', `${pkg.label} added!`)}>
                <LinearGradient colors={['#1565C0', '#0D47A1']} style={styles.pkgGradient}>
                  {pkg.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>MOST POPULAR</Text></View>}
                  <Text style={styles.pkgLabel}>{pkg.label}</Text>
                  <Text style={styles.pkgPerSession}>₹{pkg.perSession}/session</Text>
                  <Text style={styles.pkgPrice}>₹{pkg.price}</Text>
                  <Text style={styles.pkgOriginal}>₹{pkg.original}</Text>
                  <Text style={styles.pkgValidity}>Valid {pkg.validity}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 24 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
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

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚕️ Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>Physiotherapy services are for musculoskeletal and rehabilitation conditions. For emergencies or acute medical conditions, please visit a hospital. Always consult your doctor for surgical conditions.</Text>
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
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hero: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  heroStatsRow: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 16 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  credSection: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 14 },
  credGrid: { flexDirection: 'row', gap: 10 },
  credCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', ...Shadows.sm },
  credVal: { fontSize: 14, fontWeight: '800', color: '#1565C0' },
  credLbl: { fontSize: 11, color: Colors.midGray, marginTop: 2, textAlign: 'center' },
  conditionsWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  condBubble: { backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  condBubbleText: { fontSize: 13, fontWeight: '600', color: '#1565C0' },
  pkgCard: { width: 170, marginRight: 14 },
  pkgGradient: { borderRadius: 18, padding: 18 },
  popularBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  popularText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  pkgLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  pkgPerSession: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  pkgPrice: { fontSize: 22, fontWeight: '900', color: '#fff' },
  pkgOriginal: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  pkgValidity: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card, overflow: 'hidden' },
  bestBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: '#1565C0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bestBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardMeta: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black },
  cardDuration: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bkText: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 10 },
  conditionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  conditionChip: { backgroundColor: '#E3F2FD', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  conditionText: { fontSize: 11, fontWeight: '600', color: '#1565C0' },
  moreText: { fontSize: 11, color: Colors.midGray, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  origPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: { backgroundColor: '#E3F2FD', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1.5, borderColor: '#1565C0' },
  addBtnAdded: { backgroundColor: '#1565C0' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  addBtnAddedText: { color: '#fff' },
  disclaimer: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFF9C4', borderRadius: 16, padding: 18, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: Colors.warning, marginBottom: 6 },
  disclaimerText: { fontSize: 12, color: Colors.gray, lineHeight: 17 },
  // Modal
  modalWrap: { flex: 1, backgroundColor: Colors.bg },
  modalTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalTopTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDur: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  conditionsCard: { backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16, marginBottom: 16 },
  conditionsTitle: { fontSize: 14, fontWeight: '700', color: '#1565C0', marginBottom: 10 },
  conditionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionItem: {},
  conditionItemText: { fontSize: 13, color: '#1565C0', fontWeight: '500' },
  inclTitle: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 12, marginTop: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkMark: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  faqCard: { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  bookBtn: { backgroundColor: '#1565C0', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
