/**
 * MK App — Address & Payment Management Screens (Full)
 * AddAddressScreen, AddressesScreen, PaymentMethodsScreen, EditProfileScreen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, FlatList, StatusBar, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { usersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Shared header ────────────────────────────────────────────
function ScreenHeader({ title, onBack, rightAction }) {
  return (
    <View style={S.header}>
      <TouchableOpacity onPress={onBack} style={S.backBtn}>
        <Text style={S.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={S.headerTitle}>{title}</Text>
      {rightAction || <View style={{ width: 40 }} />}
    </View>
  );
}

// ── Add / Edit Address Screen ────────────────────────────────
export function AddAddressScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const editAddress = route?.params?.address;
  const isEdit = !!editAddress;

  const [form, setForm] = useState({
    label: editAddress?.label || 'Home',
    line1: editAddress?.line1 || '',
    line2: editAddress?.line2 || '',
    area: editAddress?.area || '',
    city: editAddress?.city || '',
    state: editAddress?.state || '',
    pincode: editAddress?.pincode || '',
    landmark: editAddress?.landmark || '',
    isDefault: editAddress?.isDefault || false,
  });
  const [saving, setSaving] = useState(false);

  const LABELS = ['Home', 'Work', 'Other'];
  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.line1.trim()) return Alert.alert('Required', 'Address line 1 is required');
    if (!form.city.trim())  return Alert.alert('Required', 'City is required');
    if (!form.pincode.trim() || form.pincode.length < 6) return Alert.alert('Required', 'Valid 6-digit pincode required');

    setSaving(true);
    try {
      if (isEdit) {
        await usersAPI.updateAddress(editAddress._id, form);
      } else {
        await usersAPI.addAddress(form);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title={isEdit ? 'Edit Address' : 'Add New Address'} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Label picker */}
        <Text style={S.fieldLabel}>Address Type</Text>
        <View style={S.labelRow}>
          {LABELS.map(lbl => (
            <TouchableOpacity
              key={lbl}
              style={[S.labelChip, form.label === lbl && S.labelChipActive]}
              onPress={() => setField('label', lbl)}
            >
              <Text style={S.labelIcon}>{lbl === 'Home' ? '🏠' : lbl === 'Work' ? '💼' : '📍'}</Text>
              <Text style={[S.labelText, form.label === lbl && S.labelTextActive]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        {[
          { key: 'line1', label: 'Address Line 1 *', placeholder: 'Flat / House No., Building Name', required: true },
          { key: 'line2', label: 'Address Line 2', placeholder: 'Street, Colony (optional)' },
          { key: 'area',  label: 'Area / Locality', placeholder: 'e.g. Banjara Hills' },
          { key: 'city',  label: 'City *', placeholder: 'e.g. Hyderabad', required: true },
          { key: 'state', label: 'State', placeholder: 'e.g. Telangana' },
          { key: 'pincode', label: 'Pincode *', placeholder: '6-digit pincode', keyboardType: 'numeric', maxLength: 6, required: true },
          { key: 'landmark', label: 'Landmark', placeholder: 'Near hospital, school, etc. (optional)' },
        ].map(field => (
          <View key={field.key}>
            <Text style={S.fieldLabel}>{field.label}</Text>
            <TextInput
              style={[S.input, field.required && !form[field.key] && S.inputError]}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChangeText={v => setField(field.key, v)}
              keyboardType={field.keyboardType || 'default'}
              maxLength={field.maxLength}
              placeholderTextColor="#aaa"
              autoCapitalize={field.keyboardType === 'numeric' ? 'none' : 'words'}
            />
          </View>
        ))}

        {/* Default toggle */}
        <View style={S.defaultRow}>
          <View>
            <Text style={S.defaultLabel}>Set as Default Address</Text>
            <Text style={S.defaultSub}>Used for all new bookings automatically</Text>
          </View>
          <Switch
            value={form.isDefault}
            onValueChange={v => setField('isDefault', v)}
            trackColor={{ false: '#E0E0E0', true: Colors.primaryLight }}
            thumbColor={form.isDefault ? Colors.primary : '#fff'}
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[S.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.saveBtnText}>{isEdit ? 'Update Address' : 'Save Address'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Addresses Screen ─────────────────────────────────────────
export function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data } = await usersAPI.getProfile();
      setAddresses(data.user?.addresses || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, []);
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetch);
    return unsub;
  }, [navigation]);

  const handleDelete = (id) => {
    Alert.alert('Delete Address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await usersAPI.deleteAddress(id);
            setAddresses(prev => prev.filter(a => a._id !== id));
          } catch { Alert.alert('Error', 'Could not delete address'); }
        },
      },
    ]);
  };

  const ICONS = { Home: '🏠', Work: '💼', Other: '📍' };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader
        title="My Addresses"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity style={S.addIconBtn} onPress={() => navigation.navigate('AddAddress')}>
            <Text style={S.addIconText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={S.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : addresses.length === 0 ? (
        <View style={S.empty}>
          <Text style={S.emptyEmoji}>📍</Text>
          <Text style={S.emptyTitle}>No addresses saved</Text>
          <Text style={S.emptyText}>Add your home or work address for faster checkout</Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => navigation.navigate('AddAddress')}>
            <Text style={S.emptyBtnText}>+ Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: addr }) => (
            <View style={S.addrCard}>
              <View style={S.addrTop}>
                <View style={S.addrLabelRow}>
                  <Text style={S.addrIcon}>{ICONS[addr.label] || '📍'}</Text>
                  <Text style={S.addrLabel}>{addr.label}</Text>
                  {addr.isDefault && <View style={S.defaultBadge}><Text style={S.defaultBadgeText}>Default</Text></View>}
                </View>
                <View style={S.addrActions}>
                  <TouchableOpacity style={S.editAddrBtn} onPress={() => navigation.navigate('EditAddress', { address: addr })}>
                    <Text style={S.editAddrText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.deleteAddrBtn} onPress={() => handleDelete(addr._id)}>
                    <Text style={S.deleteAddrText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={S.addrLine1}>{addr.line1}</Text>
              {addr.line2 && <Text style={S.addrLine2}>{addr.line2}</Text>}
              <Text style={S.addrCity}>{addr.area ? `${addr.area}, ` : ''}{addr.city} — {addr.pincode}</Text>
              {addr.landmark && <Text style={S.addrLandmark}>📌 Near {addr.landmark}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Payment Methods Screen ────────────────────────────────────
export function PaymentMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getWallet()
      .then(res => setWalletBalance(res.data.balance || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PAYMENT_METHODS = [
    { icon: '💳', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', available: true },
    { icon: '📱', name: 'UPI', desc: 'Google Pay, PhonePe, Paytm, BHIM', available: true },
    { icon: '🏦', name: 'Net Banking', desc: 'All major banks supported', available: true },
    { icon: '💰', name: 'MK Wallet', desc: `Balance: ₹${walletBalance.toLocaleString('en-IN')}`, available: true, isWallet: true },
    { icon: '💵', name: 'Cash on Delivery', desc: 'Pay after service completion', available: true },
    { icon: '📊', name: 'EMI', desc: 'No cost EMI on credit cards (3/6/12 months)', available: true },
  ];

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Payment Methods" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Wallet card */}
        <View style={S.walletCard}>
          <View style={S.walletLeft}>
            <Text style={S.walletEmoji}>💰</Text>
            <View>
              <Text style={S.walletTitle}>MK Wallet</Text>
              <Text style={S.walletSub}>Use for instant payments</Text>
            </View>
          </View>
          <View style={S.walletRight}>
            <Text style={S.walletBalance}>₹{walletBalance.toLocaleString('en-IN')}</Text>
            <TouchableOpacity style={S.addFundsBtn} onPress={() => navigation.navigate('Wallet')}>
              <Text style={S.addFundsText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={S.sectionHead}>Accepted Payment Methods</Text>
        {PAYMENT_METHODS.filter(m => !m.isWallet).map((method, i) => (
          <View key={i} style={S.methodCard}>
            <Text style={S.methodIcon}>{method.icon}</Text>
            <View style={S.methodInfo}>
              <Text style={S.methodName}>{method.name}</Text>
              <Text style={S.methodDesc}>{method.desc}</Text>
            </View>
            <View style={S.methodCheck}>
              <Text style={S.methodCheckText}>✓</Text>
            </View>
          </View>
        ))}

        <View style={S.secureNote}>
          <Text style={S.secureText}>🔒 All payments are secured by Razorpay with 256-bit SSL encryption</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Edit Profile Screen ───────────────────────────────────────
export function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Name is required');
    setSaving(true);
    try {
      await usersAPI.updateProfile(form);
      if (refreshUser) await refreshUser();
      Alert.alert('✅ Saved', 'Profile updated successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Avatar */}
        <View style={S.avatarSection}>
          <TouchableOpacity onPress={async () => {
            try {
              const { launchImageLibrary } = require('react-native-image-picker');
              const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
              if (!result.didCancel && result.assets?.[0]) {
                const asset = result.assets[0];
                const { usersAPI } = require('../../utils/api');
                await usersAPI.updateProfile({ avatar: asset.uri });
                Alert.alert('✅ Photo Updated', 'Your profile photo has been updated.');
              }
            } catch { Alert.alert('Error', 'Could not update photo. Please try again.'); }
          }} activeOpacity={0.8}>
            <View style={S.avatar}>
              <Text style={S.avatarText}>{(form.name || 'U')[0].toUpperCase()}</Text>
            </View>
            <Text style={S.avatarChangeText}>📷 Tap to change photo</Text>
          </TouchableOpacity>
        </View>

        {[
          { key: 'name', label: 'Full Name *', placeholder: 'Your full name' },
          { key: 'email', label: 'Email Address', placeholder: 'your@email.com', keyboardType: 'email-address' },
        ].map(f => (
          <View key={f.key}>
            <Text style={S.fieldLabel}>{f.label}</Text>
            <TextInput
              style={S.input}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChangeText={v => setField(f.key, v)}
              keyboardType={f.keyboardType || 'default'}
              placeholderTextColor="#aaa"
              autoCapitalize={f.keyboardType === 'email-address' ? 'none' : 'words'}
            />
          </View>
        ))}

        <View style={S.phoneRow}>
          <Text style={S.fieldLabel}>Phone Number</Text>
          <View style={S.phoneDisplay}>
            <Text style={S.phoneText}>+91 {user?.phone}</Text>
            <Text style={S.phoneNote}>Phone cannot be changed</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[S.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={S.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F7FA' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  addIconBtn:  { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.primaryLight, borderRadius: 20 },
  addIconText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input:       { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E0E0E0' },
  inputError:  { borderColor: '#EF4444' },
  labelRow:    { flexDirection: 'row', gap: 10, marginBottom: 4 },
  labelChip:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0' },
  labelChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  labelIcon:   { fontSize: 18 },
  labelText:   { fontSize: 13, fontWeight: '600', color: '#555' },
  labelTextActive: { color: Colors.primary },
  defaultRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  defaultLabel:{ fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  defaultSub:  { fontSize: 12, color: '#999', marginTop: 2 },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5', ...Shadows.lg },
  saveBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.md },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji:  { fontSize: 64, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText:   { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:    { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, ...Shadows.md },
  emptyBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  addrCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...Shadows.md },
  addrTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addrLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrIcon:    { fontSize: 18 },
  addrLabel:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  defaultBadge:{ backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  addrActions: { flexDirection: 'row', gap: 8 },
  editAddrBtn: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.primaryLight, borderRadius: 10 },
  editAddrText:{ fontSize: 12, fontWeight: '700', color: Colors.primary },
  deleteAddrBtn: { paddingHorizontal: 8, paddingVertical: 5 },
  deleteAddrText: { fontSize: 16 },
  addrLine1:   { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  addrLine2:   { fontSize: 13, color: '#555', marginTop: 1 },
  addrCity:    { fontSize: 13, color: '#666', marginTop: 3 },
  addrLandmark:{ fontSize: 12, color: '#999', marginTop: 3 },
  walletCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, borderRadius: 16, padding: 16, marginBottom: 20 },
  walletLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletEmoji: { fontSize: 32 },
  walletTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  walletSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  walletRight: { alignItems: 'flex-end' },
  walletBalance: { fontSize: 22, fontWeight: '900', color: '#fff' },
  addFundsBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
  addFundsText:{ fontSize: 12, fontWeight: '700', color: '#fff' },
  sectionHead: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  methodCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, ...Shadows.sm },
  methodIcon:  { fontSize: 26, marginRight: 14 },
  methodInfo:  { flex: 1 },
  methodName:  { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  methodDesc:  { fontSize: 12, color: '#999', marginTop: 2 },
  methodCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  methodCheckText: { fontSize: 14, color: '#2E7D32', fontWeight: '700' },
  secureNote:  { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginTop: 12 },
  secureText:  { fontSize: 12, color: '#555', lineHeight: 18 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.md },
  avatarText:  { fontSize: 36, fontWeight: '900', color: '#fff' },
  avatarChangeText: { fontSize: 12, color: '#999', marginTop: 8 },
  phoneRow:    {},
  phoneDisplay:{ backgroundColor: '#F7F7FA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  phoneText:   { fontSize: 15, color: '#1A1A2E', fontWeight: '600' },
  phoneNote:   { fontSize: 12, color: '#999', marginTop: 3 },
});
