/**
 * Category-specific service screens — mirrors Urban Company's dedicated category pages
 * Each has: hero, featured services grid, benefits, testimonials
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { servicesAPI } from '../../utils/api';

// ── Generic Category Page ──────────────────────────────────────
function CategoryPage({ config, navigation }) {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    servicesAPI.getByCategory(config.slug)
      .then(({ data }) => setServices(data.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [config.slug]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={config.gradient} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize:22, color:'#fff', fontWeight:'600' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>{config.icon}</Text>
          <Text style={styles.heroTitle}>{config.title}</Text>
          <Text style={styles.heroSub}>{config.subtitle}</Text>
          <View style={styles.heroStats}>
            {config.stats.map(s => (
              <View key={s.label} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{s.val}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Benefits */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding:Spacing.base, gap:12 }}>
          {config.benefits.map(b => (
            <View key={b.title} style={styles.benefitCard}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitSub}>{b.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Services */}
        <View style={{ padding:Spacing.base }}>
          <Text style={styles.sectionTitle}>{config.servicesLabel || 'Available Services'}</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ padding:40 }} />
          ) : services.length === 0 ? (
            /* Show mock services if API not seeded */
            config.mockServices?.map(svc => (
              <TouchableOpacity key={svc.name}
                onPress={() => navigation.navigate('ServiceDetail', { serviceId: svc.slug || svc.name.toLowerCase().replace(/ /g,'-') })}
                style={styles.serviceCard} activeOpacity={0.85}>
                <View style={styles.serviceCardLeft}>
                  <Text style={styles.serviceCardIcon}>{svc.icon}</Text>
                </View>
                <View style={styles.serviceCardInfo}>
                  <Text style={styles.serviceCardName}>{svc.name}</Text>
                  <View style={styles.serviceCardMeta}>
                    <Text style={styles.serviceCardRating}>★ {svc.rating || 4.8}</Text>
                    <Text style={styles.serviceCardReviews}>({svc.reviews || '2.1K'})</Text>
                    {svc.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
                  </View>
                  <Text style={styles.serviceCardDesc} numberOfLines={1}>{svc.desc}</Text>
                </View>
                <View style={styles.serviceCardRight}>
                  <Text style={styles.serviceCardPrice}>₹{svc.price}</Text>
                  <Text style={styles.serviceCardPriceSub}>onwards</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            services.map(svc => (
              <TouchableOpacity key={svc._id}
                onPress={() => navigation.navigate('ServiceDetail', { serviceId: svc.slug || svc._id })}
                style={styles.serviceCard} activeOpacity={0.85}>
                <View style={styles.serviceCardLeft}>
                  <Text style={styles.serviceCardIcon}>{svc.icon}</Text>
                </View>
                <View style={styles.serviceCardInfo}>
                  <Text style={styles.serviceCardName}>{svc.name}</Text>
                  <View style={styles.serviceCardMeta}>
                    <Text style={styles.serviceCardRating}>★ {svc.rating || 4.8}</Text>
                    <Text style={styles.serviceCardReviews}>({svc.totalRatings?.toLocaleString() || '1K+'})</Text>
                  </View>
                </View>
                <View style={styles.serviceCardRight}>
                  <Text style={styles.serviceCardPrice}>₹{svc.startingPrice}</Text>
                  <Text style={styles.serviceCardPriceSub}>onwards</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* How it works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          {[
            { step:'1', text:`Book any ${config.title.split(' ')[0]} service in 60 seconds` },
            { step:'2', text:'Certified expert arrives at your doorstep on time' },
            { step:'3', text:'Service done to perfection. Rate your experience' },
          ].map(item => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{item.step}</Text></View>
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── CATEGORY CONFIGURATIONS ────────────────────────────────────
const CONFIGS = {
  beauty: {
    slug: 'beauty', title: 'Salon at Home', icon: '💄',
    gradient: ['#1A1A2E', '#880E4F'],
    subtitle: 'Professional salon services at your doorstep — waxing, facial, haircut & more',
    stats: [{ val:'4.9★', label:'Avg Rating' }, { val:'50K+', label:'Bookings' }, { val:'30 min', label:'Arrival' }],
    benefits: [
      { icon:'💄', title:'Trained Beauticians', sub:'10+ certified pros' },
      { icon:'🧴', title:'Branded Products', sub:'L\'Oréal, O3+, Wella' },
      { icon:'🏠', title:'At Your Home', sub:'No salon needed' },
      { icon:'⏰', title:'On-Demand', sub:'Same day slots' },
    ],
    servicesLabel: 'Salon Services',
    mockServices: [
      { icon:'💆', name:'Facial & Cleanup', price:399, rating:4.9, reviews:'4.2K', popular:true, desc:'Deep cleansing, de-tan, anti-aging facials' },
      { icon:'💅', name:'Waxing (Full Body)', price:499, rating:4.8, reviews:'3.1K', desc:'Rica wax, full legs, arms, underarms' },
      { icon:'✂️', name:'Haircut & Styling', price:299, rating:4.8, reviews:'2.8K', desc:'Cut, blow dry, hair wash' },
      { icon:'💇', name:'Hair Color & Highlights', price:799, rating:4.7, reviews:'1.9K', desc:'Global color, highlights, balayage' },
      { icon:'🧖', name:'Full Body Massage', price:699, rating:4.9, reviews:'3.5K', popular:true, desc:'Swedish, deep tissue, aromatherapy' },
      { icon:'👁️', name:'Eyebrow Threading & Tint', price:149, rating:4.8, reviews:'5.1K', desc:'Threading, tinting, shaping' },
    ],
  },
  cleaning: {
    slug: 'cleaning', title: 'Home Cleaning', icon: '🧹',
    gradient: ['#1A1A2E', '#1B5E20'],
    subtitle: 'Professional deep cleaning, bathroom cleaning, sofa cleaning & more',
    stats: [{ val:'4.8★', label:'Rating' }, { val:'30K+', label:'Homes Cleaned' }, { val:'2-4 hrs', label:'Duration' }],
    benefits: [
      { icon:'🧹', title:'Eco-friendly Products', sub:'Safe for kids & pets' },
      { icon:'🛡️', title:'Insured Professionals', sub:'Fully background verified' },
      { icon:'📋', title:'Checklist-based', sub:'Nothing missed' },
      { icon:'🔄', title:'Re-clean Guarantee', sub:'Free if not satisfied' },
    ],
    mockServices: [
      { icon:'🏠', name:'Home Deep Cleaning', price:1499, rating:4.8, reviews:'6.2K', popular:true, desc:'Full home — kitchen, bathrooms, all rooms' },
      { icon:'🚿', name:'Bathroom Deep Cleaning', price:249, rating:4.9, reviews:'8.1K', popular:true, desc:'Tiles, commode, sink, exhaust' },
      { icon:'🛋️', name:'Sofa Cleaning', price:399, rating:4.8, reviews:'3.4K', desc:'Vacuuming, stain removal, sanitization' },
      { icon:'🪟', name:'Window Cleaning', price:299, rating:4.7, reviews:'2.1K', desc:'Interior + exterior glass, frame cleaning' },
      { icon:'🍳', name:'Kitchen Deep Cleaning', price:699, rating:4.8, reviews:'4.8K', desc:'Hob, chimney, tiles, cabinets' },
      { icon:'🦟', name:'Pest Control', price:599, rating:4.6, reviews:'2.9K', desc:'Cockroach, ants, termite, rodent control' },
    ],
  },
  electrician: {
    slug: 'electrician', title: 'Electrician', icon: '⚡',
    gradient: ['#1A1A2E', '#F57F17'],
    subtitle: 'Licensed electricians for all home electrical work — repairs, installations & more',
    stats: [{ val:'4.8★', label:'Rating' }, { val:'Licensed', label:'All Pros' }, { val:'Same Day', label:'Available' }],
    benefits: [
      { icon:'⚡', title:'Licensed Electricians', sub:'Government certified' },
      { icon:'🛡️', title:'Work Warranty', sub:'30-day guarantee' },
      { icon:'📋', title:'Transparent Pricing', sub:'No surprise charges' },
      { icon:'🔧', title:'All Repairs', sub:'Any brand, any issue' },
    ],
    mockServices: [
      { icon:'💡', name:'Light/Fan Installation', price:149, rating:4.8, reviews:'9.1K', popular:true, desc:'Install fans, lights, switches, sockets' },
      { icon:'🔌', name:'Wiring & Rewiring', price:399, rating:4.7, reviews:'3.2K', desc:'New wiring, extension, faulty wire repair' },
      { icon:'⚡', name:'MCB/DB Work', price:299, rating:4.8, reviews:'2.1K', desc:'MCB replacement, new DB, load balancing' },
      { icon:'🔧', name:'Switchboard Repair', price:199, rating:4.9, reviews:'5.4K', desc:'Faulty switch, socket repair/replacement' },
      { icon:'🏠', name:'Full Home Electrical Audit', price:499, rating:4.8, reviews:'1.8K', desc:'Safety check, report, recommendations' },
      { icon:'🌞', name:'Solar Panel Work', price:999, rating:4.7, reviews:'980', desc:'Installation, repair, maintenance' },
    ],
  },
  plumber: {
    slug: 'plumbing', title: 'Plumber', icon: '🪛',
    gradient: ['#1A1A2E', '#0D47A1'],
    subtitle: 'Expert plumbers for leaks, pipe repairs, bathroom fittings & more',
    stats: [{ val:'4.8★', label:'Rating' }, { val:'24/7', label:'Emergency' }, { val:'1 hr', label:'Response' }],
    benefits: [
      { icon:'🪛', title:'Expert Plumbers', sub:'10+ yrs experience avg' },
      { icon:'⚡', title:'Fast Response', sub:'Same-hour for emergencies' },
      { icon:'🔧', title:'All Brands', sub:'Jaquar, Kohler, Hindware' },
      { icon:'💰', title:'Fixed Rates', sub:'Pay only what you see' },
    ],
    mockServices: [
      { icon:'💧', name:'Tap/Faucet Repair', price:149, rating:4.8, reviews:'7.2K', popular:true, desc:'Leaking, dripping, replace tap' },
      { icon:'🚿', name:'Geyser Repair', price:299, rating:4.9, reviews:'5.1K', popular:true, desc:'No hot water, thermostat, heating element' },
      { icon:'🚽', name:'Toilet Repair', price:199, rating:4.8, reviews:'4.3K', desc:'Flush, seat, blockage, leaking' },
      { icon:'🔧', name:'Pipe Repair & Replacement', price:349, rating:4.7, reviews:'3.1K', desc:'Leaking, burst, corroded pipes' },
      { icon:'🛁', name:'Bathroom Fitting', price:499, rating:4.8, reviews:'2.4K', desc:'New shower, bathtub, sink installation' },
      { icon:'🌊', name:'Drain Unblocking', price:249, rating:4.9, reviews:'6.8K', desc:'Kitchen sink, bathroom, floor drain' },
    ],
  },
  painting: {
    slug: 'painting', title: 'Home Painting', icon: '🎨',
    gradient: ['#1A1A2E', '#4A148C'],
    subtitle: 'Professional interior & exterior painting with premium paints',
    stats: [{ val:'4.7★', label:'Rating' }, { val:'Asian Paints', label:'Partner' }, { val:'3 yr', label:'Warranty' }],
    benefits: [
      { icon:'🎨', title:'Asian Paints Partner', sub:'Premium paints only' },
      { icon:'🛡️', title:'3-Year Warranty', sub:'On all wall painting' },
      { icon:'📐', title:'Free Estimation', sub:'Quote in 30 mins' },
      { icon:'✨', title:'Anti-fungal Coat', sub:'Long-lasting finish' },
    ],
    mockServices: [
      { icon:'🏠', name:'Full Home Painting', price:8999, rating:4.8, reviews:'3.2K', popular:true, desc:'Interior walls, ceiling, per sq ft pricing' },
      { icon:'🛋️', name:'Single Room Painting', price:1999, rating:4.7, reviews:'5.6K', popular:true, desc:'Any room up to 120 sq ft' },
      { icon:'🎨', name:'Texture/Design Painting', price:3999, rating:4.9, reviews:'1.8K', desc:'Stencil, metallic, 3D texture designs' },
      { icon:'🏗️', name:'Exterior Painting', price:12999, rating:4.7, reviews:'980', desc:'Weather-proof exterior emulsion' },
      { icon:'🪵', name:'Wood Polishing', price:1499, rating:4.8, reviews:'2.1K', desc:'Doors, furniture, shelves polishing' },
      { icon:'🚪', name:'Door/Window Painting', price:499, rating:4.7, reviews:'3.4K', desc:'Per door/window, all types' },
    ],
  },
  pestcontrol: {
    slug: 'pest-control', title: 'Pest Control', icon: '🦟',
    gradient: ['#1A1A2E', '#33691E'],
    subtitle: 'Certified pest control for cockroaches, termites, rodents & more',
    stats: [{ val:'4.7★', label:'Rating' }, { val:'Certified', label:'Chemicals' }, { val:'3 Month', label:'Warranty' }],
    benefits: [
      { icon:'🛡️', title:'Government Certified', sub:'Approved chemicals only' },
      { icon:'✅', title:'Child & Pet Safe', sub:'No harmful residue' },
      { icon:'🔄', title:'3-Month Warranty', sub:'Free re-treatment' },
      { icon:'📋', title:'Inspection Report', sub:'Detailed findings' },
    ],
    mockServices: [
      { icon:'🪲', name:'Cockroach Control', price:399, rating:4.7, reviews:'8.2K', popular:true, desc:'Gel treatment, residual spray, 3-month warranty' },
      { icon:'🐀', name:'Rodent Control', price:699, rating:4.6, reviews:'3.1K', desc:'Traps, bait stations, entry point sealing' },
      { icon:'🐜', name:'Ant Treatment', price:299, rating:4.8, reviews:'4.5K', desc:'Gel bait + spray, all ant species' },
      { icon:'🦟', name:'Mosquito Treatment', price:499, rating:4.7, reviews:'5.6K', desc:'Fogging, larvicide, breeding spot treatment' },
      { icon:'🪲', name:'Termite Treatment', price:2999, rating:4.8, reviews:'2.1K', desc:'Chemical barrier, bait system, 1-year warranty' },
      { icon:'🏠', name:'Full Home Pest Control', price:1499, rating:4.7, reviews:'6.8K', popular:true, desc:'All pests, all rooms, 3-month warranty' },
    ],
  },
  appliance: {
    slug: 'appliance-repair', title: 'Appliance Repair', icon: '🔧',
    gradient: ['#1A1A2E', '#006064'],
    subtitle: 'Expert repairs for AC, washing machine, fridge, TV & all appliances',
    stats: [{ val:'4.8★', label:'Rating' }, { val:'All Brands', label:'Covered' }, { val:'90 Day', label:'Warranty' }],
    benefits: [
      { icon:'🔧', title:'All Brands', sub:'Samsung, LG, Whirlpool...' },
      { icon:'🛡️', title:'90-Day Warranty', sub:'On all repairs' },
      { icon:'🔩', title:'Original Spares', sub:'Genuine parts only' },
      { icon:'⚡', title:'Same Day Repair', sub:'Most issues fixed on-site' },
    ],
    mockServices: [
      { icon:'❄️', name:'AC Service & Repair', price:299, rating:4.9, reviews:'12K', popular:true, desc:'Service, gas refill, PCB repair, all brands' },
      { icon:'🧺', name:'Washing Machine Repair', price:249, rating:4.8, reviews:'7.4K', popular:true, desc:'Not spinning, not draining, error codes' },
      { icon:'🧊', name:'Refrigerator Repair', price:349, rating:4.8, reviews:'6.2K', desc:'Not cooling, compressor, thermostat, water leaks' },
      { icon:'📺', name:'TV Repair', price:299, rating:4.7, reviews:'4.3K', desc:'LED, LCD, OLED — screen, board, remote' },
      { icon:'♨️', name:'Microwave Repair', price:199, rating:4.8, reviews:'3.1K', desc:'Turntable, door, heating element, display' },
      { icon:'💨', name:'Air Cooler Repair', price:179, rating:4.7, reviews:'2.8K', desc:'Pump, motor, cooling pads replacement' },
    ],
  },
  fitness: {
    slug: 'fitness', title: 'Fitness at Home', icon: '💪',
    gradient: ['#1A1A2E', '#B71C1C'],
    subtitle: 'Personal trainers, yoga instructors & nutritionists at your home',
    stats: [{ val:'4.9★', label:'Rating' }, { val:'Certified', label:'All Trainers' }, { val:'1-on-1', label:'Sessions' }],
    benefits: [
      { icon:'💪', title:'Certified Trainers', sub:'ACSM, ACE, NSCA certified' },
      { icon:'🏠', title:'At Your Home', sub:'No gym membership needed' },
      { icon:'📊', title:'Personalized Plans', sub:'Diet + workout customized' },
      { icon:'📱', title:'Progress Tracking', sub:'Weekly check-ins' },
    ],
    mockServices: [
      { icon:'💪', name:'Personal Training', price:799, rating:4.9, reviews:'3.2K', popular:true, desc:'Weight loss, muscle gain, strength training' },
      { icon:'🧘', name:'Yoga at Home', price:499, rating:4.9, reviews:'5.6K', popular:true, desc:'Hatha, Vinyasa, Ashtanga, Prenatal yoga' },
      { icon:'🥗', name:'Nutrition Consultation', price:699, rating:4.8, reviews:'2.1K', desc:'Diet plan, macro tracking, weight management' },
      { icon:'🏃', name:'Zumba / Dance Fitness', price:599, rating:4.8, reviews:'1.8K', desc:'Bollywood, Zumba, aerobics sessions' },
      { icon:'🧘', name:'Meditation & Mindfulness', price:399, rating:4.9, reviews:'1.4K', desc:'Guided meditation, stress relief, breathing' },
      { icon:'👶', name:'Pre/Postnatal Fitness', price:899, rating:4.9, reviews:'980', desc:'Safe pregnancy workouts, postnatal recovery' },
    ],
  },
};

// ── EXPORTS ────────────────────────────────────────────────────
export function BeautyScreen({ navigation }) { return <CategoryPage config={CONFIGS.beauty} navigation={navigation} />; }
export function CleaningScreen({ navigation }) { return <CategoryPage config={CONFIGS.cleaning} navigation={navigation} />; }
export function ElectricianScreen({ navigation }) { return <CategoryPage config={CONFIGS.electrician} navigation={navigation} />; }
export function PlumberScreen({ navigation }) { return <CategoryPage config={CONFIGS.plumber} navigation={navigation} />; }
export function PaintingScreen({ navigation }) { return <CategoryPage config={CONFIGS.painting} navigation={navigation} />; }
export function PestControlScreen({ navigation }) { return <CategoryPage config={CONFIGS.pestcontrol} navigation={navigation} />; }
export function ApplianceScreen({ navigation }) { return <CategoryPage config={CONFIGS.appliance} navigation={navigation} />; }
export function FitnessScreen({ navigation }) { return <CategoryPage config={CONFIGS.fitness} navigation={navigation} />; }

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  hero: { padding:Spacing.xl, paddingBottom:Spacing.xxxl, alignItems:'center' },
  backBtn: { alignSelf:'flex-start', marginBottom:Spacing.xl },
  heroEmoji: { fontSize:72, marginBottom:16 },
  heroTitle: { color:Colors.white, fontSize:32, fontWeight:'900', letterSpacing:-0.5, textAlign:'center' },
  heroSub: { color:'rgba(255,255,255,0.7)', fontSize:15, textAlign:'center', lineHeight:23, marginTop:10, marginBottom:Spacing.xl, paddingHorizontal:16 },
  heroStats: { flexDirection:'row', gap:32 },
  heroStat: { alignItems:'center' },
  heroStatVal: { color:Colors.white, fontWeight:'900', fontSize:20 },
  heroStatLabel: { color:'rgba(255,255,255,0.55)', fontSize:11, marginTop:2 },
  benefitCard: { width:140, backgroundColor:Colors.white, borderRadius:Radius.xl, padding:14, ...Shadows.card },
  benefitIcon: { fontSize:26, marginBottom:8 },
  benefitTitle: { fontWeight:'700', fontSize:13, color:Colors.black, marginBottom:3 },
  benefitSub: { fontSize:11, color:Colors.midGray, lineHeight:16 },
  sectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  serviceCard: { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.md, gap:14, ...Shadows.card },
  serviceCardLeft: { width:64, height:64, borderRadius:Radius.xl, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0 },
  serviceCardIcon: { fontSize:32 },
  serviceCardInfo: { flex:1 },
  serviceCardName: { ...Typography.bodyMed, lineHeight:20, marginBottom:4 },
  serviceCardMeta: { flexDirection:'row', alignItems:'center', gap:6, marginBottom:3 },
  serviceCardRating: { fontSize:12, fontWeight:'700', color:Colors.star },
  serviceCardReviews: { fontSize:12, color:Colors.midGray },
  popularBadge: { backgroundColor:Colors.successLight, paddingHorizontal:7, paddingVertical:2, borderRadius:Radius.pill },
  popularText: { fontSize:9, fontWeight:'700', color:Colors.success },
  serviceCardDesc: { ...Typography.small },
  serviceCardRight: { alignItems:'flex-end', flexShrink:0 },
  serviceCardPrice: { ...Typography.price, color:Colors.primary },
  serviceCardPriceSub: { fontSize:10, color:Colors.midGray },
  howItWorks: { margin:Spacing.base, backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:Spacing.xl, ...Shadows.card, marginBottom:Spacing.xxxl },
  stepRow: { flexDirection:'row', gap:14, marginBottom:Spacing.base, alignItems:'flex-start' },
  stepNum: { width:30, height:30, borderRadius:15, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center', flexShrink:0 },
  stepNumText: { color:Colors.white, fontWeight:'800', fontSize:14 },
  stepText: { ...Typography.body, flex:1, lineHeight:21 },
});
