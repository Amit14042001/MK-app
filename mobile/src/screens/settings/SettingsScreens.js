import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, TextInput, StatusBar, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { usersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ═══════════════════════════════════════════════════════════
// SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════
export function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [prefs, setPrefs] = useState({
    pushNotifications: true,
    smsNotifications:  true,
    emailUpdates:      false,
    locationSharing:   true,
    darkMode:          false,
    biometricLogin:    false,
    autoplay:          true,
    dataSync:          true,
  });

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const SECTIONS = [
    {
      title: 'Notifications',
      items: [
        { key: 'pushNotifications', label: 'Push Notifications', sub: 'Booking updates, promos', icon: '🔔' },
        { key: 'smsNotifications',  label: 'SMS Alerts',         sub: 'OTP & booking confirmations', icon: '📱' },
        { key: 'emailUpdates',      label: 'Email Updates',      sub: 'Weekly offers & news', icon: '📧' },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { key: 'locationSharing', label: 'Location Sharing',  sub: 'For accurate tracking', icon: '📍' },
        { key: 'dataSync',        label: 'Data Sync',         sub: 'Sync across devices',  icon: '🔄' },
      ],
    },
    {
      title: 'App',
      items: [
        { key: 'darkMode',       label: 'Dark Mode',        sub: 'Easier on the eyes',       icon: '🌙' },
        { key: 'biometricLogin', label: 'Biometric Login',  sub: 'Use Face ID / Fingerprint', icon: '👆' },
        { key: 'autoplay',       label: 'Autoplay Videos',  sub: 'In service listings',       icon: '▶️' },
      ],
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account', style: 'destructive', onPress: async () => {
          try {
            await usersAPI.deleteAccount();
            logout();
          } catch { Alert.alert('Error', 'Could not delete account. Contact support.'); }
        }},
      ]
    );
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 60 }}>
        {SECTIONS.map(section => (
          <View key={section.title} style={{ marginBottom: Spacing.xl }}>
            <Text style={S.sectionLabel}>{section.title.toUpperCase()}</Text>
            <View style={S.card}>
              {section.items.map((item, i) => (
                <View key={item.key} style={[S.settingRow, i < section.items.length - 1 && S.settingBorder]}>
                  <View style={S.settingIcon}><Text style={{ fontSize: 20 }}>{item.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.settingLabel}>{item.label}</Text>
                    <Text style={S.settingSub}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: Colors.lightGray, true: Colors.success }}
                    thumbColor={Colors.white}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* App Info */}
        <Text style={S.sectionLabel}>ABOUT</Text>
        <View style={S.card}>
          {[
            { label: 'App Version',     value: '1.0.0 (Build 1)',     icon: '📱' },
            { label: 'Privacy Policy',  value: '',                     icon: '🔒', onPress: () => Linking.openURL('https://mkapp.in/privacy') },
            { label: 'Terms of Service',value: '',                     icon: '📄', onPress: () => Linking.openURL('https://mkapp.in/terms') },
            { label: 'Licences',        value: '',                     icon: '⚖️', onPress: () => {} },
          ].map((item, i, arr) => (
            <TouchableOpacity key={item.label} onPress={item.onPress}
              style={[S.infoRow, i < arr.length - 1 && S.settingBorder]}>
              <Text style={{ fontSize: 18, width: 32 }}>{item.icon}</Text>
              <Text style={[S.settingLabel, { flex: 1 }]}>{item.label}</Text>
              {item.value ? <Text style={S.infoValue}>{item.value}</Text> : <Text style={{ color: Colors.lightGray, fontSize: 18 }}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger zone */}
        <TouchableOpacity onPress={handleDeleteAccount} style={S.deleteBtn}>
          <Text style={S.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// PRIVACY SCREEN
// ═══════════════════════════════════════════════════════════
export function PrivacyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [consents, setConsents] = useState({
    analyticsData: true,
    personalizedAds: false,
    thirdPartySharing: false,
  });

  const toggle = (k) => setConsents(p => ({ ...p, [k]: !p[k] }));

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 60 }}>
        <Text style={S.sectionLabel}>DATA PERMISSIONS</Text>
        <View style={S.card}>
          {[
            { key: 'analyticsData',      label: 'Usage Analytics',     sub: 'Help us improve app performance' },
            { key: 'personalizedAds',    label: 'Personalized Offers',  sub: 'Receive relevant offers' },
            { key: 'thirdPartySharing',  label: 'Partner Data Sharing', sub: 'Share data with MK partners' },
          ].map((item, i, arr) => (
            <View key={item.key} style={[S.settingRow, i < arr.length - 1 && S.settingBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={S.settingLabel}>{item.label}</Text>
                <Text style={S.settingSub}>{item.sub}</Text>
              </View>
              <Switch value={consents[item.key]} onValueChange={() => toggle(item.key)} trackColor={{ false: Colors.lightGray, true: Colors.success }} thumbColor={Colors.white} />
            </View>
          ))}
        </View>

        <Text style={[S.sectionLabel, { marginTop: Spacing.xl }]}>YOUR DATA RIGHTS</Text>
        <View style={S.card}>
          {[
            { label: 'Download My Data',  icon: '📥', onPress: () => Alert.alert('Request submitted', 'You will receive your data within 30 days.') },
            { label: 'View Privacy Policy', icon: '🔒', onPress: () => Linking.openURL('https://mkapp.in/privacy') },
            { label: 'Report Privacy Issue', icon: '🚨', onPress: () => {} },
          ].map((item, i, arr) => (
            <TouchableOpacity key={item.label} onPress={item.onPress} style={[S.infoRow, i < arr.length - 1 && S.settingBorder]}>
              <Text style={{ fontSize: 18, width: 32 }}>{item.icon}</Text>
              <Text style={[S.settingLabel, { flex: 1 }]}>{item.label}</Text>
              <Text style={{ color: Colors.lightGray, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// REPORT ISSUE SCREEN
// ═══════════════════════════════════════════════════════════
export function ReportIssueScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES = [
    'Wrong charge / payment',
    'Professional was rude / unprofessional',
    'Service quality was poor',
    'Professional did not show up',
    'App is buggy / not working',
    'Safety concern',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!category || !description) {
      Alert.alert('Please fill all fields'); return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('Report Submitted 🙏', 'Our team will review your report within 24 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1500);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Report an Issue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}>
        <Text style={S.sectionLabel}>ISSUE TYPE</Text>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setCategory(cat)}
            style={[S.categoryRow, category === cat && S.categoryRowActive]}>
            <View style={[S.categoryRadio, category === cat && S.categoryRadioActive]}>
              {category === cat && <View style={S.categoryRadioDot} />}
            </View>
            <Text style={[S.categoryText, category === cat && { color: Colors.primary, fontWeight: '700' }]}>{cat}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[S.sectionLabel, { marginTop: Spacing.xl }]}>DESCRIBE THE ISSUE</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          placeholder="Please describe what happened in detail..."
          placeholderTextColor={Colors.lightGray}
          style={S.descInput}
          textAlignVertical="top"
        />

        <Text style={S.reportNote}>
          🕵️ All reports are reviewed within 24 hours by our Quality team.
        </Text>
      </ScrollView>

      <View style={[S.cta, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}} style={S.ctaGradient}>
            <Text style={S.ctaText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// REVIEW SCREEN (rate after booking)
// ═══════════════════════════════════════════════════════════
export function ReviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, serviceId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hovered, setHovered] = useState(0);
  const [subRatings, setSubRatings] = useState({ punctuality: 0, professionalism: 0, quality: 0 });
  const [submitting, setSubmitting] = useState(false);
  const { reviewsAPI } = require('../../utils/api');

  const QUICK = ['Great work!','Very professional','On time & efficient','Highly recommend!','Clean & tidy','Excellent service'];

  const handleSubmit = async () => {
    if (!rating) { Alert.alert('Please rate the service'); return; }
    setSubmitting(true);
    try {
      await reviewsAPI.create({ bookingId, serviceId, rating, comment, subRatings });
      Alert.alert('Thank you! 🌟', 'Your review helps millions choose better.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch { Alert.alert('Error', 'Could not submit review.'); }
    finally { setSubmitting(false); }
  };

  const displayRating = hovered || rating;
  const LABELS = ['','Poor 😞','Fair 😐','Good 🙂','Great 😊','Excellent! 🤩'];

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Rate Your Experience</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 120 }}>
        {/* Stars */}
        <View style={S.starsSection}>
          <View style={S.starsRow}>
            {[1,2,3,4,5].map(i => (
              <TouchableOpacity key={i} onPress={() => setRating(i)}>
                <Text style={[S.bigStar, { color: i <= displayRating ? Colors.star : Colors.lightGray }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[S.ratingLabel, displayRating && { color: Colors.primary }]}>
            {LABELS[displayRating] || 'Tap to rate'}
          </Text>
        </View>

        {/* Sub-ratings */}
        <View style={S.subCard}>
          <Text style={S.subCardTitle}>Rate specific aspects</Text>
          {[
            { key: 'punctuality',     label: 'On Time',        icon: '⏰' },
            { key: 'professionalism', label: 'Professional',   icon: '👔' },
            { key: 'quality',         label: 'Work Quality',   icon: '⭐' },
          ].map(({ key, label, icon }) => (
            <View key={key} style={S.subRow}>
              <Text style={S.subIcon}>{icon}</Text>
              <Text style={S.subLabel}>{label}</Text>
              <View style={S.subStars}>
                {[1,2,3,4,5].map(i => (
                  <TouchableOpacity key={i} onPress={() => setSubRatings(p => ({ ...p, [key]: i }))}>
                    <Text style={{ fontSize: 22, color: i <= subRatings[key] ? Colors.star : Colors.lightGray }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Quick phrases */}
        <Text style={S.sectionLabel}>QUICK COMPLIMENTS</Text>
        <View style={S.quickRow}>
          {QUICK.map(p => (
            <TouchableOpacity key={p} onPress={() => setComment(c => c ? `${c} ${p}` : p)}
              style={[S.quickChip, comment.includes(p) && S.quickChipActive]}>
              <Text style={[S.quickText, comment.includes(p) && { color: Colors.primary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment */}
        <Text style={[S.sectionLabel, { marginTop: Spacing.xl }]}>WRITE A REVIEW</Text>
        <TextInput
          value={comment} onChangeText={setComment} multiline numberOfLines={4}
          placeholder="Tell others about your experience..."
          placeholderTextColor={Colors.lightGray}
          style={S.commentInput} textAlignVertical="top"
        />
      </ScrollView>

      <View style={[S.cta, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={handleSubmit} disabled={!rating || submitting} activeOpacity={0.85}
          style={{ opacity: !rating ? 0.5 : 1 }}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}} style={S.ctaGradient}>
            <Text style={S.ctaText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  backBtn: { width:40 },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  headerTitle: { ...Typography.h4 },
  sectionLabel: { fontSize:11, fontWeight:'700', color:Colors.midGray, letterSpacing:1, textTransform:'uppercase', marginBottom:Spacing.sm },
  card: { backgroundColor:Colors.white, borderRadius:Radius.xl, overflow:'hidden', ...Shadows.card, marginBottom:4 },
  settingRow: { flexDirection:'row', alignItems:'center', padding:Spacing.base, gap:12 },
  settingBorder: { borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  settingIcon: { width:36, height:36, borderRadius:Radius.md, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center' },
  settingLabel: { ...Typography.bodyMed },
  settingSub: { ...Typography.small, marginTop:2 },
  infoRow: { flexDirection:'row', alignItems:'center', padding:Spacing.base, gap:10 },
  infoValue: { ...Typography.small, color:Colors.midGray },
  deleteBtn: { marginTop:Spacing.xxl, padding:Spacing.base, borderRadius:Radius.xl, borderWidth:1.5, borderColor:Colors.error, alignItems:'center' },
  deleteBtnText: { color:Colors.error, fontWeight:'700', fontSize:15 },
  // Report
  categoryRow: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, ...Shadows.sm },
  categoryRowActive: { borderWidth:1.5, borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  categoryRadio: { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:Colors.lightGray, alignItems:'center', justifyContent:'center' },
  categoryRadioActive: { borderColor:Colors.primary },
  categoryRadioDot: { width:10, height:10, borderRadius:5, backgroundColor:Colors.primary },
  categoryText: { flex:1, fontSize:14, color:Colors.gray, fontWeight:'500' },
  descInput: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, fontSize:14, color:Colors.black, borderWidth:1.5, borderColor:Colors.offWhite, minHeight:120, fontFamily:'System', marginBottom:Spacing.base },
  reportNote: { ...Typography.small, color:Colors.midGray, textAlign:'center', lineHeight:18 },
  cta: { position:'absolute', bottom:0, left:0, right:0, padding:Spacing.base, backgroundColor:Colors.white, borderTopWidth:1, borderTopColor:Colors.offWhite, ...Shadows.lg },
  ctaGradient: { borderRadius:Radius.xl, paddingVertical:16, alignItems:'center' },
  ctaText: { color:Colors.white, fontWeight:'800', fontSize:16 },
  // Review
  starsSection: { alignItems:'center', paddingVertical:Spacing.xl },
  starsRow: { flexDirection:'row', gap:Spacing.sm, marginBottom:Spacing.md },
  bigStar: { fontSize:48 },
  ratingLabel: { fontSize:18, fontWeight:'700', color:Colors.midGray },
  subCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.xl, ...Shadows.card },
  subCardTitle: { ...Typography.bodyMed, marginBottom:Spacing.md, color:Colors.midGray },
  subRow: { flexDirection:'row', alignItems:'center', marginBottom:Spacing.md },
  subIcon: { fontSize:18, width:28 },
  subLabel: { flex:1, ...Typography.bodyMed },
  subStars: { flexDirection:'row', gap:4 },
  quickRow: { flexDirection:'row', flexWrap:'wrap', gap:Spacing.sm, marginBottom:Spacing.base },
  quickChip: { paddingHorizontal:14, paddingVertical:9, borderRadius:Radius.pill, borderWidth:1.5, borderColor:Colors.lightGray, backgroundColor:Colors.white },
  quickChipActive: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  quickText: { fontSize:13, fontWeight:'600', color:Colors.gray },
  commentInput: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, fontSize:14, color:Colors.black, borderWidth:1.5, borderColor:Colors.offWhite, minHeight:100, fontFamily:'System' },
});
