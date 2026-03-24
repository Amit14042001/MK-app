/**
 * MK Professional App — Settings Screen
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, StatusBar, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useProfAuth } from '../../context/AuthContext';
import { Colors, Shadows } from '../../utils/theme';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';
const APP_VERSION = '2.4.1';

export default function ProSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useProfAuth();
  const [notifPush, setNotifPush]     = useState(true);
  const [notifSMS, setNotifSMS]       = useState(true);
  const [autoAccept, setAutoAccept]   = useState(false);
  const [darkMode, setDarkMode]       = useState(false);
  const [language, setLanguage]       = useState('English');

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API}/users/account`);
              logout();
            } catch { Alert.alert('Error', 'Failed to delete account. Contact support.'); }
          },
        },
      ]
    );
  };

  const SECTIONS = [
    {
      title: 'Notifications',
      items: [
        { label: 'Push Notifications', type: 'switch', value: notifPush, onChange: setNotifPush, icon: '🔔' },
        { label: 'SMS Notifications',  type: 'switch', value: notifSMS,  onChange: setNotifSMS,  icon: '💬' },
        { label: 'Auto-Accept Bookings', type: 'switch', value: autoAccept, onChange: setAutoAccept, icon: '⚡',
          desc: 'Automatically accept new bookings in your area' },
      ],
    },
    {
      title: 'Appearance',
      items: [
        { label: 'Dark Mode', type: 'switch', value: darkMode, onChange: setDarkMode, icon: '🌙', comingSoon: true },
        { label: 'Language', type: 'nav', value: language, icon: '🌐',
          onPress: () => Alert.alert('Language', 'More languages coming soon!\n\nCurrently: English') },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Change Phone Number', icon: '📱', type: 'nav',
          onPress: () => navigation.navigate('ChangePhone') },
        { label: 'Linked Bank Account',  icon: '🏦', type: 'nav',
          onPress: () => navigation.navigate('BankDetails') },
        { label: 'My Documents',         icon: '📄', type: 'nav',
          onPress: () => navigation.navigate('Documents') },
        { label: 'Commission & Earnings Info', icon: '💹', type: 'nav',
          onPress: () => Alert.alert('Commission', 'MK takes 20% commission on all bookings.\n\nYou receive 80% of each booking amount.\n\nPayouts every Monday.') },
      ],
    },
    {
      title: 'Support & Legal',
      items: [
        { label: 'Help & FAQ',           icon: '❓', type: 'nav', onPress: () => navigation.navigate('Support') },
        { label: 'Contact Support',      icon: '📞', type: 'nav', onPress: () => Linking.openURL('tel:18001234567') },
        { label: 'Privacy Policy',       icon: '🔒', type: 'nav', onPress: () => Linking.openURL('https://mkapp.in/privacy') },
        { label: 'Terms of Service',     icon: '📋', type: 'nav', onPress: () => Linking.openURL('https://mkapp.in/terms') },
        { label: 'Rate the App',         icon: '⭐', type: 'nav', onPress: () => Linking.openURL('https://play.google.com/store') },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { label: 'Logout', icon: '🚪', type: 'action', onPress: confirmLogout, danger: true },
        { label: 'Delete Account', icon: '🗑️', type: 'action', onPress: confirmDeleteAccount, danger: true },
      ],
    },
  ];

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {SECTIONS.map(section => (
          <View key={section.title} style={S.section}>
            <Text style={S.sectionTitle}>{section.title}</Text>
            <View style={S.card}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={S.row}
                    onPress={item.type !== 'switch' ? item.onPress : undefined}
                    disabled={item.type === 'switch' || item.comingSoon}
                    activeOpacity={0.7}
                  >
                    <View style={S.rowLeft}>
                      <Text style={S.rowIcon}>{item.icon}</Text>
                      <View>
                        <Text style={[S.rowLabel, item.danger && S.dangerText]}>{item.label}</Text>
                        {item.desc && <Text style={S.rowDesc}>{item.desc}</Text>}
                        {item.comingSoon && <Text style={S.comingSoon}>Coming soon</Text>}
                      </View>
                    </View>
                    {item.type === 'switch' && (
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ false: '#E0E0E0', true: Colors.primaryLight || '#FFE5DB' }}
                        thumbColor={item.value ? Colors.primary || '#f15c22' : '#fff'}
                        disabled={item.comingSoon}
                      />
                    )}
                    {item.type === 'nav' && (
                      <View style={S.rowRight}>
                        {item.value && <Text style={S.rowValue}>{item.value}</Text>}
                        <Text style={S.chevron}>›</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={S.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={S.versionWrap}>
          <Text style={S.versionText}>MK Professional App</Text>
          <Text style={S.versionNum}>Version {APP_VERSION}</Text>
          <Text style={S.versionSub}>© 2026 MK Services India Pvt. Ltd.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#1A1A2E' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card:         { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', ...Shadows.sm },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon:      { fontSize: 20, marginRight: 14, width: 28 },
  rowLabel:     { fontSize: 15, color: '#1A1A2E', fontWeight: '500' },
  rowDesc:      { fontSize: 12, color: '#999', marginTop: 2 },
  comingSoon:   { fontSize: 11, color: Colors.primary || '#f15c22', marginTop: 2 },
  dangerText:   { color: '#ef4444' },
  rowRight:     { flexDirection: 'row', alignItems: 'center' },
  rowValue:     { fontSize: 14, color: '#999', marginRight: 6 },
  chevron:      { fontSize: 20, color: '#CCC', fontWeight: '300' },
  divider:      { height: 1, backgroundColor: '#F7F7FA', marginLeft: 58 },
  versionWrap:  { alignItems: 'center', paddingVertical: 32 },
  versionText:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  versionNum:   { fontSize: 13, color: '#999', marginTop: 4 },
  versionSub:   { fontSize: 12, color: '#CCC', marginTop: 4 },
});
