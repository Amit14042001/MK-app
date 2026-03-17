/**
 * MK Professional App — PayoutScreen
 * Request earnings withdrawal, bank details, payout history
 * Feature #22: Earning withdrawal screen
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const PAYOUT_HISTORY = [
  { id: 'p1', amount: 4820, date: '2025-01-10', status: 'paid',    utr: 'UTR1234567890' },
  { id: 'p2', amount: 3650, date: '2024-12-25', status: 'paid',    utr: 'UTR0987654321' },
  { id: 'p3', amount: 5200, date: '2024-12-10', status: 'paid',    utr: 'UTR1122334455' },
  { id: 'p4', amount: 2100, date: '2024-11-28', status: 'failed',  utr: null },
];

export default function PayoutScreen({ navigation }) {
  const [requesting, setRequesting] = useState(false);

  const earnings = { pending: 4820, total: 15770, thisMonth: 6920, lastPayout: 4820 };
  const bankDetails = { bank: 'HDFC Bank', account: '****1234', ifsc: 'HDFC0001234', holder: 'Ramesh Kumar' };

  const requestPayout = async () => {
    if (earnings.pending < 100) {
      Alert.alert('Minimum Payout', 'Minimum payout amount is ₹100.');
      return;
    }
    Alert.alert(
      'Confirm Payout',
      `Request payout of ₹${earnings.pending.toLocaleString('en-IN')} to ${bankDetails.bank} ${bankDetails.account}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRequesting(true);
            try {
              const token = await AsyncStorage.getItem('proToken');
              const resp = await fetch(
                `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/payout`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ amount: earnings.pending }),
                }
              );
              const data = await resp.json();
              setRequesting(false);
              if (data.success) {
                Alert.alert('✅ Payout Requested', `₹${earnings.pending.toLocaleString('en-IN')} will be credited to your bank account within 2-3 business days.\n\nReference: ${data.payoutId || 'PO' + Date.now().toString().slice(-8)}`);
              } else {
                Alert.alert('Error', data.message || 'Payout request failed. Please try again.');
              }
            } catch (e) {
              setRequesting(false);
              Alert.alert('Error', 'Could not process payout. Please try again later.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Withdraw Earnings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={S.balanceCard}>
          <Text style={S.balanceLabel}>Available for Withdrawal</Text>
          <Text style={S.balanceAmount}>₹{earnings.pending.toLocaleString('en-IN')}</Text>
          <Text style={S.balanceSub}>Total earned: ₹{earnings.total.toLocaleString('en-IN')}</Text>

          <TouchableOpacity
            style={[S.withdrawBtn, requesting && { opacity: 0.7 }]}
            onPress={requestPayout}
            disabled={requesting || earnings.pending < 100}
          >
            {requesting
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={S.withdrawBtnText}>Withdraw ₹{earnings.pending.toLocaleString('en-IN')} →</Text>
            }
          </TouchableOpacity>

          <Text style={S.withdrawNote}>
            💡 Minimum ₹100 · Processed in 2-3 business days
          </Text>
        </View>

        {/* Stats */}
        <View style={S.statsRow}>
          {[
            { label: 'This Month', value: `₹${earnings.thisMonth.toLocaleString('en-IN')}` },
            { label: 'Last Payout', value: `₹${earnings.lastPayout.toLocaleString('en-IN')}` },
          ].map(s => (
            <View key={s.label} style={S.statBox}>
              <Text style={S.statValue}>{s.value}</Text>
              <Text style={S.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Bank Details */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionTitle}>Bank Account</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BankDetails')}>
              <Text style={S.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={S.bankCard}>
            <Text style={S.bankIcon}>🏦</Text>
            <View style={S.bankInfo}>
              <Text style={S.bankName}>{bankDetails.bank}</Text>
              <Text style={S.bankAccount}>Account: {bankDetails.account}</Text>
              <Text style={S.bankIfsc}>IFSC: {bankDetails.ifsc}</Text>
              <Text style={S.bankHolder}>{bankDetails.holder}</Text>
            </View>
            <View style={S.verifiedBadge}><Text style={S.verifiedText}>✓ Verified</Text></View>
          </View>
        </View>

        {/* Payout History */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Payout History</Text>
          {PAYOUT_HISTORY.map(p => (
            <View key={p.id} style={S.payoutRow}>
              <View style={[S.payoutStatusDot, { backgroundColor: p.status === 'paid' ? Colors.success : Colors.error }]} />
              <View style={S.payoutInfo}>
                <Text style={S.payoutAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                <Text style={S.payoutDate}>{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                {p.utr && <Text style={S.payoutUTR}>UTR: {p.utr}</Text>}
              </View>
              <View style={[S.payoutStatus, { backgroundColor: p.status === 'paid' ? Colors.successLight : Colors.errorLight }]}>
                <Text style={[S.payoutStatusText, { color: p.status === 'paid' ? Colors.success : Colors.error }]}>
                  {p.status === 'paid' ? '✓ Paid' : '✗ Failed'}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  balanceCard: { margin: 16, backgroundColor: Colors.primary, borderRadius: 20, padding: 24, alignItems: 'center' },
  balanceLabel:{ ...Typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  balanceAmount:{ fontSize: 42, color: Colors.white, fontWeight: '800', marginBottom: 4 },
  balanceSub:  { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  withdrawBtn: { backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 10 },
  withdrawBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '800' },
  withdrawNote:{ ...Typography.caption, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  statsRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statBox:     { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', ...Shadows.sm },
  statValue:   { ...Typography.h3, color: Colors.primary },
  statLabel:   { ...Typography.caption, color: Colors.gray, marginTop: 4 },
  section:     { margin: 16, marginTop: 8 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:{ ...Typography.h3, color: Colors.black },
  editText:    { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  bankCard:    { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 14, ...Shadows.sm },
  bankIcon:    { fontSize: 32 },
  bankInfo:    { flex: 1 },
  bankName:    { ...Typography.body, color: Colors.black, fontWeight: '700' },
  bankAccount: { ...Typography.caption, color: Colors.gray },
  bankIfsc:    { ...Typography.caption, color: Colors.gray },
  bankHolder:  { ...Typography.caption, color: Colors.gray },
  verifiedBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText:  { ...Typography.small, color: Colors.success, fontWeight: '700' },
  payoutRow:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...Shadows.sm },
  payoutStatusDot: { width: 10, height: 10, borderRadius: 5 },
  payoutInfo:  { flex: 1 },
  payoutAmount:{ ...Typography.body, color: Colors.black, fontWeight: '700' },
  payoutDate:  { ...Typography.caption, color: Colors.gray },
  payoutUTR:   { ...Typography.small, color: Colors.midGray, marginTop: 2 },
  payoutStatus:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  payoutStatusText:{ ...Typography.caption, fontWeight: '700' },
});
