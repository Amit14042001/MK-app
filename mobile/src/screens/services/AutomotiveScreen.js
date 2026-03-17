/**
 * MK App — Automotive Services Screen (Full)
 * Car battery, jump start, oil change, tyre, wash, AC, dent repair
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, Alert, Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const AUTO_SERVICES = [
  {
    id: 'battery-replacement',
    name: 'Car Battery Replacement',
    icon: '🔋',
    desc: 'Certified battery replacement with genuine brands. Free testing & fitting at doorstep.',
    startingPrice: 1999, originalPrice: 2500, duration: 45,
    rating: 4.8, totalBookings: 2840,
    warranty: '1 year battery warranty',
    tags: ['Battery', 'Replacement', 'Genuine'],
    brands: ['Amaron', 'Exide', 'Bosch', 'Luminous', 'SF Sonic'],
    inclusions: ['Battery testing', 'Old battery disposal', 'Fitting & charging', 'Warranty card'],
    exclusions: ['Electrical faults', 'Wiring issues'],
    steps: ['Book & confirm', 'Technician arrives in 2h', 'Battery test & replacement', 'Charge & verify'],
    faq: [
      { q: 'How long does it take?', a: '30–45 minutes for most cars.' },
      { q: 'Which brands?', a: 'Amaron, Exide, Bosch — all with genuine warranty.' },
    ],
    isEmergency: false,
  },
  {
    id: 'jump-start',
    name: 'Jump Start Service',
    icon: '⚡',
    desc: 'Dead battery? We reach you within 30 minutes anywhere in the city.',
    startingPrice: 499, originalPrice: 699, duration: 20,
    rating: 4.9, totalBookings: 5230,
    warranty: null, tags: ['Emergency', 'Roadside', 'Quick'],
    inclusions: ['Jump start', 'Battery health check', 'Alternator check'],
    exclusions: ['Battery replacement', 'Alternator replacement'],
    steps: ['Book instantly', '30-min arrival', 'Jump start car', 'Verify running'],
    faq: [{ q: 'How fast will you arrive?', a: 'Within 30 minutes in most service areas.' }],
    isEmergency: true,
  },
  {
    id: 'oil-change',
    name: 'Engine Oil Change',
    icon: '🛢️',
    desc: 'Complete engine oil change at your doorstep. Full synthetic, semi-synthetic or mineral.',
    startingPrice: 899, originalPrice: 1299, duration: 60,
    rating: 4.7, totalBookings: 3560,
    warranty: null, tags: ['Oil', 'Engine', 'Filter'],
    brands: ['Castrol', 'Mobil', 'Shell', 'Gulf', 'Servo'],
    inclusions: ['Engine oil change', 'Oil filter replacement', 'Multi-point inspection', 'Top-up fluids'],
    exclusions: ['Air filter', 'Spark plugs', 'Other parts'],
    steps: ['Select oil type', 'Book & confirm', 'Technician arrives', 'Oil change & inspection'],
    faq: [{ q: 'What grades available?', a: '5W-30, 5W-40, 10W-40 in synthetic and mineral.' }],
    isEmergency: false,
  },
  {
    id: 'tyre-puncture',
    name: 'Tyre Puncture Repair',
    icon: '🔄',
    desc: 'On-spot puncture repair or tyre replacement. Tubeless specialist arrives at your location.',
    startingPrice: 299, originalPrice: 499, duration: 30,
    rating: 4.8, totalBookings: 4120,
    warranty: null, tags: ['Tyre', 'Puncture', 'Emergency'],
    inclusions: ['Puncture repair', 'Tyre pressure check (all 4)', 'Wheel balancing check'],
    exclusions: ['New tyre (charged extra)', 'Wheel alignment'],
    steps: ['Book instantly', '30-min arrival', 'Repair or replace', 'Pressure check'],
    faq: [],
    isEmergency: true,
  },
  {
    id: 'car-wash',
    name: 'Doorstep Car Wash',
    icon: '🚿',
    desc: 'Professional car wash at your home. Exterior + interior deep cleaning.',
    startingPrice: 399, originalPrice: 599, duration: 60,
    rating: 4.6, totalBookings: 6890,
    warranty: null, tags: ['Wash', 'Cleaning', 'Interior'],
    inclusions: ['Exterior high-pressure wash', 'Wipe dry', 'Interior vacuum', 'Dashboard wipe', 'Tyre cleaning'],
    exclusions: ['Ceramic coating', 'Paint correction', 'Engine cleaning'],
    steps: ['Book slot', 'Crew arrives (own water)', 'Wash & clean', 'Final inspection'],
    faq: [{ q: 'Do they bring water?', a: 'Yes, high-pressure washer with own water supply.' }],
    isEmergency: false,
  },
  {
    id: 'car-ac-service',
    name: 'Car AC Service',
    icon: '❄️',
    desc: 'Car AC gas refill, compressor check, and cooling performance test.',
    startingPrice: 799, originalPrice: 1199, duration: 90,
    rating: 4.7, totalBookings: 2100,
    warranty: '15 days service warranty',
    tags: ['AC', 'Gas', 'Cooling'],
    inclusions: ['Gas check & refill', 'Filter cleaning', 'Cooling performance test', 'Cabin air check'],
    exclusions: ['Compressor repair', 'AC parts replacement'],
    steps: ['Book slot', 'Technician arrives', 'Diagnose & service', 'Test cooling'],
    faq: [],
    isEmergency: false,
  },
  {
    id: 'dent-paint',
    name: 'Dent & Scratch Repair',
    icon: '🎨',
    desc: 'Paintless dent removal and minor scratch repair without a workshop visit.',
    startingPrice: 1499, originalPrice: 2499, duration: 120,
    rating: 4.5, totalBookings: 890,
    warranty: '30 days warranty',
    tags: ['Dent', 'Paint', 'Body'],
    inclusions: ['Paintless dent repair', 'Minor scratch touch-up', 'Polish & buff'],
    exclusions: ['Major dents', 'Full panel painting', 'Deep scratches'],
    steps: ['Share car photos', 'Get instant quote', 'Book & confirm', 'Repair at doorstep'],
    faq: [{ q: 'No workshop visit needed?', a: 'Correct — minor repairs are done on-site at your location.' }],
    isEmergency: false,
  },
  {
    id: 'roadside-assistance',
    name: 'Roadside Assistance',
    icon: '🛟',
    desc: '24/7 emergency roadside help. Towing, fuel, locked keys — covered.',
    startingPrice: 699, originalPrice: 999, duration: 45,
    rating: 4.9, totalBookings: 3450,
    warranty: null, tags: ['Emergency', '24/7', 'Towing'],
    inclusions: ['Towing up to 20km', 'Fuel delivery', 'Locked key assistance', 'Minor on-spot repairs'],
    exclusions: ['Major repairs', 'Towing above 20km (extra)'],
    steps: ['Call or book', 'Emergency dispatch', 'Arrive in 30-45 min', 'Issue resolved'],
    faq: [],
    isEmergency: true,
  },
];

const FILTERS = [
  { key: 'all',       label: 'All Services' },
  { key: 'emergency', label: '⚡ Emergency' },
  { key: 'maintenance',label: '🔧 Maintenance' },
  { key: 'cleaning',  label: '✨ Cleaning' },
];

function ServiceDetailModal({ service, onClose, onBook }) {
  if (!service) return null;
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={MD.overlay}>
        <View style={MD.sheet}>
          <View style={MD.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={MD.top}>
              <View style={MD.iconCircle}><Text style={MD.iconEmoji}>{service.icon}</Text></View>
              <View style={MD.topInfo}>
                <Text style={MD.name}>{service.name}</Text>
                <View style={MD.metaRow}>
                  <Text style={MD.meta}>⭐ {service.rating}</Text>
                  <Text style={MD.dot}>·</Text>
                  <Text style={MD.meta}>{service.totalBookings.toLocaleString()} jobs</Text>
                  <Text style={MD.dot}>·</Text>
                  <Text style={MD.meta}>⏱ {service.duration} min</Text>
                </View>
              </View>
            </View>

            <View style={MD.priceArea}>
              <Text style={MD.price}>₹{service.startingPrice}</Text>
              <Text style={MD.orig}>₹{service.originalPrice}</Text>
              {disc > 0 && <View style={MD.discBadge}><Text style={MD.discText}>{disc}% OFF</Text></View>}
              {service.isEmergency && <View style={MD.emergBadge}><Text style={MD.emergText}>⚡ Emergency</Text></View>}
            </View>

            <Text style={MD.desc}>{service.desc}</Text>

            {service.brands?.length > 0 && (
              <View style={MD.section}>
                <Text style={MD.sectionTitle}>Available Brands</Text>
                <View style={MD.brandWrap}>
                  {service.brands.map(b => <View key={b} style={MD.brandTag}><Text style={MD.brandText}>{b}</Text></View>)}
                </View>
              </View>
            )}

            <View style={MD.section}>
              <Text style={MD.sectionTitle}>What's Included</Text>
              {service.inclusions.map((inc, i) => (
                <View key={i} style={MD.listRow}><Text style={MD.check}>✅</Text><Text style={MD.listText}>{inc}</Text></View>
              ))}
            </View>

            {service.exclusions?.length > 0 && (
              <View style={MD.section}>
                <Text style={MD.sectionTitle}>Not Included</Text>
                {service.exclusions.map((exc, i) => (
                  <View key={i} style={MD.listRow}><Text style={MD.cross}>❌</Text><Text style={MD.listText}>{exc}</Text></View>
                ))}
              </View>
            )}

            <View style={MD.section}>
              <Text style={MD.sectionTitle}>How It Works</Text>
              {service.steps.map((step, i) => (
                <View key={i} style={MD.stepRow}>
                  <View style={MD.stepNum}><Text style={MD.stepNumText}>{i + 1}</Text></View>
                  <Text style={MD.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {service.warranty && (
              <View style={MD.warrantyBox}>
                <Text style={MD.warrantyText}>🛡️ {service.warranty}</Text>
              </View>
            )}

            {service.faq?.length > 0 && (
              <View style={MD.section}>
                <Text style={MD.sectionTitle}>FAQs</Text>
                {service.faq.map((f, i) => (
                  <View key={i} style={MD.faqCard}>
                    <Text style={MD.faqQ}>Q: {f.q}</Text>
                    <Text style={MD.faqA}>A: {f.a}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={MD.footer}>
            <TouchableOpacity style={MD.closeBtn} onPress={onClose}>
              <Text style={MD.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={MD.bookBtn} onPress={onBook}>
              <Text style={MD.bookBtnText}>Book Now — ₹{service.startingPrice}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AutomotiveScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const [filter, setFilter]         = useState('all');
  const [modalService, setModalService] = useState(null);

  const filtered = AUTO_SERVICES.filter(s => {
    if (filter === 'emergency')   return s.isEmergency;
    if (filter === 'maintenance') return ['oil-change','car-ac-service','dent-paint','tyre-puncture'].includes(s.id);
    if (filter === 'cleaning')    return s.id === 'car-wash';
    return true;
  });

  const handleBook = (service) => {
    setModalService(null);
    const added = addToCart({
      serviceId: service.id, serviceName: service.name, subServiceName: null,
      price: service.startingPrice, originalPrice: service.originalPrice,
      duration: service.duration, icon: service.icon, categorySlug: 'automotive',
    });
    Alert.alert(
      added ? '🚗 Added to Cart!' : '🛒 Already in Cart',
      `${service.name} — ₹${service.startingPrice}`,
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Go to Checkout', onPress: () => navigation.navigate('Checkout') },
      ]
    );
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1A1A2E', '#2D2D5E']} style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>🚗 Automotive Services</Text>
          <Text style={S.headerSub}>Certified doorstep car care</Text>
        </View>
      </LinearGradient>

      {/* Emergency banner */}
      <TouchableOpacity style={S.emergBanner} onPress={() => setFilter('emergency')} activeOpacity={0.85}>
        <Text style={S.emergBannerIcon}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.emergBannerTitle}>Emergency Service — 30 min arrival</Text>
          <Text style={S.emergBannerSub}>Jump start · Tyre puncture · Roadside help</Text>
        </View>
        <View style={S.emergBannerBadge}><Text style={S.emergBannerBadgeText}>24/7</Text></View>
      </TouchableOpacity>

      {/* Filters */}
      <View style={S.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[S.filterChip, filter === f.key && S.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[S.filterText, filter === f.key && S.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: svc }) => {
          const disc = Math.round((1 - svc.startingPrice / svc.originalPrice) * 100);
          return (
            <TouchableOpacity style={S.card} onPress={() => setModalService(svc)} activeOpacity={0.9}>
              <View style={S.cardBadges}>
                {svc.isEmergency && <View style={S.emergTag}><Text style={S.emergTagText}>⚡ Emergency</Text></View>}
                {disc > 0 && <View style={S.discTag}><Text style={S.discTagText}>{disc}% OFF</Text></View>}
                {svc.warranty && <View style={S.warrantyTag}><Text style={S.warrantyTagText}>🛡️ Warranty</Text></View>}
              </View>
              <View style={S.cardInner}>
                <View style={S.cardIconBox}><Text style={S.cardEmoji}>{svc.icon}</Text></View>
                <View style={S.cardContent}>
                  <Text style={S.cardName}>{svc.name}</Text>
                  <Text style={S.cardDesc} numberOfLines={2}>{svc.desc}</Text>
                  <View style={S.cardMeta}>
                    <Text style={S.cardRating}>⭐ {svc.rating}</Text>
                    <Text style={S.metaDot}>·</Text>
                    <Text style={S.cardBookings}>{svc.totalBookings.toLocaleString()} bookings</Text>
                    <Text style={S.metaDot}>·</Text>
                    <Text style={S.cardTime}>⏱ {svc.duration}m</Text>
                  </View>
                  <View style={S.cardBottom}>
                    <View>
                      <Text style={S.cardPrice}>₹{svc.startingPrice}</Text>
                      <Text style={S.cardOrig}>₹{svc.originalPrice}</Text>
                    </View>
                    <TouchableOpacity style={S.addBtn} onPress={() => handleBook(svc)}>
                      <Text style={S.addBtnText}>+ Book</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <ServiceDetailModal
        service={modalService}
        onClose={() => setModalService(null)}
        onBook={() => handleBook(modalService)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F7FA' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, gap: 14 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backText:    { fontSize: 20, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  emergBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderBottomWidth: 1, borderBottomColor: '#FFE0B2', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  emergBannerIcon: { fontSize: 28 },
  emergBannerTitle: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  emergBannerSub: { fontSize: 12, color: '#666', marginTop: 1 },
  emergBannerBadge: { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  emergBannerBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  filterWrap:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  filterRow:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip:  { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F5' },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText:  { fontSize: 13, fontWeight: '600', color: '#555' },
  filterTextActive: { color: '#fff' },
  card:        { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.md },
  cardBadges:  { flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 0 },
  emergTag:    { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  emergTagText: { fontSize: 11, fontWeight: '700', color: '#E65100' },
  discTag:     { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discTagText: { fontSize: 11, fontWeight: '700', color: '#C62828' },
  warrantyTag: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  warrantyTagText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  cardInner:   { flexDirection: 'row', padding: 14 },
  cardIconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardEmoji:   { fontSize: 32 },
  cardContent: { flex: 1 },
  cardName:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  cardDesc:    { fontSize: 12, color: '#666', lineHeight: 17, marginBottom: 6 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardRating:  { fontSize: 12, color: '#555' },
  metaDot:     { fontSize: 12, color: '#CCC', marginHorizontal: 4 },
  cardBookings:{ fontSize: 12, color: '#555' },
  cardTime:    { fontSize: 12, color: '#555' },
  cardBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice:   { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  cardOrig:    { fontSize: 12, color: '#CCC', textDecorationLine: 'line-through' },
  addBtn:      { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  addBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const MD = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  handle:    { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  top:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  iconCircle:{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconEmoji: { fontSize: 32 },
  topInfo:   { flex: 1 },
  name:      { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  metaRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta:      { fontSize: 12, color: '#666' },
  dot:       { fontSize: 12, color: '#CCC', marginHorizontal: 4 },
  priceArea: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  price:     { fontSize: 26, fontWeight: '900', color: '#1A1A2E' },
  orig:      { fontSize: 14, color: '#CCC', textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  discText:  { fontSize: 12, fontWeight: '700', color: '#C62828' },
  emergBadge:{ backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  emergText: { fontSize: 12, fontWeight: '700', color: '#E65100' },
  desc:      { fontSize: 14, color: '#555', lineHeight: 20, paddingHorizontal: 20, marginBottom: 16 },
  section:   { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  brandWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandTag:  { backgroundColor: '#F0F0F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  brandText: { fontSize: 12, fontWeight: '600', color: '#555' },
  listRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  check:     { fontSize: 14, marginRight: 10, marginTop: 1 },
  cross:     { fontSize: 14, marginRight: 10, marginTop: 1 },
  listText:  { fontSize: 14, color: '#444', flex: 1, lineHeight: 20 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepNum:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepText:  { fontSize: 14, color: '#444', flex: 1 },
  warrantyBox: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14 },
  warrantyText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  faqCard:   { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, marginBottom: 8 },
  faqQ:      { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  faqA:      { fontSize: 13, color: '#555', lineHeight: 18 },
  footer:    { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5', backgroundColor: '#fff' },
  closeBtn:  { width: 52, height: 52, borderRadius: 14, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 18, color: '#555', fontWeight: '600' },
  bookBtn:   { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, ...Shadows.md },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
