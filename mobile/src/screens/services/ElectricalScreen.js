/**
 * MK App — Electrical Services Screen (Full Production v2)
 * Fan, switchboard, wiring, MCB, inverter, CCTV, smart home
 */
import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { useCart } from '../../context/CartContext';

const SERVICES = [
  { id:'fan', name:'Fan Repair & Install', icon:'💨', desc:'Ceiling, exhaust, table fans — repair, install, speed regulator and capacitor replacement.', startingPrice:149, originalPrice:249, duration:30, rating:4.8, totalBookings:48200, warranty:'30-day warranty', problems:['Not working','Running slow','Making noise','Wobbling','New install','Regulator fault'], inclusions:['Diagnosis','Capacitor/regulator check','Blade balancing','Labour','Testing'], exclusions:['Fan purchase','Motor winding'], faq:[{q:'Fan slow but not stopping?',a:'Usually a capacitor. ₹80-150 for part + labour.'}], isBestseller:true },
  { id:'switchboard', name:'Switchboard & Socket', icon:'🔌', desc:'Loose sockets, sparking switches, MCB issues, new socket and USB socket installation.', startingPrice:149, originalPrice:249, duration:30, rating:4.8, totalBookings:38700, warranty:'30-day warranty', problems:['Socket dead','Sparking switch','MCB tripping','New socket','USB socket','Dimmer install'], inclusions:['Inspection','Socket/switch repair','MCB test','Safety check','Labour'], exclusions:['Complete rewiring'], faq:[{q:'Sparking socket?',a:'Dangerous! Switch off that circuit immediately.'}], isBestseller:true, isEmergency:true },
  { id:'wiring', name:'Home Wiring & Rewiring', icon:'🔋', desc:'New wiring, concealed conduit, wire replacement, earthing. ISI-certified wires only.', startingPrice:399, originalPrice:699, duration:120, rating:4.7, totalBookings:14200, warranty:'1-year warranty', problems:['New room wiring','Faulty old wiring','Earthing issue','Circuit extension'], inclusions:['Site inspection','ISI-mark wires','Earthing check','Load test'], exclusions:['Civil work','Material cost'], faq:[{q:'Full home wiring cost?',a:'₹150/point. 2BHK = 40-60 points = ₹6,000-9,000.'}] },
  { id:'mcb', name:'MCB & Distribution Board', icon:'⚡', desc:'MCB repair/replacement, DB upgrade, RCCB/ELCB installation, phase balancing.', startingPrice:299, originalPrice:499, duration:60, rating:4.7, totalBookings:18900, warranty:'30-day warranty', problems:['MCB tripping','Main switch fault','DB upgrade','RCCB install','Phase balance'], inclusions:['Load analysis','MCB rating check','Replacement','DB inspection','Phase test'], exclusions:['Rewiring'], faq:[{q:'MCB trips with AC?',a:'MCB rating may be too low. We assess and replace correctly.'}], isEmergency:true },
  { id:'inverter', name:'Inverter & UPS Service', icon:'🔆', desc:'Inverter repair, battery check, UPS service, new inverter installation and battery replacement.', startingPrice:299, originalPrice:499, duration:60, rating:4.7, totalBookings:12400, warranty:'30-day warranty', problems:['Not charging','Low backup','Beeping alarms','New install','Battery check'], inclusions:['Battery load test','Charger check','Connection inspect','Topping if needed','Testing'], exclusions:['Battery replacement cost'], faq:[{q:'Battery lifespan?',a:'3-5 years with maintenance. Free health check included.'}] },
  { id:'cctv', name:'CCTV & Security Camera', icon:'📹', desc:'CCTV installation, DVR/NVR setup, remote mobile viewing config for home and office.', startingPrice:499, originalPrice:799, duration:90, rating:4.8, totalBookings:9800, warranty:'90-day warranty', problems:['New setup','Camera fault','DVR config','Remote access','Cable routing'], inclusions:['Mounting','Cable routing','DVR setup','Remote config','Mobile app setup','Testing'], exclusions:['Camera/DVR purchase'], faq:[{q:'View on phone?',a:'Yes. Free apps configured (XMEye, HikConnect etc.).'}] },
  { id:'smart-home', name:'Smart Home Installation', icon:'🏠', desc:'Smart switches, Alexa/Google Home, smart bulbs, video doorbell and home automation.', startingPrice:349, originalPrice:599, duration:60, rating:4.9, totalBookings:7200, warranty:'30-day warranty', problems:['Smart switch','Alexa setup','Smart bulb wiring','Video doorbell','Smart plug'], inclusions:['Installation','App config','Voice pairing','Testing','Demo'], exclusions:['Device purchase'], faq:[{q:'Which brands?',a:'Philips Hue, Wipro, Syska, Legrand, Schneider and more.'}], isNew:true },
  { id:'lights', name:'Light Fixture & LED Install', icon:'💡', desc:'Chandelier, false ceiling lights, LED strips, track lights, garden lights installation.', startingPrice:199, originalPrice:349, duration:45, rating:4.8, totalBookings:22100, warranty:'30-day warranty', problems:['New light install','Chandelier','LED strips','False ceiling','Garden lights'], inclusions:['Mounting','Wiring connection','Switch install','Dimmer if needed','Testing'], exclusions:['Fixture purchase'], faq:[{q:'Recessed lights?',a:'Yes, including false ceiling. Civil cutting charged extra.'}] },
];
const EMERGENCY = [
  { icon:'⚡', name:'Power Outage Fix', time:'45 min', price:299 },
  { icon:'🔥', name:'Sparking/Short Circuit', time:'30 min', price:249 },
  { icon:'🚨', name:'MCB Not Resetting', time:'30 min', price:199 },
];

export default function ElectricalScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { addToCart } = useCart();
  const FILTERS = [{ key:'all',label:'All' },{ key:'repair',label:'Repair' },{ key:'install',label:'Install' },{ key:'smart',label:'Smart Home' },{ key:'emergency',label:'⚡ Emergency' }];
  const filtered = SERVICES.filter(s => filter==='all'||(filter==='repair'&&['fan','switchboard','wiring','mcb','inverter'].includes(s.id))||(filter==='install'&&['lights','cctv','fan'].includes(s.id))||(filter==='smart'&&s.id==='smart-home')||(filter==='emergency'&&s.isEmergency));
  const handleAdd = (s) => {
    addToCart({ id:s.id, name:s.name, price:s.startingPrice, category:'electrician', duration:s.duration, icon:s.icon });
    Alert.alert('Added! ⚡', `${s.name} added.`, [{ text:'View Cart', onPress:()=>navigation.navigate('Cart') }, { text:'Continue' }]);
  };
  const headerBg = scrollY.interpolate({ inputRange:[0,100], outputRange:['transparent','#E94560'], extrapolate:'clamp' });
  return (
    <View style={[E.screen, { paddingTop:insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[E.header, { backgroundColor:headerBg }]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={{ width:40 }}><Text style={{ fontSize:22,color:'#fff',fontWeight:'700' }}>←</Text></TouchableOpacity>
        <Text style={E.headerTitle}>Electrician</Text>
        <TouchableOpacity onPress={()=>navigation.navigate('Cart')}><Text style={{ fontSize:22 }}>🛒</Text></TouchableOpacity>
      </Animated.View>
      <Animated.ScrollView showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:false })} scrollEventThrottle={16}>
        <LinearGradient colors={['#1A1A2E','#E94560','#FF6B35']} style={E.hero}>
          <Text style={{ fontSize:56,marginBottom:12 }}>⚡</Text>
          <Text style={E.heroTitle}>Electrician at Your Doorstep</Text>
          <Text style={E.heroSub}>Licensed electricians • ISI wire guarantee • Emergency 24/7</Text>
          <View style={E.heroStats}>{[['4.8★','Rating'],['45 min','Avg arrival'],['30-day','Warranty']].map(([v,l],i)=>(
            <View key={i} style={E.heroStat}><Text style={E.heroStatVal}>{v}</Text><Text style={E.heroStatLbl}>{l}</Text></View>
          ))}</View>
        </LinearGradient>

        <View style={E.emergencySection}>
          <Text style={E.emergencyTitle}>⚡ Emergency — Arrives in 45 min</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:12,paddingTop:10 }}>
            {EMERGENCY.map((e,i)=>(
              <TouchableOpacity key={i} style={E.emergencyCard} onPress={()=>Alert.alert('Emergency Booked!',`${e.name} — Electrician dispatched.`)}>
                <Text style={{ fontSize:26,marginBottom:6 }}>{e.icon}</Text>
                <Text style={E.emergencyCardName}>{e.name}</Text>
                <Text style={E.emergencyCardTime}>Arrives in {e.time}</Text>
                <Text style={E.emergencyCardPrice}>₹{e.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={E.safetyBanner}>
          <Text style={{ fontSize:30 }}>🏅</Text>
          <View style={{ flex:1, marginLeft:12 }}>
            <Text style={E.safetyTitle}>Licensed & Certified Electricians</Text>
            <Text style={E.safetyText}>ITI/wireman licence. ISI-certified wires and MCBs only.</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:16 }} contentContainerStyle={{ paddingHorizontal:16,gap:10 }}>
          {FILTERS.map(f=>(
            <TouchableOpacity key={f.key} style={[E.filterChip,filter===f.key&&E.filterChipActive]} onPress={()=>setFilter(f.key)}>
              <Text style={[E.filterTxt,filter===f.key&&E.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding:16 }}>
          <Text style={E.sectionTitle}>{filtered.length} Services</Text>
          {filtered.map(s=>{
            const inCart = false;
            const disc = Math.round((1-s.startingPrice/s.originalPrice)*100);
            return (
              <TouchableOpacity key={s.id} style={E.card} onPress={()=>{ setDetail(s); setShowDetail(true); }} activeOpacity={0.93}>
                {s.isBestseller&&<View style={E.badge}><Text style={E.badgeTxt}>BESTSELLER</Text></View>}
                {s.isEmergency&&<View style={[E.badge,{ backgroundColor:'#E67E22' }]}><Text style={E.badgeTxt}>⚡ EMERGENCY</Text></View>}
                {s.isNew&&<View style={[E.badge,{ backgroundColor:'#27AE60' }]}><Text style={E.badgeTxt}>✨ NEW</Text></View>}
                <View style={{ flexDirection:'row',marginBottom:10 }}>
                  <Text style={{ fontSize:36,marginRight:14 }}>{s.icon}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={E.cardName}>{s.name}</Text>
                    <Text style={{ fontSize:11,color:Colors.midGray,marginTop:3 }}>⏱ ~{s.duration} min  •  🛡️ {s.warranty}</Text>
                    <View style={{ flexDirection:'row',marginTop:4 }}><Text style={{ fontSize:13,fontWeight:'600',color:Colors.black }}>⭐ {s.rating}</Text><Text style={{ fontSize:12,color:Colors.midGray }}>  {(s.totalBookings/1000).toFixed(1)}k bookings</Text></View>
                  </View>
                </View>
                <Text style={{ fontSize:13,color:Colors.gray,lineHeight:18,marginBottom:10 }} numberOfLines={2}>{s.desc}</Text>
                <View style={{ flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12 }}>
                  {s.problems.slice(0,3).map((p,i)=>(<View key={i} style={{ backgroundColor:'#FFF3E0',borderRadius:10,paddingHorizontal:10,paddingVertical:4 }}><Text style={{ fontSize:11,fontWeight:'600',color:'#E67E22' }}>{p}</Text></View>))}
                </View>
                <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}>
                  <View>
                    <Text style={{ fontSize:11,color:Colors.midGray }}>Starting at</Text>
                    <View style={{ flexDirection:'row',alignItems:'center',gap:8 }}>
                      <Text style={{ fontSize:18,fontWeight:'800',color:Colors.black }}>₹{s.startingPrice}</Text>
                      <Text style={{ fontSize:13,color:Colors.midGray,textDecorationLine:'line-through' }}>₹{s.originalPrice}</Text>
                      <View style={{ backgroundColor:Colors.successLight,borderRadius:8,paddingHorizontal:6,paddingVertical:2 }}><Text style={{ fontSize:11,fontWeight:'700',color:Colors.success }}>{disc}% off</Text></View>
                    </View>
                  </View>
                  <TouchableOpacity style={E.addBtn} onPress={()=>handleAdd(s)}><Text style={E.addBtnTxt}>Add</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ margin:16,backgroundColor:'#FFF0F3',borderRadius:18,padding:20 }}>
          <Text style={{ fontSize:15,fontWeight:'700',color:'#E94560',marginBottom:14 }}>🛡️ Our Electrical Guarantee</Text>
          {['Licensed ITI/wireman electricians only','ISI-certified wires and MCBs used','30-day repair warranty on all work','No fix = No charge policy','24/7 emergency service available'].map((item,i)=>(
            <View key={i} style={{ flexDirection:'row',marginBottom:10 }}>
              <Text style={{ fontSize:14,color:'#E94560',fontWeight:'700',marginRight:10 }}>✓</Text>
              <Text style={{ flex:1,fontSize:13,color:Colors.gray,lineHeight:18 }}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={{ height:80 }} />
      </Animated.ScrollView>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowDetail(false)}>
        {detail&&(
          <View style={E.modal}>
            <View style={E.modalBar}>
              <TouchableOpacity onPress={()=>setShowDetail(false)} style={E.closeBtn}><Text style={{ fontSize:16,color:Colors.gray }}>✕</Text></TouchableOpacity>
              <Text style={E.modalBarTitle}>{detail.name}</Text>
              <View style={{ width:36 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <LinearGradient colors={['#1A1A2E','#E94560','#FF6B35']} style={{ padding:28,alignItems:'center' }}>
                <Text style={{ fontSize:52,marginBottom:10 }}>{detail.icon}</Text>
                <Text style={{ fontSize:22,fontWeight:'800',color:'#fff',textAlign:'center' }}>{detail.name}</Text>
                <Text style={{ fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:6,textAlign:'center' }}>⭐ {detail.rating}  •  {(detail.totalBookings/1000).toFixed(1)}k bookings  •  {detail.warranty}</Text>
              </LinearGradient>
              <View style={{ padding:20 }}>
                <Text style={{ fontSize:14,color:Colors.gray,lineHeight:20,marginBottom:16 }}>{detail.desc}</Text>
                <Text style={{ fontSize:15,fontWeight:'700',color:Colors.black,marginBottom:10 }}>Problems Fixed</Text>
                <View style={{ flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16 }}>
                  {detail.problems.map((p,i)=>(<View key={i} style={{ backgroundColor:'#FFF3E0',borderRadius:10,paddingHorizontal:10,paddingVertical:5 }}><Text style={{ fontSize:12,fontWeight:'600',color:'#E67E22' }}>{p}</Text></View>))}
                </View>
                <Text style={{ fontSize:15,fontWeight:'700',color:Colors.black,marginBottom:10 }}>What's Included</Text>
                {detail.inclusions.map((item,i)=>(<View key={i} style={{ flexDirection:'row',marginBottom:8 }}><Text style={{ color:Colors.success,fontWeight:'700',marginRight:10 }}>✓</Text><Text style={{ flex:1,fontSize:14,color:Colors.gray }}>{item}</Text></View>))}
                {detail.faq.map((item,i)=>(<View key={i} style={{ backgroundColor:Colors.offWhite,borderRadius:12,padding:14,marginBottom:12,marginTop:8 }}><Text style={{ fontSize:14,fontWeight:'700',color:Colors.black,marginBottom:6 }}>{item.q}</Text><Text style={{ fontSize:13,color:Colors.gray }}>{item.a}</Text></View>))}
              </View>
            </ScrollView>
            <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,borderTopWidth:1,borderTopColor:Colors.offWhite,backgroundColor:'#fff' }}>
              <View><Text style={{ fontSize:12,color:Colors.midGray }}>Starting at</Text><Text style={{ fontSize:22,fontWeight:'800',color:Colors.black }}>₹{detail.startingPrice}</Text></View>
              <TouchableOpacity style={{ backgroundColor:'#E94560',borderRadius:14,paddingHorizontal:28,paddingVertical:14 }} onPress={()=>{ handleAdd(detail); setShowDetail(false); }}><Text style={{ fontSize:15,fontWeight:'700',color:'#fff' }}>Add to Cart</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const E = StyleSheet.create({
  screen:{ flex:1,backgroundColor:Colors.bg },
  header:{ position:'absolute',top:0,left:0,right:0,zIndex:100,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12 },
  headerTitle:{ fontSize:16,fontWeight:'700',color:'#fff' },
  hero:{ paddingTop:60,paddingBottom:32,paddingHorizontal:24,alignItems:'center' },
  heroTitle:{ fontSize:24,fontWeight:'800',color:'#fff',textAlign:'center' },
  heroSub:{ fontSize:13,color:'rgba(255,255,255,0.8)',marginTop:6,textAlign:'center' },
  heroStats:{ flexDirection:'row',marginTop:18,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,paddingVertical:12,paddingHorizontal:16,gap:16 },
  heroStat:{ alignItems:'center',flex:1 },
  heroStatVal:{ fontSize:15,fontWeight:'800',color:'#fff' },
  heroStatLbl:{ fontSize:10,color:'rgba(255,255,255,0.7)',marginTop:2 },
  emergencySection:{ margin:16,backgroundColor:'#FFF3E0',borderRadius:18,padding:16,borderLeftWidth:4,borderLeftColor:Colors.warning },
  emergencyTitle:{ fontSize:15,fontWeight:'700',color:Colors.warning },
  emergencyCard:{ backgroundColor:'#fff',borderRadius:14,padding:14,width:150,...Shadows.sm },
  emergencyCardName:{ fontSize:13,fontWeight:'700',color:Colors.black },
  emergencyCardTime:{ fontSize:11,color:Colors.midGray,marginTop:2 },
  emergencyCardPrice:{ fontSize:15,fontWeight:'800',color:'#E94560',marginTop:6 },
  safetyBanner:{ flexDirection:'row',alignItems:'center',backgroundColor:'#FFF0F3',marginHorizontal:16,borderRadius:16,padding:16,borderLeftWidth:4,borderLeftColor:'#E94560' },
  safetyTitle:{ fontSize:14,fontWeight:'700',color:'#E94560' },
  safetyText:{ fontSize:12,color:Colors.gray,marginTop:2 },
  filterChip:{ paddingHorizontal:16,paddingVertical:8,borderRadius:20,backgroundColor:'#fff',borderWidth:1,borderColor:Colors.lightGray },
  filterChipActive:{ backgroundColor:'#E94560',borderColor:'#E94560' },
  filterTxt:{ fontSize:13,fontWeight:'600',color:Colors.gray },
  filterTxtActive:{ color:'#fff' },
  sectionTitle:{ fontSize:18,fontWeight:'800',color:Colors.black,marginBottom:14 },
  card:{ backgroundColor:'#fff',borderRadius:20,padding:18,marginBottom:16,...Shadows.card,overflow:'hidden' },
  badge:{ position:'absolute',top:14,right:14,backgroundColor:Colors.primary,borderRadius:8,paddingHorizontal:8,paddingVertical:3 },
  badgeTxt:{ fontSize:9,fontWeight:'800',color:'#fff' },
  cardName:{ fontSize:15,fontWeight:'700',color:Colors.black },
  addBtn:{ backgroundColor:'#FFF0F3',borderRadius:14,paddingHorizontal:22,paddingVertical:10,borderWidth:1.5,borderColor:'#E94560' },
  addBtnTxt:{ fontSize:14,fontWeight:'700',color:'#E94560' },
  modal:{ flex:1,backgroundColor:Colors.bg },
  modalBar:{ flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderBottomWidth:1,borderBottomColor:Colors.offWhite },
  closeBtn:{ width:36,height:36,borderRadius:18,backgroundColor:Colors.offWhite,justifyContent:'center',alignItems:'center' },
  modalBarTitle:{ fontSize:16,fontWeight:'700',color:Colors.black,flex:1,textAlign:'center' },
});
