/**
 * MK App — LoyaltyPointsScreen (Feature #26 - UC Pass)
 * Points earned per booking, tier system, redemption
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';
import { api } from '../utils/api';

const { width: W } = Dimensions.get('window');

const TIERS = [
  { id: 'bronze', name: 'Bronze',   minPoints: 0,    maxPoints: 499,  color: '#CD7F32', icon: '🥉', multiplier: 1,   perks: ['1 point per ₹10 spent', 'Birthday bonus 50 pts'] },
  { id: 'silver', name: 'Silver',   minPoints: 500,  maxPoints: 1999, color: '#C0C0C0', icon: '🥈', multiplier: 1.5, perks: ['1.5x points', '5% discount', 'Priority support'] },
  { id: 'gold',   name: 'Gold',     minPoints: 2000, maxPoints: 4999, color: '#FFD700', icon: '🥇', multiplier: 2,   perks: ['2x points', '10% discount', 'Free rescheduling', 'Dedicated manager'] },
  { id: 'plat',   name: 'Platinum', minPoints: 5000, maxPoints: null, color: '#9B59B6', icon: '💎', multiplier: 3,   perks: ['3x points', '15% discount', '2 free services/mo', 'Concierge booking'] },
];

const TRANSACTIONS = [
  { id: 't1', desc: 'AC Service — BK7823',      points: +48,  date: '2025-01-10', type: 'earn'   },
  { id: 't2', desc: 'Redeemed for discount',    points: -100, date: '2025-01-08', type: 'redeem' },
  { id: 't3', desc: 'Home Cleaning — BK7801',   points: +35,  date: '2025-01-05', type: 'earn'   },
  { id: 't4', desc: 'Referral bonus',           points: +200, date: '2025-01-03', type: 'bonus'  },
  { id: 't5', desc: 'Birthday bonus',           points: +50,  date: '2024-12-28', type: 'bonus'  },
  { id: 't6', desc: 'Pest Control — BK7790',    points: +28,  date: '2024-12-20', type: 'earn'   },
];

const REWARDS = [
  { id: 'r1', title: '₹50 Off Next Booking',    points: 200,  icon: '🎫', category: 'discount' },
  { id: 'r2', title: '₹100 Off Next Booking',   points: 400,  icon: '💰', category: 'discount' },
  { id: 'r3', title: 'Free AC Service',         points: 800,  icon: '❄️', category: 'free_service' },
  { id: 'r4', title: 'Free Home Cleaning',      points: 600,  icon: '🧹', category: 'free_service' },
  { id: 'r5', title: '1 Month Gold Membership', points: 1500, icon: '🏅', category: 'membership' },
  { id: 'r6', title: '₹500 Amazon Voucher',     points: 2000, icon: '🛍️', category: 'voucher' },
];

export default function LoyaltyPointsScreen({ navigation }) {
  const [activeTab, setTab]        = useState('points');
  const [redeeming, setRedeem]     = useState(null);
  const [loading,   setLoading]    = useState(true);
  const [myPoints,  setMyPoints]   = useState(0);
  const [transactions, setTxns]    = useState(TRANSACTIONS); // fallback to mock
  const [rewards,   setRewards]    = useState(REWARDS);      // fallback to mock

  useEffect(() => { loadLoyaltyData(); }, []);

  const loadLoyaltyData = async () => {
    try {
      const [profileRes, historyRes, rewardsRes] = await Promise.all([
        api.get('/loyalty/profile'),
        api.get('/loyalty/history').catch(() => ({ data: { history: [] } })),
        api.get('/loyalty/rewards').catch(() => ({ data: { rewards: [] } })),
      ]);
      if (profileRes.data.success) {
        setMyPoints(profileRes.data.points || profileRes.data.data?.points || 0);
      }
      if (historyRes.data.history?.length) {
        setTxns(historyRes.data.history.map(h => ({
          id:     h._id || h.id,
          desc:   h.description || h.desc,
          points: h.points,
          date:   h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-IN') : h.date,
          type:   h.type,
        })));
      }
      if (rewardsRes.data.rewards?.length) {
        setRewards(rewardsRes.data.rewards.map(r => ({
          id:       r._id || r.id,
          title:    r.title || r.name,
          points:   r.pointsRequired || r.points,
          icon:     r.icon || '🎁',
          category: r.category,
        })));
      }
    } catch { /* keep mock data */ }
    setLoading(false);
  };

  const myTier   = TIERS.find(t => myPoints >= t.minPoints && (t.maxPoints === null || myPoints <= t.maxPoints)) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(myTier) + 1];
  const progress = nextTier ? ((myPoints - myTier.minPoints) / (nextTier.minPoints - myTier.minPoints)) * 100 : 100;

  const handleRedeem = (reward) => {
    if (myPoints < reward.points) {
      Alert.alert('Insufficient Points', `You need ${reward.points - myPoints} more points.`);
      return;
    }
    Alert.alert('Redeem?', `Redeem ${reward.points} points for "${reward.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: async () => {
        setRedeem(reward.id);
        try {
          const { data } = await api.post('/loyalty/redeem', { rewardId: reward.id, points: reward.points });
          if (data.success) {
            setMyPoints(p => p - reward.points);
            Alert.alert('✅ Redeemed!', `${reward.title} has been added to your account.`);
          } else throw new Error(data.message);
        } catch (e) {
          Alert.alert('Error', e.message || 'Could not redeem. Please try again.');
        }
        setRedeem(null);
      }},
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: Colors.textLight, marginTop: 12 }}>Loading your rewards...</Text>
    </View>
  );

  return (
    <View style={LP.container}>
      <View style={LP.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={LP.backBtn}>
          <Text style={LP.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={LP.headerTitle}>MK Rewards</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Points Card */}
        <View style={[LP.pointsCard, { backgroundColor: myTier.color }]}>
          <View style={LP.pointsTop}>
            <View>
              <Text style={LP.pointsLabel}>Your Points</Text>
              <Text style={LP.pointsValue}>{myPoints.toLocaleString('en-IN')}</Text>
            </View>
            <View style={LP.tierBadge}>
              <Text style={LP.tierIcon}>{myTier.icon}</Text>
              <Text style={LP.tierName}>{myTier.name}</Text>
            </View>
          </View>

          {nextTier && (
            <View style={LP.tierProgress}>
              <View style={LP.tierProgressBar}>
                <View style={[LP.tierProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
              <Text style={LP.tierProgressText}>
                {(nextTier.minPoints - myPoints).toLocaleString('en-IN')} pts to {nextTier.name} {nextTier.icon}
              </Text>
            </View>
          )}

          <View style={LP.tierPerks}>
            {myTier.perks.map((p, i) => (
              <Text key={i} style={LP.tierPerk}>✓ {p}</Text>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={LP.tabs}>
          {['points', 'rewards', 'tiers'].map(t => (
            <TouchableOpacity key={t} style={[LP.tab, activeTab === t && LP.tabActive]} onPress={() => setTab(t)}>
              <Text style={[LP.tabText, activeTab === t && LP.tabTextActive]}>
                {t === 'points' ? 'History' : t === 'rewards' ? 'Redeem' : 'Tiers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'points' && (
          <View style={LP.section}>
            {TRANSACTIONS.map(tx => (
              <View key={tx.id} style={LP.txRow}>
                <View style={[LP.txDot, {
                  backgroundColor: tx.type === 'earn' ? Colors.success : tx.type === 'bonus' ? Colors.star : Colors.primary
                }]} />
                <View style={LP.txInfo}>
                  <Text style={LP.txDesc}>{tx.desc}</Text>
                  <Text style={LP.txDate}>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={[LP.txPoints, { color: tx.points > 0 ? Colors.success : Colors.primary }]}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'rewards' && (
          <View style={LP.section}>
            <Text style={LP.rewardsNote}>💡 You have {myPoints} points to redeem</Text>
            {REWARDS.map(r => {
              const canRedeem = myPoints >= r.points;
              return (
                <View key={r.id} style={[LP.rewardCard, !canRedeem && LP.rewardCardDisabled]}>
                  <Text style={LP.rewardIcon}>{r.icon}</Text>
                  <View style={LP.rewardInfo}>
                    <Text style={[LP.rewardTitle, !canRedeem && { color: Colors.midGray }]}>{r.title}</Text>
                    <Text style={LP.rewardPoints}>{r.points.toLocaleString('en-IN')} points</Text>
                  </View>
                  <TouchableOpacity
                    style={[LP.redeemBtn, !canRedeem && LP.redeemBtnDisabled]}
                    onPress={() => handleRedeem(r)}
                    disabled={!canRedeem}
                  >
                    <Text style={[LP.redeemBtnText, !canRedeem && { color: Colors.midGray }]}>
                      {canRedeem ? 'Redeem' : `Need ${(r.points - myPoints)} more`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'tiers' && (
          <View style={LP.section}>
            {TIERS.map(tier => {
              const isCurrent = myTier.id === tier.id;
              return (
                <View key={tier.id} style={[LP.tierCard, isCurrent && { borderColor: tier.color, borderWidth: 2 }]}>
                  <View style={[LP.tierCardHeader, { backgroundColor: tier.color + '20' }]}>
                    <Text style={LP.tierCardIcon}>{tier.icon}</Text>
                    <Text style={[LP.tierCardName, { color: tier.color }]}>{tier.name}</Text>
                    {isCurrent && <View style={[LP.currentBadge, { backgroundColor: tier.color }]}><Text style={LP.currentBadgeText}>Current</Text></View>}
                    <Text style={LP.tierRange}>{tier.minPoints}–{tier.maxPoints || '∞'} pts</Text>
                  </View>
                  <View style={LP.tierCardPerks}>
                    {tier.perks.map((p, i) => (
                      <View key={i} style={LP.tierCardPerkRow}>
                        <Text style={[LP.tierCardPerkCheck, { color: tier.color }]}>✓</Text>
                        <Text style={LP.tierCardPerkText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Alert import
import { Alert } from 'react-native';

const LP = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  pointsCard:   { margin: 16, borderRadius: 20, padding: 22 },
  pointsTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  pointsLabel:  { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  pointsValue:  { fontSize: 42, color: Colors.white, fontWeight: '800' },
  tierBadge:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  tierIcon:     { fontSize: 24, marginBottom: 2 },
  tierName:     { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  tierProgress: { marginBottom: 14 },
  tierProgressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  tierProgressFill:{ height: 6, backgroundColor: Colors.white, borderRadius: 3 },
  tierProgressText:{ ...Typography.caption, color: 'rgba(255,255,255,0.8)' },
  tierPerks:    { gap: 4 },
  tierPerk:     { ...Typography.caption, color: 'rgba(255,255,255,0.9)' },

  tabs:        { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 12, padding: 4, ...Shadows.sm },
  tab:         { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive:   { backgroundColor: Colors.primary },
  tabText:     { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  tabTextActive:{ ...Typography.caption, color: Colors.white, fontWeight: '700' },

  section:      { padding: 16 },
  txRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, ...Shadows.sm },
  txDot:        { width: 10, height: 10, borderRadius: 5 },
  txInfo:       { flex: 1 },
  txDesc:       { ...Typography.body, color: Colors.black, fontWeight: '600' },
  txDate:       { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  txPoints:     { ...Typography.body, fontWeight: '800' },
  rewardsNote:  { ...Typography.caption, color: Colors.gray, marginBottom: 12 },
  rewardCard:   { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, ...Shadows.sm },
  rewardCardDisabled: { opacity: 0.6 },
  rewardIcon:   { fontSize: 28 },
  rewardInfo:   { flex: 1 },
  rewardTitle:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  rewardPoints: { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  redeemBtn:    { backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  redeemBtnDisabled: { backgroundColor: Colors.offWhite },
  redeemBtnText:{ ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  tierCard:     { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.sm, borderWidth: 1, borderColor: 'transparent' },
  tierCardHeader:{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  tierCardIcon: { fontSize: 28 },
  tierCardName: { ...Typography.h3, flex: 1 },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  currentBadgeText:{ ...Typography.small, color: Colors.white, fontWeight: '700' },
  tierRange:    { ...Typography.caption, color: Colors.gray },
  tierCardPerks:{ padding: 14, paddingTop: 0 },
  tierCardPerkRow:{ flexDirection: 'row', gap: 8, marginBottom: 6 },
  tierCardPerkCheck:{ ...Typography.body, fontWeight: '700' },
  tierCardPerkText: { ...Typography.body, color: Colors.darkGray, flex: 1 },
});
