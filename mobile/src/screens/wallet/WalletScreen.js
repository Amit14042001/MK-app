/**
 * MK App — Wallet Screen (Full)
 * Balance, transactions, add money, Razorpay integration
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, StatusBar, Modal, TextInput,
  Alert, Animated, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Shadows } from '../../utils/theme';
import { usersAPI, paymentsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const ADD_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const TXN_CONFIG = {
  credit:   { icon: '⬇️', color: '#22c55e', bg: '#f0fdf4', label: 'Credit' },
  debit:    { icon: '⬆️', color: '#ef4444', bg: '#fef2f2', label: 'Debit' },
  refund:   { icon: '↩️', color: '#3b82f6', bg: '#eff6ff', label: 'Refund' },
  cashback: { icon: '🎁', color: Colors.primary, bg: '#fff7ed', label: 'Cashback' },
};

function TransactionCard({ txn }) {
  const cfg = TXN_CONFIG[txn.type] || TXN_CONFIG.debit;
  const isIncoming = ['credit', 'refund', 'cashback'].includes(txn.type);
  return (
    <View style={S.txnCard}>
      <View style={[S.txnIconBox, { backgroundColor: cfg.bg }]}>
        <Text style={S.txnEmoji}>{cfg.icon}</Text>
      </View>
      <View style={S.txnBody}>
        <Text style={S.txnDesc} numberOfLines={1}>{txn.description || cfg.label}</Text>
        <Text style={S.txnDate}>
          {new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
      <Text style={[S.txnAmount, { color: cfg.color }]}>
        {isIncoming ? '+' : '-'}₹{txn.amount}
      </Text>
    </View>
  );
}

function AddMoneyModal({ visible, onClose, onSuccess, userInfo }) {
  const [selected, setSelected] = useState(500);
  const [custom, setCustom]     = useState('');
  const [loading, setLoading]   = useState(false);
  const amount = custom ? parseInt(custom, 10) : selected;

  const handleAdd = async () => {
    if (!amount || amount < 10) {
      Alert.alert('Invalid Amount', 'Minimum recharge is ₹10');
      return;
    }
    if (amount > 50000) {
      Alert.alert('Limit Exceeded', 'Maximum recharge is ₹50,000');
      return;
    }
    setLoading(true);
    try {
      const { data } = await paymentsAPI.walletRecharge({ amount });
      const options = {
        description:    'MK Wallet Recharge',
        image:          'https://mkapp.in/logo.png',
        currency:       'INR',
        key:            data.key,
        amount:         amount * 100,
        order_id:       data.order.id,
        name:           'MK Services',
        prefill: {
          email:        userInfo?.email || '',
          contact:      userInfo?.phone || '',
          name:         userInfo?.name  || '',
        },
        theme: { color: Colors.primary },
      };
      const paymentData = await RazorpayCheckout.open(options);
      await usersAPI.addWalletMoney({
        amount,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        description: `Wallet recharge ₹${amount}`,
      });
      Alert.alert('✅ Success!', `₹${amount} added to your wallet!`);
      onSuccess();
      onClose();
    } catch (err) {
      if (err.code !== 0) { // 0 = user dismissed
        Alert.alert('Payment Failed', err.description || 'Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.modalOverlay}>
        <View style={S.modalCard}>
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>Add Money to Wallet</Text>
            <TouchableOpacity onPress={onClose} style={S.closeBtn}>
              <Text style={S.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={S.modalSub}>Select or enter amount</Text>

          <View style={S.amountGrid}>
            {ADD_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[S.amountChip, selected === amt && !custom && S.amountChipActive]}
                onPress={() => { setSelected(amt); setCustom(''); }}
              >
                <Text style={[S.amountChipText, selected === amt && !custom && S.amountChipTextActive]}>
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={S.customInput}
            placeholder="Enter custom amount"
            keyboardType="numeric"
            value={custom}
            onChangeText={setCustom}
            placeholderTextColor="#aaa"
          />

          <View style={S.totalRow}>
            <Text style={S.totalLabel}>Amount to add</Text>
            <Text style={S.totalValue}>₹{amount || 0}</Text>
          </View>

          <TouchableOpacity
            style={[S.addBtn, loading && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.addBtnText}>Add ₹{amount || 0} via Razorpay 💳</Text>
            }
          </TouchableOpacity>

          <Text style={S.secureNote}>🔒 100% secure payments via Razorpay</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user }  = useAuth();
  const [balance, setBalance]           = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const balanceAnim = React.useRef(new Animated.Value(0)).current;

  const fetchWallet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data } = await usersAPI.getWallet();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
      Animated.spring(balanceAnim, { toValue: 1, useNativeDriver: true, tension: 120 }).start();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, []);

  const FILTERS = ['all', 'credit', 'debit', 'refund'];
  const filtered = activeFilter === 'all'
    ? transactions
    : transactions.filter(t => t.type === activeFilter);

  const totalCredits = transactions.filter(t => ['credit','refund','cashback'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0);
  const totalDebits  = transactions.filter(t => t.type === 'debit')
    .reduce((s, t) => s + t.amount, 0);

  if (loading) return (
    <View style={[S.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header with gradient */}
      <LinearGradient colors={['#1A1A2E', '#f15c22']} style={S.walletHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={S.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
            <Text style={S.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>MK Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={[S.balanceBox, { transform: [{ scale: balanceAnim }] }]}>
          <Text style={S.balanceLabel}>Available Balance</Text>
          <Text style={S.balanceAmount}>₹{balance.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={S.addMoneyBtn} onPress={() => setShowAddModal(true)}>
            <Text style={S.addMoneyText}>+ Add Money</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={S.statsRow}>
          <View style={S.statBox}>
            <Text style={S.statVal}>₹{totalCredits.toLocaleString('en-IN')}</Text>
            <Text style={S.statLbl}>Total Added</Text>
          </View>
          <View style={S.statDivider} />
          <View style={S.statBox}>
            <Text style={S.statVal}>₹{totalDebits.toLocaleString('en-IN')}</Text>
            <Text style={S.statLbl}>Total Spent</Text>
          </View>
          <View style={S.statDivider} />
          <View style={S.statBox}>
            <Text style={S.statVal}>{transactions.length}</Text>
            <Text style={S.statLbl}>Transactions</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Offers strip */}
      <View style={S.offersStrip}>
        <Text style={S.offersText}>🎁 Add ₹500+ and get ₹50 cashback! Use code: </Text>
        <Text style={S.offersCode}>WALLET50</Text>
      </View>

      {/* Transactions */}
      <View style={S.txnSection}>
        <View style={S.txnHeader}>
          <Text style={S.txnTitle}>Transaction History</Text>
          <View style={S.filters}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[S.filterChip, activeFilter === f && S.filterChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[S.filterText, activeFilter === f && S.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <TransactionCard txn={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchWallet(true)}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={S.emptyBox}>
            <Text style={S.emptyEmoji}>💸</Text>
            <Text style={S.emptyTitle}>No transactions yet</Text>
            <Text style={S.emptyText}>Your transaction history will appear here</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />

      <AddMoneyModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchWallet}
        userInfo={user}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  walletHeader: { paddingBottom: 20 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon:     { fontSize: 20, color: '#fff', fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  balanceBox:   { alignItems: 'center', paddingVertical: 20 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  balanceAmount:{ fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  addMoneyBtn:  { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 8, marginTop: 12 },
  addMoneyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statsRow:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16 },
  statBox:      { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 16, fontWeight: '800', color: '#fff' },
  statLbl:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider:  { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  offersStrip:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFE8CC' },
  offersText:   { fontSize: 12, color: '#666' },
  offersCode:   { fontSize: 12, fontWeight: '800', color: Colors.primary },
  txnSection:   { paddingHorizontal: 16, paddingTop: 16 },
  txnHeader:    { marginBottom: 12 },
  txnTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  filters:      { flexDirection: 'row', gap: 8 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F5' },
  filterChipActive: { backgroundColor: Colors.primaryLight },
  filterText:   { fontSize: 12, color: '#666', fontWeight: '500' },
  filterTextActive: { color: Colors.primary, fontWeight: '700' },
  txnCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, ...Shadows.sm },
  txnIconBox:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnEmoji:     { fontSize: 20 },
  txnBody:      { flex: 1 },
  txnDesc:      { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  txnDate:      { fontSize: 12, color: '#999', marginTop: 2 },
  txnAmount:    { fontSize: 16, fontWeight: '800' },
  emptyBox:     { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:   { fontSize: 64, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText:    { fontSize: 14, color: '#999', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center' },
  closeIcon:    { fontSize: 16, color: '#666' },
  modalSub:     { fontSize: 13, color: '#999', marginBottom: 16 },
  amountGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  amountChip:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F7F7FA', borderWidth: 1, borderColor: '#E0E0E0' },
  amountChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  amountChipText: { fontSize: 15, fontWeight: '600', color: '#555' },
  amountChipTextActive: { color: Colors.primary },
  customInput:  { backgroundColor: '#F7F7FA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1A1A2E', marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel:   { fontSize: 14, color: '#666' },
  totalValue:   { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  addBtn:       { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.md },
  addBtnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  secureNote:   { textAlign: 'center', fontSize: 12, color: '#999', marginTop: 12 },
});
