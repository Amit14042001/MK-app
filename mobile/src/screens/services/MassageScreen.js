/**
 * MK App — Massage & Spa Services Screen (Full)
 * Body massage, couple massage, deep tissue, Swedish, Thai, foot reflexology
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, Alert, Modal, ActivityIndicator,
  Animated, Image, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const { width: W } = Dimensions.get('window');

const MASSAGE_SERVICES = [
  {
    id: 'swedish-massage',
    name: 'Swedish Body Massage',
    icon: '💆',
    desc: 'Full body relaxation with gentle strokes. Relieves stress, improves circulation and calms the nervous system.',
    startingPrice: 799, originalPrice: 1299, duration: 60,
    rating: 4.9, totalBookings: 24300,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['60 min full body massage', 'Aromatherapy oil', 'Hot towel treatment', 'Pressure point relief', 'Professional female therapist'],
    exclusions: ['Steam/sauna', 'Hair spa', 'Facial'],
    steps: ['Book in 60 sec', 'Therapist arrives with kit', 'Setup massage space', 'Full session begins', 'Relaxation done ✓'],
    faq: [
      { q: 'Is the therapist female?', a: 'Yes, we assign same-gender therapists by default.' },
      { q: 'What do I need at home?', a: 'Just a clean, comfortable mat or bed. Therapist brings everything else.' },
    ],
    isBestseller: true,
    isWomensOnly: true,
    genderOptions: ['Female therapist', 'Male therapist'],
  },
  {
    id: 'deep-tissue',
    name: 'Deep Tissue Massage',
    icon: '💪',
    desc: 'Targets chronic muscle tension. Ideal for back pain, stiff neck, and sports recovery.',
    startingPrice: 999, originalPrice: 1599, duration: 60,
    rating: 4.8, totalBookings: 18400,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['60 min deep tissue work', 'Trigger point therapy', 'Hot stone option available', 'Muscle knot release'],
    exclusions: ['Acupressure needles', 'Medical treatment'],
    steps: ['Book', 'Therapist arrives', 'Brief consultation', 'Deep tissue session', 'Stretch & cool down'],
    faq: [
      { q: 'Is deep tissue painful?', a: 'Some discomfort is normal. Tell the therapist your pressure preference.' },
      { q: 'How soon for relief from back pain?', a: 'Most clients feel better within 24 hours. 3-session packages give best results.' },
    ],
    isBestseller: false,
    forPain: true,
  },
  {
    id: 'thai-massage',
    name: 'Thai Yoga Massage',
    icon: '🧘',
    desc: 'Ancient Thai technique combining acupressure, stretches and yoga-like postures. Energizes the whole body.',
    startingPrice: 1099, originalPrice: 1799, duration: 75,
    rating: 4.7, totalBookings: 9200,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['75 min full session', 'Assisted stretching', 'Energy line work (Sen lines)', 'Joint mobilization'],
    exclusions: ['Oil massage', 'Hot stone treatment'],
    steps: ['Book', 'Wear loose comfortable clothes', 'Therapist arrives', 'Yoga mat session', 'Post-stretch cooldown'],
    faq: [
      { q: 'Do I need to undress?', a: 'No. Thai massage is done fully clothed. Wear loose, comfortable clothes.' },
    ],
    isBestseller: false,
  },
  {
    id: 'couple-massage',
    name: 'Couple Massage',
    icon: '👫',
    desc: 'Relaxing spa experience for two, done simultaneously in your home. Perfect for anniversaries and date nights.',
    startingPrice: 1799, originalPrice: 2799, duration: 60,
    rating: 4.9, totalBookings: 7600,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['Two 60 min sessions (simultaneous)', 'Aromatherapy oils', 'Rose petal setup', 'Candles & ambience kit'],
    exclusions: ['Spa meals', 'Accommodation'],
    steps: ['Book for 2', 'Two therapists arrive', 'Ambience setup', 'Simultaneous sessions', 'Couple relaxation time'],
    faq: [
      { q: 'Can we choose different massage types?', a: 'Yes! Each person can choose Swedish, deep tissue, or Thai independently.' },
    ],
    isBestseller: true,
    isSpecial: true,
  },
  {
    id: 'foot-reflexology',
    name: 'Foot Reflexology',
    icon: '🦶',
    desc: 'Targeted pressure on foot reflex zones. Relieves stress and improves organ function through nerve pathways.',
    startingPrice: 499, originalPrice: 799, duration: 45,
    rating: 4.8, totalBookings: 15800,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['45 min foot massage', 'Reflexology chart analysis', 'Warm foot soak', 'Heel & arch focus'],
    exclusions: ['Full body massage', 'Pedicure'],
    steps: ['Book', 'Therapist arrives', 'Warm foot soak', 'Reflexology session', 'Done in 45 min'],
    faq: [
      { q: 'Is reflexology safe during pregnancy?', a: 'No. Certain reflex points are contraindicated during pregnancy. Please consult a doctor first.' },
    ],
    isBestseller: false,
  },
  {
    id: 'head-neck-shoulder',
    name: 'Head, Neck & Shoulder',
    icon: '🙆',
    desc: 'Quick tension relief targeting the most stressed areas. Great for desk workers and frequent device users.',
    startingPrice: 499, originalPrice: 799, duration: 30,
    rating: 4.9, totalBookings: 31200,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['30 min targeted session', 'Scalp massage', 'Neck decompression', 'Shoulder knot release'],
    exclusions: ['Full body', 'Aromatherapy oil'],
    steps: ['Book', 'Sit in a chair', 'Therapist arrives', '30 min session', 'Instant relief'],
    faq: [
      { q: 'Can this help with migraines?', a: 'Many clients report relief. Not a medical treatment, but highly effective for tension headaches.' },
    ],
    isBestseller: true,
    isQuick: true,
  },
  {
    id: 'hot-stone-massage',
    name: 'Hot Stone Massage',
    icon: '🪨',
    desc: 'Heated basalt stones placed on energy centers to deeply relax muscles and restore energy flow.',
    startingPrice: 1299, originalPrice: 1999, duration: 75,
    rating: 4.8, totalBookings: 5400,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['75 min session', 'Basalt stone heating', 'Full body application', 'Lavender aromatherapy'],
    exclusions: ['Not for varicose veins', 'Not for sunburned skin'],
    steps: ['Book', 'Therapist arrives with stone kit', 'Stones heated at your home', 'Hot stone session', 'Relaxation wrap'],
    faq: [
      { q: 'How hot are the stones?', a: 'Stones are heated to 54°C and cooled before placement. Never uncomfortable.' },
    ],
    isBestseller: false,
    isLuxury: true,
  },
  {
    id: 'aromatherapy-massage',
    name: 'Aromatherapy Massage',
    icon: '🌸',
    desc: 'Essential oil massage combining scent therapy and touch to reduce anxiety, improve mood and sleep quality.',
    startingPrice: 899, originalPrice: 1399, duration: 60,
    rating: 4.8, totalBookings: 11200,
    warranty: 'Satisfaction guaranteed',
    inclusions: ['60 min massage', 'Choice of essential oil blend', 'Diffuser aromatherapy', 'Light effleurage technique'],
    exclusions: ['Deep tissue pressure', 'Not for fragrance allergies'],
    steps: ['Book & choose oil', 'Therapist arrives', 'Oil blend prepared', '60 min session', 'Relaxation + mood lift'],
    faq: [
      { q: 'What oils are available?', a: 'Lavender (sleep), Peppermint (energy), Eucalyptus (breathing), Rose (mood), Jasmine (stress).' },
    ],
    isBestseller: false,
  },
];

const PACKAGES = [
  {
    id: 'relax-monthly',
    name: 'Monthly Relaxation Pack',
    icon: '🗓️',
    sessions: 4,
    type: 'Swedish Massage (60 min)',
    originalPrice: 3196,
    discountedPrice: 2399,
    savings: 797,
    validity: '30 days',
    perks: ['Priority booking', 'Same therapist guarantee', 'Free head massage upgrade (1 session)'],
  },
  {
    id: 'wellness-pack',
    name: 'Wellness Starter Pack',
    icon: '✨',
    sessions: 2,
    type: 'Any massage of your choice',
    originalPrice: 1998,
    discountedPrice: 1499,
    savings: 499,
    validity: '15 days',
    perks: ['Mix & match any 2 services', 'Free foot soak upgrade'],
  },
  {
    id: 'couple-anniversary',
    name: 'Anniversary Special',
    icon: '💑',
    sessions: 1,
    type: 'Couple massage + décor setup',
    originalPrice: 3499,
    discountedPrice: 2499,
    savings: 1000,
    validity: '7 days',
    perks: ['Rose petal setup', 'Candles & fairy lights', 'Personalized message card', 'Couple photo frame'],
  },
];

const BENEFITS = [
  { icon: '😌', title: 'Stress Relief', desc: 'Reduces cortisol by up to 31%' },
  { icon: '🩸', title: 'Better Circulation', desc: 'Improves blood flow throughout' },
  { icon: '😴', title: 'Better Sleep', desc: '85% clients report improved sleep' },
  { icon: '💪', title: 'Muscle Recovery', desc: 'Reduces DOMS after workouts' },
];

function ServiceCard({ service, onAddToCart, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={() => onPress(service)} activeOpacity={0.92}>
      <View style={styles.serviceCardHeader}>
        <Text style={styles.serviceIcon}>{service.icon}</Text>
        <View style={styles.serviceInfo}>
          <View style={styles.serviceNameRow}>
            <Text style={styles.serviceName}>{service.name}</Text>
            {service.isBestseller && <View style={styles.bestsellerBadge}><Text style={styles.bestsellerText}>BESTSELLER</Text></View>}
            {service.isSpecial && <View style={[styles.bestsellerBadge, { backgroundColor: '#E91E8C' }]}><Text style={styles.bestsellerText}>SPECIAL</Text></View>}
          </View>
          <Text style={styles.serviceDuration}>⏱ {service.duration} min</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {service.rating}</Text>
            <Text style={styles.bookingsText}>  {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.serviceDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.serviceFooter}>
        <View>
          <Text style={styles.priceLabel}>Starts at</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{service.startingPrice}</Text>
            <Text style={styles.originalPrice}>₹{service.originalPrice}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{Math.round((1 - service.startingPrice / service.originalPrice) * 100)}% off</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, inCart && styles.addBtnAdded]}
          onPress={() => onAddToCart(service)}
        >
          <Text style={[styles.addBtnText, inCart && styles.addBtnAddedText]}>{inCart ? '✓ Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.warrantyRow}>
        <Text style={styles.warrantyText}>🛡️ {service.warranty}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PackageCard({ pkg, onBook }) {
  return (
    <TouchableOpacity style={styles.packageCard} onPress={() => onBook(pkg)} activeOpacity={0.92}>
      <LinearGradient colors={['#6A0572', '#E91E8C']} style={styles.packageGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.packageHeader}>
          <Text style={styles.packageIcon}>{pkg.icon}</Text>
          <View style={styles.savingsBadge}><Text style={styles.savingsText}>Save ₹{pkg.savings}</Text></View>
        </View>
        <Text style={styles.packageName}>{pkg.name}</Text>
        <Text style={styles.packageType}>{pkg.sessions} × {pkg.type}</Text>
        <View style={styles.packagePriceRow}>
          <Text style={styles.packagePrice}>₹{pkg.discountedPrice}</Text>
          <Text style={styles.packageOriginal}>₹{pkg.originalPrice}</Text>
        </View>
        <Text style={styles.packageValidity}>Valid for {pkg.validity}</Text>
        <View style={styles.packagePerks}>
          {pkg.perks.map((p, i) => (
            <Text key={i} style={styles.packagePerk}>✓ {p}</Text>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ServiceDetailModal({ service, visible, onClose, onAddToCart }) {
  const [activeTab, setActiveTab] = useState('inclusions');
  if (!service) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{service.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#6A0572', '#E91E8C']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalHeroDuration}>⏱ {service.duration} minutes</Text>
            <View style={styles.modalHeroStats}>
              <Text style={styles.modalStat}>⭐ {service.rating}</Text>
              <Text style={styles.modalStat}>📦 {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
            </View>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <View style={styles.modalPriceCard}>
              <Text style={styles.modalStartsAt}>Starting at</Text>
              <View style={styles.modalPriceRow}>
                <Text style={styles.modalPrice}>₹{service.startingPrice}</Text>
                <Text style={styles.modalOriginalPrice}>₹{service.originalPrice}</Text>
              </View>
            </View>
            {/* Tabs */}
            <View style={styles.tabs}>
              {['inclusions', 'exclusions', 'steps', 'faq'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {activeTab === 'inclusions' && service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.listCheck}>✓</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {activeTab === 'exclusions' && service.exclusions.map((item, i) => (
              <View key={i} style={styles.listRow}><Text style={styles.listX}>✗</Text><Text style={styles.listText}>{item}</Text></View>
            ))}
            {activeTab === 'steps' && service.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
            {activeTab === 'faq' && service.faq.map((item, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQ}>Q: {item.q}</Text>
                <Text style={styles.faqA}>A: {item.a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <View>
            <Text style={styles.modalFooterLabel}>Starting at</Text>
            <Text style={styles.modalFooterPrice}>₹{service.startingPrice}</Text>
          </View>
          <TouchableOpacity style={styles.modalAddBtn} onPress={() => { onAddToCart(service); onClose(); }}>
            <Text style={styles.modalAddBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MassageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const { addToCart } = useCart();
  const scrollY = useRef(new Animated.Value(0)).current;

  const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'relaxation', label: 'Relaxation' },
    { key: 'therapeutic', label: 'Therapeutic' },
    { key: 'specialty', label: 'Specialty' },
    { key: 'quick', label: 'Quick Fix' },
  ];

  const filteredServices = MASSAGE_SERVICES.filter(s => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'relaxation') return ['swedish-massage', 'aromatherapy-massage', 'couple-massage'].includes(s.id);
    if (activeCategory === 'therapeutic') return ['deep-tissue', 'thai-massage', 'hot-stone-massage'].includes(s.id);
    if (activeCategory === 'specialty') return ['foot-reflexology', 'hot-stone-massage'].includes(s.id);
    if (activeCategory === 'quick') return s.isQuick || s.duration <= 30;
    return true;
  });

  const handleAddToCart = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'massage', duration: service.duration, icon: service.icon });
    Alert.alert('Added! 💆', `${service.name} added to cart.`, [{ text: 'View Cart', onPress: () => navigation.navigate('Cart') }, { text: 'Continue' }]);
  };

  const headerBg = scrollY.interpolate({ inputRange: [0, 120], outputRange: ['transparent', '#6A0572'], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Massage & Spa</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartBtn}>
          <Text style={styles.cartIcon}>🛒</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#6A0572', '#E91E8C']} style={styles.hero}>
          <Text style={styles.heroEmoji}>💆</Text>
          <Text style={styles.heroTitle}>Massage & Spa at Home</Text>
          <Text style={styles.heroSubtitle}>Certified therapists • Premium oils • Your comfort</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatNum}>4.9★</Text><Text style={styles.heroStatLabel}>Rating</Text></View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}><Text style={styles.heroStatNum}>2L+</Text><Text style={styles.heroStatLabel}>Bookings</Text></View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}><Text style={styles.heroStatNum}>30 min</Text><Text style={styles.heroStatLabel}>Arrival</Text></View>
          </View>
        </LinearGradient>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitChip}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Spa Packages</Text>
          <Text style={styles.sectionSubtitle}>Save more, relax more</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {PACKAGES.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} onBook={(p) => Alert.alert('Package Booked!', `${p.name} package added to cart.`)} />
            ))}
          </ScrollView>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryChip, activeCategory === cat.key && styles.categoryChipActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={[styles.categoryChipText, activeCategory === cat.key && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services List */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>All Services ({filteredServices.length})</Text>
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onAddToCart={handleAddToCart}
              onPress={(s) => { setSelectedService(s); setModalVisible(true); }}
            />
          ))}
        </View>

        {/* Safety Note */}
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>🛡️ Your Safety First</Text>
          <Text style={styles.safetyText}>All therapists are background verified, trained & certified. You can view their profiles before booking. Our 24/7 support is one tap away.</Text>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* FAB - Book Now */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Cart')}>
          <LinearGradient colors={['#6A0572', '#E91E8C']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.fabText}>View Cart  →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ServiceDetailModal
        service={selectedService}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAddToCart={handleAddToCart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cartBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  cartIcon: { fontSize: 22 },

  hero: { paddingTop: 80, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  heroStats: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatNum: { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },

  benefitsSection: { marginTop: 20 },
  benefitChip: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginRight: 12, width: 130, ...Shadows.card },
  benefitIcon: { fontSize: 28, marginBottom: 6 },
  benefitTitle: { fontSize: 13, fontWeight: '700', color: Colors.black },
  benefitDesc: { fontSize: 11, color: Colors.midGray, marginTop: 4, lineHeight: 15 },

  section: { marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: Colors.midGray, marginHorizontal: 16, marginBottom: 14 },

  packageCard: { width: 260, marginRight: 14 },
  packageGradient: { borderRadius: 20, padding: 20 },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  packageIcon: { fontSize: 30 },
  savingsBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  savingsText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  packageName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  packageType: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 10 },
  packagePriceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  packagePrice: { fontSize: 22, fontWeight: '900', color: '#fff', marginRight: 8 },
  packageOriginal: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  packageValidity: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  packagePerks: {},
  packagePerk: { fontSize: 12, color: '#fff', marginBottom: 4 },

  categoryScroll: { marginTop: 24, marginBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  categoryChipActive: { backgroundColor: '#6A0572', borderColor: '#6A0572' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  categoryChipTextActive: { color: '#fff' },

  servicesSection: { padding: 16 },
  serviceCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card },
  serviceCardHeader: { flexDirection: 'row', marginBottom: 10 },
  serviceIcon: { fontSize: 38, marginRight: 14 },
  serviceInfo: { flex: 1 },
  serviceNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  serviceName: { fontSize: 15, fontWeight: '700', color: Colors.black, flex: 1 },
  bestsellerBadge: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  bestsellerText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  serviceDuration: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  ratingRow: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bookingsText: { fontSize: 12, color: Colors.midGray },
  serviceDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 12 },
  serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 11, color: Colors.midGray },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black },
  originalPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  addBtn: { backgroundColor: '#F3E5F5', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1.5, borderColor: '#6A0572' },
  addBtnAdded: { backgroundColor: '#6A0572' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#6A0572' },
  addBtnAddedText: { color: '#fff' },
  warrantyRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.offWhite, paddingTop: 10 },
  warrantyText: { fontSize: 12, color: Colors.success, fontWeight: '600' },

  safetyCard: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#F3E5F5', borderRadius: 16, padding: 18 },
  safetyTitle: { fontSize: 15, fontWeight: '700', color: '#6A0572', marginBottom: 6 },
  safetyText: { fontSize: 13, color: Colors.gray, lineHeight: 18 },

  fabContainer: { position: 'absolute', left: 16, right: 16 },
  fab: { borderRadius: 16, overflow: 'hidden' },
  fabGradient: { paddingVertical: 18, alignItems: 'center' },
  fabText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: Colors.gray },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalHeroIcon: { fontSize: 52, marginBottom: 12 },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalHeroDuration: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  modalHeroStats: { flexDirection: 'row', gap: 20, marginTop: 12 },
  modalStat: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  modalPriceCard: { backgroundColor: '#F3E5F5', borderRadius: 14, padding: 16, marginBottom: 20 },
  modalStartsAt: { fontSize: 12, color: '#6A0572' },
  modalPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  modalPrice: { fontSize: 26, fontWeight: '900', color: '#6A0572' },
  modalOriginalPrice: { fontSize: 15, color: Colors.midGray, textDecorationLine: 'line-through' },
  tabs: { flexDirection: 'row', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', ...Shadows.sm },
  tabText: { fontSize: 12, color: Colors.midGray, fontWeight: '600' },
  tabTextActive: { color: '#6A0572', fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  listCheck: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  listX: { fontSize: 14, color: Colors.error, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6A0572', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: Colors.gray },
  faqItem: { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  modalFooterLabel: { fontSize: 12, color: Colors.midGray },
  modalFooterPrice: { fontSize: 20, fontWeight: '800', color: Colors.black },
  modalAddBtn: { backgroundColor: '#6A0572', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  modalAddBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
