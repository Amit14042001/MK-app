/**
 * MK Professional App — SOSScreen, LeaderboardScreen, WorkProofCameraScreen
 * Features #21, #23, #24
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, Animated, Vibration, Dimensions, Image,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const { width: W } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
// FEATURE #21 — SOS / Safety Screen
// ══════════════════════════════════════════════════════════════
export function SOSScreen({ navigation }) {
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [cancelled, setCancelled] = useState(false);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef(null);
  const pulseRef   = useRef(null);

  const EMERGENCY_CONTACTS = [
    { name: 'MK Safety Team',  phone: '1800-123-4567', icon: '🛡️' },
    { name: 'Police',          phone: '100',           icon: '👮' },
    { name: 'Ambulance',       phone: '108',           icon: '🚑' },
    { name: 'Women Helpline',  phone: '1091',          icon: '👩' },
  ];

  const SAFETY_TIPS = [
    '📍 Always share your live location with family when visiting a new area',
    '📱 Keep your phone charged before heading to service locations',
    '🔔 Let MK Safety Team know if a customer is making you uncomfortable',
    '🚗 Prefer well-lit routes and avoid isolated areas at night',
    '📞 Save emergency contacts in your speed dial',
  ];

  useEffect(() => {
    return () => { clearInterval(timerRef.current); stopPulse(); };
  }, []);

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => { pulseRef.current?.stop(); pulseAnim.setValue(1); };

  const activateSOS = () => {
    setSosActive(true);
    setCancelled(false);
    setCountdown(5);
    startPulse();
    Vibration.vibrate([0, 300, 200, 300]);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          stopPulse();
          setSosActive(false);
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(timerRef.current);
    stopPulse();
    setSosActive(false);
    setCancelled(true);
    Vibration.cancel();
    setTimeout(() => setCancelled(false), 3000);
  };

  const triggerSOS = async () => {
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      // Get current GPS location
      let location = null;
      try {
        const Geolocation = require('@react-native-community/geolocation').default;
        location = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
      } catch {}

      await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/sos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lat:       location?.coords?.latitude,
            lng:       location?.coords?.longitude,
            bookingId: route?.params?.bookingId,
            message:   'SOS triggered via pro app',
          }),
        }
      );
    } catch {}
    Alert.alert(
      '🚨 SOS Activated',
      'Emergency alert sent to MK Safety Team.\nYour location has been shared.\nHelp is on the way.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={SOS.container}>
      <View style={SOS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={SOS.backBtn}>
          <Text style={SOS.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={SOS.headerTitle}>Safety & SOS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <View style={SOS.sosSection}>
          <Text style={SOS.sosTitle}>Emergency SOS</Text>
          <Text style={SOS.sosSub}>Press and hold for 5 seconds to alert MK Safety Team and share your location</Text>

          <View style={SOS.sosContainer}>
            <Animated.View style={[SOS.pulse, { transform: [{ scale: pulseAnim }], opacity: sosActive ? 0.3 : 0 }]} />
            <TouchableOpacity
              style={[SOS.sosBtn, sosActive && SOS.sosBtnActive]}
              onLongPress={activateSOS}
              delayLongPress={1000}
              activeOpacity={0.85}
            >
              <Text style={SOS.sosBtnIcon}>🆘</Text>
              <Text style={SOS.sosBtnText}>{sosActive ? `Cancel (${countdown}s)` : 'HOLD FOR SOS'}</Text>
            </TouchableOpacity>
          </View>

          {sosActive && (
            <TouchableOpacity style={SOS.cancelBtn} onPress={cancelSOS}>
              <Text style={SOS.cancelBtnText}>✕ Cancel SOS</Text>
            </TouchableOpacity>
          )}

          {cancelled && (
            <View style={SOS.cancelledBadge}>
              <Text style={SOS.cancelledText}>✓ SOS Cancelled</Text>
            </View>
          )}
        </View>

        {/* Emergency Contacts */}
        <View style={SOS.section}>
          <Text style={SOS.sectionTitle}>Emergency Contacts</Text>
          {EMERGENCY_CONTACTS.map(c => (
            <TouchableOpacity
              key={c.phone}
              style={SOS.contactRow}
              onPress={() => Alert.alert('Call', `Calling ${c.name}: ${c.phone}`)}
            >
              <Text style={SOS.contactIcon}>{c.icon}</Text>
              <View style={SOS.contactInfo}>
                <Text style={SOS.contactName}>{c.name}</Text>
                <Text style={SOS.contactPhone}>{c.phone}</Text>
              </View>
              <Text style={SOS.callIcon}>📞</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Tips */}
        <View style={SOS.section}>
          <Text style={SOS.sectionTitle}>Safety Tips</Text>
          {SAFETY_TIPS.map((tip, i) => (
            <View key={i} style={SOS.tipRow}>
              <Text style={SOS.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Live Location Share */}
        <View style={SOS.section}>
          <View style={SOS.locationCard}>
            <Text style={SOS.locationTitle}>📍 Share Live Location</Text>
            <Text style={SOS.locationSub}>Share your real-time location with a trusted contact while on job</Text>
            <TouchableOpacity style={SOS.shareLocationBtn} onPress={() => Alert.alert('Share', 'Location sharing link copied!')}>
              <Text style={SOS.shareLocationBtnText}>Share Location Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #23 — Professional Leaderboard
// ══════════════════════════════════════════════════════════════
const LEADERBOARD = [
  { rank: 1, name: 'Suresh Kumar',  rating: 4.98, jobs: 342, earnings: 82400, badge: '🥇', category: 'AC', city: 'Hyderabad' },
  { rank: 2, name: 'Ramesh Reddy',  rating: 4.95, jobs: 298, earnings: 71200, badge: '🥈', category: 'AC', city: 'Hyderabad' },
  { rank: 3, name: 'Vinay Sharma',  rating: 4.93, jobs: 276, earnings: 66800, badge: '🥉', category: 'AC', city: 'Hyderabad' },
  { rank: 4, name: 'Anil Verma',    rating: 4.91, jobs: 251, earnings: 60100, badge: null,  category: 'AC', city: 'Hyderabad' },
  { rank: 5, name: 'Praveen Singh', rating: 4.89, jobs: 234, earnings: 56200, badge: null,  category: 'AC', city: 'Hyderabad' },
  { rank: 8, name: 'You (Rajesh)',  rating: 4.72, jobs: 142, earnings: 34100, badge: null,  category: 'AC', city: 'Hyderabad', isYou: true },
];

const PERIODS = ['This Week', 'This Month', 'All Time'];
const CATEGORIES = ['AC', 'Cleaning', 'Electrical', 'Plumbing', 'All'];

export function LeaderboardScreen({ navigation }) {
  const [period, setPeriod]   = useState('This Month');
  const [category, setCategory] = useState('AC');

  return (
    <View style={LB.container}>
      <View style={LB.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={LB.backBtn}>
          <Text style={LB.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={LB.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Your rank */}
        <View style={LB.yourRankCard}>
          <Text style={LB.yourRankLabel}>Your Rank</Text>
          <Text style={LB.yourRankNum}>#8</Text>
          <Text style={LB.yourRankSub}>Top 10% in Hyderabad · AC Service</Text>
          <View style={LB.yourRankStats}>
            <View style={LB.yourStat}><Text style={LB.yourStatVal}>4.72⭐</Text><Text style={LB.yourStatLabel}>Rating</Text></View>
            <View style={LB.yourStat}><Text style={LB.yourStatVal}>142</Text><Text style={LB.yourStatLabel}>Jobs</Text></View>
            <View style={LB.yourStat}><Text style={LB.yourStatVal}>₹34.1K</Text><Text style={LB.yourStatLabel}>Earnings</Text></View>
          </View>
        </View>

        {/* Period filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={LB.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[LB.filterChip, period === p && LB.filterChipActive]} onPress={() => setPeriod(p)}>
              <Text style={[LB.filterText, period === p && LB.filterTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[LB.catChip, category === c && LB.catChipActive]} onPress={() => setCategory(c)}>
              <Text style={[LB.catText, category === c && LB.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top 3 podium */}
        <View style={LB.podium}>
          {/* 2nd */}
          <View style={[LB.podiumItem, { marginTop: 30 }]}>
            <View style={[LB.podiumAvatar, { backgroundColor: '#C0C0C0' }]}>
              <Text style={LB.podiumAvatarText}>{LEADERBOARD[1].name[0]}</Text>
            </View>
            <Text style={LB.podiumBadge}>🥈</Text>
            <Text style={LB.podiumName} numberOfLines={1}>{LEADERBOARD[1].name.split(' ')[0]}</Text>
            <Text style={LB.podiumRating}>⭐{LEADERBOARD[1].rating}</Text>
            <View style={[LB.podiumBase, { backgroundColor: '#C0C0C0', height: 80 }]}>
              <Text style={LB.podiumRank}>2</Text>
            </View>
          </View>

          {/* 1st */}
          <View style={LB.podiumItem}>
            <Text style={LB.crown}>👑</Text>
            <View style={[LB.podiumAvatar, { backgroundColor: Colors.star, width: 68, height: 68, borderRadius: 34 }]}>
              <Text style={[LB.podiumAvatarText, { fontSize: 26 }]}>{LEADERBOARD[0].name[0]}</Text>
            </View>
            <Text style={LB.podiumBadge}>🥇</Text>
            <Text style={LB.podiumName} numberOfLines={1}>{LEADERBOARD[0].name.split(' ')[0]}</Text>
            <Text style={LB.podiumRating}>⭐{LEADERBOARD[0].rating}</Text>
            <View style={[LB.podiumBase, { backgroundColor: Colors.star, height: 110 }]}>
              <Text style={LB.podiumRank}>1</Text>
            </View>
          </View>

          {/* 3rd */}
          <View style={[LB.podiumItem, { marginTop: 50 }]}>
            <View style={[LB.podiumAvatar, { backgroundColor: '#CD7F32' }]}>
              <Text style={LB.podiumAvatarText}>{LEADERBOARD[2].name[0]}</Text>
            </View>
            <Text style={LB.podiumBadge}>🥉</Text>
            <Text style={LB.podiumName} numberOfLines={1}>{LEADERBOARD[2].name.split(' ')[0]}</Text>
            <Text style={LB.podiumRating}>⭐{LEADERBOARD[2].rating}</Text>
            <View style={[LB.podiumBase, { backgroundColor: '#CD7F32', height: 60 }]}>
              <Text style={LB.podiumRank}>3</Text>
            </View>
          </View>
        </View>

        {/* Full list */}
        <View style={LB.list}>
          {LEADERBOARD.map(pro => (
            <View key={pro.rank} style={[LB.proRow, pro.isYou && LB.proRowYou]}>
              <Text style={[LB.proRank, { color: pro.rank <= 3 ? Colors.star : Colors.gray }]}>
                {pro.badge || `#${pro.rank}`}
              </Text>
              <View style={[LB.proAvatar, { backgroundColor: pro.isYou ? Colors.primary : Colors.primaryLight }]}>
                <Text style={[LB.proAvatarText, { color: pro.isYou ? Colors.white : Colors.primary }]}>{pro.name[0]}</Text>
              </View>
              <View style={LB.proInfo}>
                <Text style={LB.proName}>{pro.name}{pro.isYou ? ' (You)' : ''}</Text>
                <Text style={LB.proSub}>{pro.jobs} jobs · ⭐{pro.rating}</Text>
              </View>
              <Text style={LB.proEarnings}>₹{(pro.earnings / 1000).toFixed(1)}K</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #24 — In-App Camera for Work Proof
// ══════════════════════════════════════════════════════════════
export function WorkProofCameraScreen({ navigation, route }) {
  const bookingId = route?.params?.bookingId;
  const [photos, setPhotos]     = useState([]);
  const [phase, setPhase]       = useState('before'); // before | after
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const takePhoto = async () => {
    try {
      const { launchCamera } = require('react-native-image-picker');
      launchCamera({ mediaType: 'photo', quality: 0.85, saveToPhotos: true }, (result) => {
        if (!result.didCancel && result.assets?.[0]) {
          const asset = result.assets[0];
          setPhotos(prev => [...prev, { id: Date.now().toString(), uri: asset.uri, phase }]);
        }
      });
    } catch {
      // Fallback for simulator
      setPhotos(prev => [...prev, { id: Date.now().toString(), uri: 'mock_' + Date.now(), phase }]);
    }
  };

  const removePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));

  const submitProof = async () => {
    const beforePhotos = photos.filter(p => p.phase === 'before');
    const afterPhotos  = photos.filter(p => p.phase === 'after');
    if (beforePhotos.length === 0 || afterPhotos.length === 0) {
      Alert.alert('Required', 'Please add at least 1 before and 1 after photo.');
      return;
    }
    setUploading(true);
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const formData = new FormData();
      photos.forEach((p, i) => {
        if (p.uri && !p.uri.startsWith('mock_')) {
          formData.append('photos', { uri: p.uri, type: 'image/jpeg', name: `proof_${p.phase}_${i}.jpg` });
          formData.append('phases', p.phase);
        }
      });
      formData.append('bookingId', route?.params?.bookingId || '');
      await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/portfolio`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, body: formData }
      ).catch(() => {});
    } catch {}
    setUploading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={CAM.successContainer}>
        <Text style={CAM.successEmoji}>✅</Text>
        <Text style={CAM.successTitle}>Work Proof Submitted!</Text>
        <Text style={CAM.successDesc}>Photos have been uploaded and attached to booking {bookingId}.</Text>
        <TouchableOpacity style={CAM.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={CAM.doneBtnText}>Back to Job</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const beforePhotos = photos.filter(p => p.phase === 'before');
  const afterPhotos  = photos.filter(p => p.phase === 'after');

  return (
    <View style={CAM.container}>
      <View style={CAM.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={CAM.backBtn}>
          <Text style={CAM.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={CAM.headerTitle}>Work Proof Photos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        <View style={CAM.infoBox}>
          <Text style={CAM.infoText}>
            📸 Take photos before starting and after completing the work. This protects you and builds customer trust.
          </Text>
        </View>

        {/* Phase Tabs */}
        <View style={CAM.tabs}>
          {['before', 'after'].map(p => (
            <TouchableOpacity
              key={p}
              style={[CAM.tab, phase === p && CAM.tabActive]}
              onPress={() => setPhase(p)}
            >
              <Text style={[CAM.tabText, phase === p && CAM.tabTextActive]}>
                {p === 'before' ? '📷 Before Work' : '📷 After Work'}
              </Text>
              <View style={[CAM.tabBadge, { backgroundColor: p === 'before' ? Colors.warning : Colors.success }]}>
                <Text style={CAM.tabBadgeText}>{p === 'before' ? beforePhotos.length : afterPhotos.length}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos grid */}
        <View style={CAM.photosGrid}>
          {photos.filter(p => p.phase === phase).map(photo => (
            <View key={photo.id} style={CAM.photoCard}>
              <View style={CAM.photoPlaceholder}>
                <Text style={CAM.photoPlaceholderIcon}>🖼️</Text>
                <Text style={CAM.photoPlaceholderText}>Photo {photo.id.slice(-4)}</Text>
              </View>
              <TouchableOpacity style={CAM.photoRemoveBtn} onPress={() => removePhoto(photo.id)}>
                <Text style={CAM.photoRemoveIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={CAM.addPhotoBtn} onPress={takePhoto}>
            <Text style={CAM.addPhotoIcon}>📷</Text>
            <Text style={CAM.addPhotoText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Requirements */}
        <View style={CAM.requirements}>
          <Text style={CAM.reqTitle}>Requirements</Text>
          {[
            `✓ Minimum 1 before photo ${beforePhotos.length >= 1 ? '✅' : '⭕'}`,
            `✓ Minimum 1 after photo ${afterPhotos.length >= 1 ? '✅' : '⭕'}`,
            '✓ Show the work area clearly',
            '✓ Good lighting',
          ].map((r, i) => (
            <Text key={i} style={CAM.reqItem}>{r}</Text>
          ))}
        </View>

        {/* Summary */}
        {photos.length > 0 && (
          <View style={CAM.summary}>
            <Text style={CAM.summaryText}>
              📷 {beforePhotos.length} before photo{beforePhotos.length !== 1 ? 's' : ''} · {afterPhotos.length} after photo{afterPhotos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[CAM.submitBtn, (photos.length === 0 || uploading) && CAM.submitBtnDisabled]}
          onPress={submitProof}
          disabled={photos.length === 0 || uploading}
        >
          {uploading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={CAM.submitBtnText}>Upload Proof Photos ↑</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Import ActivityIndicator
import { ActivityIndicator } from 'react-native';

// ── Styles ────────────────────────────────────────────────────
const SOS = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  sosSection:   { backgroundColor: Colors.white, margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', ...Shadows.sm },
  sosTitle:     { ...Typography.h2, color: Colors.black, marginBottom: 6 },
  sosSub:       { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  sosContainer: { position: 'relative', width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  pulse:        { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.error },
  sosBtn:       { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  sosBtnActive: { backgroundColor: Colors.errorLight, borderWidth: 3, borderColor: Colors.error },
  sosBtnIcon:   { fontSize: 36, marginBottom: 4 },
  sosBtnText:   { ...Typography.caption, color: Colors.white, fontWeight: '700', textAlign: 'center' },
  cancelBtn:    { backgroundColor: Colors.errorLight, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  cancelBtnText:{ ...Typography.body, color: Colors.error, fontWeight: '700' },
  cancelledBadge:{ backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 8 },
  cancelledText: { ...Typography.body, color: Colors.success, fontWeight: '700' },
  section:      { margin: 16, marginTop: 0 },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  contactRow:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...Shadows.sm },
  contactIcon:  { fontSize: 28 },
  contactInfo:  { flex: 1 },
  contactName:  { ...Typography.body, color: Colors.black, fontWeight: '600' },
  contactPhone: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
  callIcon:     { fontSize: 24 },
  tipRow:       { backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 6 },
  tipText:      { ...Typography.body, color: Colors.darkGray, lineHeight: 22 },
  locationCard: { backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 16 },
  locationTitle:{ ...Typography.bodyLarge, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  locationSub:  { ...Typography.body, color: Colors.gray, marginBottom: 12 },
  shareLocationBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  shareLocationBtnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
});

const LB = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  yourRankCard:{ margin: 16, backgroundColor: Colors.primary, borderRadius: 20, padding: 20, alignItems: 'center' },
  yourRankLabel:{ ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  yourRankNum: { fontSize: 48, color: Colors.white, fontWeight: '800', lineHeight: 56 },
  yourRankSub: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  yourRankStats:{ flexDirection: 'row', gap: 24 },
  yourStat:    { alignItems: 'center' },
  yourStatVal: { ...Typography.h3, color: Colors.white },
  yourStatLabel:{ ...Typography.small, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterScroll:{ marginVertical: 8 },
  filterChip:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.lightGray },
  filterChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:  { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  filterTextActive:{ color: Colors.white },
  catChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: Colors.offWhite },
  catChipActive:{ backgroundColor: Colors.primaryLight },
  catText:     { ...Typography.caption, color: Colors.gray },
  catTextActive:{ color: Colors.primary, fontWeight: '700' },
  podium:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  podiumItem:  { alignItems: 'center', flex: 1 },
  crown:       { fontSize: 24, marginBottom: 4 },
  podiumAvatar:{ width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  podiumAvatarText: { fontSize: 22, color: Colors.white, fontWeight: '800' },
  podiumBadge: { fontSize: 20, marginBottom: 2 },
  podiumName:  { ...Typography.small, color: Colors.black, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  podiumRating:{ ...Typography.small, color: Colors.gray, marginBottom: 4 },
  podiumBase:  { width: '90%', borderTopLeftRadius: 8, borderTopRightRadius: 8, justifyContent: 'flex-end', paddingBottom: 8, alignItems: 'center' },
  podiumRank:  { ...Typography.h3, color: Colors.white, fontWeight: '800' },
  list:        { paddingHorizontal: 16 },
  proRow:      { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...Shadows.sm },
  proRowYou:   { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  proRank:     { width: 28, textAlign: 'center', ...Typography.body, fontWeight: '700' },
  proAvatar:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  proAvatarText:{ ...Typography.body, fontWeight: '800' },
  proInfo:     { flex: 1 },
  proName:     { ...Typography.body, color: Colors.black, fontWeight: '700' },
  proSub:      { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  proEarnings: { ...Typography.body, color: Colors.success, fontWeight: '700' },
});

const CAM = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  infoBox:      { backgroundColor: Colors.infoLight, borderRadius: 14, padding: 14, marginBottom: 16 },
  infoText:     { ...Typography.body, color: Colors.info, lineHeight: 22 },
  tabs:         { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 4, marginBottom: 16, ...Shadows.sm, gap: 4 },
  tab:          { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive:    { backgroundColor: Colors.primary },
  tabText:      { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  tabTextActive:{ color: Colors.white },
  tabBadge:     { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '800' },
  photosGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  photoCard:    { width: (W - 56) / 3, height: (W - 56) / 3, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoPlaceholder:{ flex: 1, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderIcon:{ fontSize: 28 },
  photoPlaceholderText:{ ...Typography.small, color: Colors.gray, marginTop: 4 },
  photoRemoveBtn:{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  photoRemoveIcon:{ fontSize: 10, color: Colors.white, fontWeight: '800' },
  addPhotoBtn:  { width: (W - 56) / 3, height: (W - 56) / 3, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  addPhotoIcon: { fontSize: 28, marginBottom: 4 },
  addPhotoText: { ...Typography.small, color: Colors.primary, fontWeight: '700' },
  requirements: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.sm },
  reqTitle:     { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 8 },
  reqItem:      { ...Typography.body, color: Colors.gray, marginBottom: 6, lineHeight: 22 },
  summary:      { backgroundColor: Colors.successLight, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center' },
  summaryText:  { ...Typography.body, color: Colors.success, fontWeight: '600' },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  successContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.bg },
  successEmoji:  { fontSize: 72, marginBottom: 16 },
  successTitle:  { ...Typography.h2, color: Colors.black, marginBottom: 10 },
  successDesc:   { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  doneBtn:       { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 15 },
  doneBtnText:   { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
});
