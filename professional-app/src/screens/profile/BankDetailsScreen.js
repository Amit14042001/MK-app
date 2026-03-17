import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Switch, FlatList, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { useProfAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const hdr = (navigation, title) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
      <Text style={styles.backIcon}>←</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width:40 }} />
  </View>
);

// ─────────────────────────────────────────────────────────────
// BANK DETAILS SCREEN
// ─────────────────────────────────────────────────────────────
export function BankDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ accountNumber:'', ifsc:'', bankName:'', accountHolder:'', upiId:'' });
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.accountNumber || !form.ifsc) { Alert.alert('Fill required fields'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/professionals/bank-details`, form);
      setVerified(true);
      Alert.alert('Saved!', 'Bank details updated. Withdrawals will be processed within 24 hours.');
    } catch { Alert.alert('Error', 'Could not save. Please try again.'); }
    finally { setSaving(false); }
  };

  const inputStyle = { borderWidth:1.5, borderColor:Colors.offWhite, borderRadius:Radius.lg, padding:Spacing.md, fontSize:14, color:Colors.black, backgroundColor:Colors.white, marginBottom:Spacing.md, fontFamily:'System' };

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      {hdr(navigation, 'Bank Account & UPI')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:100 }}>
        {/* Security note */}
        <View style={styles.securityNote}>
          <Text style={{ fontSize:20 }}>🔒</Text>
          <Text style={styles.securityText}>Your bank details are encrypted and never shared with customers</Text>
        </View>

        {/* Account details */}
        <Text style={styles.sectionTitle}>Bank Account</Text>
        <Text style={styles.fieldLabel}>ACCOUNT HOLDER NAME *</Text>
        <TextInput value={form.accountHolder} onChangeText={v=>set('accountHolder',v)} placeholder="As per bank records" placeholderTextColor={Colors.lightGray} style={inputStyle} />

        <Text style={styles.fieldLabel}>ACCOUNT NUMBER *</Text>
        <TextInput value={form.accountNumber} onChangeText={v=>set('accountNumber',v.replace(/\D/g,''))} placeholder="Account number" keyboardType="number-pad" secureTextEntry placeholderTextColor={Colors.lightGray} style={inputStyle} />

        <Text style={styles.fieldLabel}>IFSC CODE *</Text>
        <TextInput value={form.ifsc} onChangeText={v=>set('ifsc',v.toUpperCase())} placeholder="e.g. HDFC0001234" autoCapitalize="characters" placeholderTextColor={Colors.lightGray} style={inputStyle} />

        <Text style={styles.fieldLabel}>BANK NAME</Text>
        <TextInput value={form.bankName} onChangeText={v=>set('bankName',v)} placeholder="e.g. HDFC Bank" placeholderTextColor={Colors.lightGray} style={inputStyle} />

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>UPI ID (for instant payouts)</Text>

        <Text style={styles.fieldLabel}>UPI ID</Text>
        <TextInput value={form.upiId} onChangeText={v=>set('upiId',v)} placeholder="yourname@upi" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={Colors.lightGray} style={inputStyle} />

        {/* Payout schedule */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutTitle}>Payout Schedule</Text>
          {[
            ['Daily Payout', 'UPI payouts every day by 11 PM'],
            ['Weekly Payout', 'Bank transfer every Monday'],
            ['On-demand', 'Request payout anytime (min ₹100)'],
          ].map(([t,s]) => (
            <View key={t} style={styles.payoutRow}>
              <Text style={styles.payoutRowTitle}>{t}</Text>
              <Text style={styles.payoutRowSub}>{s}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ borderRadius:Radius.xl, overflow:'hidden', marginTop:Spacing.base }}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ paddingVertical:16, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{saving ? 'Saving...' : 'Save Bank Details'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS SCREEN
// ─────────────────────────────────────────────────────────────
export function DocumentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const DOCS = [
    { id: 'aadhaar',    label: 'Aadhaar Card',        icon: '🪪', required: true,  status: 'verified',   note: 'Identity proof' },
    { id: 'pan',        label: 'PAN Card',             icon: '📋', required: true,  status: 'pending',    note: 'Tax registration' },
    { id: 'photo',      label: 'Profile Photo',        icon: '🤳', required: true,  status: 'verified',   note: 'Clear face photo' },
    { id: 'address',    label: 'Address Proof',        icon: '📄', required: true,  status: 'not_uploaded', note: 'Utility bill or bank statement' },
    { id: 'skill_cert', label: 'Skill Certificate',    icon: '🎓', required: false, status: 'not_uploaded', note: 'Optional but boosts earnings' },
    { id: 'police',     label: 'Police Clearance',     icon: '🛡️', required: false, status: 'processing', note: 'MK can help obtain this' },
  ];

  const STATUS_CONFIG = {
    verified:     { color: Colors.success, bg: Colors.successLight, icon: '✓', label: 'Verified' },
    pending:      { color: Colors.warning, bg: Colors.warningLight, icon: '⏳', label: 'Under Review' },
    processing:   { color: Colors.info,    bg: Colors.infoLight,    icon: '🔄', label: 'Processing' },
    not_uploaded: { color: Colors.error,   bg: Colors.errorLight,   icon: '↑',  label: 'Upload Now' },
    rejected:     { color: Colors.error,   bg: Colors.errorLight,   icon: '✗',  label: 'Re-upload' },
  };

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      {hdr(navigation, 'My Documents')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base }}>
        <Text style={styles.docsNote}>
          Keep documents current and accurate to maintain your Verified Pro status
        </Text>

        {DOCS.map(doc => {
          const cfg = STATUS_CONFIG[doc.status];
          return (
            <TouchableOpacity key={doc.id}
              onPress={() => doc.status === 'not_uploaded' || doc.status === 'rejected'
                ? Alert.alert('Upload', `Upload your ${doc.label}`)
                : null}
              style={styles.docCard} activeOpacity={0.85}>
              <View style={styles.docIconWrap}>
                <Text style={{ fontSize:28 }}>{doc.icon}</Text>
              </View>
              <View style={{ flex:1 }}>
                <View style={styles.docHeaderRow}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  {doc.required && <View style={styles.reqBadge}><Text style={styles.reqText}>Required</Text></View>}
                </View>
                <Text style={styles.docNote}>{doc.note}</Text>
              </View>
              <View style={[styles.docStatusBadge, { backgroundColor:cfg.bg }]}>
                <Text style={[styles.docStatusText, { color:cfg.color }]}>{cfg.icon} {cfg.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.docsHelp}>
          <Text style={styles.docsHelpTitle}>Need help uploading documents?</Text>
          <Text style={styles.docsHelpSub}>Call pro support: 1800-123-4567 (Mon-Sat, 9AM-7PM)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PRO NOTIFICATIONS SCREEN
// ─────────────────────────────────────────────────────────────
export function ProNotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([
    { id:'1', title:'New Job Alert 🔔', message:'AC Service booking near Jubilee Hills — ₹1,299', time:'2 min ago', isRead:false, type:'job' },
    { id:'2', title:'Payment Received 💰', message:'₹1,039 credited to your UPI for booking #MK2026001', time:'1 hr ago', isRead:false, type:'payment' },
    { id:'3', title:'Rating Received ⭐', message:'Rahul gave you 5 stars! "Very professional and on time."', time:'3 hr ago', isRead:true, type:'rating' },
    { id:'4', title:'Schedule Reminder', message:'You have 2 jobs tomorrow. Check your schedule.', time:'Yesterday', isRead:true, type:'reminder' },
    { id:'5', title:'Training Available 🎓', message:'New "Advanced AC Servicing" course available. Complete to earn more.', time:'2 days ago', isRead:true, type:'training' },
  ]);

  const ICONS = { job:'📋', payment:'💰', rating:'⭐', reminder:'⏰', training:'🎓', system:'📢' };
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications {unread > 0 ? `(${unread})` : ''}</Text>
        <TouchableOpacity onPress={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}>
          <Text style={{ color:Colors.primary, fontSize:13, fontWeight:'600' }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding:Spacing.base }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setNotifications(prev => prev.map(n => n.id === item.id ? {...n, isRead:true} : n))}
            style={[styles.notifCard, !item.isRead && { borderLeftWidth:3, borderLeftColor:Colors.primary }]}>
            <View style={[styles.notifIconWrap, { backgroundColor: !item.isRead ? Colors.primaryLight : Colors.offWhite }]}>
              <Text style={{ fontSize:20 }}>{ICONS[item.type] || '🔔'}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={[styles.notifTitle, !item.isRead && { color:Colors.black }]}>{item.title}</Text>
              <Text style={styles.notifMsg}>{item.message}</Text>
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PRO SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────
export function ProSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useProfAuth();
  const [prefs, setPrefs] = useState({
    jobAlerts: true, paymentAlerts: true, ratingAlerts: true, promos: false,
    locationTracking: true, autoAccept: false,
  });
  const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }));

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      {hdr(navigation, 'Settings')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:60 }}>
        <Text style={styles.settingSection}>JOB PREFERENCES</Text>
        {[
          { key:'autoAccept',      label:'Auto-Accept Jobs',      sub:'Automatically accept new jobs when online', icon:'🤖' },
          { key:'locationTracking',label:'Background Location',   sub:'Required for live tracking during jobs',   icon:'📍' },
        ].map((item,i,arr) => (
          <View key={item.key} style={[styles.settingRow, i < arr.length-1 && styles.settingBorder]}>
            <Text style={{ fontSize:20, width:32 }}>{item.icon}</Text>
            <View style={{ flex:1 }}><Text style={styles.settingLabel}>{item.label}</Text><Text style={styles.settingSub}>{item.sub}</Text></View>
            <Switch value={prefs[item.key]} onValueChange={() => toggle(item.key)} trackColor={{ false:Colors.lightGray, true:Colors.success }} thumbColor={Colors.white} />
          </View>
        ))}

        <Text style={[styles.settingSection, { marginTop:Spacing.xl }]}>NOTIFICATIONS</Text>
        {[
          { key:'jobAlerts',     label:'New Job Alerts',      icon:'📋' },
          { key:'paymentAlerts', label:'Payment Notifications', icon:'💰' },
          { key:'ratingAlerts',  label:'Rating & Reviews',    icon:'⭐' },
          { key:'promos',        label:'Promotions & Training', icon:'🎁' },
        ].map((item,i,arr) => (
          <View key={item.key} style={[styles.settingRow, i < arr.length-1 && styles.settingBorder]}>
            <Text style={{ fontSize:20, width:32 }}>{item.icon}</Text>
            <Text style={[styles.settingLabel, { flex:1 }]}>{item.label}</Text>
            <Switch value={prefs[item.key]} onValueChange={() => toggle(item.key)} trackColor={{ false:Colors.lightGray, true:Colors.success }} thumbColor={Colors.white} />
          </View>
        ))}

        <Text style={[styles.settingSection, { marginTop:Spacing.xl }]}>ABOUT</Text>
        {[
          { label:'App Version', value:'1.0.0 (Pro Build 1)', icon:'📱' },
          { label:'Pro Terms', value:'', icon:'📄' },
          { label:'Privacy Policy', value:'', icon:'🔒' },
        ].map((item,i,arr) => (
          <View key={item.label} style={[styles.settingRow, i < arr.length-1 && styles.settingBorder]}>
            <Text style={{ fontSize:20, width:32 }}>{item.icon}</Text>
            <Text style={[styles.settingLabel, { flex:1 }]}>{item.label}</Text>
            {item.value ? <Text style={styles.settingSub}>{item.value}</Text> : <Text style={{ color:Colors.lightGray, fontSize:18 }}>›</Text>}
          </View>
        ))}

        <TouchableOpacity onPress={() => Alert.alert('Sign Out','Are you sure?',[{text:'Cancel',style:'cancel'},{text:'Sign Out',style:'destructive',onPress:logout}])}
          style={styles.logoutBtn}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PRO SUPPORT SCREEN
// ─────────────────────────────────────────────────────────────
export function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const FAQ = [
    { q:'When do I get paid?', a:'UPI payouts daily by 11PM. Bank transfers every Monday. You can also request payout anytime.' },
    { q:'How is my earnings calculated?', a:'You keep 80% of each booking. For Prime bookings you earn an extra 5% bonus.' },
    { q:'What if a customer cancels?', a:'If cancelled within 2hrs of the slot, you earn 50% of the booking amount as compensation.' },
    { q:'How do I improve my rating?', a:'Always be punctual, professional and clean. Respond to customers quickly via chat.' },
    { q:'How do I report a safety incident?', a:'Use the emergency SOS in the app or call our 24/7 pro helpline: 1800-999-1234.' },
  ];
  const [expanded, setExpanded] = useState(null);

  return (
    <View style={[styles.container, { paddingTop:insets.top }]}>
      {hdr(navigation, 'Help & Support')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:60 }}>
        {/* Contact */}
        <View style={styles.contactCard}>
          {[
            { icon:'📞', label:'Pro Helpline', sub:'1800-123-4567 · 24/7' },
            { icon:'💬', label:'Live Chat',    sub:'Avg 2 min response' },
            { icon:'📧', label:'Email',        sub:'prosupport@mkapp.in' },
          ].map(c => (
            <View key={c.label} style={styles.contactItem}>
              <Text style={{ fontSize:24 }}>{c.icon}</Text>
              <View>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactSub}>{c.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginBottom:Spacing.md }]}>Frequently Asked Questions</Text>
        {FAQ.map((faq,i) => (
          <TouchableOpacity key={i} onPress={() => setExpanded(expanded===i ? null : i)}
            style={styles.faqItem} activeOpacity={0.8}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Text style={{ color:Colors.midGray, fontSize:12 }}>{expanded===i ? '▲' : '▼'}</Text>
            </View>
            {expanded===i && <Text style={styles.faqA}>{faq.a}</Text>}
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
  // Bank
  securityNote: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#E8F5E9', borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.xl },
  securityText: { flex:1, fontSize:13, color:Colors.success, lineHeight:18 },
  sectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  fieldLabel: { fontSize:11, fontWeight:'700', color:Colors.midGray, letterSpacing:1, textTransform:'uppercase', marginBottom:Spacing.sm },
  divider: { height:1, backgroundColor:Colors.offWhite, marginVertical:Spacing.xl },
  payoutCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, ...Shadows.card },
  payoutTitle: { ...Typography.h4, marginBottom:Spacing.md },
  payoutRow: { paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  payoutRowTitle: { ...Typography.bodyMed },
  payoutRowSub: { ...Typography.small, marginTop:2 },
  // Documents
  docsNote: { ...Typography.body, color:Colors.midGray, lineHeight:21, marginBottom:Spacing.xl },
  docCard: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, ...Shadows.sm },
  docIconWrap: { width:52, height:52, borderRadius:Radius.lg, backgroundColor:Colors.offWhite, alignItems:'center', justifyContent:'center', flexShrink:0 },
  docHeaderRow: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:3 },
  docLabel: { ...Typography.bodyMed },
  docNote: { ...Typography.small },
  reqBadge: { backgroundColor:Colors.errorLight, paddingHorizontal:6, paddingVertical:2, borderRadius:Radius.pill },
  reqText: { fontSize:9, color:Colors.error, fontWeight:'700' },
  docStatusBadge: { paddingHorizontal:9, paddingVertical:4, borderRadius:Radius.pill },
  docStatusText: { fontSize:11, fontWeight:'700' },
  docsHelp: { backgroundColor:Colors.offWhite, borderRadius:Radius.xl, padding:Spacing.base, marginTop:Spacing.xl },
  docsHelpTitle: { ...Typography.bodyMed, marginBottom:4 },
  docsHelpSub: { ...Typography.small, lineHeight:17 },
  // Notifications
  notifCard: { backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, flexDirection:'row', gap:12, ...Shadows.sm },
  notifIconWrap: { width:44, height:44, borderRadius:Radius.lg, alignItems:'center', justifyContent:'center', flexShrink:0 },
  notifTitle: { ...Typography.bodyMed, color:Colors.midGray },
  notifMsg: { ...Typography.small, marginTop:3, lineHeight:17 },
  notifTime: { ...Typography.caption, marginTop:5 },
  unreadDot: { width:9, height:9, borderRadius:5, backgroundColor:Colors.primary, marginTop:4 },
  // Settings
  settingSection: { fontSize:11, fontWeight:'700', color:Colors.midGray, letterSpacing:1, textTransform:'uppercase', marginBottom:Spacing.sm },
  settingRow: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, padding:Spacing.base, gap:12, borderRadius:0 },
  settingBorder: { borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  settingLabel: { ...Typography.bodyMed },
  settingSub: { ...Typography.small, marginTop:2 },
  logoutBtn: { marginTop:Spacing.xxl, padding:Spacing.base, borderRadius:Radius.xl, borderWidth:1.5, borderColor:Colors.error, alignItems:'center' },
  logoutText: { color:Colors.error, fontWeight:'700', fontSize:15 },
  // Support
  contactCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.xl, ...Shadows.card },
  contactItem: { flexDirection:'row', alignItems:'center', gap:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  contactLabel: { ...Typography.bodyMed },
  contactSub: { ...Typography.small, marginTop:2 },
  faqItem: { backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, ...Shadows.sm },
  faqHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', gap:10 },
  faqQ: { ...Typography.bodyMed, flex:1, lineHeight:20 },
  faqA: { ...Typography.body, marginTop:Spacing.sm, lineHeight:21, color:Colors.gray },
});

export { ProNotificationsScreen, ProSettingsScreen };
export default { BankDetailsScreen, DocumentsScreen, ProNotificationsScreen, ProSettingsScreen, SupportScreen };
