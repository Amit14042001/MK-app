/**
 * MK App — Pest Control Screen (Full Production)
 * Cockroach, rodent, termite, bed bug, mosquito, general pest control
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Modal, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const PEST_SERVICES = [
  {
    id: 'cockroach-control',
    name: 'Cockroach Control',
    icon: '🪳',
    desc: 'Gel-based cockroach treatment — effective on German and American cockroaches. Safe for family and pets.',
    startingPrice: 299, originalPrice: 499, duration: 30,
    rating: 4.8, totalBookings: 44200,
    warranty: '3-month warranty',
    method: 'Gel Treatment (Odorless)',
    safeFor: 'Pets & children (re-enter in 30 min)',
    inclusions: ['Kitchen cabinets', 'Under sink areas', 'Bathroom joints', 'Appliance gaps', 'Wall crevices'],
    faq: [{ q: 'Is the gel safe around food?', a: 'Yes. Gel is applied in cracks and crevices, not on food surfaces. Kitchen can be used 1 hour after treatment.' }],
    isBestseller: true,
  },
  {
    id: 'bed-bug-control',
    name: 'Bed Bug Treatment',
    icon: '🛏️',
    desc: 'Complete bed bug elimination using heat and chemical treatment. Covers mattress, headboard, and furniture.',
    startingPrice: 999, originalPrice: 1699, duration: 120,
    rating: 4.8, totalBookings: 18300,
    warranty: '3-month warranty',
    method: 'Heat + Chemical Spray',
    safeFor: 'Re-enter after 4 hours',
    inclusions: ['Mattress treatment', 'Headboard', 'Side tables', 'Sofa & upholstery', 'Wardrobe base'],
    faq: [{ q: 'Do I need to wash bedding after treatment?', a: 'Yes. Wash all bedding in hot water (60°C+) after treatment. We will guide you through prep steps.' }],
    isBestseller: false,
    isSerious: true,
  },
  {
    id: 'termite-control',
    name: 'Termite Treatment',
    icon: '🪵',
    desc: 'Pre-construction or post-construction termite treatment. Anti-termite drilling and chemical barrier.',
    startingPrice: 1499, originalPrice: 2499, duration: 180,
    rating: 4.7, totalBookings: 12400,
    warranty: '5-year warranty',
    method: 'Drilling + Chemical Barrier',
    safeFor: 'Re-enter after 24 hours',
    inclusions: ['Floor drilling at wall bases', 'Chemical injection', 'Soil treatment', 'Wood treatment', 'Infested wood repair guidance'],
    faq: [{ q: 'How long does termite treatment take?', a: 'For a 2BHK, typically 3-5 hours. The chemical barrier takes 24 hours to fully activate.' }],
    isBestseller: false,
    isSerious: true,
  },
  {
    id: 'rodent-control',
    name: 'Rodent & Rat Control',
    icon: '🐀',
    desc: 'Traps, baiting and proofing to eliminate rats and mice. Safe, non-toxic options available.',
    startingPrice: 599, originalPrice: 999, duration: 60,
    rating: 4.7, totalBookings: 9800,
    warranty: '1-month warranty',
    method: 'Bait Stations + Trapping',
    safeFor: 'Pets safe (child-proof bait stations)',
    inclusions: ['Entry point identification', 'Bait stations placement', 'Sticky traps', 'Gap sealing guidance', 'Follow-up visit in 7 days'],
    faq: [{ q: 'Will bait harm my pet if they find it?', a: 'Child-proof and tamper-resistant bait stations are used. Still, keep pets away from treated areas.' }],
    isBestseller: false,
  },
  {
    id: 'mosquito-control',
    name: 'Mosquito & Flies Control',
    icon: '🦟',
    desc: 'Fogging and larviciding to eliminate mosquitoes at the source. Effective for dengue, malaria prevention.',
    startingPrice: 499, originalPrice: 799, duration: 60,
    rating: 4.8, totalBookings: 31200,
    warranty: '1-month warranty',
    method: 'Thermal Fogging + Spray',
    safeFor: 'Re-enter after 2 hours',
    inclusions: ['Indoor fogging', 'Outdoor perimeter spray', 'Drain treatment', 'Plant base treatment', 'Water stagnation check'],
    faq: [{ q: 'How often should mosquito control be done?', a: 'Monthly during monsoon season. Every 2-3 months otherwise.' }],
    isBestseller: true,
  },
  {
    id: 'general-pest',
    name: 'General Pest Control',
    icon: '🐛',
    desc: 'Ants, spiders, silverfish, lizards, centipedes — comprehensive treatment for common household pests.',
    startingPrice: 399, originalPrice: 699, duration: 60,
    rating: 4.8, totalBookings: 26700,
    warranty: '3-month warranty',
    method: 'Spray + Gel Treatment',
    safeFor: 'Re-enter after 1 hour',
    inclusions: ['All rooms & bathrooms', 'Kitchen & pantry', 'Balconies', 'Store room', 'Common areas'],
    faq: [{ q: 'Does it cover ants inside kitchen cabinets?', a: 'Yes. All kitchen cabinets, drawers, and food prep areas are treated (non-toxic near food zones).' }],
    isBestseller: false,
  },
  {
    id: 'wood-borer',
    name: 'Wood Borer Control',
    icon: '🪲',
    desc: 'Treatment for wood boring beetles in furniture, floors and door frames using injection method.',
    startingPrice: 699, originalPrice: 1199, duration: 90,
    rating: 4.7, totalBookings: 7200,
    warranty: '1-year warranty',
    method: 'Chemical Injection',
    safeFor: 'Re-enter after 4 hours',
    inclusions: ['Identification of affected wood', 'Chemical injection into galleries', 'Surface spray', 'Affected holes sealed', 'Prevention guidance'],
    faq: [{ q: 'Can furniture be saved after wood borer attack?', a: 'Usually yes, if caught early. Severe infestations may require replacing affected parts.' }],
    isBestseller: false,
  },
];

const AMC_PLANS = [
  { id: '2-service', label: '2 Services / Year', price: 999, original: 1398, savings: 399, perService: 499, coverage: 'Cockroach + General Pest' },
  { id: '4-service', label: '4 Services / Year', price: 1499, original: 2796, savings: 1297, perService: 374, coverage: 'Cockroach, Mosquito, Rodent + General', isPopular: true },
  { id: '6-service', label: '6 Services / Year', price: 1999, original: 4194, savings: 2195, perService: 333, coverage: 'All pests, quarterly visits' },
];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={styles.bsBadge}><Text style={styles.bsTxt}>BESTSELLER</Text></View>}
      {service.isSerious && <View style={[styles.bsBadge, { backgroundColor:'#B71C1C' }]}><Text style={styles.bsTxt}>SERIOUS INFESTATION</Text></View>}
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{service.icon}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{service.name}</Text>
          <Text style={styles.cardDur}>⏱ {service.duration} min  •  🛡️ {service.warranty}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingTxt}>⭐ {service.rating}</Text>
            <Text style={styles.bkTxt}>  {(service.totalBookings/1000).toFixed(1)}k bookings</Text>
          </View>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={styles.methodRow}>
        <View style={styles.methodChip}><Text style={styles.methodTxt}>🧪 {service.method}</Text></View>
        <View style={styles.safeChip}><Text style={styles.safeTxt}>✅ {service.safeFor}</Text></View>
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
          <Text style={[styles.addBtnTxt, inCart && styles.addBtnActiveTxt]}>{inCart ? '✓ Added' : 'Book'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function PestControlScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();

  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'pest_control', duration: service.duration, icon: service.icon });
    Alert.alert('Booked! 🪳', `${service.name} added to cart.`, [
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      { text: 'Continue' },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange:[0,100], outputRange:['transparent','#1B5E20'], extrapolate:'clamp' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width:40 }}>
          <Text style={{ fontSize:22, color:'#fff', fontWeight:'700' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pest Control</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Text style={{ fontSize:22 }}>🛒</Text></TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false })}
        scrollEventThrottle={16}
      >
        <LinearGradient colors={['#1A1A2E','#1B5E20','#2E7D32']} style={styles.hero}>
          <Text style={styles.heroEmoji}>🪳</Text>
          <Text style={styles.heroTitle}>Pest Control at Home</Text>
          <Text style={styles.heroSub}>Certified exterminators • PCAI registered • Eco-safe products</Text>
          <View style={styles.heroStats}>
            {[['4.8★','Rating'],['3 months','Warranty'],['60 min','Avg service']].map(([v,l],i)=>(
              <View key={i} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{v}</Text>
                <Text style={styles.heroStatLbl}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* AMC Plans */}
        <View style={{ marginTop:20 }}>
          <Text style={styles.sectionTitle}>📅 Annual Maintenance Plans</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, gap:14 }}>
            {AMC_PLANS.map(plan => (
              <TouchableOpacity key={plan.id} style={styles.amcCard} onPress={() => Alert.alert('AMC Selected', `${plan.label} — ₹${plan.price}/year`)}>
                <LinearGradient colors={['#1B5E20','#2E7D32']} style={styles.amcGrad}>
                  {plan.isPopular && <View style={styles.popBadge}><Text style={styles.popTxt}>MOST POPULAR</Text></View>}
                  <Text style={styles.amcLabel}>{plan.label}</Text>
                  <Text style={styles.amcCoverage}>{plan.coverage}</Text>
                  <Text style={styles.amcPrice}>₹{plan.price}/yr</Text>
                  <Text style={styles.amcOrig}>₹{plan.original}</Text>
                  <Text style={styles.amcSave}>Save ₹{plan.savings}</Text>
                  <Text style={styles.amcPer}>₹{plan.perService}/visit</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Safety Promise */}
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>🌿 Safe & Eco-Friendly</Text>
          <Text style={styles.safetyDesc}>We use WHO-approved, PCAI-certified chemicals. All products are safe for children, pets and pregnant women after the specified re-entry time.</Text>
        </View>

        <View style={{ padding:16 }}>
          <Text style={styles.sectionTitle}>All Services</Text>
          {PEST_SERVICES.map(s => (
            <ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv)=>{ setDetail(sv); setShowDetail(true); }} />
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
  sectionTitle: { fontSize:18, fontWeight:'800', color:Colors.black, marginHorizontal:16, marginBottom:14 },
  amcCard: { width:180, borderRadius:18, overflow:'hidden' },
  amcGrad: { borderRadius:18, padding:18 },
  popBadge: { backgroundColor:'rgba(255,255,255,0.25)', borderRadius:8, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:3, marginBottom:8 },
  popTxt: { fontSize:9, fontWeight:'800', color:'#fff' },
  amcLabel: { fontSize:14, fontWeight:'700', color:'#fff', marginBottom:4 },
  amcCoverage: { fontSize:11, color:'rgba(255,255,255,0.8)', marginBottom:10, lineHeight:16 },
  amcPrice: { fontSize:22, fontWeight:'900', color:'#fff' },
  amcOrig: { fontSize:13, color:'rgba(255,255,255,0.6)', textDecorationLine:'line-through' },
  amcSave: { fontSize:12, fontWeight:'700', color:'#FFD700', marginTop:4 },
  amcPer: { fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2 },
  safetyCard: { marginHorizontal:16, marginVertical:4, backgroundColor:'#E8F5E9', borderRadius:16, padding:18, borderLeftWidth:4, borderLeftColor:'#2E7D32' },
  safetyTitle: { fontSize:15, fontWeight:'700', color:'#1B5E20', marginBottom:6 },
  safetyDesc: { fontSize:13, color:Colors.gray, lineHeight:18 },
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
  cardDesc: { fontSize:13, color:Colors.gray, lineHeight:18, marginBottom:10 },
  methodRow: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 },
  methodChip: { backgroundColor:'#E3F2FD', borderRadius:10, paddingHorizontal:10, paddingVertical:4 },
  methodTxt: { fontSize:11, fontWeight:'600', color:'#0D47A1' },
  safeChip: { backgroundColor:'#E8F5E9', borderRadius:10, paddingHorizontal:10, paddingVertical:4 },
  safeTxt: { fontSize:11, fontWeight:'600', color:'#1B5E20' },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  startsAt: { fontSize:11, color:Colors.midGray },
  priceRow: { flexDirection:'row', alignItems:'center', gap:8 },
  price: { fontSize:18, fontWeight:'800', color:Colors.black },
  origPrice: { fontSize:13, color:Colors.midGray, textDecorationLine:'line-through' },
  discBadge: { backgroundColor:Colors.successLight, borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  discTxt: { fontSize:11, fontWeight:'700', color:Colors.success },
  addBtn: { backgroundColor:'#E8F5E9', borderRadius:14, paddingHorizontal:22, paddingVertical:10, borderWidth:1.5, borderColor:'#2E7D32' },
  addBtnActive: { backgroundColor:'#2E7D32' },
  addBtnTxt: { fontSize:14, fontWeight:'700', color:'#2E7D32' },
  addBtnActiveTxt: { color:'#fff' },
});
