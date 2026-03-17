/**
 * MK App — MultiAddressBookingScreen (Feature #16)
 * Book services at multiple addresses in one corporate order
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const SAVED_ADDRESSES = [
  { id: 'a1', label: 'Office HQ',    line1: 'Hitech City Tower 4', city: 'Hyderabad', pincode: '500081', icon: '🏢' },
  { id: 'a2', label: 'Branch Office',line1: 'Jubilee Hills 245',   city: 'Hyderabad', pincode: '500033', icon: '🏬' },
  { id: 'a3', label: 'Warehouse',    line1: 'Kukatpally JNTU',     city: 'Hyderabad', pincode: '500072', icon: '🏭' },
  { id: 'a4', label: 'Guest House',  line1: 'Banjara Hills 67',    city: 'Hyderabad', pincode: '500034', icon: '🏠' },
];

export default function MultiAddressBookingScreen({ navigation, route }) {
  const service    = route?.params?.service || { name: 'AC Service', price: 499 };
  const [selected, setSelected]   = useState([]);
  const [schedules, setSchedules] = useState({});
  const [notes, setNotes]         = useState({});
  const [submitting, setSubmit]   = useState(false);

  const toggleAddress = (addr) => {
    setSelected(prev =>
      prev.find(a => a.id === addr.id)
        ? prev.filter(a => a.id !== addr.id)
        : [...prev, addr]
    );
  };

  const totalAmount = selected.length * service.price;

  const handleBookAll = async () => {
    if (!selected.length) { Alert.alert('Select Addresses', 'Please select at least one address.'); return; }
    setSubmit(true);
    try {
      const { bookingsAPI } = require('../../utils/api');
      const results = await Promise.allSettled(
        selected.map(addr => bookingsAPI.create({
          service:       service._id || service.id,
          scheduledDate: selectedDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          scheduledTime: selectedTime || '10:00 AM – 12:00 PM',
          address:       addr,
          specialInstructions: `Multi-location booking — ${addr.label || addr.line1}`,
          payment:       { method: 'online' },
          pricing:       { walletUsed: 0 },
        }))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      setSubmit(false);
      Alert.alert(
        '✅ Bookings Created!',
        `${succeeded} of ${selected.length} booking${selected.length > 1 ? 's' : ''} created.\nTotal: ₹${(succeeded * service.price).toLocaleString('en-IN')}`,
        [{ text: 'View Bookings', onPress: () => navigation.navigate('BookingsTab') }]
      );
    } catch (e) {
      setSubmit(false);
      Alert.alert('Error', e?.response?.data?.message || 'Could not create bookings. Please try again.');
    }
  };

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Multi-Location Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Service info */}
        <View style={S.serviceCard}>
          <Text style={S.serviceLabel}>Service</Text>
          <Text style={S.serviceName}>{service.name}</Text>
          <Text style={S.servicePrice}>₹{service.price} per location</Text>
        </View>

        {/* Address list */}
        <Text style={S.sectionTitle}>Select Locations</Text>
        <Text style={S.sectionSub}>{selected.length} of {SAVED_ADDRESSES.length} selected</Text>

        {SAVED_ADDRESSES.map(addr => {
          const isSelected = selected.find(a => a.id === addr.id);
          return (
            <View key={addr.id} style={[S.addrCard, isSelected && S.addrCardSelected]}>
              <TouchableOpacity style={S.addrMain} onPress={() => toggleAddress(addr)} activeOpacity={0.85}>
                <View style={[S.checkbox, isSelected && S.checkboxSelected]}>
                  {isSelected && <Text style={S.checkboxMark}>✓</Text>}
                </View>
                <Text style={S.addrIcon}>{addr.icon}</Text>
                <View style={S.addrInfo}>
                  <Text style={[S.addrLabel, isSelected && S.addrLabelSelected]}>{addr.label}</Text>
                  <Text style={S.addrLine}>{addr.line1}, {addr.city}</Text>
                  <Text style={S.addrPin}>📍 {addr.pincode}</Text>
                </View>
              </TouchableOpacity>

              {isSelected && (
                <View style={S.scheduleRow}>
                  <TextInput
                    style={S.scheduleInput}
                    placeholder="Date (e.g. 2025-02-10)"
                    placeholderTextColor={Colors.lightGray}
                    value={schedules[addr.id] || ''}
                    onChangeText={v => setSchedules(p => ({ ...p, [addr.id]: v }))}
                  />
                  <TextInput
                    style={S.scheduleInput}
                    placeholder="Time slot"
                    placeholderTextColor={Colors.lightGray}
                    value={notes[addr.id] || ''}
                    onChangeText={v => setNotes(p => ({ ...p, [addr.id]: v }))}
                  />
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={S.addAddrBtn} onPress={() => Alert.alert('Add Address', 'Address picker coming...')}>
          <Text style={S.addAddrText}>+ Add New Location</Text>
        </TouchableOpacity>

        {/* Summary */}
        {selected.length > 0 && (
          <View style={S.summaryCard}>
            <Text style={S.summaryTitle}>Booking Summary</Text>
            {selected.map(addr => (
              <View key={addr.id} style={S.summaryRow}>
                <Text style={S.summaryLabel}>{addr.label}</Text>
                <Text style={S.summaryValue}>₹{service.price}</Text>
              </View>
            ))}
            <View style={S.summaryDivider} />
            <View style={S.summaryRow}>
              <Text style={S.summaryTotal}>Total ({selected.length} locations)</Text>
              <Text style={S.summaryTotalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[S.bookBtn, (!selected.length || submitting) && S.bookBtnDisabled]}
          onPress={handleBookAll}
          disabled={!selected.length || submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={S.bookBtnText}>Book {selected.length} Location{selected.length !== 1 ? 's' : ''} →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  serviceCard:  { backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 14, marginBottom: 16 },
  serviceLabel: { ...Typography.caption, color: Colors.primary, fontWeight: '700', marginBottom: 2 },
  serviceName:  { ...Typography.h3, color: Colors.primary },
  servicePrice: { ...Typography.body, color: Colors.primaryDark },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 2 },
  sectionSub:   { ...Typography.caption, color: Colors.gray, marginBottom: 10 },
  addrCard:     { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm },
  addrCardSelected: { borderColor: Colors.primary },
  addrMain:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxMark: { fontSize: 12, color: Colors.white, fontWeight: '800' },
  addrIcon:     { fontSize: 26 },
  addrInfo:     { flex: 1 },
  addrLabel:    { ...Typography.body, color: Colors.black, fontWeight: '700' },
  addrLabelSelected: { color: Colors.primary },
  addrLine:     { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  addrPin:      { ...Typography.small, color: Colors.midGray, marginTop: 1 },
  scheduleRow:  { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  scheduleInput:{ flex: 1, backgroundColor: Colors.offWhite, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, ...Typography.caption, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray },
  addAddrBtn:   { borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  addAddrText:  { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  summaryCard:  { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, ...Shadows.sm },
  summaryTitle: { ...Typography.h3, color: Colors.black, marginBottom: 10 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { ...Typography.body, color: Colors.gray },
  summaryValue: { ...Typography.body, color: Colors.black },
  summaryDivider: { height: 1, backgroundColor: Colors.offWhite, marginVertical: 8 },
  summaryTotal: { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  summaryTotalVal: { ...Typography.bodyLarge, color: Colors.primary, fontWeight: '800' },
  bookBtn:      { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnText:  { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
});
