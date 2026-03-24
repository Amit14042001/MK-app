/**
 * Slot Professional App — Profile Screen (Full)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors, Shadows } from '../../utils/theme';
import { useProfAuth } from '../../context/AuthContext';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const MENU_ITEMS = [
  { icon: '🏦', label: 'Bank Details',       screen: 'BankDetails',    section: 'account' },
  { icon: '📄', label: 'My Documents',        screen: 'Documents',      section: 'account' },
  { icon: '💰', label: 'Earnings & Payouts',  screen: 'Earnings',       section: 'account' },
  { icon: '📋', label: 'My Jobs',             screen: 'Jobs',           section: 'work' },
  { icon: '🗺️',  label: 'Service Areas',       screen: 'ServiceAreas',   section: 'work' },
  { icon: '⏰',  label: 'Working Hours',       screen: 'WorkingHours',   section: 'work' },
  { icon: '🔔', label: 'Notifications',       screen: 'ProNotifications',section: 'preferences' },
  { icon: '⚙️',  label: 'Settings',            screen: 'Settings',       section: 'preferences' },
  { icon: '❓', label: 'Help & Support',      screen: 'Support',        section: 'support' },
  { icon: '⭐', label: 'Rate the App',        screen: null,             section: 'support', action: 'rate' },
];

const SECTIONS = {
  account:     'Account',
  work:        'Work Settings',
  preferences: 'Preferences',
  support:     'Support',
};

export default function ProfProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { professional: authPro, logout, isOnline, updateOnlineStatus } = useProfAuth();
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data } = await axios.get(`${API}/professionals/me`);
      setProfile(data.professional);
    } catch (e) {
      console.error('[ProProfile]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, []);

  const handleToggleOnline = async (val) => {
    setTogglingOnline(true);
    try {
      await updateOnlineStatus(val);
    } catch {
      Alert.alert('Error', 'Could not update status. Check your connection.');
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleAction = (item) => {
    if (item.action === 'rate') {
      Alert.alert('Rate Us', 'Thank you for your support! Redirecting to Play Store...');
      return;
    }
    if (item.screen) navigation.navigate(item.screen);
  };

  if (loading) return (
    <View style={[S.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const pro   = profile || {};
  const user  = pro.user || {};
  const stats = [
    { label: 'Rating', value: pro.rating?.toFixed(1) || '—', icon: '⭐' },
    { label: 'Completed', value: pro.completedBookings || 0, icon: '✅' },
    { label: 'Earnings', value: `₹${((pro.totalEarnings || 0) / 1000).toFixed(1)}K`, icon: '💰' },
  ];

  const grouped = Object.entries(SECTIONS).map(([key, title]) => ({
    key, title,
    items: MENU_ITEMS.filter(m => m.section === key),
  }));

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <LinearGradient colors={['#1A1A2E', '#f15c22']} style={S.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={S.avatarRow}>
            <View style={S.avatar}>
              <Text style={S.avatarText}>{(user.name || 'P')[0]}</Text>
            </View>
            <View style={S.nameBlock}>
              <Text style={S.name}>{user.name || 'Professional'}</Text>
              <Text style={S.phone}>{user.phone || ''}</Text>
              <View style={[S.verifiedBadge, { backgroundColor: pro.isVerified ? '#22c55e' : '#f59e0b' }]}>
                <Text style={S.verifiedText}>{pro.isVerified ? '✓ Verified' : '⏳ Pending Verification'}</Text>
              </View>
            </View>
            <TouchableOpacity style={S.editBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={S.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={S.statsRow}>
            {stats.map(s => (
              <View key={s.label} style={S.statBox}>
                <Text style={S.statIcon}>{s.icon}</Text>
                <Text style={S.statVal}>{s.value}</Text>
                <Text style={S.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Online toggle */}
        <View style={S.onlineCard}>
          <View style={S.onlineLeft}>
            <View style={[S.onlineDot, { backgroundColor: isOnline ? '#22c55e' : '#999' }]} />
            <View>
              <Text style={S.onlineTitle}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
              <Text style={S.onlineSub}>{isOnline ? 'Accepting new bookings' : 'Not accepting bookings'}</Text>
            </View>
          </View>
          {togglingOnline
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: '#E0E0E0', true: '#BBF7D0' }}
                thumbColor={isOnline ? '#22c55e' : '#fff'}
              />
          }
        </View>

        {/* Verification progress */}
        {!pro.isVerified && (
          <TouchableOpacity style={S.verifyBanner} onPress={() => navigation.navigate('Documents')}>
            <Text style={S.verifyIcon}>📋</Text>
            <View style={S.verifyInfo}>
              <Text style={S.verifyTitle}>Complete Verification</Text>
              <Text style={S.verifySub}>Upload your documents to start accepting jobs</Text>
            </View>
            <Text style={S.verifyCta}>→</Text>
          </TouchableOpacity>
        )}

        {/* Menu sections */}
        {grouped.map(({ key, title, items }) => (
          <View key={key} style={S.section}>
            <Text style={S.sectionTitle}>{title}</Text>
            <View style={S.card}>
              {items.map((item, idx) => (
                <View key={item.label}>
                  <TouchableOpacity style={S.menuRow} onPress={() => handleAction(item)} activeOpacity={0.7}>
                    <Text style={S.menuIcon}>{item.icon}</Text>
                    <Text style={S.menuLabel}>{item.label}</Text>
                    <Text style={S.chevron}>›</Text>
                  </TouchableOpacity>
                  {idx < items.length - 1 && <View style={S.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
            <Text style={S.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={S.version}>Slot Professional App v2.4.1</Text>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { padding: 20, paddingTop: 16, paddingBottom: 24 },
  avatarRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  avatar:       { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  nameBlock:    { flex: 1 },
  name:         { fontSize: 20, fontWeight: '800', color: '#fff' },
  phone:        { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  verifiedBadge:{ alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  editBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  editIcon:     { fontSize: 16 },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16 },
  statBox:      { flex: 1, alignItems: 'center' },
  statIcon:     { fontSize: 20, marginBottom: 4 },
  statVal:      { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  onlineCard:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, ...Shadows.md },
  onlineLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineDot:    { width: 12, height: 12, borderRadius: 6 },
  onlineTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  onlineSub:    { fontSize: 12, color: '#999', marginTop: 1 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FFE0C4' },
  verifyIcon:   { fontSize: 28, marginRight: 12 },
  verifyInfo:   { flex: 1 },
  verifyTitle:  { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  verifySub:    { fontSize: 12, color: '#666', marginTop: 2 },
  verifyCta:    { fontSize: 20, color: Colors.primary, fontWeight: '700' },
  section:      { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card:         { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...Shadows.sm },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
  menuIcon:     { fontSize: 20, width: 32 },
  menuLabel:    { flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  chevron:      { fontSize: 22, color: '#CCC' },
  divider:      { height: 1, backgroundColor: '#F7F7FA', marginLeft: 64 },
  logoutBtn:    { backgroundColor: '#FFEBEE', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  logoutText:   { fontSize: 15, fontWeight: '700', color: '#C62828' },
  version:      { textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20, marginBottom: 8 },
});
