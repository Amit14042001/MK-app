/**
 * MK App — Car Wash, Home Shifting, Smart Home, Interior Design Screens
 * 4 missing Urban Company service categories
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

// ── Shared service card ───────────────────────────────────────
function ServiceCard({ service, onAdd, color }) {
  const { cartItems } = useCart();
  const inCart = cartItems?.some(i => i.id === service.id);
  const disc = Math.round((1 - service.price / service.originalPrice) * 100);
  return (
    <View style={SS.card}>
      <View style={SS.cardHead}>
        <Text style={SS.cardIcon}>{service.icon}</Text>
        <View style={SS.cardInfo}>
          <Text style={SS.cardName}>{service.name}</Text>
          <Text style={SS.cardMeta}>⏱ {service.duration}  •  ⭐ {service.rating}  •  {(service.totalBookings/1000).toFixed(1)}k bookings</Text>
        </View>
      </View>
      <Text style={SS.cardDesc} numberOfLines={2}>{service.desc}</Text>
      <View style={SS.cardFooter}>
        <View>
          <Text style={SS.startsAt}>Starting at</Text>
          <View style={SS.priceRow}>
            <Text style={SS.price}>₹{service.price}</Text>
            <Text style={SS.origPrice}>₹{service.originalPrice}</Text>
            <View style={[SS.discBadge, { backgroundColor: color + '20' }]}><Text style={[SS.discTxt, { color }]}>{disc}% off</Text></View>
          </View>
        </View>
        <TouchableOpacity style={[SS.addBtn, { borderColor: color }, inCart && { backgroundColor: color }]} onPress={() => onAdd(service)}>
          <Text style={[SS.addBtnTxt, { color }, inCart && { color: '#fff' }]}>{inCart ? '✓' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── 1. Car Wash Screen ────────────────────────────────────────
const CAR_WASH_SERVICES = [
  { id:'basic-wash', name:'Basic Car Wash', icon:'🚿', desc:'Exterior wash, glass cleaning, tyre wash and dashboard wipe at your doorstep.', price:249, originalPrice:399, duration:'45 min', rating:4.7, totalBookings:28400, isBestseller:true },
  { id:'interior-wash', name:'Interior Deep Clean', icon:'🧹', desc:'Seat vacuuming, dashboard cleaning, mat wash, AC vent clean and fragrance.', price:399, originalPrice:699, duration:'90 min', rating:4.8, totalBookings:18200, isBestseller:false },
  { id:'full-detailing', name:'Full Car Detailing', icon:'✨', desc:'Exterior + interior complete detailing with foam wash, polish, wax and odour elimination.', price:799, originalPrice:1299, duration:'3 hours', rating:4.9, totalBookings:8700, isBestseller:false },
  { id:'engine-wash', name:'Engine Bay Cleaning', icon:'⚙️', desc:'Safe engine degreasing and cleaning. Improves cooling and extends engine life.', price:399, originalPrice:699, duration:'60 min', rating:4.7, totalBookings:4200, isBestseller:false },
  { id:'foam-wash', name:'Foam + Pressure Wash', icon:'🫧', desc:'High-pressure foam cannon wash for a scratch-free deep exterior clean.', price:349, originalPrice:599, duration:'60 min', rating:4.8, totalBookings:14800, isBestseller:false },
  { id:'ceramic-coat', name:'Ceramic Coating', icon:'💎', desc:'Professional ceramic coating for 1-2 year paint protection. Scratch and UV resistant.', price:4999, originalPrice:8999, duration:'8 hours', rating:4.9, totalBookings:2100, isBestseller:false },
];

export function CarWashScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const handleAdd = (s) => {
    addToCart({ id:s.id, name:s.name, price:s.price, category:'car_wash', icon:s.icon });
    Alert.alert('Added! 🚗', `${s.name} added.`, [{ text:'View Cart', onPress:()=>navigation.navigate('Cart') }, { text:'Continue' }]);
  };
  return (
    <View style={[SS.screen, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1A1A2E','#1565C0','#42A5F5']} style={SS.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={SS.heroBack}><Text style={SS.heroBackTxt}>←</Text></TouchableOpacity>
        <Text style={SS.heroEmoji}>🚗</Text>
        <Text style={SS.heroTitle}>Car Wash at Doorstep</Text>
        <Text style={SS.heroSub}>Professional detailing • Waterless options • All cars</Text>
        <View style={SS.heroStats}>{[['4.8★','Rating'],['₹249','From'],['45 min','Starts']].map(([v,l],i)=>(<View key={i} style={SS.heroStat}><Text style={SS.heroStatVal}>{v}</Text><Text style={SS.heroStatLbl}>{l}</Text></View>))}</View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding:16, paddingBottom:60 }}>
        <Text style={SS.sectionTitle}>🚗 Car Wash Services</Text>
        {CAR_WASH_SERVICES.map(s => <ServiceCard key={s.id} service={s} onAdd={handleAdd} color="#1565C0" />)}
      </ScrollView>
    </View>
  );
}

// ── 2. Home Shifting / Packers & Movers Screen ────────────────
const SHIFTING_SERVICES = [
  { id:'local-shift', name:'Local House Shifting', icon:'📦', desc:'Complete packing, loading, transport and unloading within the city. Trained movers, GPS-tracked trucks.', price:2999, originalPrice:4999, duration:'4-8 hours', rating:4.7, totalBookings:12400, isBestseller:true },
  { id:'intercity-shift', name:'Intercity Relocation', icon:'🚛', desc:'Safe intercity moving with fully enclosed trucks. Insurance cover included. Door to door.', price:8999, originalPrice:14999, duration:'1-3 days', rating:4.7, totalBookings:4800, isBestseller:false },
  { id:'office-shift', name:'Office Relocation', icon:'🏢', desc:'Complete office moving — furniture, IT equipment, servers. Minimal business disruption.', price:4999, originalPrice:7999, duration:'6-12 hours', rating:4.8, totalBookings:2200, isBestseller:false },
  { id:'packing-only', name:'Packing Only Service', icon:'📫', desc:'Professional packing with bubble wrap, boxes, and fragile item protection. No transport.', price:1499, originalPrice:2499, duration:'2-4 hours', rating:4.7, totalBookings:6700, isBestseller:false },
  { id:'furniture-assembly', name:'Furniture Disassembly & Assembly', icon:'🛋️', desc:'Expert disassembly before move and reassembly at new location. All brands handled.', price:999, originalPrice:1699, duration:'2-4 hours', rating:4.8, totalBookings:8200, isBestseller:false },
  { id:'storage', name:'Storage & Warehousing', icon:'🏪', desc:'Secure climate-controlled storage for 1 week to 6 months. GPS-tracked warehouse.', price:999, originalPrice:1699, duration:'Per week', rating:4.7, totalBookings:3100, isBestseller:false },
];

export function HomeShiftingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const handleAdd = (s) => {
    addToCart({ id:s.id, name:s.name, price:s.price, category:'home_shifting', icon:s.icon });
    Alert.alert('Added! 📦', `${s.name} added. Our team will call to confirm details.`, [{ text:'View Cart', onPress:()=>navigation.navigate('Cart') }, { text:'Continue' }]);
  };
  return (
    <View style={[SS.screen, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1A1A2E','#4A148C','#7B1FA2']} style={SS.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={SS.heroBack}><Text style={SS.heroBackTxt}>←</Text></TouchableOpacity>
        <Text style={SS.heroEmoji}>📦</Text>
        <Text style={SS.heroTitle}>Packers & Movers</Text>
        <Text style={SS.heroSub}>Verified movers • Insurance cover • GPS tracking</Text>
        <View style={SS.heroStats}>{[['4.7★','Rating'],['₹2999','Local from'],['Insured','Moves']].map(([v,l],i)=>(<View key={i} style={SS.heroStat}><Text style={SS.heroStatVal}>{v}</Text><Text style={SS.heroStatLbl}>{l}</Text></View>))}</View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding:16, paddingBottom:60 }}>
        <View style={{ backgroundColor:'#F3E5F5',borderRadius:16,padding:16,marginBottom:16,borderLeftWidth:4,borderLeftColor:'#7B1FA2' }}>
          <Text style={{ fontSize:14,fontWeight:'700',color:'#4A148C',marginBottom:4 }}>📞 Requires Consultation</Text>
          <Text style={{ fontSize:12,color:Colors.gray,lineHeight:18 }}>After booking, our team will call within 2 hours to confirm vehicle size, manpower and final quote.</Text>
        </View>
        <Text style={SS.sectionTitle}>📦 Shifting Services</Text>
        {SHIFTING_SERVICES.map(s => <ServiceCard key={s.id} service={s} onAdd={handleAdd} color="#7B1FA2" />)}
      </ScrollView>
    </View>
  );
}

// ── 3. Smart Home & Automation Screen ────────────────────────
const SMART_HOME_SERVICES = [
  { id:'smart-switches', name:'Smart Switches Installation', icon:'💡', desc:'Replace regular switches with smart ones. Control via phone, Alexa or Google Home.', price:349, originalPrice:599, duration:'45 min', rating:4.9, totalBookings:7200, isBestseller:true },
  { id:'alexa-setup', name:'Alexa / Google Home Setup', icon:'🔊', desc:'Complete Amazon Echo or Google Home setup, device pairing and home automation configuration.', price:299, originalPrice:499, duration:'60 min', rating:4.8, totalBookings:9800, isBestseller:true },
  { id:'video-doorbell', name:'Video Doorbell Install', icon:'🔔', desc:'Install Ring, Eufy or Nest video doorbell with app config and motion alerts setup.', price:499, originalPrice:799, duration:'60 min', rating:4.8, totalBookings:4200, isBestseller:false },
  { id:'smart-tv-wall', name:'Smart TV & Wall Mount', icon:'📺', desc:'TV wall mount installation, soundbar setup, streaming device config and HDMI management.', price:399, originalPrice:699, duration:'60 min', rating:4.8, totalBookings:18400, isBestseller:false },
  { id:'home-theatre', name:'Home Theatre Setup', icon:'🎬', desc:'Complete home theatre installation — projector, speakers, AV receiver, streaming and calibration.', price:999, originalPrice:1699, duration:'3 hours', rating:4.9, totalBookings:2800, isBestseller:false },
  { id:'wifi-mesh', name:'WiFi Mesh & Network Setup', icon:'📶', desc:'Mesh WiFi installation for full home coverage, router placement and parental controls.', price:499, originalPrice:799, duration:'90 min', rating:4.7, totalBookings:6400, isBestseller:false },
  { id:'smart-lock', name:'Smart Lock Installation', icon:'🔐', desc:'Fingerprint / PIN / app-based smart lock installation for main door and bedrooms.', price:499, originalPrice:849, duration:'60 min', rating:4.8, totalBookings:5100, isBestseller:false },
];

export function SmartHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const handleAdd = (s) => {
    addToCart({ id:s.id, name:s.name, price:s.price, category:'smart_home', icon:s.icon });
    Alert.alert('Added! 🏠', `${s.name} added.`, [{ text:'View Cart', onPress:()=>navigation.navigate('Cart') }, { text:'Continue' }]);
  };
  return (
    <View style={[SS.screen, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1A1A2E','#0D47A1','#1565C0']} style={SS.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={SS.heroBack}><Text style={SS.heroBackTxt}>←</Text></TouchableOpacity>
        <Text style={SS.heroEmoji}>🏠</Text>
        <Text style={SS.heroTitle}>Smart Home Setup</Text>
        <Text style={SS.heroSub}>Certified installers • All brands • Demo included</Text>
        <View style={SS.heroStats}>{[['4.8★','Rating'],['₹299','From'],['All Brands','Supported']].map(([v,l],i)=>(<View key={i} style={SS.heroStat}><Text style={SS.heroStatVal}>{v}</Text><Text style={SS.heroStatLbl}>{l}</Text></View>))}</View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding:16, paddingBottom:60 }}>
        <Text style={SS.sectionTitle}>🤖 Smart Home Services</Text>
        {SMART_HOME_SERVICES.map(s => <ServiceCard key={s.id} service={s} onAdd={handleAdd} color="#0D47A1" />)}
      </ScrollView>
    </View>
  );
}

// ── 4. Interior Design Screen ─────────────────────────────────
const INTERIOR_SERVICES = [
  { id:'design-consult', name:'Design Consultation (Free)', icon:'✏️', desc:'30-minute video consultation with an interior designer. Get style advice, mood board and budget plan.', price:0, originalPrice:999, duration:'30 min', rating:4.9, totalBookings:18400, isBestseller:true },
  { id:'false-ceiling', name:'False Ceiling Design', icon:'🔝', desc:'POP / gypsum false ceiling design and installation. Includes LED cove lighting planning.', price:3999, originalPrice:6999, duration:'2-5 days', rating:4.8, totalBookings:4200, isBestseller:false },
  { id:'wallpaper', name:'Wallpaper Installation', icon:'🖼️', desc:'Choose from 500+ designs. Professional installation with precise alignment and bubble-free finish.', price:1499, originalPrice:2499, duration:'1-2 days', rating:4.8, totalBookings:8700, isBestseller:false },
  { id:'furniture-buy', name:'Furniture Sourcing & Setup', icon:'🛋️', desc:'Curated furniture selection based on your space and budget. Delivery and assembly included.', price:1999, originalPrice:3499, duration:'1 week', rating:4.7, totalBookings:2800, isBestseller:false },
  { id:'color-consult', name:'Paint Color Consultation', icon:'🎨', desc:'Expert color scheme selection for each room. Includes sample patches and brand recommendation.', price:499, originalPrice:999, duration:'2 hours', rating:4.9, totalBookings:12100, isBestseller:false },
  { id:'kitchen-design', name:'Modular Kitchen Design', icon:'🍳', desc:'3D kitchen design, material selection, cost estimation and project management.', price:4999, originalPrice:8999, duration:'2-4 weeks', rating:4.8, totalBookings:3600, isBestseller:false },
  { id:'wardrobe-design', name:'Wardrobe Design', icon:'🚪', desc:'Custom wardrobe design with sliding doors, internal accessories and material selection.', price:2999, originalPrice:4999, duration:'1-2 weeks', rating:4.7, totalBookings:4100, isBestseller:false },
];

export function InteriorDesignScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const handleAdd = (s) => {
    if (s.price === 0) {
      Alert.alert('Free Consultation Booked!', 'Our interior designer will call you within 2 hours to schedule your consultation.');
      return;
    }
    addToCart({ id:s.id, name:s.name, price:s.price, category:'interior_design', icon:s.icon });
    Alert.alert('Added! ✏️', `${s.name} added. Our designer team will contact you.`, [{ text:'View Cart', onPress:()=>navigation.navigate('Cart') }, { text:'Continue' }]);
  };
  return (
    <View style={[SS.screen, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#1A1A2E','#b8860b','#DAA520']} style={SS.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={SS.heroBack}><Text style={SS.heroBackTxt}>←</Text></TouchableOpacity>
        <Text style={SS.heroEmoji}>🏡</Text>
        <Text style={SS.heroTitle}>Interior Design</Text>
        <Text style={SS.heroSub}>Award-winning designers • 3D visualization • Fixed prices</Text>
        <View style={SS.heroStats}>{[['4.8★','Rating'],['FREE','Consultation'],['1000+','Projects done']].map(([v,l],i)=>(<View key={i} style={SS.heroStat}><Text style={SS.heroStatVal}>{v}</Text><Text style={SS.heroStatLbl}>{l}</Text></View>))}</View>
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding:16, paddingBottom:60 }}>
        <View style={{ backgroundColor:'#FFFDE7',borderRadius:16,padding:16,marginBottom:16,borderLeftWidth:4,borderLeftColor:'#b8860b' }}>
          <Text style={{ fontSize:14,fontWeight:'700',color:'#b8860b',marginBottom:4 }}>🎁 Free Design Consultation</Text>
          <Text style={{ fontSize:12,color:Colors.gray,lineHeight:18 }}>Start with a FREE 30-minute consultation. Our designer will create a mood board for your space.</Text>
        </View>
        <Text style={SS.sectionTitle}>✏️ Interior Services</Text>
        {INTERIOR_SERVICES.map(s => <ServiceCard key={s.id} service={{ ...s, price: s.price === 0 ? 0 : s.price }} onAdd={handleAdd} color="#b8860b" />)}
      </ScrollView>
    </View>
  );
}

// ── Shared Styles ─────────────────────────────────────────────
const SS = StyleSheet.create({
  screen: { flex:1, backgroundColor:Colors.bg },
  hero: { paddingBottom:32, paddingHorizontal:24, alignItems:'center', paddingTop:16 },
  heroBack: { alignSelf:'flex-start', marginBottom:12 },
  heroBackTxt: { fontSize:22, fontWeight:'700', color:'#fff' },
  heroEmoji: { fontSize:56, marginBottom:12 },
  heroTitle: { fontSize:24, fontWeight:'800', color:'#fff', textAlign:'center' },
  heroSub: { fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:6, textAlign:'center' },
  heroStats: { flexDirection:'row', marginTop:18, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, paddingVertical:12, paddingHorizontal:16, gap:16 },
  heroStat: { alignItems:'center', flex:1 },
  heroStatVal: { fontSize:15, fontWeight:'800', color:'#fff' },
  heroStatLbl: { fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:2 },
  sectionTitle: { fontSize:18, fontWeight:'800', color:Colors.black, marginBottom:14 },
  card: { backgroundColor:'#fff', borderRadius:18, padding:18, marginBottom:14, ...Shadows.card },
  cardHead: { flexDirection:'row', marginBottom:10 },
  cardIcon: { fontSize:32, marginRight:14 },
  cardInfo: { flex:1 },
  cardName: { fontSize:15, fontWeight:'700', color:Colors.black },
  cardMeta: { fontSize:12, color:Colors.midGray, marginTop:3 },
  cardDesc: { fontSize:13, color:Colors.gray, lineHeight:18, marginBottom:12 },
  cardFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  startsAt: { fontSize:11, color:Colors.midGray },
  priceRow: { flexDirection:'row', alignItems:'center', gap:8 },
  price: { fontSize:18, fontWeight:'800', color:Colors.black },
  origPrice: { fontSize:13, color:Colors.midGray, textDecorationLine:'line-through' },
  discBadge: { borderRadius:8, paddingHorizontal:6, paddingVertical:2 },
  discTxt: { fontSize:11, fontWeight:'700' },
  addBtn: { borderRadius:14, paddingHorizontal:22, paddingVertical:10, borderWidth:1.5, backgroundColor:'transparent' },
  addBtnTxt: { fontSize:14, fontWeight:'700' },
});
