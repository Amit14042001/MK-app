/**
 * Slot App — Yoga & Fitness at Home Screen (Full)
 * Personal yoga sessions, meditation, zumba, pilates, stretching classes
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

const YOGA_SERVICES = [
  {
    id: 'hatha-yoga',
    name: 'Hatha Yoga',
    icon: '🧘',
    desc: 'Classical yoga postures and breathing techniques. Perfect for beginners and intermediate practitioners.',
    startingPrice: 699, originalPrice: 999, duration: 60,
    rating: 4.9, totalBookings: 19400,
    level: 'Beginner-Friendly',
    sessions: [1, 4, 8, 12],
    inclusions: ['60 min session', 'Asana sequence tailored to you', 'Pranayama breathing', 'Relaxation (Shavasana)', 'Progress tracking'],
    benefits: ['Flexibility', 'Stress relief', 'Better posture', 'Mindfulness'],
    faq: [
      { q: 'Do I need a yoga mat?', a: 'Yes. The trainer will bring props (blocks, straps) if needed.' },
      { q: 'Can beginners do Hatha?', a: 'Absolutely! Hatha is the most suitable style for beginners.' },
    ],
    isBestseller: true,
  },
  {
    id: 'power-yoga',
    name: 'Power Yoga / Vinyasa',
    icon: '💥',
    desc: 'Dynamic, flowing sequences linked with breath. Burns calories, builds core strength and increases stamina.',
    startingPrice: 799, originalPrice: 1199, duration: 60,
    rating: 4.8, totalBookings: 12800,
    level: 'Intermediate',
    sessions: [1, 4, 8, 12],
    inclusions: ['60 min power session', 'Dynamic flow sequences', 'Core strengthening', 'Cardio elements', 'Cool-down stretch'],
    benefits: ['Weight loss', 'Core strength', 'Stamina', 'Body toning'],
    faq: [
      { q: 'Is power yoga good for weight loss?', a: 'Yes. A 60-min power yoga session burns 300–450 calories.' },
    ],
    isBestseller: false,
  },
  {
    id: 'prenatal-yoga',
    name: 'Prenatal Yoga',
    icon: '🤰',
    desc: 'Safe, gentle yoga for expecting mothers. Reduces back pain, prepares for labor, and calms pregnancy anxiety.',
    startingPrice: 899, originalPrice: 1299, duration: 60,
    rating: 4.9, totalBookings: 7200,
    level: 'All Trimesters',
    sessions: [1, 4, 8, 12],
    inclusions: ['Certified prenatal trainer', 'Trimester-specific postures', 'Breathing for labor', 'Pelvic floor exercises', 'Relaxation techniques'],
    benefits: ['Back pain relief', 'Labor prep', 'Reduced anxiety', 'Better sleep'],
    faq: [
      { q: 'Is it safe in the first trimester?', a: 'Yes, with modifications. Always inform your doctor first. Our trainers are certified in prenatal yoga.' },
    ],
    isBestseller: true,
    isSpecial: true,
  },
  {
    id: 'meditation',
    name: 'Guided Meditation',
    icon: '🪷',
    desc: 'One-on-one guided meditation sessions. Mindfulness, breathwork and visualization to reduce stress and improve focus.',
    startingPrice: 599, originalPrice: 899, duration: 45,
    rating: 4.8, totalBookings: 9600,
    level: 'All Levels',
    sessions: [1, 4, 8, 12],
    inclusions: ['45 min guided session', 'Mindfulness techniques', 'Breath awareness', 'Visualization', 'Mantra practice'],
    benefits: ['Stress reduction', 'Better focus', 'Emotional balance', 'Sleep improvement'],
    faq: [
      { q: 'Is meditation useful for anxiety?', a: 'Clinically proven. Even 10 minutes daily reduces cortisol and anxiety significantly.' },
    ],
    isBestseller: false,
  },
  {
    id: 'zumba',
    name: 'Zumba Dance Fitness',
    icon: '💃',
    desc: 'Fun, energetic dance workout combining Latin rhythms and interval training. Feels like a party, works like a gym.',
    startingPrice: 599, originalPrice: 899, duration: 45,
    rating: 4.8, totalBookings: 16400,
    level: 'All Levels',
    sessions: [1, 4, 8, 12],
    inclusions: ['45 min dance workout', 'Warm-up & cool-down', 'Multiple Latin styles (Salsa, Merengue, Cumbia)', 'Calorie-burning cardio'],
    benefits: ['Weight loss', 'Full body workout', 'Mood boost', 'Coordination'],
    faq: [
      { q: 'Do I need dance experience?', a: 'Not at all! Zumba is designed for everyone regardless of dance ability.' },
    ],
    isBestseller: false,
  },
  {
    id: 'pilates',
    name: 'Pilates',
    icon: '🏋️',
    desc: 'Core-centric exercises for strength, stability and flexibility. Great for back pain recovery and posture correction.',
    startingPrice: 799, originalPrice: 1199, duration: 60,
    rating: 4.7, totalBookings: 8200,
    level: 'Beginner–Advanced',
    sessions: [1, 4, 8, 12],
    inclusions: ['60 min mat Pilates', 'Core strengthening sequence', 'Postural alignment work', 'Breathing techniques', 'Flexibility training'],
    benefits: ['Core strength', 'Back pain relief', 'Posture', 'Flexibility'],
    faq: [
      { q: 'Is Pilates good for back pain?', a: 'Yes. Many physiotherapists recommend Pilates as rehabilitation for chronic back pain.' },
    ],
    isBestseller: false,
  },
  {
    id: 'stretching-mobility',
    name: 'Stretching & Mobility',
    icon: '🤸',
    desc: 'Targeted flexibility and mobility work. Reduces stiffness, improves range of motion and prevents injury.',
    startingPrice: 499, originalPrice: 699, duration: 45,
    rating: 4.8, totalBookings: 11600,
    level: 'All Levels',
    sessions: [1, 4, 8, 12],
    inclusions: ['Full body stretch routine', 'Foam roller techniques', 'Dynamic & static stretches', 'Mobility drills', 'PNF stretching'],
    benefits: ['Flexibility', 'Injury prevention', 'Post-workout recovery', 'Joint health'],
    faq: [
      { q: 'How often should I stretch?', a: 'Ideally daily. Even 20 minutes 3x/week dramatically improves flexibility.' },
    ],
    isBestseller: false,
    isQuick: true,
  },
  {
    id: 'kids-yoga',
    name: 'Kids Yoga (Ages 4–14)',
    icon: '🧒',
    desc: 'Fun, playful yoga for children. Improves focus, flexibility, reduces screen time and builds body awareness.',
    startingPrice: 549, originalPrice: 799, duration: 45,
    rating: 4.9, totalBookings: 6800,
    level: 'Kids',
    sessions: [1, 4, 8, 12],
    inclusions: ['Age-appropriate poses', 'Breathing games', 'Story-based sequences', 'Mindfulness activities', 'Progress report to parents'],
    benefits: ['Focus & attention', 'Flexibility', 'Confidence', 'Body awareness'],
    faq: [
      { q: 'What age is suitable?', a: 'We have programs for 4–7, 8–11, and 12–14 age groups with different curricula.' },
    ],
    isBestseller: false,
    isSpecial: true,
  },
];

const TRAINERS = [
  {
    id: 'priya',
    name: 'Priya Sharma',
    avatar: '👩',
    experience: '8 years',
    certifications: ['RYT 500', 'Pre/Postnatal Yoga'],
    specialties: ['Hatha', 'Prenatal', 'Meditation'],
    rating: 4.9,
    reviews: 1240,
    location: 'Hyderabad',
    available: true,
  },
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    avatar: '👨',
    experience: '6 years',
    certifications: ['RYT 200', 'NASM CPT'],
    specialties: ['Power Yoga', 'Pilates', 'Stretching'],
    rating: 4.8,
    reviews: 860,
    location: 'Hyderabad',
    available: true,
  },
  {
    id: 'kavya',
    name: 'Kavya Reddy',
    avatar: '👩',
    experience: '5 years',
    certifications: ['ACE Group Fitness', 'Zumba Licensed'],
    specialties: ['Zumba', 'Kids Yoga', 'Mobility'],
    rating: 4.9,
    reviews: 720,
    location: 'Hyderabad',
    available: false,
  },
];

const PACKAGES = [
  {
    id: 'monthly-8',
    label: '8 Sessions / Month',
    originalPrice: 5592,
    discountedPrice: 3999,
    perSession: 499,
    savings: 1593,
    validity: '30 days',
    color: ['#2193b0', '#6dd5ed'],
  },
  {
    id: 'monthly-12',
    label: '12 Sessions / Month',
    originalPrice: 8388,
    discountedPrice: 5499,
    perSession: 458,
    savings: 2889,
    validity: '30 days',
    color: ['#11998e', '#38ef7d'],
    isPopular: true,
  },
  {
    id: 'quarterly',
    label: '3 Month Program',
    originalPrice: 21199,
    discountedPrice: 12999,
    perSession: 361,
    savings: 8200,
    validity: '90 days',
    color: ['#8E2DE2', '#4A00E0'],
  },
];

function TrainerCard({ trainer }) {
  return (
    <View style={styles.trainerCard}>
      <View style={styles.trainerAvatarWrap}>
        <Text style={styles.trainerAvatar}>{trainer.avatar}</Text>
        {trainer.available && <View style={styles.availableDot} />}
      </View>
      <Text style={styles.trainerName}>{trainer.name}</Text>
      <Text style={styles.trainerExp}>{trainer.experience} exp</Text>
      <View style={styles.trainerRating}>
        <Text style={styles.trainerRatingText}>⭐ {trainer.rating}</Text>
        <Text style={styles.trainerReviews}> ({trainer.reviews})</Text>
      </View>
      <View style={styles.trainerCerts}>
        {trainer.certifications.map((c, i) => (
          <View key={i} style={styles.certBadge}><Text style={styles.certText}>{c}</Text></View>
        ))}
      </View>
    </View>
  );
}

function ServiceDetailModal({ service, visible, onClose, onBook }) {
  const [selectedSessions, setSelectedSessions] = useState(1);
  if (!service) return null;
  const sessionPrice = service.startingPrice * selectedSessions;
  const savedAmount = Math.round(selectedSessions > 1 ? sessionPrice * 0.15 : 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{service.name}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#1A1A2E', '#11998e', '#38ef7d']} style={styles.modalHero}>
            <Text style={styles.modalIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalLevel}>{service.level} • {service.duration} min</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>⭐ {service.rating}</Text>
              <Text style={styles.statText}>📦 {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
            </View>
          </LinearGradient>

          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>

            {/* Benefits chips */}
            <View style={styles.benefitChips}>
              {service.benefits.map((b, i) => (
                <View key={i} style={styles.benefitChip}><Text style={styles.benefitChipText}>{b}</Text></View>
              ))}
            </View>

            {/* Session selector */}
            <Text style={styles.sectionLabel}>Select Sessions</Text>
            <View style={styles.sessionSelector}>
              {service.sessions.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sessionBtn, selectedSessions === s && styles.sessionBtnActive]}
                  onPress={() => setSelectedSessions(s)}
                >
                  <Text style={[styles.sessionBtnText, selectedSessions === s && styles.sessionBtnTextActive]}>{s}</Text>
                  {s > 1 && <Text style={[styles.sessionSave, selectedSessions === s && { color: '#fff' }]}>-15%</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {/* Inclusions */}
            <Text style={styles.sectionLabel}>What's Included</Text>
            {service.inclusions.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.checkMark}>✓</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}

            {/* FAQ */}
            <Text style={styles.sectionLabel}>FAQ</Text>
            {service.faq.map((item, i) => (
              <View key={i} style={styles.faqCard}>
                <Text style={styles.faqQ}>Q: {item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bookingFooter}>
          <View>
            <Text style={styles.totalLabel}>{selectedSessions} session{selectedSessions > 1 ? 's' : ''}</Text>
            <Text style={styles.totalPrice}>₹{sessionPrice - savedAmount}</Text>
            {savedAmount > 0 && <Text style={styles.savedText}>Save ₹{savedAmount}</Text>}
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => { onBook(service, selectedSessions); onClose(); }}>
            <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.bookBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.bookBtnText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function YogaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'yoga', label: 'Yoga' },
    { key: 'fitness', label: 'Fitness' },
    { key: 'meditation', label: 'Meditation' },
    { key: 'special', label: 'Special' },
  ];

  const filtered = YOGA_SERVICES.filter(s => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'yoga') return ['hatha-yoga', 'power-yoga', 'prenatal-yoga', 'kids-yoga'].includes(s.id);
    if (activeFilter === 'fitness') return ['zumba', 'pilates', 'stretching-mobility'].includes(s.id);
    if (activeFilter === 'meditation') return s.id === 'meditation';
    if (activeFilter === 'special') return s.isSpecial;
    return true;
  });

  const handleBook = (service, sessions) => {
    addToCart({
      id: `${service.id}-${sessions}`,
      name: `${service.name} (${sessions} session${sessions > 1 ? 's' : ''})`,
      price: service.startingPrice * sessions * (sessions > 1 ? 0.85 : 1),
      category: 'yoga',
      duration: service.duration * sessions,
      icon: service.icon,
    });
    Alert.alert('Booked! 🧘', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yoga & Fitness</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Hero */}
        <LinearGradient colors={['#1A1A2E', '#11998e', '#38ef7d']} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBack}>
            <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>🧘</Text>
          <Text style={styles.heroTitle}>Yoga & Fitness at Home</Text>
          <Text style={styles.heroSub}>Expert trainers • All levels • Your schedule</Text>
          <View style={styles.heroStats}>
            {[['4.9★', 'Rating'], ['50k+', 'Sessions done'], ['200+', 'Certified trainers']].map(([val, lbl], i) => (
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{val}</Text>
                <Text style={styles.heroStatLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Packages */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.heading}>📦 Best Value Packages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {PACKAGES.map(pkg => (
              <TouchableOpacity key={pkg.id} style={styles.pkgCard} onPress={() => Alert.alert('Package', `${pkg.label} added!`)}>
                <LinearGradient colors={pkg.color} style={styles.pkgGradient}>
                  {pkg.isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>MOST POPULAR</Text></View>}
                  <Text style={styles.pkgLabel}>{pkg.label}</Text>
                  <Text style={styles.pkgPerSession}>₹{pkg.perSession}/session</Text>
                  <Text style={styles.pkgPrice}>₹{pkg.discountedPrice}</Text>
                  <Text style={styles.pkgOrig}>₹{pkg.originalPrice}</Text>
                  <Text style={styles.pkgSave}>Save ₹{pkg.savings}</Text>
                  <Text style={styles.pkgValidity}>Valid {pkg.validity}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trainer Spotlight */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.heading}>🌟 Top Trainers Near You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {TRAINERS.map(t => <TrainerCard key={t.id} trainer={t} />)}
          </ScrollView>
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
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
        <View style={{ padding: 16 }}>
          <Text style={styles.heading}>{filtered.length} Services</Text>
          {filtered.map(service => (
            <TouchableOpacity key={service.id} style={styles.card} onPress={() => { setSelectedService(service); setModalVisible(true); }}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{service.icon}</Text>
                <View style={styles.cardInfo}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{service.name}</Text>
                    {service.isBestseller && <View style={styles.bsBadge}><Text style={styles.bsText}>BESTSELLER</Text></View>}
                  </View>
                  <Text style={styles.cardLevel}>{service.level} • {service.duration} min</Text>
                  <View style={styles.cardRating}>
                    <Text style={styles.ratingText}>⭐ {service.rating}</Text>
                    <Text style={styles.bookingsText}> • {(service.totalBookings / 1000).toFixed(1)}k bookings</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardPriceLabel}>from</Text>
                  <View style={styles.cardPriceRow}>
                    <Text style={styles.cardPrice}>₹{service.startingPrice}</Text>
                    <Text style={styles.cardOrigPrice}>₹{service.originalPrice}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.bookNowBtn}
                  onPress={() => { setSelectedService(service); setModalVisible(true); }}
                >
                  <Text style={styles.bookNowText}>Book →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Why us */}
        <View style={styles.whySection}>
          <Text style={styles.heading}>Why Choose Us?</Text>
          {[
            ['📋', 'Certified Trainers', 'RYT 200/500, ACE and NASM certified professionals'],
            ['🏠', 'At Your Doorstep', 'No commute. Train in the comfort of your home'],
            ['📅', 'Flexible Scheduling', 'Early morning, evening, weekend — your preference'],
            ['📊', 'Progress Tracking', 'Weekly reports on your flexibility and strength gains'],
          ].map(([icon, title, desc], i) => (
            <View key={i} style={styles.whyRow}>
              <Text style={styles.whyIcon}>{icon}</Text>
              <View>
                <Text style={styles.whyTitle}>{title}</Text>
                <Text style={styles.whyDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <ServiceDetailModal
        service={selectedService}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onBook={handleBook}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#11998e' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  hero: { paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', paddingTop: 16 },
  heroBack: { alignSelf: 'flex-start', marginBottom: 12 },
  heroEmoji: { fontSize: 56, marginBottom: 10 },
  heroTitle: { fontSize: 25, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  heroStats: { flexDirection: 'row', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, gap: 16 },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  heading: { fontSize: 18, fontWeight: '800', color: Colors.black, marginHorizontal: 16, marginBottom: 14 },

  pkgCard: { width: 190, marginRight: 14 },
  pkgGradient: { borderRadius: 18, padding: 18 },
  popularBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  popularText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  pkgLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 },
  pkgPerSession: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  pkgPrice: { fontSize: 22, fontWeight: '900', color: '#fff' },
  pkgOrig: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  pkgSave: { fontSize: 12, fontWeight: '700', color: '#FFD700', marginTop: 4 },
  pkgValidity: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  trainerCard: { width: 150, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginRight: 14, alignItems: 'center', ...Shadows.card },
  trainerAvatarWrap: { position: 'relative', marginBottom: 8 },
  trainerAvatar: { fontSize: 42 },
  availableDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff' },
  trainerName: { fontSize: 14, fontWeight: '700', color: Colors.black, textAlign: 'center' },
  trainerExp: { fontSize: 11, color: Colors.midGray, marginTop: 2, textAlign: 'center' },
  trainerRating: { flexDirection: 'row', marginTop: 4 },
  trainerRatingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  trainerReviews: { fontSize: 11, color: Colors.midGray },
  trainerCerts: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8, justifyContent: 'center' },
  certBadge: { backgroundColor: '#E8F8F0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  certText: { fontSize: 9, fontWeight: '600', color: Colors.success },

  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: '#11998e', borderColor: '#11998e' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, ...Shadows.card },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  cardIcon: { fontSize: 36, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.black, flex: 1 },
  bsBadge: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bsText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  cardLevel: { fontSize: 12, color: Colors.midGray, marginTop: 3 },
  cardRating: { flexDirection: 'row', marginTop: 4 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.black },
  bookingsText: { fontSize: 12, color: Colors.midGray },
  cardDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPriceLabel: { fontSize: 11, color: Colors.midGray },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: Colors.black },
  cardOrigPrice: { fontSize: 13, color: Colors.midGray, textDecorationLine: 'line-through' },
  bookNowBtn: { backgroundColor: '#E8FAF5', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderColor: '#11998e' },
  bookNowText: { fontSize: 14, fontWeight: '700', color: '#11998e' },

  whySection: { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, ...Shadows.card },
  whyRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  whyIcon: { fontSize: 28, marginRight: 14 },
  whyTitle: { fontSize: 14, fontWeight: '700', color: Colors.black },
  whyDesc: { fontSize: 12, color: Colors.gray, marginTop: 2, lineHeight: 17 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, color: Colors.gray },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.black, flex: 1, textAlign: 'center' },
  modalHero: { padding: 28, alignItems: 'center' },
  modalIcon: { fontSize: 52, marginBottom: 10 },
  modalHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalLevel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  statText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  modalBody: { padding: 20 },
  modalDesc: { fontSize: 14, color: Colors.gray, lineHeight: 20, marginBottom: 16 },
  benefitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  benefitChip: { backgroundColor: '#E8FAF5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  benefitChipText: { fontSize: 12, fontWeight: '600', color: '#11998e' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 12, marginTop: 8 },
  sessionSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sessionBtn: { flex: 1, backgroundColor: Colors.offWhite, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.lightGray },
  sessionBtnActive: { backgroundColor: '#11998e', borderColor: '#11998e' },
  sessionBtnText: { fontSize: 15, fontWeight: '700', color: Colors.black },
  sessionBtnTextActive: { color: '#fff' },
  sessionSave: { fontSize: 10, fontWeight: '600', color: Colors.success, marginTop: 2 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkMark: { fontSize: 14, color: Colors.success, fontWeight: '700', marginRight: 10 },
  listText: { flex: 1, fontSize: 14, color: Colors.gray, lineHeight: 20 },
  faqCard: { backgroundColor: Colors.offWhite, borderRadius: 14, padding: 14, marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: Colors.offWhite, backgroundColor: '#fff' },
  totalLabel: { fontSize: 12, color: Colors.midGray },
  totalPrice: { fontSize: 22, fontWeight: '800', color: Colors.black },
  savedText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  bookBtn: { borderRadius: 14, overflow: 'hidden' },
  bookBtnGradient: { paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center' },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
