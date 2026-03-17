/**
 * MK App — Appliance Repair Screen (Full Production)
 * Washing machine, refrigerator, microwave, TV, geyser, air cooler repair
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

const APPLIANCE_SERVICES = [
  {
    id: 'washing-machine',
    name: 'Washing Machine Repair',
    icon: '🫧',
    desc: 'All brands serviced — Samsung, LG, Whirlpool, Bosch, IFB. Front-load, top-load, semi-automatic.',
    startingPrice: 299, originalPrice: 499, duration: 60,
    rating: 4.8, totalBookings: 32400,
    warranty: '30-day repair warranty',
    brands: ['Samsung', 'LG', 'Whirlpool', 'Bosch', 'IFB', 'Videocon', 'Godrej'],
    problems: ['Not spinning', 'Water leakage', 'Not draining', 'Drum noise', 'Door not locking', 'Error codes', 'Not starting'],
    inclusions: ['Diagnosis & inspection', 'Labour charges', 'Basic repairs', 'Testing after repair'],
    exclusions: ['Spare parts (charged actual)', 'Motor replacement'],
    faq: [{ q: 'What if parts are needed?', a: 'Genuine parts are sourced and charged at actual cost. You are informed before proceeding.' }],
    isBestseller: true,
    isEmergency: false,
  },
  {
    id: 'refrigerator-repair',
    name: 'Refrigerator Repair',
    icon: '🧊',
    desc: 'Cooling issues, gas refilling, compressor problems, door seal — all fridge repairs at home.',
    startingPrice: 349, originalPrice: 599, duration: 60,
    rating: 4.8, totalBookings: 27800,
    warranty: '30-day repair warranty',
    brands: ['Samsung', 'LG', 'Whirlpool', 'Haier', 'Godrej', 'Voltas Beko'],
    problems: ['Not cooling', 'Excessive frost', 'Water leaking inside', 'Compressor noise', 'Gas refill needed', 'Thermostat issue', 'Door seal broken'],
    inclusions: ['Full diagnosis', 'Gas leakage check', 'Labour', 'Testing'],
    exclusions: ['Gas refilling (charged extra per kg)', 'Compressor replacement'],
    faq: [{ q: 'How much does gas refilling cost?', a: 'Gas refill (R-134a) is ₹500-800 depending on quantity. Charged transparently.' }],
    isBestseller: true,
  },
  {
    id: 'microwave-repair',
    name: 'Microwave & OTG Repair',
    icon: '📦',
    desc: 'Not heating, turntable issues, door not closing, sparking — all microwave problems fixed.',
    startingPrice: 249, originalPrice: 399, duration: 45,
    rating: 4.7, totalBookings: 18200,
    warranty: '30-day repair warranty',
    brands: ['Samsung', 'LG', 'IFB', 'Bajaj', 'Panasonic', 'Whirlpool'],
    problems: ['Not heating', 'Turntable not rotating', 'Sparking inside', 'Display not working', 'Door latch broken', 'Unusual noise'],
    inclusions: ['Safety inspection', 'Diagnosis', 'Component repair', 'Testing'],
    exclusions: ['Magnetron replacement (high-cost part)', 'Physical damage'],
    faq: [{ q: 'Is microwave repair safe at home?', a: 'Yes. Our technicians are trained for high-voltage appliance safety. Capacitors are discharged before any internal work.' }],
    isBestseller: false,
  },
  {
    id: 'tv-repair',
    name: 'TV & LED Display Repair',
    icon: '📺',
    desc: 'LED, LCD, Smart TV repair — no picture, backlight issues, remote not working, HDMI port fix.',
    startingPrice: 299, originalPrice: 499, duration: 60,
    rating: 4.7, totalBookings: 21600,
    warranty: '30-day repair warranty',
    brands: ['Samsung', 'LG', 'Sony', 'OnePlus', 'Mi', 'TCL', 'Panasonic', 'Vu'],
    problems: ['No display / blank screen', 'Backlight failure', 'No sound', 'Remote not working', 'HDMI port issue', 'Screen lines', 'Smart TV software issue'],
    inclusions: ['Diagnosis', 'Software update/reset if needed', 'Minor hardware repair', 'HDMI/port check'],
    exclusions: ['Screen/panel replacement (very high cost)', 'Physical damage repair'],
    faq: [{ q: 'Can you fix a cracked TV screen?', a: 'Screen panel replacement is extremely costly — often more than a new TV. We advise accordingly.' }],
    isBestseller: false,
  },
  {
    id: 'geyser-repair',
    name: 'Geyser / Water Heater Repair',
    icon: '🚿',
    desc: 'Not heating, leaking, thermostat issues, heating element replacement for all geyser brands.',
    startingPrice: 249, originalPrice: 399, duration: 45,
    rating: 4.8, totalBookings: 24400,
    warranty: '30-day repair warranty',
    brands: ['Racold', 'AO Smith', 'Havells', 'Bajaj', 'V-Guard', 'Crompton'],
    problems: ['Not heating water', 'Water leaking', 'Tripping MCB', 'Making noise', 'Thermostat fault', 'Anode rod replacement'],
    inclusions: ['Safety check', 'Element testing', 'Thermostat check', 'Labour', 'Testing'],
    exclusions: ['Tank replacement', 'Plumbing connections'],
    faq: [{ q: 'Is geyser repair safe?', a: 'Power is disconnected before any work. Safety is our top priority for electrical appliances.' }],
    isBestseller: false,
    isEmergency: true,
  },
  {
    id: 'ac-service-deep',
    name: 'AC Deep Service & Gas Fill',
    icon: '❄️',
    desc: 'Annual AC deep cleaning, gas top-up, coil cleaning, drain flush — maximize efficiency and cooling.',
    startingPrice: 599, originalPrice: 999, duration: 90,
    rating: 4.9, totalBookings: 38700,
    warranty: '90-day service warranty',
    brands: ['Daikin', 'Voltas', 'Blue Star', 'Carrier', 'Hitachi', 'LG', 'Samsung', 'O General'],
    problems: ['Poor cooling', 'Water dripping inside', 'Noise', 'High electricity bill', 'Bad smell', 'Gas refill needed'],
    inclusions: ['Filter cleaning', 'Indoor/outdoor coil wash', 'Drain pipe flush', 'Gas pressure check', 'Electrical connections check', 'Performance test'],
    exclusions: ['Gas refilling (₹800-1200 extra)', 'PCB replacement', 'Compressor repair'],
    faq: [{ q: 'How often should AC be serviced?', a: 'Once before summer (March-April) is ideal. Heavy users should service twice a year.' }],
    isBestseller: true,
  },
  {
    id: 'chimney-repair',
    name: 'Kitchen Chimney Service',
    icon: '🏭',
    desc: 'Chimney deep cleaning, motor repair, filter replacement, suction restoration for all brands.',
    startingPrice: 499, originalPrice: 799, duration: 60,
    rating: 4.7, totalBookings: 14200,
    warranty: '30-day warranty',
    brands: ['Elica', 'Faber', 'Glen', 'Hindware', 'Inalsa', 'Kaff', 'Bosch'],
    problems: ['Low suction', 'Noise', 'Oil/grease buildup', 'LED not working', 'Auto-clean not working'],
    inclusions: ['Filter removal & cleaning', 'Motor check', 'Oil cup cleaning', 'Duct check', 'Reassembly & test'],
    exclusions: ['New filter purchase', 'Motor replacement'],
    faq: [{ q: 'How often should chimney be cleaned?', a: 'Every 3-6 months depending on cooking frequency. Annual deep clean recommended.' }],
    isBestseller: false,
  },
  {
    id: 'air-purifier-repair',
    name: 'Air Purifier & Cooler Service',
    icon: '💨',
    desc: 'Air purifier filter replacement, cooler pad replacement, pump repair, cleaning and servicing.',
    startingPrice: 249, originalPrice: 399, duration: 45,
    rating: 4.7, totalBookings: 9800,
    warranty: '30-day warranty',
    brands: ['Honeywell', 'Dyson', 'Philips', 'Coway', 'Symphony', 'Crompton'],
    problems: ['Filter replacement', 'Low airflow', 'Not turning on', 'Bad smell', 'Cooler pads worn', 'Pump issue'],
    inclusions: ['Inspection', 'Filter check/clean', 'Motor check', 'Testing'],
    exclusions: ['Filter purchase (charged extra)', 'PCB repair'],
    faq: [{ q: 'When should air purifier filters be changed?', a: 'HEPA filters every 6-12 months, pre-filters every 3 months depending on usage.' }],
    isBestseller: false,
  },
];

const BRAND_LOGOS = ['Samsung', 'LG', 'Whirlpool', 'Bosch', 'IFB', 'Voltas', 'Daikin', 'Haier', 'Godrej', 'Sony'];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.bsBadge}><Text style={styles.bsBadgeText}>TOP BOOKED</Text></View>}
      {service.isEmergency && <View style={[styles.bsBadge, { backgroundColor: '#E67E22' }]}><Text style={styles.bsBadgeText}>⚡ EMERGENCY</Text></View>}
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDur}>⏱ ~{service.duration} min  •  🛡️ {service.warranty}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingTxt}>⭐ {service.rating}</Text>
            <Text style={styles.bkTxt}>  {(service.totalBookings/1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.brandsRow}>
        <Text style={styles.brandsLabel}>Brands: </Text>
        <Text style={styles.brandsList} numberOfLines={1}>{service.brands.slice(0,4).join(', ')}{service.brands.length > 4 ? ` +${service.brands.length-4}` : ''}</Text>
      </View>
      <View style={styles.problemsRow}>
        {service.problems.slice(0,3).map((p,i) => (
          <View key={i} style={styles.problemChip}><Text style={styles.problemTxt}>{p}</Text></View>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.startsAt}>Starts at</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{service.startingPrice}</Text>
            <Text style={styles.origPrice}>₹{service.originalPrice}</Text>
            <View style={styles.discBadge}><Text style={styles.discTxt}>{disc}% off</Text></View>
          </View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnActive]} onPress={() => onAdd(service)}>
          <Text style={[styles.addBtnTxt, inCart && styles.addBtnActiveTxt]}>{inCart ? '✓ Added' : 'Add'}</Text>
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
          <LinearGradient colors={['#1A1A2E', '#0D47A1', '#1565C0']} style={styles.modalHero}>
            <Text style={styles.modalHeroIcon}>{service.icon}</Text>
            <Text style={styles.modalHeroTitle}>{service.name}</Text>
            <Text style={styles.modalHeroDur}>⭐ {service.rating}  •  {(service.totalBookings/1000).toFixed(1)}k bookings  •  {service.warranty}</Text>
          </LinearGradient>
          <View style={styles.modalBody}>
            <Text style={styles.modalDesc}>{service.desc}</Text>
            <Text style={styles.subHead}>Brands We Service</Text>
            <View style={styles.brandsWrap}>
              {service.brands.map((b,i) => <View key={i} style={styles.brandBadge}><Text style={styles.brandBadgeTxt}>{b}</Text></View>)}
            </View>
            <Text style={styles.subHead}>Common Problems Fixed</Text>
            <View style={styles.problemsWrap}>
              {service.problems.map((p,i) => (
                <View key={i} style={styles.problemItem}><Text style={styles.problemCheck}>✓</Text><Text style={styles.problemItemTxt}>{p}</Text></View>
              ))}
            </View>
            <View style={styles.tabBar}>
              {['inclusions', 'exclusions', 'faq'].map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab===t && styles.tabBtnActive]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabBtnTxt, tab===t && styles.tabBtnTxtActive]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab==='inclusions' && service.inclusions.map((item,i)=>(
              <View key={i} style={styles.listRow}><Text style={styles.check}>✓</Text><Text style={styles.listTxt}>{item}</Text></View>
            ))}
            {tab==='exclusions' && service.exclusions.map((item,i)=>(
              <View key={i} style={styles.listRow}><Text style={styles.cross}>✗</Text><Text style={styles.listTxt}>{item}</Text></View>
            ))}
            {tab==='faq' && service.faq.map((item,i)=>(
              <View key={i} style={styles.faqCard}><Text style={styles.faqQ}>{item.q}</Text><Text style={styles.faqA}>{item.a}</Text></View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <View>
            <Text style={{ fontSize: 12, color: Colors.midGray }}>Starting at</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.black }}>₹{service.startingPrice}</Text>
          </View>
          <TouchableOpacity style={styles.modalBookBtn} onPress={() => { onAdd(service); onClose(); }}>
            <Text style={styles.modalBookTxt}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ApplianceRepairScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'kitchen', label: 'Kitchen' },
    { key: 'laundry', label: 'Laundry' },
    { key: 'cooling', label: 'Cooling' },
    { key: 'entertainment', label: 'TV / AV' },
  ];

  const filtered = APPLIANCE_SERVICES.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'kitchen') return ['microwave-repair','chimney-repair','refrigerator-repair'].includes(s.id);
    if (filter === 'laundry') return s.id === 'washing-machine';
    if (filter === 'cooling') return ['ac-service-deep','air-purifier-repair'].includes(s.id);
    if (filter === 'entertainment') return s.id === 'tv-repair';
    return true;
  });

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'appliance', duration: service.duration, icon: service.icon });
    Alert.alert('Added! 🔧', `${service.name} added. Technician will arrive at your selected time.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange:[0,100], outputRange:['transparent','#0D47A1'], extrapolate:'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width:40 }}>
          <Text style={{ fontSize:22, color:'#fff', fontWeight:'700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appliance Repair</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Text style={{ fontSize:22 }}>🛒</Text></TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false })}
        scrollEventThrottle={16}
      >
        <LinearGradient colors={['#1A1A2E','#0D47A1','#1565C0']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🔧</Text>
          <Text style={styles.heroTitle}>Appliance Repair at Home</Text>
          <Text style={styles.heroSub}>Expert technicians • All brands • Same-day service</Text>
          <View style={styles.heroStats}>
            {[['4.8★','Rating'],['90 min','Avg arrival'],['30-day','Warranty']].map(([v,l],i)=>(
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Brand support banner */}
        <View style={styles.brandsBanner}>
          <Text style={styles.brandsBannerTitle}>All Major Brands Serviced</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:12 }}>
            {BRAND_LOGOS.map((b,i) => (
              <View key={i} style={styles.brandLogo}><Text style={styles.brandLogoTxt}>{b}</Text></View>
            ))}
          </ScrollView>
        </View>

        {/* Emergency callout */}
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyIcon}>⚡</Text>
          <View style={{ flex:1 }}>
            <Text style={styles.emergencyTitle}>Emergency Repair — Arrives in 90 min</Text>
            <Text style={styles.emergencyDesc}>AC breakdown, refrigerator stopped, geyser not working — we come fast.</Text>
          </View>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => Alert.alert('Emergency Booked', 'Technician dispatched. ETA 90 minutes.')}>
            <Text style={styles.emergencyBtnTxt}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:16 }} contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter===f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterTxt, filter===f.key && styles.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding:16 }}>
          <Text style={styles.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv)=>{ setDetail(sv); setShowDetail(true); }} />
          ))}
        </View>

        <View style={styles.guaranteeCard}>
          <Text style={styles.guaranteeTitle}>🛡️ MK App Repair Guarantee</Text>
          {['30-day warranty on all repairs','Genuine OEM spare parts only','Transparent pricing before work starts','No fix = No charge policy','Background-verified technicians'].map((item,i) => (
            <View key={i} style={styles.guaranteeRow}>
              <Text style={styles.guaranteeCheck}>✓</Text>
              <Text style={styles.guaranteeItem}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={{ height:80 }} />
      </Animated.ScrollView>

      <DetailModal service={detail} visible={showDetail} onClose={()=>setShowDetail(false)} onAdd={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  header: { position:'absolute', top:0, left:0, right:0, zIndex:100, flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12 },
  headerTitle: { fontSize:16, fontWeight:'700', color:'#fff' },
  hero: { paddingTop:60, paddingBottom:32, paddingHorizontal:24, alignItems:'center' },
  heroEmoji: { fontSize:56, marginBottom:12 },
  heroTitle: { fontSize:24, fontWeight:'800', color:'#fff', textAlign:'center' },
  heroSub: { fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:6, textAlign:'center' },
  heroStats: { flexDirection:'row', marginTop:18, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, paddingVertical:12, paddingHorizontal:16, gap:16 },
  heroStat: { alignItems:'center', flex:1 },
  heroStatVal: { fontSize:15, fontWeight:'800', color:'#fff' },
  heroStatLbl: { fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:2 },
  brandsBanner: { margin:16, backgroundColor:'#fff', borderRadius:16, padding:16, ...Shadows.sm },
  brandsBannerTitle: { fontSize:14, fontWeight:'700', color:Colors.black, marginBottom:12 },
  brandLogo: { backgroundColor:Colors.offWhite, borderRadius:10, paddingHorizontal:14, paddingVertical:8 },
  brandLogoTxt: { fontSize:12, fontWeight:'600', color:Colors.gray },
  emergencyCard: { flexDirection:'row', alignItems:'center', marginHorizontal:16, backgroundColor:'#FFF3E0', borderRadius:16, padding:16, borderLeftWidth:4, borderLeftColor:Colors.warning, gap:12 },
  emergencyIcon: { fontSize:28 },
  emergencyTitle: { fontSize:14, fontWeight:'700', color:Colors.warning },
  emergencyDesc: { fontSize:12, color:Colors.gray, marginTop:2 },
  emergencyBtn: { backgroundColor:Colors.warning, borderRadius:12, paddingHorizontal:14, paddingVertical:10 },
  emergencyBtnTxt: { fontSize:12, fontWeight:'700', color:'#fff' },
  filterChip: { paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor:'#fff', borderWidth:1, borderColor:Colors.lightGray },
  filterChipActive: { backgroundColor:'#0D47A1', borderColor:'#0D47A1' },
  filterTxt: { fontSize:13, fontWeight:'600', color:Colors.gray },
  filterTxtActive: { color:'#fff' },
  sectionTitle: { fontSize:18, fontWeight:'800', color:Colors.black, marginBottom:14 },
  card: { backgroundColor:'#fff', borderRadius:20, padding:18, marginBottom:16, ...Shadows.card, overflow:'hidden' },
  bsBadge: { position:'absolute', top:14, right:14, backgroundColor:Colors.primary, borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  bsBadgeText: { fontSize:9, fontWeight:'800', color:'#fff' },
  cardTop: { flexDirection:'row', marginBottom:10 },
  cardIcon: { fontSize:36, marginRight:14 },
  cardMeta: { flex:1 },
  cardName: { fontSize:15, fontWeight:'700', color:Colors.black },
  cardDur: { fontSize:11, color:Colors.midGray, marginTop:3 },
  ratingRow: { flexDirection:'row', marginTop:4 },
  ratingTxt: { fontSize:13, fontWeight:'600', color:Colors.black },
  bkTxt: { fontSize:12, color:Colors.midGray },
  cardDesc: { fontSize:13, color:Colors.gray, lineHeight:18, marginBottom:8 },
  brandsRow: { flexDirection:'row', marginBottom:8 },
  brandsLabel: { fontSize:12, fontWeight:'600', color:Colors.black },
  brandsList: { flex:1, fontSize:12, color:Colors.midGray },
  problemsRow: { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:12 },
  problemChip: { backgroundColor:'#E3F2FD', borderRadius:10, paddingHorizontal:10, paddingVertical:4 },
  problemTxt: { fontSize:11, fontWeight:'600', color:'#0D47A1' },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  startsAt: { fontSize:11, color:Colors.midGray },
  priceRow: { flexDirection:'row', alignItems:'center', gap:8 },
  price: { fontSize:18, fontWeight:'800', color:Colors.black },
  origPrice: { fontSize:13, color:Colors.midGray, textDecorationLine:'line-through' },
  discBadge: { backgroundColor:Colors.successLight, borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  discTxt: { fontSize:11, fontWeight:'700', color:Colors.success },
  addBtn: { backgroundColor:'#E3F2FD', borderRadius:14, paddingHorizontal:22, paddingVertical:10, borderWidth:1.5, borderColor:'#0D47A1' },
  addBtnActive: { backgroundColor:'#0D47A1' },
  addBtnTxt: { fontSize:14, fontWeight:'700', color:'#0D47A1' },
  addBtnActiveTxt: { color:'#fff' },
  guaranteeCard: { margin:16, backgroundColor:'#E3F2FD', borderRadius:18, padding:20 },
  guaranteeTitle: { fontSize:15, fontWeight:'700', color:'#0D47A1', marginBottom:14 },
  guaranteeRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:10 },
  guaranteeCheck: { fontSize:14, fontWeight:'700', color:'#0D47A1', marginRight:10 },
  guaranteeItem: { flex:1, fontSize:13, color:Colors.gray, lineHeight:18 },
  // Modal
  modal: { flex:1, backgroundColor:Colors.bg },
  modalBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  closeBtn: { width:36, height:36, borderRadius:18, backgroundColor:Colors.offWhite, justifyContent:'center', alignItems:'center' },
  modalBarTitle: { fontSize:16, fontWeight:'700', color:Colors.black, flex:1, textAlign:'center' },
  modalHero: { padding:28, alignItems:'center' },
  modalHeroIcon: { fontSize:52, marginBottom:10 },
  modalHeroTitle: { fontSize:22, fontWeight:'800', color:'#fff', textAlign:'center' },
  modalHeroDur: { fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:6, textAlign:'center' },
  modalBody: { padding:20 },
  modalDesc: { fontSize:14, color:Colors.gray, lineHeight:20, marginBottom:16 },
  subHead: { fontSize:15, fontWeight:'700', color:Colors.black, marginBottom:10 },
  brandsWrap: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 },
  brandBadge: { backgroundColor:'#E3F2FD', borderRadius:10, paddingHorizontal:12, paddingVertical:6 },
  brandBadgeTxt: { fontSize:12, fontWeight:'600', color:'#0D47A1' },
  problemsWrap: { marginBottom:16 },
  problemItem: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  problemCheck: { fontSize:13, color:Colors.success, fontWeight:'700', marginRight:10 },
  problemItemTxt: { fontSize:13, color:Colors.gray },
  tabBar: { flexDirection:'row', backgroundColor:Colors.offWhite, borderRadius:12, padding:4, marginBottom:16 },
  tabBtn: { flex:1, paddingVertical:8, borderRadius:10, alignItems:'center' },
  tabBtnActive: { backgroundColor:'#fff', ...Shadows.sm },
  tabBtnTxt: { fontSize:12, color:Colors.midGray, fontWeight:'600' },
  tabBtnTxtActive: { color:'#0D47A1', fontWeight:'700' },
  listRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:10 },
  check: { fontSize:14, color:Colors.success, fontWeight:'700', marginRight:10 },
  cross: { fontSize:14, color:Colors.error, fontWeight:'700', marginRight:10 },
  listTxt: { flex:1, fontSize:14, color:Colors.gray, lineHeight:20 },
  faqCard: { backgroundColor:Colors.offWhite, borderRadius:12, padding:14, marginBottom:12 },
  faqQ: { fontSize:14, fontWeight:'700', color:Colors.black, marginBottom:6 },
  faqA: { fontSize:13, color:Colors.gray, lineHeight:18 },
  modalFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderTopWidth:1, borderTopColor:Colors.offWhite, backgroundColor:'#fff' },
  modalBookBtn: { backgroundColor:'#0D47A1', borderRadius:14, paddingHorizontal:28, paddingVertical:14 },
  modalBookTxt: { fontSize:15, fontWeight:'700', color:'#fff' },
});
