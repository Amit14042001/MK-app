import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Switch, Alert, ActivityIndicator, FlatList, Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';

const MAP_STYLE = [
  { elementType:'geometry',        stylers:[{color:'#f5f5f5'}] },
  { elementType:'labels.icon',     stylers:[{visibility:'off'}] },
  { featureType:'road',            elementType:'geometry',            stylers:[{color:'#ffffff'}] },
  { featureType:'road.arterial',   elementType:'labels.text.fill',    stylers:[{color:'#757575'}] },
  { featureType:'water',           elementType:'geometry',            stylers:[{color:'#c9e8f0'}] },
  { featureType:'poi',             elementType:'geometry',            stylers:[{color:'#eeeeee'}] },
];

// ─────────────────────────────────────────────────────────────
// MAP / NAVIGATION SCREEN
// ─────────────────────────────────────────────────────────────
export function MapNavigationScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const { booking } = route?.params || {};

  const [myLocation, setMyLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [eta, setEta] = useState('--');
  const [distance, setDistance] = useState('--');

  const destCoords = {
    latitude:  booking?.address?.lat  || 17.3850,
    longitude: booking?.address?.lng  || 78.4867,
  };

  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setMyLocation(coords);
        mapRef.current?.fitToCoordinates([coords, destCoords], {
          edgePadding: { top: 80, right: 40, bottom: 180, left: 40 }, animated: true,
        });
      },
      err => console.warn(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const openExternalNav = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destCoords.latitude},${destCoords.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => {
      // Fallback: try Google Maps app directly
      const appUrl = `google.navigation:q=${destCoords.latitude},${destCoords.longitude}`;
      Linking.openURL(appUrl).catch(() => {
        Alert.alert('Navigation', 'Could not open maps. Please navigate manually.');
      });
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()}
        style={[styles.mapBackBtn, { top: insets.top + 12 }]}>
        <Text style={styles.mapBackIcon}>←</Text>
      </TouchableOpacity>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={MAP_STYLE}
        initialRegion={{
          latitude: destCoords.latitude, longitude: destCoords.longitude,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
        showsUserLocation
        followsUserLocation={tracking}>

        {/* Destination marker */}
        <Marker coordinate={destCoords} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destMarker}>
            <Text style={{ fontSize: 28 }}>🏠</Text>
            <View style={styles.destMarkerPin} />
          </View>
        </Marker>

        {/* Route line */}
        {myLocation && (
          <Polyline
            coordinates={[myLocation, destCoords]}
            strokeColor={Colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Bottom info sheet */}
      <View style={[styles.navSheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Customer info */}
        <View style={styles.navCustomer}>
          <View style={styles.navAvatar}>
            <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 16 }}>
              {booking?.customer?.name?.charAt(0) || 'C'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navCustName}>{booking?.customer?.name || 'Customer'}</Text>
            <Text style={styles.navCustAddr} numberOfLines={1}>
              📍 {booking?.address?.line1}, {booking?.address?.area}, {booking?.address?.city}
            </Text>
          </View>
          <TouchableOpacity style={styles.callIconBtn}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* ETA strip */}
        <View style={styles.etaStrip}>
          <View style={styles.etaItem}>
            <Text style={styles.etaVal}>{eta}</Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaVal}>{distance}</Text>
            <Text style={styles.etaLabel}>Distance</Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={styles.etaItem}>
            <Text style={styles.etaVal}>{booking?.scheduledTime || '--'}</Text>
            <Text style={styles.etaLabel}>Slot</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.navActions}>
          <TouchableOpacity onPress={openExternalNav}
            style={[styles.navActionBtn, { backgroundColor: Colors.infoLight, flex: 1 }]}>
            <Text style={[styles.navActionText, { color: Colors.info }]}>🗺️ Open in Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navActionBtn, { backgroundColor: Colors.primary, flex: 1 }]}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.navActionText, { color: Colors.white }]}>✅ Mark Arrived</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SCHEDULE SCREEN
// ─────────────────────────────────────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOTS = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];

export function ScheduleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [availability, setAvailability] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { active: true, from: '8 AM', to: '8 PM' } }), {})
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (day) => {
    setAvailability(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); Alert.alert('Saved!', 'Your schedule has been updated.'); }, 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
        <Text style={styles.schedHint}>
          Set your working hours. You'll only receive job requests during active slots.
        </Text>

        {DAYS.map(day => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, !availability[day].active && { color: Colors.midGray }]}>{day}</Text>
              <Switch
                value={availability[day].active}
                onValueChange={() => toggleDay(day)}
                trackColor={{ false: Colors.lightGray, true: Colors.success }}
                thumbColor={Colors.white}
              />
            </View>
            {availability[day].active && (
              <View style={styles.slotRow}>
                <View style={styles.slotSelect}>
                  <Text style={styles.slotLabel}>From</Text>
                  <Text style={styles.slotVal}>{availability[day].from}</Text>
                </View>
                <Text style={{ color: Colors.midGray, fontSize: 16, fontWeight: '600' }}>—</Text>
                <View style={styles.slotSelect}>
                  <Text style={styles.slotLabel}>To</Text>
                  <Text style={styles.slotVal}>{availability[day].to}</Text>
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity onPress={handleSave} activeOpacity={0.85}
          style={{ borderRadius: Radius.xl, overflow: 'hidden', marginTop: Spacing.base }}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
            style={{ paddingVertical: 16, alignItems: 'center' }}>
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 16 }}>Save Schedule</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// VERIFICATION SCREEN
// ─────────────────────────────────────────────────────────────
const VERIFY_STEPS = [
  { id: 'phone',      label: 'Phone Number',      icon: '📱', status: 'done' },
  { id: 'aadhaar',    label: 'Aadhaar Card',      icon: '🪪', status: 'pending' },
  { id: 'pan',        label: 'PAN Card',           icon: '📋', status: 'pending' },
  { id: 'photo',      label: 'Profile Photo',      icon: '🤳', status: 'pending' },
  { id: 'background', label: 'Background Check',   icon: '🛡️', status: 'processing' },
  { id: 'training',   label: 'Skills Training',    icon: '🎓', status: 'pending' },
];

export function VerificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const STATUS_CONFIG = {
    done:       { label: 'Verified',    color: Colors.success, bg: Colors.successLight, icon: '✓' },
    pending:    { label: 'Upload Now',  color: Colors.warning, bg: Colors.warningLight, icon: '→' },
    processing: { label: 'Processing', color: Colors.info,    bg: Colors.infoLight,    icon: '⏳' },
    rejected:   { label: 'Rejected',   color: Colors.error,   bg: Colors.errorLight,   icon: '✗' },
  };

  const done = VERIFY_STEPS.filter(s => s.status === 'done').length;
  const pct  = Math.round((done / VERIFY_STEPS.length) * 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
        {/* Progress */}
        <LinearGradient colors={['#1A1A2E','#0F3460']} style={styles.verifyProgress}>
          <Text style={styles.verifyPct}>{pct}%</Text>
          <Text style={styles.verifyPctLabel}>Profile Complete</Text>
          <View style={styles.verifyBar}>
            <View style={[styles.verifyBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.verifyNote}>
            Complete all steps to start receiving jobs
          </Text>
        </LinearGradient>

        {/* Steps */}
        {VERIFY_STEPS.map(step => {
          const cfg = STATUS_CONFIG[step.status];
          return (
            <TouchableOpacity key={step.id}
              onPress={() => step.status === 'pending' ? Alert.alert('Upload Document', `Upload your ${step.label}`) : null}
              style={styles.verifyStep} activeOpacity={step.status === 'pending' ? 0.75 : 1}>
              <View style={styles.verifyStepIcon}>
                <Text style={{ fontSize: 26 }}>{step.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyStepLabel}>{step.label}</Text>
                {step.status === 'processing' && (
                  <Text style={[styles.verifyStepSub, { color: Colors.info }]}>Usually takes 24-48 hours</Text>
                )}
              </View>
              <View style={[styles.verifyStatusBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.verifyStatusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.verifyHelp}>
          <Text style={styles.verifyHelpTitle}>Need help with verification?</Text>
          <Text style={styles.verifyHelpSub}>Contact our pro support at prosupport@slotapp.in or call 1800-123-4567</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// TRAINING SCREEN
// ─────────────────────────────────────────────────────────────
const COURSES = [
  { id: '1', title: 'Slot Professional Standards', duration: '45 min', modules: 6, done: true, icon: '🏆' },
  { id: '2', title: 'Customer Communication',    duration: '30 min', modules: 4, done: true, icon: '💬' },
  { id: '3', title: 'Safety & Hygiene Protocols',duration: '25 min', modules: 3, done: false, icon: '🛡️' },
  { id: '4', title: 'Using the Slot Pro App',      duration: '20 min', modules: 5, done: false, icon: '📱' },
  { id: '5', title: 'AC & Appliance Servicing',  duration: '60 min', modules: 8, done: false, icon: '❄️' },
  { id: '6', title: 'Automotive Services Training',duration:'50 min',modules:7, done: false, icon: '🚗' },
];

export function TrainingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const completed = COURSES.filter(c => c.done).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training & Certification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
        {/* Stats bar */}
        <View style={styles.trainingStats}>
          <View style={styles.trainingStat}>
            <Text style={styles.trainingStatVal}>{completed}/{COURSES.length}</Text>
            <Text style={styles.trainingStatLabel}>Completed</Text>
          </View>
          <View style={styles.trainingStatDivider} />
          <View style={styles.trainingStat}>
            <Text style={styles.trainingStatVal}>{COURSES.reduce((s,c) => s + c.modules, 0)}</Text>
            <Text style={styles.trainingStatLabel}>Total Modules</Text>
          </View>
          <View style={styles.trainingStatDivider} />
          <View style={styles.trainingStat}>
            <Text style={styles.trainingStatVal}>{completed >= COURSES.length ? '✓' : `${Math.round(completed/COURSES.length*100)}%`}</Text>
            <Text style={styles.trainingStatLabel}>{completed >= COURSES.length ? 'Certified' : 'Progress'}</Text>
          </View>
        </View>

        {/* Course list */}
        {COURSES.map(course => (
          <TouchableOpacity key={course.id}
            onPress={() => Alert.alert('Start Course', `Open "${course.title}"?`)}
            style={[styles.courseCard, course.done && styles.courseCardDone]} activeOpacity={0.8}>
            <View style={styles.courseIconWrap}>
              <Text style={{ fontSize: 28 }}>{course.icon}</Text>
              {course.done && <View style={styles.courseDoneBadge}><Text style={{ color: Colors.white, fontSize: 10, fontWeight: '800' }}>✓</Text></View>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.courseTitle, course.done && { color: Colors.midGray }]}>{course.title}</Text>
              <Text style={styles.courseMeta}>{course.modules} modules  ·  {course.duration}</Text>
            </View>
            <Text style={[styles.courseStatus, { color: course.done ? Colors.success : Colors.primary }]}>
              {course.done ? 'Done ✓' : 'Start →'}
            </Text>
          </TouchableOpacity>
        ))}

        {completed >= COURSES.length && (
          <View style={styles.certCard}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏅</Text>
            <Text style={styles.certTitle}>Slot Certified Professional</Text>
            <Text style={styles.certSub}>You've completed all training modules. Your certificate is ready to download.</Text>
            <TouchableOpacity style={styles.certBtn}>
              <Text style={styles.certBtnText}>Download Certificate</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  backBtn: { width:40, justifyContent:'center' },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  headerTitle: { ...Typography.h4 },
  // Map
  map: { flex: 1 },
  mapBackBtn: { position:'absolute', left:16, zIndex:10, width:40, height:40, borderRadius:20, backgroundColor:Colors.white, alignItems:'center', justifyContent:'center', ...Shadows.md },
  mapBackIcon: { fontSize:20, fontWeight:'700', color:Colors.black },
  destMarker: { alignItems:'center' },
  destMarkerPin: { width:3, height:14, backgroundColor:Colors.primary, borderRadius:2, marginTop:-4 },
  navSheet: { backgroundColor:Colors.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:Spacing.base, ...Shadows.lg },
  navCustomer: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:Spacing.base },
  navAvatar: { width:44, height:44, borderRadius:22, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  navCustName: { fontWeight:'700', fontSize:15, color:Colors.black },
  navCustAddr: { fontSize:12, color:Colors.midGray, marginTop:2 },
  callIconBtn: { width:40, height:40, borderRadius:20, backgroundColor:Colors.successLight, alignItems:'center', justifyContent:'center' },
  etaStrip: { flexDirection:'row', backgroundColor:Colors.offWhite, borderRadius:Radius.lg, padding:Spacing.md, marginBottom:Spacing.base },
  etaItem: { flex:1, alignItems:'center' },
  etaVal:  { fontWeight:'800', fontSize:18, color:Colors.black },
  etaLabel:{ fontSize:11, color:Colors.midGray, marginTop:2 },
  etaDivider: { width:1, backgroundColor:Colors.lightGray },
  navActions: { flexDirection:'row', gap:10 },
  navActionBtn: { flex:1, paddingVertical:13, borderRadius:Radius.xl, alignItems:'center' },
  navActionText: { fontWeight:'700', fontSize:14 },
  // Schedule
  schedHint: { ...Typography.body, color:Colors.midGray, marginBottom:Spacing.base, lineHeight:21 },
  dayCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, ...Shadows.sm },
  dayHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  dayName: { ...Typography.h4 },
  slotRow: { flexDirection:'row', alignItems:'center', gap:12, marginTop:Spacing.sm },
  slotSelect: { flex:1, backgroundColor:Colors.offWhite, borderRadius:Radius.md, padding:10, alignItems:'center' },
  slotLabel: { ...Typography.caption, marginBottom:2 },
  slotVal: { ...Typography.bodyMed },
  // Verify
  verifyProgress: { borderRadius:Radius.xl, padding:Spacing.xl, alignItems:'center', marginBottom:Spacing.base },
  verifyPct: { color:Colors.white, fontSize:48, fontWeight:'900', lineHeight:52 },
  verifyPctLabel: { color:'rgba(255,255,255,0.65)', fontSize:14, marginBottom:Spacing.base },
  verifyBar: { width:'100%', height:8, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:4, overflow:'hidden', marginBottom:Spacing.sm },
  verifyBarFill: { height:'100%', backgroundColor:Colors.primary, borderRadius:4 },
  verifyNote: { color:'rgba(255,255,255,0.55)', fontSize:12, textAlign:'center' },
  verifyStep: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, ...Shadows.sm },
  verifyStepIcon: { width:48, height:48, borderRadius:Radius.lg, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0 },
  verifyStepLabel: { ...Typography.bodyMed },
  verifyStepSub: { ...Typography.small, marginTop:2 },
  verifyStatusBadge: { paddingHorizontal:10, paddingVertical:4, borderRadius:Radius.pill },
  verifyStatusText: { fontSize:11, fontWeight:'700' },
  verifyHelp: { backgroundColor:Colors.offWhite, borderRadius:Radius.xl, padding:Spacing.base, marginTop:Spacing.base },
  verifyHelpTitle: { ...Typography.bodyMed, marginBottom:4 },
  verifyHelpSub: { ...Typography.small, lineHeight:18 },
  // Training
  trainingStats: { flexDirection:'row', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.base, ...Shadows.card },
  trainingStat: { flex:1, alignItems:'center' },
  trainingStatVal: { ...Typography.h3, color:Colors.primary },
  trainingStatLabel: { ...Typography.caption, marginTop:2 },
  trainingStatDivider: { width:1, backgroundColor:Colors.offWhite },
  courseCard: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, ...Shadows.sm },
  courseCardDone: { opacity:0.7 },
  courseIconWrap: { width:52, height:52, borderRadius:Radius.lg, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' },
  courseDoneBadge: { position:'absolute', top:-2, right:-2, width:18, height:18, borderRadius:9, backgroundColor:Colors.success, alignItems:'center', justifyContent:'center' },
  courseTitle: { ...Typography.bodyMed, lineHeight:20 },
  courseMeta: { ...Typography.small, marginTop:2 },
  courseStatus: { fontWeight:'700', fontSize:13 },
  certCard: { backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:28, alignItems:'center', marginTop:Spacing.base, ...Shadows.lg },
  certTitle: { ...Typography.h3, marginBottom:8 },
  certSub: { ...Typography.body, textAlign:'center', lineHeight:21, marginBottom:Spacing.base },
  certBtn: { backgroundColor:Colors.primary, paddingHorizontal:24, paddingVertical:13, borderRadius:Radius.xl },
  certBtnText: { color:Colors.white, fontWeight:'800', fontSize:14 },
});

// ── ProDetailViewScreen ───────────────────────────────────────
/**
 * Detailed view of a job/customer before accepting
 * Shows address on map, service details, estimated earnings
 */
export function ProDetailViewScreen({ route, navigation }) {
  const { job } = route?.params || {};
  const insets = { top: 44, bottom: 34 }; // safe area fallback

  const handleAccept = () => {
    Alert.alert(
      'Accept Job?',
      `Confirm booking for ${job?.serviceName || 'this service'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => navigation.navigate('JobDetail', { jobId: job?._id }),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.white,
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.sm,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: Colors.black }}>←</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.h3, flex: 1 }}>Job Details</Text>
        <View style={{
          backgroundColor: Colors.successLight,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 20,
        }}>
          <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 12 }}>New Request</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map placeholder */}
        <View style={{ height: 200, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>🗺️</Text>
          <Text style={{ fontSize: 13, color: Colors.gray, marginTop: 8 }}>
            {job?.address?.area || 'HITEC City'}, {job?.address?.city || 'Hyderabad'}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.midGray }}>~{job?.distanceKm || '3.2'} km away</Text>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Service info */}
          <View style={{
            backgroundColor: Colors.white,
            borderRadius: 16,
            padding: 18,
            ...Shadows.sm,
          }}>
            <Text style={{ ...Typography.h3, marginBottom: 14 }}>Service Details</Text>
            {[
              { icon: '🔧', label: 'Service',   value: job?.serviceName   || 'AC Service' },
              { icon: '📅', label: 'Date',      value: job?.scheduledDate || 'Today' },
              { icon: '⏰', label: 'Time',      value: job?.timeSlot      || '10:00 AM – 12:00 PM' },
              { icon: '📍', label: 'Address',   value: job?.address?.line1 || 'HITEC City, Hyderabad' },
              { icon: '👤', label: 'Customer',  value: job?.customerName  || 'Verified Customer' },
            ].map(({ icon, label, value }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                <Text style={{ fontSize: 18, width: 24 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...Typography.caption, color: Colors.gray }}>{label}</Text>
                  <Text style={{ ...Typography.body, fontWeight: '600', marginTop: 2 }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Earnings */}
          <View style={{
            backgroundColor: Colors.successLight,
            borderRadius: 16,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}>
            <Text style={{ fontSize: 36 }}>💰</Text>
            <View>
              <Text style={{ ...Typography.caption, color: Colors.success }}>Your Earnings</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: Colors.success }}>
                ₹{job?.earnings || '350'}
              </Text>
              <Text style={{ ...Typography.caption, color: Colors.success, marginTop: 2 }}>
                After platform fee deduction
              </Text>
            </View>
          </View>

          {/* Customer requirements */}
          {job?.specialInstructions ? (
            <View style={{ backgroundColor: Colors.warningLight, borderRadius: 16, padding: 16 }}>
              <Text style={{ ...Typography.bodyMed, color: Colors.warning, marginBottom: 6 }}>📝 Customer Note</Text>
              <Text style={{ ...Typography.body, color: Colors.darkGray }}>{job.specialInstructions}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={{
        padding: 16,
        paddingBottom: insets.bottom + 8,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        gap: 10,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            ...Shadows.brand,
          }}
          onPress={handleAccept}
        >
          <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 16 }}>
            ✅ Accept Job — ₹{job?.earnings || '350'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.borderLight,
          }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: Colors.gray, fontWeight: '600', fontSize: 14 }}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
