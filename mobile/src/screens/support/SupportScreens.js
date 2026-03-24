import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  ScrollView, StatusBar, Linking, Platform,
  PermissionsAndroid, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════
// PAYMENT SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════
export function PaymentSuccessScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { booking, amount } = route.params || {};
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue:1, tension:60, friction:7, useNativeDriver:true }),
        Animated.timing(opacityAnim, { toValue:1, duration:500, useNativeDriver:true }),
      ]),
      Animated.timing(confettiAnim, { toValue:1, duration:800, useNativeDriver:true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E20','#2E7D32','#43A047']} style={styles.successContainer}>
        <Animated.View style={[styles.successCircle, { transform:[{scale:scaleAnim}], opacity:opacityAnim }]}>
          <Animated.Text style={[styles.successCheck, { opacity:opacityAnim }]}>✓</Animated.Text>
        </Animated.View>

        <Animated.View style={{ opacity:opacityAnim, alignItems:'center' }}>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successAmount}>₹{amount || booking?.pricing?.totalAmount}</Text>
          <Text style={styles.successSub}>
            {booking?.service?.name ? `${booking.service.icon} ${booking.service.name}` : 'Service booked'}
          </Text>
          <Text style={styles.successId}>Booking ID: {booking?.bookingId || 'Slot' + Date.now().toString().slice(-8)}</Text>
        </Animated.View>

        <View style={styles.successActions}>
          <TouchableOpacity onPress={() => navigation.navigate('BookingDetail', { bookingId: booking?._id })}
            style={styles.successActionBtn}>
            <Text style={styles.successActionText}>View Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')}
            style={[styles.successActionBtn, styles.successActionSecondary]}>
            <Text style={styles.successActionTextSecondary}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYMENT FAILED SCREEN
// ═══════════════════════════════════════════════════════════
export function PaymentFailedScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { error, booking, amount } = route.params || {};
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(shakeAnim, { toValue:1, duration:100, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:-1, duration:100, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:1, duration:100, useNativeDriver:true }),
      Animated.timing(shakeAnim, { toValue:0, duration:100, useNativeDriver:true }),
    ]).start();
  }, []);

  const REASONS = [
    'Insufficient balance in your account',
    'Payment gateway timeout',
    'Bank declined the transaction',
    'Wrong OTP / authentication failed',
  ];

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#B71C1C','#C62828','#E53935']} style={styles.failContainer}>
        <Animated.View style={[styles.failCircle, { transform:[{ translateX: shakeAnim.interpolate({ inputRange:[-1,1], outputRange:[-8,8] }) }] }]}>
          <Text style={styles.failX}>✕</Text>
        </Animated.View>

        <Text style={styles.failTitle}>Payment Failed</Text>
        <Text style={styles.failAmount}>₹{amount || booking?.pricing?.totalAmount}</Text>
        <Text style={styles.failSub}>{error || 'Transaction was declined'}</Text>

        <View style={styles.failReasonsCard}>
          <Text style={styles.failReasonsTitle}>Possible reasons:</Text>
          {REASONS.map((r,i) => (
            <Text key={i} style={styles.failReason}>• {r}</Text>
          ))}
        </View>

        <View style={styles.successActions}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={styles.successActionBtn}>
            <Text style={styles.successActionText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')}
            style={[styles.successActionBtn, { backgroundColor:'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.successActionTextSecondary}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// CITY PICKER SCREEN
// ═══════════════════════════════════════════════════════════
const CITIES = [
  { name:'Hyderabad',   icon:'🏙️', active:true },
  { name:'Bangalore',   icon:'🌆', active:true },
  { name:'Mumbai',      icon:'🏗️', active:true },
  { name:'Delhi NCR',   icon:'🏛️', active:true },
  { name:'Chennai',     icon:'🌊', active:true },
  { name:'Pune',        icon:'🎓', active:true },
  { name:'Kolkata',     icon:'🌉', active:true },
  { name:'Ahmedabad',   icon:'🏟️', active:true },
  { name:'Jaipur',      icon:'🏰', active:false },
  { name:'Lucknow',     icon:'🕌', active:false },
  { name:'Bhopal',      icon:'⛰️', active:false },
  { name:'Chandigarh',  icon:'🌳', active:false },
];

export function CityPickerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { onSelect } = route?.params || {};
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('Hyderabad');

  const filtered = CITIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const active   = filtered.filter(c => c.active);
  const upcoming = filtered.filter(c => !c.active);

  const handleSelect = async (city) => {
    setSelected(city.name);
    await AsyncStorage.setItem('slot_selected_city', city.name);
    onSelect?.(city.name);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Your City</Text>
        <View style={{ width:40 }} />
      </View>

      <View style={{ padding:Spacing.base }}>
        <View style={styles.citySearchBox}>
          <Text style={{ fontSize:16, marginRight:8 }}>🔍</Text>
          <Text
            style={[styles.citySearchInput, { color: search ? Colors.black : Colors.lightGray }]}
            onPress={() => {}}>
            {search || 'Search your city...'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal:Spacing.base, paddingBottom:40 }}>
        <Text style={styles.citySection}>Available Cities</Text>
        <View style={styles.cityGrid}>
          {active.map(city => (
            <TouchableOpacity key={city.name} onPress={() => handleSelect(city)}
              style={[styles.cityCard, selected===city.name && styles.cityCardActive]} activeOpacity={0.8}>
              <Text style={styles.cityCardIcon}>{city.icon}</Text>
              <Text style={[styles.cityCardName, selected===city.name && styles.cityCardNameActive]}>{city.name}</Text>
              {selected===city.name && <Text style={styles.cityCheckmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.citySection, { marginTop:Spacing.xl }]}>Coming Soon</Text>
        <View style={styles.cityGrid}>
          {upcoming.map(city => (
            <View key={city.name} style={[styles.cityCard, styles.cityCardDisabled]}>
              <Text style={[styles.cityCardIcon, { opacity:0.4 }]}>{city.icon}</Text>
              <Text style={[styles.cityCardName, { color:Colors.lightGray }]}>{city.name}</Text>
              <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>Soon</Text></View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// PERMISSIONS SCREEN — Request location, notifications
// ═══════════════════════════════════════════════════════════
export function PermissionsScreen({ navigation, onGranted }) {
  const insets = useSafeAreaInsets();
  const [permissions, setPermissions] = useState({
    location: false, notifications: false, camera: false,
  });

  const PERMS = [
    {
      key:'location', icon:'📍', title:'Location Access',
      desc:'Required to find professionals near you and enable live tracking',
      required:true,
    },
    {
      key:'notifications', icon:'🔔', title:'Push Notifications',
      desc:'Get real-time updates about your booking, professional arrival and offers',
      required:true,
    },
    {
      key:'camera', icon:'📷', title:'Camera & Gallery',
      desc:'Share photos with professionals and upload documents for verification',
      required:false,
    },
  ];

  const requestAll = async () => {
    const results = { location: false, notifications: false, camera: false };

    if (Platform.OS === 'android') {
      const locationResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      results.location = locationResult === PermissionsAndroid.RESULTS.GRANTED;

      const cameraResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      results.camera = cameraResult === PermissionsAndroid.RESULTS.GRANTED;

      results.notifications = true; // Android 12 and below auto-granted
    } else {
      // iOS — handled by native modules
      results.location = true;
      results.notifications = true;
      results.camera = true;
    }

    setPermissions(results);
    await AsyncStorage.setItem('slot_permissions_asked', 'true');

    if (results.location && results.notifications) {
      setTimeout(() => { onGranted?.(); navigation.goBack?.(); }, 800);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ padding:Spacing.xl, paddingBottom:120, alignItems:'center' }}>
        <Text style={{ fontSize:72, marginBottom:Spacing.xl }}>🏠</Text>
        <Text style={[Typography.h2, { textAlign:'center', marginBottom:10 }]}>
          Before We Begin
        </Text>
        <Text style={[Typography.body, { textAlign:'center', color:Colors.midGray, lineHeight:22, marginBottom:Spacing.xxl }]}>
          Slot needs a few permissions to give you the best experience
        </Text>

        {PERMS.map(perm => (
          <View key={perm.key} style={styles.permCard}>
            <View style={styles.permIconWrap}>
              <Text style={{ fontSize:28 }}>{perm.icon}</Text>
              {permissions[perm.key] && (
                <View style={styles.permGranted}><Text style={{ color:Colors.white, fontSize:10, fontWeight:'800' }}>✓</Text></View>
              )}
            </View>
            <View style={{ flex:1 }}>
              <Text style={styles.permTitle}>{perm.title}</Text>
              <Text style={styles.permDesc}>{perm.desc}</Text>
            </View>
            {perm.required && <View style={styles.permRequired}><Text style={styles.permRequiredText}>Required</Text></View>}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.permCTA, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={requestAll} activeOpacity={0.85}
          style={{ borderRadius:Radius.xl, overflow:'hidden' }}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
            style={{ paddingVertical:17, alignItems:'center' }}>
            <Text style={{ color:Colors.white, fontWeight:'800', fontSize:17 }}>Grant Permissions</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { navigation.goBack?.(); onGranted?.(); }}
          style={{ marginTop:Spacing.md, alignItems:'center' }}>
          <Text style={{ color:Colors.midGray, fontSize:14 }}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// ABOUT SCREEN
// ═══════════════════════════════════════════════════════════
export function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Slot</Text>
        <View style={{ width:40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding:Spacing.xl, alignItems:'center', paddingBottom:60 }}>
        <LinearGradient colors={['#E94560','#C0392B']} style={styles.aboutLogo}>
          <Text style={{ color:Colors.white, fontSize:40, fontWeight:'900' }}>Slot</Text>
        </LinearGradient>

        <Text style={[Typography.h2, { textAlign:'center', marginBottom:8 }]}>Slot App</Text>
        <Text style={[Typography.body, { color:Colors.midGray, textAlign:'center', marginBottom:4 }]}>Version 1.0.0 (Build 100)</Text>
        <Text style={[Typography.small, { color:Colors.lightGray, marginBottom:Spacing.xxl }]}>© 2026 Slot Technologies Pvt. Ltd.</Text>

        <Text style={[Typography.body, { textAlign:'center', lineHeight:24, marginBottom:Spacing.xxl, color:Colors.gray }]}>
          Slot is India's most trusted platform for home services — connecting millions of customers with verified, trained professionals across 200+ services.
        </Text>

        {[
          { icon:'🏆', title:'Our Mission', desc:'Make quality home services accessible, affordable and reliable for every Indian home.' },
          { icon:'❤️', title:'Our Values', desc:'Trust, transparency, quality. We verify every professional and guarantee every service.' },
          { icon:'🌍', title:'Our Reach', desc:'Operating in 50+ cities, 5,000+ professionals, 1M+ happy customers.' },
        ].map(item => (
          <View key={item.title} style={styles.aboutCard}>
            <Text style={{ fontSize:32, marginBottom:10 }}>{item.icon}</Text>
            <Text style={styles.aboutCardTitle}>{item.title}</Text>
            <Text style={styles.aboutCardDesc}>{item.desc}</Text>
          </View>
        ))}

        <View style={styles.aboutLinks}>
          {[
            { label:'Website',       url:'https://slotapp.in' },
            { label:'Privacy Policy',url:'https://slotapp.in/privacy' },
            { label:'Terms of Use',  url:'https://slotapp.in/terms' },
            { label:'Careers',       url:'https://slotapp.in/careers' },
          ].map(link => (
            <TouchableOpacity key={link.label} onPress={() => Linking.openURL(link.url)}
              style={styles.aboutLink}>
              <Text style={styles.aboutLinkText}>{link.label} →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// EMERGENCY SCREEN — Quick help for urgent situations
// ═══════════════════════════════════════════════════════════
export function EmergencyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const EMERGENCY_SERVICES = [
    { icon:'🚗', title:'Car Jump Start', desc:'Dead battery, car not starting — 30 min arrival', price:'₹499', color:'#E94560', urgent:true },
    { icon:'💧', title:'Emergency Plumber', desc:'Burst pipe, major leak — 24/7 available', price:'₹349', color:'#1565C0', urgent:true },
    { icon:'⚡', title:'Emergency Electrician', desc:'Power failure, sparking, short circuit', price:'₹299', color:'#F57F17', urgent:true },
    { icon:'🔒', title:'Locksmith', desc:'Locked out of home or car — anytime', price:'₹399', color:'#2E7D32', urgent:true },
    { icon:'❄️', name:'AC Emergency', desc:'No cooling in extreme heat — same day fix', price:'₹499', color:'#006064', urgent:false },
    { icon:'🔋', title:'Battery Replacement', desc:'Two-wheeler battery, home battery', price:'₹299', color:'#880E4F', urgent:false },
  ];

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#B71C1C','#C62828']} style={styles.emergencyHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize:22, color:Colors.white, fontWeight:'600' }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.emergencyHeaderTitle}>🆘 Emergency Services</Text>
          <Text style={styles.emergencyHeaderSub}>Fast response · 24/7 · Guaranteed arrival</Text>
        </View>
      </LinearGradient>

      {/* SOS Banner */}
      <TouchableOpacity onPress={() => Linking.openURL('tel:18001234567')} activeOpacity={0.85}
        style={styles.sosBanner}>
        <Text style={styles.sosIcon}>📞</Text>
        <View>
          <Text style={styles.sosTitle}>Slot Emergency Hotline</Text>
          <Text style={styles.sosSub}>1800-123-4567 · Free · 24/7</Text>
        </View>
        <Text style={styles.sosCall}>Call Now</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:60 }}>
        <Text style={styles.emergencySectionTitle}>Available Emergency Services</Text>
        {EMERGENCY_SERVICES.map(svc => (
          <TouchableOpacity key={svc.title}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: svc.title?.toLowerCase().replace(/ /g,'-') })}
            style={styles.emergencyCard} activeOpacity={0.85}>
            <View style={[styles.emergencyCardIcon, { backgroundColor: svc.color + '15' }]}>
              <Text style={{ fontSize:32 }}>{svc.icon}</Text>
            </View>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <Text style={styles.emergencyCardTitle}>{svc.title}</Text>
                {svc.urgent && <View style={styles.urgentBadge}><Text style={styles.urgentText}>URGENT</Text></View>}
              </View>
              <Text style={styles.emergencyCardDesc}>{svc.desc}</Text>
            </View>
            <View>
              <Text style={[styles.emergencyCardPrice, { color:svc.color }]}>{svc.price}</Text>
              <Text style={styles.emergencyCardBook}>Book →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  backBtn: { width:40 },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  headerTitle: { ...Typography.h4 },
  // Success
  successContainer: { flex:1, alignItems:'center', justifyContent:'center', padding:Spacing.xl },
  successCircle: { width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:Spacing.xl },
  successCheck: { color:Colors.white, fontSize:52, fontWeight:'900' },
  successTitle: { color:Colors.white, fontSize:28, fontWeight:'900', marginBottom:8 },
  successAmount: { color:Colors.white, fontSize:48, fontWeight:'900', letterSpacing:-2, marginBottom:8 },
  successSub: { color:'rgba(255,255,255,0.8)', fontSize:16, marginBottom:8 },
  successId: { color:'rgba(255,255,255,0.5)', fontSize:12, fontFamily:'monospace' },
  successActions: { marginTop:Spacing.xxxl, gap:12, width:'100%' },
  successActionBtn: { backgroundColor:'rgba(255,255,255,0.2)', paddingVertical:15, borderRadius:Radius.xl, alignItems:'center' },
  successActionText: { color:Colors.white, fontWeight:'700', fontSize:15 },
  successActionSecondary: { backgroundColor:'rgba(255,255,255,0.1)' },
  successActionTextSecondary: { color:'rgba(255,255,255,0.7)', fontWeight:'600', fontSize:14 },
  // Failed
  failContainer: { flex:1, alignItems:'center', justifyContent:'center', padding:Spacing.xl },
  failCircle: { width:100, height:100, borderRadius:50, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:Spacing.xl },
  failX: { color:Colors.white, fontSize:52, fontWeight:'900' },
  failTitle: { color:Colors.white, fontSize:28, fontWeight:'900', marginBottom:8 },
  failAmount: { color:Colors.white, fontSize:42, fontWeight:'900', letterSpacing:-2, marginBottom:8 },
  failSub: { color:'rgba(255,255,255,0.75)', fontSize:16, textAlign:'center', marginBottom:Spacing.xl },
  failReasonsCard: { backgroundColor:'rgba(255,255,255,0.15)', borderRadius:Radius.xl, padding:Spacing.base, width:'100%', marginBottom:Spacing.base },
  failReasonsTitle: { color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:'600', marginBottom:Spacing.sm, textTransform:'uppercase', letterSpacing:1 },
  failReason: { color:'rgba(255,255,255,0.65)', fontSize:13, lineHeight:22 },
  // City
  citySearchBox: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.md, borderWidth:1.5, borderColor:Colors.offWhite },
  citySearchInput: { flex:1, fontSize:14 },
  citySection: { ...Typography.h4, marginBottom:Spacing.md },
  cityGrid: { flexDirection:'row', flexWrap:'wrap', gap:12 },
  cityCard: { width:'30%', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:12, alignItems:'center', gap:6, borderWidth:1.5, borderColor:Colors.offWhite, ...Shadows.sm },
  cityCardActive: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  cityCardDisabled: { opacity:0.6 },
  cityCardIcon: { fontSize:28 },
  cityCardName: { fontSize:12, fontWeight:'600', color:Colors.gray, textAlign:'center' },
  cityCardNameActive: { color:Colors.primary },
  cityCheckmark: { fontSize:14, color:Colors.primary, fontWeight:'800' },
  comingSoonBadge: { position:'absolute', top:-4, right:-4, backgroundColor:Colors.warning, paddingHorizontal:5, paddingVertical:1, borderRadius:Radius.pill },
  comingSoonText: { fontSize:8, fontWeight:'700', color:Colors.white },
  // Permissions
  permCard: { flexDirection:'row', alignItems:'flex-start', backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:Spacing.base, marginBottom:Spacing.md, gap:14, width:'100%', ...Shadows.card },
  permIconWrap: { width:52, height:52, borderRadius:Radius.lg, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' },
  permGranted: { position:'absolute', top:-3, right:-3, width:18, height:18, borderRadius:9, backgroundColor:Colors.success, alignItems:'center', justifyContent:'center' },
  permTitle: { ...Typography.bodyMed, marginBottom:4 },
  permDesc: { ...Typography.small, lineHeight:18 },
  permRequired: { backgroundColor:Colors.errorLight, paddingHorizontal:8, paddingVertical:3, borderRadius:Radius.pill, alignSelf:'flex-start' },
  permRequiredText: { fontSize:10, color:Colors.error, fontWeight:'700' },
  permCTA: { position:'absolute', bottom:0, left:0, right:0, padding:Spacing.base, backgroundColor:Colors.white, borderTopWidth:1, borderTopColor:Colors.offWhite, ...Shadows.lg },
  // About
  aboutLogo: { width:80, height:80, borderRadius:24, alignItems:'center', justifyContent:'center', marginBottom:Spacing.md, ...Shadows.lg },
  aboutCard: { backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:Spacing.xl, marginBottom:Spacing.base, alignItems:'center', width:'100%', ...Shadows.card },
  aboutCardTitle: { ...Typography.h4, marginBottom:8, textAlign:'center' },
  aboutCardDesc: { ...Typography.body, textAlign:'center', lineHeight:22, color:Colors.gray },
  aboutLinks: { width:'100%', gap:4 },
  aboutLink: { paddingVertical:14, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  aboutLinkText: { ...Typography.bodyMed, color:Colors.primary },
  // Emergency
  emergencyHeader: { padding:Spacing.base, paddingBottom:Spacing.xl, flexDirection:'row', alignItems:'center', gap:16 },
  emergencyHeaderTitle: { color:Colors.white, fontWeight:'900', fontSize:18 },
  emergencyHeaderSub: { color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 },
  sosBanner: { margin:Spacing.base, backgroundColor:'#FFF3E0', borderRadius:Radius.xl, padding:Spacing.base, flexDirection:'row', alignItems:'center', gap:14, borderWidth:2, borderColor:'#FF9800' },
  sosIcon: { fontSize:28 },
  sosTitle: { fontWeight:'700', fontSize:15, color:'#E65100' },
  sosSub: { fontSize:12, color:'#E65100', marginTop:2 },
  sosCall: { marginLeft:'auto', backgroundColor:'#FF9800', paddingHorizontal:16, paddingVertical:9, borderRadius:Radius.xl, color:Colors.white, fontWeight:'800', fontSize:13, overflow:'hidden' },
  emergencySectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  emergencyCard: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.md, gap:14, ...Shadows.card },
  emergencyCardIcon: { width:56, height:56, borderRadius:Radius.xl, alignItems:'center', justifyContent:'center', flexShrink:0 },
  emergencyCardTitle: { ...Typography.bodyMed },
  emergencyCardDesc: { ...Typography.small, marginTop:3, lineHeight:17 },
  urgentBadge: { backgroundColor:Colors.errorLight, paddingHorizontal:7, paddingVertical:2, borderRadius:Radius.pill },
  urgentText: { fontSize:9, fontWeight:'800', color:Colors.error, letterSpacing:0.5 },
  emergencyCardPrice: { fontWeight:'800', fontSize:15, textAlign:'right' },
  emergencyCardBook: { fontSize:12, color:Colors.primary, fontWeight:'700', textAlign:'right', marginTop:2 },
});
