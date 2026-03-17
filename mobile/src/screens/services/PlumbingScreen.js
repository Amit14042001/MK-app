/**
 * MK App — Plumbing Services Screen (Full)
 * Tap repair, pipe leakage, bathroom fitting, drain cleaning, geyser installation
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, StatusBar, Alert, Modal, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const PLUMBING_SERVICES = [
  {
    id: 'tap-repair',
    name: 'Tap / Faucet Repair',
    icon: '🚿',
    desc: 'Fix leaking or dripping taps. All brands serviced at your doorstep.',
    startingPrice: 199, originalPrice: 349, duration: 30,
    rating: 4.8, totalBookings: 8920,
    warranty: '7 days warranty',
    inclusions: ['Tap diagnosis', 'Washer/O-ring replacement', 'Leak testing', 'Minor fitting fix'],
    exclusions: ['New tap purchase', 'Pipe replacement'],
    steps: ['Book in 60 sec', 'Plumber arrives in 90 min', 'Repair done', 'Test & verify'],
    faq: [{ q: 'Do you bring spare parts?', a: 'Yes, basic washers and O-rings are carried. Major parts may need ordering.' }],
    isEmergency: false,
  },
  {
    id: 'pipe-leakage',
    name: 'Pipe Leakage Fix',
    icon: '🔧',
    desc: 'Emergency pipe leak repair. Hidden leaks detected with professional tools.',
    startingPrice: 349, originalPrice: 599, duration: 60,
    rating: 4.7, totalBookings: 5430,
    warranty: '30 days warranty',
    inclusions: ['Leak detection', 'Joint sealing', 'Pressure test', 'Minor pipe repair'],
    exclusions: ['Full pipe replacement', 'Wall breaking/drilling'],
    steps: ['Book instantly', 'Plumber arrives in 60 min', 'Locate & fix leak', 'Pressure test'],
    faq: [{ q: 'Can you fix concealed pipe leaks?', a: 'Yes, we use detection tools. Wall-breaking is charged extra.' }],
    isEmergency: true,
  },
  {
    id: 'drain-cleaning',
    name: 'Drain / Pipe Unclogging',
    icon: '🌀',
    desc: 'Blocked sink, bathtub, or floor drain? We clear it fast with professional equipment.',
    startingPrice: 249, originalPrice: 449, duration: 45,
    rating: 4.9, totalBookings: 12300,
    warranty: '7 days warranty',
    inclusions: ['Blockage inspection', 'Drain cleaning (manual + chemical)', 'Flush test'],
    exclusions: ['Pipe replacement', 'Septic tank cleaning'],
    steps: ['Book', 'Plumber arrives', 'Clear blockage', 'Flush test'],
    faq: [{ q: 'What causes kitchen drain blockage?', a: 'Usually food grease, food particles, and soap buildup.' }],
    isEmergency: true,
  },
  {
    id: 'toilet-repair',
    name: 'Toilet Repair & Installation',
    icon: '🚽',
    desc: 'Flush repair, seat replacement, cistern fix, or new toilet installation.',
    startingPrice: 299, originalPrice: 499, duration: 60,
    rating: 4.7, totalBookings: 6780,
    warranty: '15 days warranty',
    inclusions: ['Flush mechanism check', 'Cistern repair', 'Seat repair/replacement', 'Water supply check'],
    exclusions: ['New toilet purchase', 'Civil work'],
    steps: ['Book', 'Plumber arrives', 'Diagnose & repair', 'Flush test'],
    faq: [],
    isEmergency: false,
  },
  {
    id: 'geyser-installation',
    name: 'Geyser / Water Heater Installation',
    icon: '♨️',
    desc: 'Install new geyser or repair existing one. All brands — Racold, Havells, AO Smith.',
    startingPrice: 499, originalPrice: 799, duration: 90,
    rating: 4.8, totalBookings: 4560,
    warranty: '30 days installation warranty',
    inclusions: ['Mounting bracket fix', 'Water connection', 'Electric connection', 'Leak test', 'Demo'],
    exclusions: ['Geyser purchase', 'Electrical board work'],
    steps: ['Book with brand details', 'Plumber arrives', 'Install & connect', 'Safety check'],
    faq: [{ q: 'Do you install all brands?', a: 'Yes — Racold, AO Smith, Havells, Bajaj, V-Guard and more.' }],
    isEmergency: false,
  },
  {
    id: 'bathroom-fitting',
    name: 'Bathroom Fitting & Renovation',
    icon: '🛁',
    desc: 'Shower installation, basin fitting, accessories installation, renovation work.',
    startingPrice: 599, originalPrice: 999, duration: 120,
    rating: 4.6, totalBookings: 3210,
    warranty: '30 days warranty',
    inclusions: ['Shower fitting', 'Basin installation', 'Accessories mounting', 'Sealant application'],
    exclusions: ['Tiles', 'Civil work', 'Product purchase'],
    steps: ['Book', 'Plumber arrives', 'Install fittings', 'Test all outlets'],
    faq: [],
    isEmergency: false,
  },
  {
    id: 'water-tank-cleaning',
    name: 'Water Tank Cleaning',
    icon: '🪣',
    desc: 'Overhead or underground tank cleaning, disinfection, and sanitization.',
    startingPrice: 799, originalPrice: 1299, duration: 180,
    rating: 4.8, totalBookings: 2890,
    warranty: null,
    inclusions: ['Tank draining', 'Manual scrubbing', 'Disinfection', 'Refill & check'],
    exclusions: ['Tank repair', 'Pipe cleaning'],
    steps: ['Book (schedule in advance)', 'Team arrives', 'Drain & clean', 'Sanitize & refill'],
    faq: [{ q: 'How often should a tank be cleaned?', a: 'Every 6 months for overhead tanks, annually for underground.' }],
    isEmergency: false,
  },
  {
    id: 'motor-pump-repair',
    name: 'Water Motor / Pump Repair',
    icon: '⚙️',
    desc: 'Water motor not working? We repair and service submersible and monoblock pumps.',
    startingPrice: 399, originalPrice: 699, duration: 90,
    rating: 4.7, totalBookings: 1980,
    warranty: '15 days warranty',
    inclusions: ['Pump diagnosis', 'Capacitor/coil check', 'Minor repair', 'Test run'],
    exclusions: ['New pump purchase', 'Borewell work'],
    steps: ['Book', 'Technician arrives', 'Diagnose pump', 'Repair & test'],
    faq: [],
    isEmergency: true,
  },
];

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'emergency', label: '⚡ Emergency' },
  { key: 'repair',    label: '🔧 Repair' },
  { key: 'install',   label: '🔩 Installation' },
  { key: 'cleaning',  label: '✨ Cleaning' },
];

function ServiceModal({ service, onClose, onBook }) {
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
                  <Text style={MD.meta}>⏱ {service.duration}m</Text>
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
            <View style={MD.section}>
              <Text style={MD.sTitle}>What's Included</Text>
              {service.inclusions.map((inc, i) => (
                <View key={i} style={MD.listRow}><Text style={MD.check}>✅</Text><Text style={MD.listText}>{inc}</Text></View>
              ))}
            </View>
            {service.exclusions?.length > 0 && (
              <View style={MD.section}>
                <Text style={MD.sTitle}>Not Included</Text>
                {service.exclusions.map((exc, i) => (
                  <View key={i} style={MD.listRow}><Text>❌</Text><Text style={MD.listText}>{exc}</Text></View>
                ))}
              </View>
            )}
            <View style={MD.section}>
              <Text style={MD.sTitle}>How It Works</Text>
              {service.steps.map((s, i) => (
                <View key={i} style={MD.stepRow}>
                  <View style={MD.stepNum}><Text style={MD.stepNumText}>{i+1}</Text></View>
                  <Text style={MD.stepText}>{s}</Text>
                </View>
              ))}
            </View>
            {service.warranty && <View style={MD.warrantyBox}><Text style={MD.warrantyText}>🛡️ {service.warranty}</Text></View>}
            {service.faq?.length > 0 && (
              <View style={MD.section}>
                <Text style={MD.sTitle}>FAQs</Text>
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
            <TouchableOpacity style={MD.closeBtn} onPress={onClose}><Text style={MD.closeBtnText}>✕</Text></TouchableOpacity>
            <TouchableOpacity style={MD.bookBtn} onPress={onBook}>
              <Text style={MD.bookBtnText}>Book Now — ₹{service.startingPrice}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PlumbingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const [filter, setFilter]   = useState('all');
  const [modal, setModal]     = useState(null);

  const filtered = PLUMBING_SERVICES.filter(s => {
    if (filter === 'emergency') return s.isEmergency;
    if (filter === 'repair')    return ['tap-repair','pipe-leakage','toilet-repair','motor-pump-repair'].includes(s.id);
    if (filter === 'install')   return ['geyser-installation','bathroom-fitting'].includes(s.id);
    if (filter === 'cleaning')  return ['drain-cleaning','water-tank-cleaning'].includes(s.id);
    return true;
  });

  const handleBook = (svc) => {
    setModal(null);
    const added = addToCart({ serviceId: svc.id, serviceName: svc.name, price: svc.startingPrice, originalPrice: svc.originalPrice, duration: svc.duration, icon: svc.icon, categorySlug: 'plumbing' });
    Alert.alert(added ? '🔧 Added to Cart!' : '🛒 Already Added', `${svc.name} — ₹${svc.startingPrice}`, [
      { text: 'Continue', style: 'cancel' },
      { text: 'Checkout', onPress: () => navigation.navigate('Checkout') },
    ]);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1565C0', '#0D47A1']} style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>🔧 Plumbing Services</Text>
          <Text style={S.headerSub}>Certified plumbers at your doorstep</Text>
        </View>
      </LinearGradient>

      <TouchableOpacity style={S.emergBanner} onPress={() => setFilter('emergency')}>
        <Text style={S.emergIcon}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.emergTitle}>Emergency Plumbing — 60 min arrival</Text>
          <Text style={S.emergSub}>Pipe leak · Drain block · Overflow</Text>
        </View>
        <View style={S.emergBadge}><Text style={S.emergBadgeText}>URGENT</Text></View>
      </TouchableOpacity>

      <View style={S.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[S.chip, filter === f.key && S.chipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[S.chipText, filter === f.key && S.chipTextActive]}>{f.label}</Text>
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
            <TouchableOpacity style={S.card} onPress={() => setModal(svc)} activeOpacity={0.9}>
              <View style={S.cardBadges}>
                {svc.isEmergency && <View style={S.eTag}><Text style={S.eTagText}>⚡ Emergency</Text></View>}
                {disc > 0 && <View style={S.dTag}><Text style={S.dTagText}>{disc}% OFF</Text></View>}
                {svc.warranty && <View style={S.wTag}><Text style={S.wTagText}>🛡️ Warranty</Text></View>}
              </View>
              <View style={S.cardInner}>
                <View style={S.iconBox}><Text style={S.emoji}>{svc.icon}</Text></View>
                <View style={S.cardContent}>
                  <Text style={S.cardName}>{svc.name}</Text>
                  <Text style={S.cardDesc} numberOfLines={2}>{svc.desc}</Text>
                  <View style={S.metaRow}>
                    <Text style={S.rat}>⭐ {svc.rating}</Text>
                    <Text style={S.dot}>·</Text>
                    <Text style={S.bk}>{svc.totalBookings.toLocaleString()} jobs</Text>
                    <Text style={S.dot}>·</Text>
                    <Text style={S.dur}>⏱ {svc.duration}m</Text>
                  </View>
                  <View style={S.bottom}>
                    <View>
                      <Text style={S.price}>₹{svc.startingPrice}</Text>
                      <Text style={S.orig}>₹{svc.originalPrice}</Text>
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
      <ServiceModal service={modal} onClose={() => setModal(null)} onBook={() => handleBook(modal)} />
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
  emergBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderBottomWidth: 1, borderBottomColor: '#BBDEFB', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  emergIcon:   { fontSize: 26 },
  emergTitle:  { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  emergSub:    { fontSize: 12, color: '#666', marginTop: 1 },
  emergBadge:  { backgroundColor: '#1565C0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  emergBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  filterWrap:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  filterRow:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F5' },
  chipActive:  { backgroundColor: '#1565C0' },
  chipText:    { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  card:        { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.md },
  cardBadges:  { flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 0 },
  eTag:        { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  eTagText:    { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  dTag:        { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  dTagText:    { fontSize: 11, fontWeight: '700', color: '#C62828' },
  wTag:        { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  wTagText:    { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  cardInner:   { flexDirection: 'row', padding: 14 },
  iconBox:     { width: 64, height: 64, borderRadius: 16, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  emoji:       { fontSize: 32 },
  cardContent: { flex: 1 },
  cardName:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  cardDesc:    { fontSize: 12, color: '#666', lineHeight: 17, marginBottom: 6 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rat:         { fontSize: 12, color: '#555' },
  dot:         { fontSize: 12, color: '#CCC', marginHorizontal: 4 },
  bk:          { fontSize: 12, color: '#555' },
  dur:         { fontSize: 12, color: '#555' },
  bottom:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price:       { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  orig:        { fontSize: 12, color: '#CCC', textDecorationLine: 'line-through' },
  addBtn:      { backgroundColor: '#1565C0', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  addBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const MD = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  handle:    { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  top:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  iconCircle:{ width: 60, height: 60, borderRadius: 16, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconEmoji: { fontSize: 30 },
  topInfo:   { flex: 1 },
  name:      { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  metaRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta:      { fontSize: 12, color: '#666' },
  dot:       { fontSize: 12, color: '#CCC', marginHorizontal: 4 },
  priceArea: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  price:     { fontSize: 26, fontWeight: '900', color: '#1A1A2E' },
  orig:      { fontSize: 14, color: '#CCC', textDecorationLine: 'line-through' },
  discBadge: { backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  discText:  { fontSize: 12, fontWeight: '700', color: '#C62828' },
  emergBadge:{ backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  emergText: { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  desc:      { fontSize: 14, color: '#555', lineHeight: 20, paddingHorizontal: 20, marginBottom: 16 },
  section:   { paddingHorizontal: 20, marginBottom: 18 },
  sTitle:    { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  listRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  check:     { fontSize: 14, marginTop: 1 },
  listText:  { fontSize: 14, color: '#444', flex: 1, lineHeight: 20 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepNum:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepText:  { fontSize: 14, color: '#444', flex: 1 },
  warrantyBox: { marginHorizontal: 20, marginBottom: 18, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14 },
  warrantyText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  faqCard:   { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, marginBottom: 8 },
  faqQ:      { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  faqA:      { fontSize: 13, color: '#555', lineHeight: 18 },
  footer:    { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  closeBtn:  { width: 52, height: 52, borderRadius: 14, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 18, color: '#555' },
  bookBtn:   { flex: 1, backgroundColor: '#1565C0', borderRadius: 14, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, ...Shadows.md },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
