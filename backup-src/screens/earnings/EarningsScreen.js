/**
 * MK Professional App — Earnings Screen (Full)
 * Weekly/monthly earnings, payout history, withdrawal
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar, FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors, Shadows } from '../../utils/theme';
import { useProfAuth } from '../../context/AuthContext';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const PERIODS = [
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: 'all',     label: 'All Time' },
];

function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <View style={[E.statCard, accent && { borderTopWidth: 3, borderTopColor: Colors.primary }]}>
      <Text style={E.statIcon}>{icon}</Text>
      <Text style={E.statValue}>{value}</Text>
      <Text style={E.statLabel}>{label}</Text>
      {sub && <Text style={E.statSub}>{sub}</Text>}
    </View>
  );
}

function EarningsBar({ label, amount, max, color }) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0;
  return (
    <View style={E.barRow}>
      <Text style={E.barLabel}>{label}</Text>
      <View style={E.barTrack}>
        <View style={[E.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={E.barVal}>₹{amount.toLocaleString('en-IN')}</Text>
    </View>
  );
}

function TransactionRow({ booking }) {
  return (
    <View style={E.txnRow}>
      <View style={[E.txnDot, { backgroundColor: '#22c55e' }]} />
      <View style={E.txnInfo}>
        <Text style={E.txnName} numberOfLines={1}>{booking.service?.name || 'Service'}</Text>
        <Text style={E.txnDate}>{new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
      </View>
      <Text style={E.txnAmt}>+₹{Math.round((booking.pricing?.totalAmount || 0) * 0.8).toLocaleString('en-IN')}</Text>
    </View>
  );
}

export default function EarningsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { professional } = useProfAuth();
  const [period, setPeriod]   = useState('month');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const now = new Date();
      const params = {};
      if (period === 'today') {
        params.startDate = new Date(now.setHours(0,0,0,0)).toISOString();
        params.endDate   = new Date().toISOString();
      } else if (period === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - 7);
        params.startDate = start.toISOString();
        params.endDate   = new Date().toISOString();
      } else if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = start.toISOString();
        params.endDate   = new Date().toISOString();
      }
      const res = await axios.get(`${API}/professionals/me/earnings`, { params });
      setData(res.data);
    } catch (e) {
      console.error('[EarningsScreen]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchEarnings(); }, [period]);

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxDailyEarning = data?.bookings?.length
    ? Math.max(...WEEKDAYS.map(day => {
        const dayTotal = (data.bookings || [])
          .filter(b => {
            const d = new Date(b.scheduledDate);
            return d.toLocaleDateString('en-US', { weekday: 'short' }) === day;
          })
          .reduce((s, b) => s + Math.round((b.pricing?.totalAmount || 0) * 0.8), 0);
        return dayTotal;
      }), 0)
    : 500;

  if (loading) return (
    <View style={[E.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={[E.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1A1A2E', '#f15c22']} style={E.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={E.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={E.backBtn}>
            <Text style={E.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={E.headerTitle}>My Earnings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={E.balanceArea}>
          <Text style={E.balanceLabel}>Wallet Balance</Text>
          <Text style={E.balanceAmt}>₹{(data?.walletBalance || 0).toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={E.withdrawBtn}>
            <Text style={E.withdrawText}>Request Payout 💸</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchEarnings(true)}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {/* Period selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={E.periodScroll} contentContainerStyle={E.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[E.periodChip, period === p.key && E.periodChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[E.periodText, period === p.key && E.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats grid */}
        <View style={E.statsGrid}>
          <StatCard icon="💰" label="Period Earnings" value={`₹${(data?.periodEarnings || 0).toLocaleString('en-IN')}`} accent />
          <StatCard icon="📋" label="Completed Jobs" value={data?.completedBookings || 0} />
          <StatCard icon="📊" label="Commission Rate" value={`${data?.commissionRate || 20}%`} sub="MK takes" />
          <StatCard icon="🏆" label="Total Lifetime" value={`₹${(data?.totalEarnings || 0).toLocaleString('en-IN')}`} />
        </View>

        {/* Weekly chart */}
        <View style={E.chartCard}>
          <Text style={E.chartTitle}>Daily Earnings — This Week</Text>
          {WEEKDAYS.map(day => {
            const dayEarnings = (data?.bookings || [])
              .filter(b => new Date(b.scheduledDate).toLocaleDateString('en-US', { weekday: 'short' }) === day)
              .reduce((s, b) => s + Math.round((b.pricing?.totalAmount || 0) * 0.8), 0);
            return (
              <EarningsBar
                key={day}
                label={day}
                amount={dayEarnings}
                max={maxDailyEarning || 500}
                color={dayEarnings > 0 ? Colors.primary : '#E0E0E0'}
              />
            );
          })}
        </View>

        {/* Payout info */}
        <View style={E.payoutCard}>
          <Text style={E.payoutTitle}>💳 Payout Information</Text>
          <View style={E.payoutRow}>
            <Text style={E.payoutLabel}>Next Payout Date</Text>
            <Text style={E.payoutVal}>Every Monday</Text>
          </View>
          <View style={E.payoutRow}>
            <Text style={E.payoutLabel}>Payout Method</Text>
            <Text style={E.payoutVal}>Bank Transfer / UPI</Text>
          </View>
          <View style={E.payoutRow}>
            <Text style={E.payoutLabel}>Processing Time</Text>
            <Text style={E.payoutVal}>1-2 business days</Text>
          </View>
          <View style={E.payoutRow}>
            <Text style={E.payoutLabel}>Min Payout Amount</Text>
            <Text style={E.payoutVal}>₹500</Text>
          </View>
          <TouchableOpacity style={E.bankBtn} onPress={() => navigation.navigate('BankDetails')}>
            <Text style={E.bankBtnText}>🏦 Update Bank Details</Text>
          </TouchableOpacity>
        </View>

        {/* Recent transactions */}
        {data?.bookings?.length > 0 && (
          <View style={E.txnCard}>
            <Text style={E.txnTitle}>Recent Completed Jobs</Text>
            {data.bookings.slice(0, 10).map((b, i) => (
              <TransactionRow key={i} booking={b} />
            ))}
          </View>
        )}

        {/* Tips */}
        <View style={E.tipsCard}>
          <Text style={E.tipsTitle}>💡 Tips to Earn More</Text>
          {[
            'Maintain a rating above 4.7 to get priority job assignments',
            'Complete jobs on time to get repeat customers',
            'Accept more jobs during peak hours (9AM–12PM, 5PM–8PM)',
            'Add more skills to your profile for more job types',
          ].map((tip, i) => (
            <Text key={i} style={E.tip}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const E = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F7F7FA' },
  gradientHeader: { paddingBottom: 24 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon:       { fontSize: 20, color: '#fff', fontWeight: '700' },
  headerTitle:    { fontSize: 18, fontWeight: '700', color: '#fff' },
  balanceArea:    { alignItems: 'center', paddingVertical: 12 },
  balanceLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  balanceAmt:     { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1, marginVertical: 4 },
  withdrawBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  withdrawText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  periodScroll:   { marginVertical: 16 },
  periodRow:      { paddingHorizontal: 16, gap: 10 },
  periodChip:     { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', ...Shadows.sm },
  periodChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodText:     { fontSize: 13, fontWeight: '600', color: '#555' },
  periodTextActive: { color: '#fff' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12, marginBottom: 16 },
  statCard:       { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', ...Shadows.sm },
  statIcon:       { fontSize: 28, marginBottom: 8 },
  statValue:      { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLabel:      { fontSize: 12, color: '#999', marginTop: 4 },
  statSub:        { fontSize: 11, color: '#CCC', marginTop: 2 },
  chartCard:      { backgroundColor: '#fff', borderRadius: 16, margin: 16, padding: 16, ...Shadows.md },
  chartTitle:     { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  barRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel:       { width: 36, fontSize: 12, color: '#999', fontWeight: '600' },
  barTrack:       { flex: 1, height: 8, backgroundColor: '#F0F0F5', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 4 },
  barVal:         { width: 70, fontSize: 12, fontWeight: '700', color: '#1A1A2E', textAlign: 'right' },
  payoutCard:     { backgroundColor: '#fff', borderRadius: 16, margin: 16, marginTop: 0, padding: 16, ...Shadows.md },
  payoutTitle:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  payoutRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  payoutLabel:    { fontSize: 13, color: '#666' },
  payoutVal:      { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  bankBtn:        { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  bankBtnText:    { fontSize: 14, fontWeight: '700', color: Colors.primary },
  txnCard:        { backgroundColor: '#fff', borderRadius: 16, margin: 16, marginTop: 0, padding: 16, ...Shadows.md },
  txnTitle:       { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  txnRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  txnDot:         { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  txnInfo:        { flex: 1 },
  txnName:        { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  txnDate:        { fontSize: 12, color: '#999' },
  txnAmt:         { fontSize: 14, fontWeight: '700', color: '#22c55e' },
  tipsCard:       { backgroundColor: '#FFF8F6', borderRadius: 16, margin: 16, marginTop: 0, padding: 16, borderWidth: 1, borderColor: '#FFE0D4' },
  tipsTitle:      { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  tip:            { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 4 },
});
