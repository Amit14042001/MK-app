/**
 * Slot App — Cleaning Services Screen (Full Production)
 * Deep cleaning, bathroom, kitchen, sofa, water tank, move-in/out
 */
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const CLEANING_SERVICES = [
  { id: 'deep-clean', name: 'Deep Home Cleaning', icon: '🧹', desc: 'Full home deep clean — every room, corner to corner. Ideal for spring cleaning or post-renovation.', startingPrice: 599, originalPrice: 999, duration: 120, rating: 4.9, totalBookings: 42300, warranty: '7-day re-clean guarantee', inclusions: ['All rooms vacuuming', 'Mopping (all floors)', 'Dusting & cobweb removal', 'Kitchen scrubbing', 'Bathroom cleaning', 'Sofa surface wipe', 'Window sill cleaning'], exclusions: ['Inside fridge/oven', 'Carpet shampooing', 'Balcony deep clean'], faq: [{ q: 'How long for 2BHK?', a: '3-4 hours. 3BHK is 4-6 hours.' }], isBestseller: true },
  { id: 'bathroom-clean', name: 'Bathroom Deep Clean', icon: '🚿', desc: 'Tiles, toilet, washbasin, mirrors — professional-grade cleaning. 99% germ removal guaranteed.', startingPrice: 299, originalPrice: 499, duration: 60, rating: 4.8, totalBookings: 31200, warranty: '7-day warranty', inclusions: ['Tiles scrubbing (floor + walls)', 'Toilet disinfection', 'Washbasin & fixtures polish', 'Mirror & glass cleaning', 'Exhaust fan cleaning', 'Anti-fungal treatment'], exclusions: ['Geyser service', 'Plumbing repairs'], faq: [{ q: 'How many bathrooms per booking?', a: 'Price is per bathroom. Add more bathrooms when booking.' }], isBestseller: true },
  { id: 'kitchen-clean', name: 'Kitchen Deep Clean', icon: '🍳', desc: 'Chimney, stove, countertops, tiles, cabinets and sink — full kitchen degreasing.', startingPrice: 399, originalPrice: 699, duration: 90, rating: 4.8, totalBookings: 24800, warranty: '7-day guarantee', inclusions: ['Chimney external clean', 'Stove & burner scrubbing', 'Tiles degreasing', 'Counter & slab clean', 'Cabinet exteriors', 'Sink & fixtures polish'], exclusions: ['Inside cabinets', 'Chimney deep service (book separately)'], faq: [{ q: 'Do you clean inside the chimney?', a: 'No. Inside chimney service is a separate booking under Appliance Repair.' }], isBestseller: false },
  { id: 'sofa-cleaning', name: 'Sofa & Upholstery Cleaning', icon: '🛋️', desc: 'Dry foam or steam cleaning for sofas, chairs, mattresses and curtains.', startingPrice: 399, originalPrice: 699, duration: 90, rating: 4.7, totalBookings: 18200, warranty: '3-day guarantee', inclusions: ['Dry foam or steam clean', 'Stain treatment', 'Deodorizing', 'Cushion clean', 'Drying (2-3 hours)'], exclusions: ['Leather sofas (different process)', 'Curtain dry clean'], faq: [{ q: 'How long to dry after cleaning?', a: '2-4 hours. We recommend air circulation during drying.' }], isBestseller: false },
  { id: 'water-tank', name: 'Water Tank Cleaning', icon: '💧', desc: 'Underground, overhead and sump tank cleaning. Removes algae, sediment and bacterial contamination.', startingPrice: 499, originalPrice: 899, duration: 90, rating: 4.8, totalBookings: 14300, warranty: '6-month warranty', inclusions: ['Tank draining', 'Manual scrubbing', 'High-pressure jet wash', 'Disinfection (food-grade chlorine)', 'Refill & water quality check'], exclusions: ['Plumbing repairs', 'Pipe cleaning'], faq: [{ q: 'How often should tank be cleaned?', a: 'Every 6 months for overhead tanks. Every 3 months for underground.' }], isBestseller: false },
  { id: 'carpet-cleaning', name: 'Carpet & Rug Shampoo', icon: '🪄', desc: 'Professional carpet shampooing with hot water extraction. Removes deep stains, dust mites and odors.', startingPrice: 349, originalPrice: 599, duration: 60, rating: 4.7, totalBookings: 9800, warranty: '3-day guarantee', inclusions: ['Vacuum pre-clean', 'Shampoo application', 'Machine extraction', 'Spot stain treatment', 'Deodorizing'], exclusions: ['Persian/silk rugs (specialist needed)', 'Carpet repair'], faq: [{ q: 'Will carpet be wet after cleaning?', a: 'Slightly damp for 2-4 hours. Open windows for faster drying.' }], isBestseller: false },
  { id: 'move-in-clean', name: 'Move In / Move Out Cleaning', icon: '📦', desc: 'Complete property cleaning before moving in or after moving out. Satisfies landlords and gets deposits back.', startingPrice: 999, originalPrice: 1699, duration: 180, rating: 4.9, totalBookings: 8200, warranty: '48-hour guarantee', inclusions: ['All rooms deep clean', 'Bathrooms & kitchen', 'Inside cabinets', 'Balcony & terrace', 'Window cleaning (accessible)', 'Fan & fixture cleaning', 'Debris removal'], exclusions: ['Painting', 'Pest control', 'Plumbing'], faq: [{ q: 'Can this help get my deposit back?', a: 'Yes. Most landlords accept our cleaning certificate for deposit return.' }], isBestseller: false, isSpecial: true },
  { id: 'office-cleaning', name: 'Office / Commercial Cleaning', icon: '🏢', desc: 'Regular or one-time office cleaning — workstations, floors, restrooms, meeting rooms.', startingPrice: 699, originalPrice: 1199, duration: 120, rating: 4.8, totalBookings: 6400, warranty: '7-day guarantee', inclusions: ['Workstation dusting', 'Floor mopping', 'Restroom cleaning', 'Pantry & kitchen', 'Trash disposal', 'Glass & partition cleaning'], exclusions: ['Exterior windows', 'Server room', 'Specialized equipment'], faq: [{ q: 'Do you offer recurring office cleaning?', a: 'Yes. Daily, weekly and bi-weekly contracts available at 20% discount.' }], isBestseller: false },
];

const SUBSCRIPTION_PLANS = [
  { id: 'weekly', label: 'Weekly Plan', sessions: 4, price: 1599, original: 2396, savings: 797, perSession: 399, color: ['#1565C0', '#0D47A1'] },
  { id: 'biweekly', label: 'Bi-Weekly Plan', sessions: 2, price: 999, original: 1198, savings: 199, perSession: 499, color: ['#1B5E20', '#2E7D32'], isPopular: true },
  { id: 'monthly', label: 'Monthly Plan', sessions: 1, price: 549, original: 599, savings: 50, perSession: 549, color: ['#4A148C', '#7B1FA2'] },
];

function ServiceCard({ service, onAdd, onPress }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.startingPrice / service.originalPrice) * 100);
  return (
    <TouchableOpacity style={S.card} onPress={() => onPress(service)} activeOpacity={0.93}>
      {service.isBestseller && <View style={S.bsBadge}><Text style={S.bsBadgeText}>BESTSELLER</Text></View>}
      {service.isSpecial && <View style={[S.bsBadge, { backgroundColor: '#b8860b' }]}><Text style={S.bsBadgeText}>SPECIAL</Text></View>}
      <View style={S.cardHead}><Text style={S.cardIcon}>{service.icon}</Text>
        <View style={S.cardMeta}><Text style={S.cardName}>{service.name}</Text>
          <Text style={S.cardDur}>⏱ {service.duration} min  •  🛡️ {service.warranty}</Text>
          <View style={S.ratingRow}><Text style={S.ratingTxt}>⭐ {service.rating}</Text><Text style={S.bkTxt}>  {(service.totalBookings/1000).toFixed(1)}k bookings</Text></View>
        </View>
      </View>
      <Text style={S.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={S.cardFooter}>
        <View><Text style={S.startsAt}>Starts at</Text>
          <View style={S.priceRow}><Text style={S.price}>₹{service.startingPrice}</Text><Text style={S.origPrice}>₹{service.originalPrice}</Text>
            <View style={S.discBadge}><Text style={S.discTxt}>{disc}% off</Text></View>
          </View>
        </View>
        <TouchableOpacity style={[S.addBtn, inCart && S.addBtnActive]} onPress={() => onAdd(service)}>
          <Text style={[S.addBtnTxt, inCart && S.addBtnActiveTxt]}>{inCart ? '✓ Added' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CleaningScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();
  const FILTERS = [{ key:'all',label:'All' },{ key:'home',label:'Home' },{ key:'spot',label:'Spot Clean' },{ key:'commercial',label:'Commercial' }];
  const filtered = CLEANING_SERVICES.filter(s => filter==='all' || (filter==='home' && ['deep-clean','bathroom-clean','kitchen-clean','move-in-clean'].includes(s.id)) || (filter==='spot' && ['sofa-cleaning','carpet-cleaning','water-tank'].includes(s.id)) || (filter==='commercial' && s.id==='office-cleaning'));
  const handleAdd = (service) => {
    addToCart({ id: service.id, name: service.name, price: service.startingPrice, category: 'cleaning', duration: service.duration, icon: service.icon });
    Alert.alert('Added! 🧹', `${service.name} added.`, [{ text: 'View Cart', onPress: () => navigation.navigate('Cart') }, { text: 'Continue' }]);
  };
  const headerBg = scrollY.interpolate({ inputRange:[0,100], outputRange:['transparent','#1565C0'], extrapolate:'clamp' });
  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[S.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width:40 }}><Text style={{ fontSize:22, color:'#fff', fontWeight:'700' }}>←</Text></TouchableOpacity>
        <Text style={S.headerTitle}>Cleaning Services</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}><Text style={{ fontSize:22 }}>🛒</Text></TouchableOpacity>
      </Animated.View>
      <Animated.ScrollView showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false })} scrollEventThrottle={16}>
        <LinearGradient colors={['#1A1A2E','#1565C0','#0D47A1']} style={S.hero}>
          <Text style={S.heroEmoji}>🧹</Text>
          <Text style={S.heroTitle}>Cleaning at Your Doorstep</Text>
          <Text style={S.heroSub}>Professional cleaners • Eco-safe products • 7-day guarantee</Text>
          <View style={S.heroStats}>
            {[['4.9★','Rating'],['₹599','From'],['7 days','Warranty']].map(([v,l],i) => (
              <View key={i} style={S.heroStat}><Text style={S.heroStatVal}>{v}</Text><Text style={S.heroStatLbl}>{l}</Text></View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ marginTop:20 }}>
          <Text style={S.sectionTitle}>📅 Recurring Cleaning Plans</Text>
          <Text style={S.sectionSub}>Save 15-30% on regular cleans</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, gap:14 }}>
            {SUBSCRIPTION_PLANS.map(plan => (
              <TouchableOpacity key={plan.id} style={S.planCard} onPress={() => Alert.alert(plan.label, `₹${plan.price}/month — ${plan.sessions} session${plan.sessions>1?'s':''} added!`)}>
                <LinearGradient colors={plan.color} style={S.planGrad}>
                  {plan.isPopular && <View style={S.popularBadge}><Text style={{ fontSize:9, fontWeight:'800', color:'#fff' }}>POPULAR</Text></View>}
                  <Text style={S.planLabel}>{plan.label}</Text>
                  <Text style={S.planSessions}>{plan.sessions} clean{plan.sessions>1?'s':''}/month</Text>
                  <Text style={S.planPrice}>₹{plan.price}<Text style={{ fontSize:12 }}>/mo</Text></Text>
                  <Text style={S.planOrig}>₹{plan.original}</Text>
                  <Text style={S.planSave}>Save ₹{plan.savings}</Text>
                  <Text style={S.planPer}>₹{plan.perSession}/session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:20 }} contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[S.filterChip, filter===f.key && S.filterChipActive]} onPress={() => setFilter(f.key)}>
              <Text style={[S.filterTxt, filter===f.key && S.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding:16 }}>
          <Text style={S.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s => (<ServiceCard key={s.id} service={s} onAdd={handleAdd} onPress={(sv) => { setDetail(sv); setShowDetail(true); }} />))}
        </View>

        <View style={S.safetyCard}>
          <Text style={S.safetyTitle}>🌿 Eco-Safe Cleaning</Text>
          <Text style={S.safetyText}>We use PETA-certified, pet-safe and child-safe cleaning products. All cleaners are background verified and carry photo ID. Satisfaction guaranteed or free re-clean.</Text>
        </View>
        <View style={{ height:80 }} />
      </Animated.ScrollView>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetail(false)}>
        {detail && (
          <View style={S.modal}>
            <View style={S.modalBar}>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={S.closeBtn}><Text style={{ fontSize:16, color:Colors.gray }}>✕</Text></TouchableOpacity>
              <Text style={S.modalBarTitle}>{detail.name}</Text>
              <View style={{ width:36 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <LinearGradient colors={['#1A1A2E','#1565C0']} style={{ padding:28, alignItems:'center' }}>
                <Text style={{ fontSize:52, marginBottom:10 }}>{detail.icon}</Text>
                <Text style={{ fontSize:22, fontWeight:'800', color:'#fff', textAlign:'center' }}>{detail.name}</Text>
                <Text style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:6 }}>⭐ {detail.rating}  •  {(detail.totalBookings/1000).toFixed(1)}k bookings  •  {detail.warranty}</Text>
              </LinearGradient>
              <View style={{ padding:20 }}>
                <Text style={{ fontSize:14, color:Colors.gray, lineHeight:20, marginBottom:16 }}>{detail.desc}</Text>
                <Text style={{ fontSize:15, fontWeight:'700', color:Colors.black, marginBottom:10 }}>What's Included</Text>
                {detail.inclusions.map((item,i) => (<View key={i} style={{ flexDirection:'row', marginBottom:8 }}><Text style={{ color:Colors.success, fontWeight:'700', marginRight:10 }}>✓</Text><Text style={{ flex:1, fontSize:14, color:Colors.gray }}>{item}</Text></View>))}
                <Text style={{ fontSize:15, fontWeight:'700', color:Colors.black, marginBottom:10, marginTop:8 }}>What's Not Included</Text>
                {detail.exclusions.map((item,i) => (<View key={i} style={{ flexDirection:'row', marginBottom:8 }}><Text style={{ color:Colors.error, fontWeight:'700', marginRight:10 }}>✗</Text><Text style={{ flex:1, fontSize:14, color:Colors.gray }}>{item}</Text></View>))}
                {detail.faq.map((item,i) => (<View key={i} style={{ backgroundColor:Colors.offWhite, borderRadius:12, padding:14, marginBottom:12 }}><Text style={{ fontSize:14, fontWeight:'700', color:Colors.black, marginBottom:6 }}>{item.q}</Text><Text style={{ fontSize:13, color:Colors.gray }}>{item.a}</Text></View>))}
              </View>
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderTopWidth:1, borderTopColor:Colors.offWhite, backgroundColor:'#fff' }}>
              <View><Text style={{ fontSize:12, color:Colors.midGray }}>Starting at</Text><Text style={{ fontSize:22, fontWeight:'800', color:Colors.black }}>₹{detail.startingPrice}</Text></View>
              <TouchableOpacity style={{ backgroundColor:'#1565C0', borderRadius:14, paddingHorizontal:28, paddingVertical:14 }} onPress={() => { handleAdd(detail); setShowDetail(false); }}><Text style={{ fontSize:15, fontWeight:'700', color:'#fff' }}>Add to Cart</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex:1, backgroundColor:Colors.bg },
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
  sectionTitle: { fontSize:18, fontWeight:'800', color:Colors.black, marginHorizontal:16, marginBottom:4 },
  sectionSub: { fontSize:13, color:Colors.midGray, marginHorizontal:16, marginBottom:14 },
  planCard: { width:175, borderRadius:18, overflow:'hidden' },
  planGrad: { borderRadius:18, padding:18 },
  popularBadge: { backgroundColor:'rgba(255,255,255,0.25)', borderRadius:8, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:3, marginBottom:8 },
  planLabel: { fontSize:14, fontWeight:'700', color:'#fff', marginBottom:4 },
  planSessions: { fontSize:11, color:'rgba(255,255,255,0.8)', marginBottom:8 },
  planPrice: { fontSize:22, fontWeight:'900', color:'#fff' },
  planOrig: { fontSize:13, color:'rgba(255,255,255,0.6)', textDecorationLine:'line-through' },
  planSave: { fontSize:12, fontWeight:'700', color:'#FFD700', marginTop:4 },
  planPer: { fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:2 },
  filterChip: { paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor:'#fff', borderWidth:1, borderColor:Colors.lightGray },
  filterChipActive: { backgroundColor:'#1565C0', borderColor:'#1565C0' },
  filterTxt: { fontSize:13, fontWeight:'600', color:Colors.gray },
  filterTxtActive: { color:'#fff' },
  card: { backgroundColor:'#fff', borderRadius:20, padding:18, marginBottom:16, ...Shadows.card, overflow:'hidden' },
  bsBadge: { position:'absolute', top:14, right:14, backgroundColor:Colors.primary, borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  bsBadgeText: { fontSize:9, fontWeight:'800', color:'#fff' },
  cardHead: { flexDirection:'row', marginBottom:10 },
  cardIcon: { fontSize:36, marginRight:14 },
  cardMeta: { flex:1 },
  cardName: { fontSize:15, fontWeight:'700', color:Colors.black },
  cardDur: { fontSize:11, color:Colors.midGray, marginTop:3 },
  ratingRow: { flexDirection:'row', marginTop:4 },
  ratingTxt: { fontSize:13, fontWeight:'600', color:Colors.black },
  bkTxt: { fontSize:12, color:Colors.midGray },
  cardDesc: { fontSize:13, color:Colors.gray, lineHeight:18, marginBottom:12 },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  startsAt: { fontSize:11, color:Colors.midGray },
  priceRow: { flexDirection:'row', alignItems:'center', gap:8 },
  price: { fontSize:18, fontWeight:'800', color:Colors.black },
  origPrice: { fontSize:13, color:Colors.midGray, textDecorationLine:'line-through' },
  discBadge: { backgroundColor:Colors.successLight, borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  discTxt: { fontSize:11, fontWeight:'700', color:Colors.success },
  addBtn: { backgroundColor:'#E3F2FD', borderRadius:14, paddingHorizontal:22, paddingVertical:10, borderWidth:1.5, borderColor:'#1565C0' },
  addBtnActive: { backgroundColor:'#1565C0' },
  addBtnTxt: { fontSize:14, fontWeight:'700', color:'#1565C0' },
  addBtnActiveTxt: { color:'#fff' },
  safetyCard: { margin:16, backgroundColor:'#E3F2FD', borderRadius:16, padding:18 },
  safetyTitle: { fontSize:15, fontWeight:'700', color:'#1565C0', marginBottom:6 },
  safetyText: { fontSize:13, color:Colors.gray, lineHeight:18 },
  modal: { flex:1, backgroundColor:Colors.bg },
  modalBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  closeBtn: { width:36, height:36, borderRadius:18, backgroundColor:Colors.offWhite, justifyContent:'center', alignItems:'center' },
  modalBarTitle: { fontSize:16, fontWeight:'700', color:Colors.black, flex:1, textAlign:'center' },
});
