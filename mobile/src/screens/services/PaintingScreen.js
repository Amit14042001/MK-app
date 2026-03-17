/**
 * MK App — Painting Services Screen (Full Production)
 * Interior, exterior, texture, waterproofing, wood polishing with cost calculator
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Modal, Animated, Dimensions, TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const { width: W } = Dimensions.get('window');

const PAINTING_SERVICES = [
  {
    id: 'interior-painting',
    name: 'Interior Wall Painting',
    icon: '🖌️',
    desc: 'Full room painting with 2 coats of premium emulsion. Surface prep, masking and clean-up included.',
    pricePerSqFt: 12, originalPerSqFt: 22, minArea: 100,
    duration: '1–3 days', rating: 4.8, totalBookings: 28400,
    warranty: '2-year painting warranty',
    brands: ['Asian Paints', 'Berger', 'Dulux', 'Nerolac', 'Indigo'],
    inclusions: ['Surface preparation', 'Putty (if needed)', 'Primer coat', '2 coats of emulsion', 'Masking', 'Clean-up after'],
    exclusions: ['Furniture moving', 'Ceiling (priced separately)'],
    faq: [{ q: 'How long for a 2BHK?', a: 'Typically 3-5 days for full interior with putty and 2 coats.' }],
    isBestseller: true,
  },
  {
    id: 'texture-painting',
    name: 'Texture & Designer Painting',
    icon: '🎨',
    desc: 'Stucco, Venetian, sand, jute, sparkle textures for feature walls. 30+ designs available.',
    pricePerSqFt: 35, originalPerSqFt: 60, minArea: 50,
    duration: '1–2 days', rating: 4.9, totalBookings: 9800,
    warranty: '1-year warranty',
    brands: ['Asian Paints Royale Play', 'Berger Silk Illusions'],
    inclusions: ['Design consultation', 'Sample on wall', 'Surface prep', 'Texture application', 'Finishing'],
    exclusions: ['Other room painting'],
    faq: [{ q: 'Can I choose the pattern?', a: 'Yes! 30+ patterns available. Custom looks on request.' }],
    isBestseller: true,
  },
  {
    id: 'exterior-painting',
    name: 'Exterior Painting',
    icon: '🏠',
    desc: 'Weather-resistant exterior emulsion. Protects from rain, UV and damp. 5-year warranty.',
    pricePerSqFt: 15, originalPerSqFt: 25, minArea: 200,
    duration: '3–7 days', rating: 4.7, totalBookings: 14200,
    warranty: '5-year warranty',
    brands: ['Asian Paints Apex', 'Berger WeatherCoat', 'Dulux Weathershield'],
    inclusions: ['Scaffolding', 'Pressure wash', 'Crack fill', 'Primer', '2 coats exterior emulsion', 'Safety measures'],
    exclusions: ['Structural repairs', 'Roof waterproofing'],
    faq: [{ q: 'Best season to paint exterior?', a: 'Oct–Feb in most Indian cities. Avoid monsoon.' }],
    isBestseller: false,
  },
  {
    id: 'waterproofing',
    name: 'Waterproofing',
    icon: '💧',
    desc: 'Terrace, bathroom, basement waterproofing. Stops leakage and seepage permanently.',
    pricePerSqFt: 45, originalPerSqFt: 75, minArea: 50,
    duration: '2–4 days', rating: 4.8, totalBookings: 12300,
    warranty: '5–10 year warranty',
    brands: ['Dr. Fixit', 'Fosroc', 'Asian Paints SmartCare'],
    inclusions: ['Crack mapping', 'Chemical treatment', 'Waterproofing membrane', 'Protection coat', 'Test flooding'],
    exclusions: ['Structural repair', 'Tiling'],
    faq: [{ q: 'Does it stop active leakage?', a: 'Yes for most cases. Active seepage through cracks may need extra treatment.' }],
    isBestseller: false,
  },
  {
    id: 'wood-polishing',
    name: 'Wood Polishing & Varnish',
    icon: '🪵',
    desc: 'Door, furniture and floor polishing. Wood staining, PU coating and lacquering.',
    pricePerSqFt: 25, originalPerSqFt: 45, minArea: 30,
    duration: '1–3 days', rating: 4.8, totalBookings: 8900,
    warranty: '1-year finish warranty',
    brands: ['Asian Paints Wood Primer', 'Global PU'],
    inclusions: ['Sanding', 'Stain/polish application', 'Multiple coats', 'Final buffing', 'Hardware protection'],
    exclusions: ['Damaged wood replacement', 'Upholstery'],
    faq: [{ q: 'Can old furniture look new again?', a: 'Absolutely. Proper sanding and fresh polish restores furniture near to new condition.' }],
    isBestseller: false,
  },
  {
    id: 'metal-painting',
    name: 'Metal & Gate Painting',
    icon: '🚪',
    desc: 'Anti-rust painting for gates, grilles and pipes. Prevents corrosion and oxidation.',
    pricePerSqFt: 18, originalPerSqFt: 30, minArea: 20,
    duration: '4–8 hours', rating: 4.7, totalBookings: 6700,
    warranty: '2-year anti-rust warranty',
    brands: ['Shalimar', 'Berger Bison', 'Asian Paints'],
    inclusions: ['Rust removal', 'Anti-rust primer', '2 coats enamel', 'Finishing coat'],
    exclusions: ['Metal welding', 'Part replacement'],
    faq: [{ q: 'How often does metal need repainting?', a: 'Every 2-3 years outdoors, 4-5 years for sheltered gates.' }],
    isBestseller: false,
  },
];

const ROOM_SIZES = [
  { name: '1 BHK', sqft: 450 },
  { name: '2 BHK', sqft: 800 },
  { name: '3 BHK', sqft: 1200 },
  { name: '4 BHK+', sqft: 1800 },
  { name: 'Villa', sqft: 2500 },
  { name: 'Custom', sqft: null },
];
const FINISHES = [
  { name: 'Economy', rate: 10, desc: 'Basic emulsion' },
  { name: 'Standard', rate: 12, desc: 'Premium emulsion' },
  { name: 'Premium', rate: 18, desc: 'Luxury finish' },
];

function CostCalculator() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [customSqft, setCustomSqft] = useState('');
  const [finish, setFinish] = useState(1);
  const sqft = selectedRoom?.sqft || parseInt(customSqft) || 0;
  const rate = FINISHES[finish].rate;
  const base = sqft * rate;
  const labour = Math.round(base * 0.4);
  const material = Math.round(base * 0.6);
  const gst = Math.round(base * 0.18);
  const total = base + gst;
  const showResult = sqft > 0;

  return (
    <View style={styles.calcCard}>
      <Text style={styles.calcTitle}>🧮 Painting Cost Estimator</Text>
      <Text style={styles.calcSub}>Get instant estimate for your home</Text>
      <Text style={styles.calcLabel}>Property Size</Text>
      <View style={styles.roomGrid}>
        {ROOM_SIZES.map((r,i) => (
          <TouchableOpacity key={i} style={[styles.roomBtn, selectedRoom?.name===r.name && styles.roomBtnActive]} onPress={() => { setSelectedRoom(r); }}>
            <Text style={[styles.roomBtnTxt, selectedRoom?.name===r.name && styles.roomBtnTxtActive]}>{r.name}</Text>
            {r.sqft && <Text style={[styles.roomSqft, selectedRoom?.name===r.name && { color:'#7B1FA2' }]}>{r.sqft} sqft</Text>}
          </TouchableOpacity>
        ))}
      </View>
      {selectedRoom?.name === 'Custom' && (
        <View style={styles.customArea}>
          <Text style={styles.calcLabel}>Enter Area (sq ft)</Text>
          <TextInput style={styles.sqftInput} value={customSqft} onChangeText={setCustomSqft} keyboardType="numeric" placeholder="e.g. 1000" placeholderTextColor={Colors.midGray} />
        </View>
      )}
      <Text style={styles.calcLabel}>Finish Quality</Text>
      <View style={styles.finishRow}>
        {FINISHES.map((f,i) => (
          <TouchableOpacity key={i} style={[styles.finishBtn, finish===i && styles.finishBtnActive]} onPress={() => setFinish(i)}>
            <Text style={[styles.finishBtnTxt, finish===i && styles.finishBtnTxtActive]}>{f.name}</Text>
            <Text style={[styles.finishBtnDesc, finish===i && { color:'#fff' }]}>{f.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {showResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Estimated Cost ({sqft} sqft)</Text>
          <Text style={styles.resultPrice}>₹{base.toLocaleString()}</Text>
          <View style={styles.breakdownCard}>
            {[['Labour (40%)', labour],['Materials (60%)', material],['GST 18%', gst]].map(([lbl,val],i) => (
              <View key={i} style={styles.breakRow}>
                <Text style={styles.breakLabel}>{lbl}</Text>
                <Text style={styles.breakVal}>₹{val.toLocaleString()}</Text>
              </View>
            ))}
            <View style={[styles.breakRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalVal}>₹{total.toLocaleString()}</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>*Estimate at ₹{rate}/sqft. Final quote after site visit.</Text>
          <TouchableOpacity style={styles.consultBtn} onPress={() => Alert.alert('Free Consultation Booked', 'Our painting consultant will visit within 24 hours for a detailed quote and colour guidance.')}>
            <Text style={styles.consultBtnTxt}>Book Free Site Visit →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.pricePerSqFt / service.originalPerSqFt) * 100);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.bsBadge}><Text style={styles.bsTxt}>BESTSELLER</Text></View>}
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDur}>⏱ {service.duration}  •  🛡️ {service.warranty}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingTxt}>⭐ {service.rating}</Text>
            <Text style={styles.bkTxt}>  {(service.totalBookings/1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.brandsRow}>
        <Text style={styles.brandsLabel}>Brands: </Text>
        <Text style={styles.brandsVal}>{service.brands.join(', ')}</Text>
      </View>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.startsAt}>Starting at</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{service.pricePerSqFt}/sqft</Text>
            <Text style={styles.origPrice}>₹{service.originalPerSqFt}</Text>
            <View style={styles.discBadge}><Text style={styles.discTxt}>{disc}% off</Text></View>
          </View>
        </View>
        <TouchableOpacity style={[styles.addBtn, inCart && styles.addBtnActive]} onPress={() => onAdd(service)}>
          <Text style={[styles.addBtnTxt, inCart && styles.addBtnActiveTxt]}>{inCart ? '✓' : 'Quote'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function PaintingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.pricePerSqFt * 100, category: 'painting', icon: service.icon });
    Alert.alert('Added! 🖌️', `${service.name} added. Final pricing confirmed after site inspection.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange:[0,100], outputRange:['transparent','#4A148C'], extrapolate:'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width:40 }}>
          <Text style={{ fontSize:22, color:'#fff', fontWeight:'700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painting Services</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Text style={{ fontSize:22 }}>🛒</Text></TouchableOpacity>
      </Animated.View>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false })}
        scrollEventThrottle={16}
      >
        <LinearGradient colors={['#1A1A2E','#4A148C','#7B1FA2']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🖌️</Text>
          <Text style={styles.heroTitle}>Painting at Your Doorstep</Text>
          <Text style={styles.heroSub}>Expert painters • Premium paint brands • 2-year warranty</Text>
          <View style={styles.heroStats}>
            {[['4.8★','Rating'],['₹12/sqft','Starting price'],['2 yr','Warranty']].map(([v,l],i)=>(
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
        <CostCalculator />
        <View style={{ padding:16 }}>
          <Text style={styles.sectionTitle}>All Painting Services</Text>
          {PAINTING_SERVICES.map(s => (
            <ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv)=>{ setDetail(sv); setShowDetail(true); }} />
          ))}
        </View>
        <View style={styles.whyCard}>
          <Text style={styles.sectionTitle}>Why Choose MK App Painters?</Text>
          {[['🎨','All Premium Brands','Asian Paints, Berger, Dulux — your choice'],['🛡️','Up to 5-Year Warranty','Written warranty on all painting work'],['👷','Experienced Teams','Average 8 years experience per painter'],['🧹','Zero Mess Policy','Full masking and complete cleanup included'],['💰','Transparent Pricing','No hidden costs. Final quote before work starts']].map(([icon,title,desc],i) => (
            <View key={i} style={styles.whyRow}>
              <Text style={styles.whyIcon}>{icon}</Text>
              <View><Text style={styles.whyTitle}>{title}</Text><Text style={styles.whyDesc}>{desc}</Text></View>
            </View>
          ))}
        </View>
        <View style={{ height:80 }} />
      </Animated.ScrollView>
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
  calcCard: { backgroundColor:'#fff', margin:16, borderRadius:20, padding:20, ...Shadows.card },
  calcTitle: { fontSize:17, fontWeight:'800', color:Colors.black, marginBottom:4 },
  calcSub: { fontSize:13, color:Colors.midGray, marginBottom:16 },
  calcLabel: { fontSize:14, fontWeight:'700', color:Colors.black, marginBottom:10 },
  roomGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 },
  roomBtn: { paddingHorizontal:14, paddingVertical:10, borderRadius:14, backgroundColor:Colors.offWhite, borderWidth:1.5, borderColor:'transparent', alignItems:'center' },
  roomBtnActive: { backgroundColor:'#F3E5F5', borderColor:'#7B1FA2' },
  roomBtnTxt: { fontSize:13, fontWeight:'700', color:Colors.gray },
  roomBtnTxtActive: { color:'#7B1FA2' },
  roomSqft: { fontSize:10, color:Colors.midGray, marginTop:2 },
  customArea: { marginBottom:16 },
  sqftInput: { borderWidth:1.5, borderColor:Colors.lightGray, borderRadius:12, padding:14, fontSize:16, color:Colors.black },
  finishRow: { flexDirection:'row', gap:10, marginBottom:16 },
  finishBtn: { flex:1, backgroundColor:Colors.offWhite, borderRadius:14, padding:12, alignItems:'center', borderWidth:1.5, borderColor:'transparent' },
  finishBtnActive: { backgroundColor:'#7B1FA2', borderColor:'#7B1FA2' },
  finishBtnTxt: { fontSize:13, fontWeight:'700', color:Colors.black },
  finishBtnTxtActive: { color:'#fff' },
  finishBtnDesc: { fontSize:10, color:Colors.midGray, marginTop:2 },
  resultCard: { backgroundColor:'#F3E5F5', borderRadius:16, padding:16 },
  resultTitle: { fontSize:13, color:'#7B1FA2', fontWeight:'600', marginBottom:4 },
  resultPrice: { fontSize:28, fontWeight:'900', color:'#4A148C', marginBottom:14 },
  breakdownCard: { backgroundColor:'#fff', borderRadius:12, padding:14, marginBottom:12 },
  breakRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  breakLabel: { fontSize:13, color:Colors.gray },
  breakVal: { fontSize:13, fontWeight:'600', color:Colors.black },
  totalRow: { borderTopWidth:1, borderTopColor:Colors.offWhite, paddingTop:8, marginBottom:0 },
  totalLabel: { fontSize:14, fontWeight:'700', color:Colors.black },
  totalVal: { fontSize:16, fontWeight:'800', color:'#4A148C' },
  disclaimer: { fontSize:11, color:Colors.midGray, marginBottom:12 },
  consultBtn: { backgroundColor:'#4A148C', borderRadius:14, paddingVertical:14, alignItems:'center' },
  consultBtnTxt: { fontSize:15, fontWeight:'700', color:'#fff' },
  sectionTitle: { fontSize:18, fontWeight:'800', color:Colors.black, marginHorizontal:16, marginBottom:14 },
  card: { backgroundColor:'#fff', borderRadius:20, padding:18, marginBottom:16, ...Shadows.card, overflow:'hidden' },
  bsBadge: { position:'absolute', top:14, right:14, backgroundColor:Colors.primary, borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  bsTxt: { fontSize:9, fontWeight:'800', color:'#fff' },
  cardTop: { flexDirection:'row', marginBottom:10 },
  cardIcon: { fontSize:36, marginRight:14 },
  cardMeta: { flex:1 },
  cardName: { fontSize:15, fontWeight:'700', color:Colors.black },
  cardDur: { fontSize:11, color:Colors.midGray, marginTop:3 },
  ratingRow: { flexDirection:'row', marginTop:4 },
  ratingTxt: { fontSize:13, fontWeight:'600', color:Colors.black },
  bkTxt: { fontSize:12, color:Colors.midGray },
  cardDesc: { fontSize:13, color:Colors.gray, lineHeight:18, marginBottom:8 },
  brandsRow: { flexDirection:'row', marginBottom:12 },
  brandsLabel: { fontSize:12, fontWeight:'600', color:Colors.black },
  brandsVal: { flex:1, fontSize:12, color:Colors.midGray },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  startsAt: { fontSize:11, color:Colors.midGray },
  priceRow: { flexDirection:'row', alignItems:'center', gap:8 },
  price: { fontSize:16, fontWeight:'800', color:Colors.black },
  origPrice: { fontSize:13, color:Colors.midGray, textDecorationLine:'line-through' },
  discBadge: { backgroundColor:Colors.successLight, borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  discTxt: { fontSize:11, fontWeight:'700', color:Colors.success },
  addBtn: { backgroundColor:'#F3E5F5', borderRadius:14, paddingHorizontal:22, paddingVertical:10, borderWidth:1.5, borderColor:'#7B1FA2' },
  addBtnActive: { backgroundColor:'#7B1FA2' },
  addBtnTxt: { fontSize:14, fontWeight:'700', color:'#7B1FA2' },
  addBtnActiveTxt: { color:'#fff' },
  whyCard: { margin:16, backgroundColor:'#fff', borderRadius:20, padding:20, ...Shadows.card },
  whyRow: { flexDirection:'row', alignItems:'flex-start', marginBottom:16 },
  whyIcon: { fontSize:26, marginRight:14 },
  whyTitle: { fontSize:14, fontWeight:'700', color:Colors.black },
  whyDesc: { fontSize:12, color:Colors.gray, marginTop:2, lineHeight:17 },
});
