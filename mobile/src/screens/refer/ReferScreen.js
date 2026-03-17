/**
 * MK App — ReferScreen
 * Referral program: share code, track earnings, leaderboard
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, Clipboard, Alert, Animated, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const REFERRAL_CODE = ''; // fetched from API via loadReferralData()
const REWARD_PER_REFERRAL = 100;
const FRIEND_REWARD = 50;

const REFERRAL_STEPS = [
  { icon: '📲', title: 'Share your code', desc: 'Send your unique code to friends & family' },
  { icon: '✅', title: 'Friend signs up', desc: 'They register using your referral code' },
  { icon: '🛒', title: 'First booking', desc: 'Your friend completes their first booking' },
  { icon: '💰', title: 'Both earn!', desc: `You get ₹${REWARD_PER_REFERRAL}, friend gets ₹${FRIEND_REWARD}` },
];

const REFERRALS = [
  { id: 'r1', name: 'Priya S.',   date: '2025-01-10', status: 'completed', earned: 100 },
  { id: 'r2', name: 'Rajesh M.',  date: '2025-01-07', status: 'completed', earned: 100 },
  { id: 'r3', name: 'Kavya N.',   date: '2025-01-03', status: 'pending',   earned: 0 },
  { id: 'r4', name: 'Arjun P.',   date: '2024-12-28', status: 'completed', earned: 100 },
  { id: 'r5', name: 'Sneha R.',   date: '2024-12-20', status: 'expired',   earned: 0 },
];

export default function ReferScreen({ navigation }) {
  const [copied,    setCopied]   = useState(false);
  const [scaleAnim]              = useState(new Animated.Value(1));
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats,     setStats]    = useState({ totalEarned: 0, pendingCount: 0, completedCount: 0 });
  const [history,   setHistory]  = useState(REFERRALS); // fallback to mock
  const [loading,   setLoading]  = useState(true);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { api } = require('../../utils/api');
      const [codeRes, histRes] = await Promise.all([
        api.get('/referrals/my-code'),
        api.get('/referrals/history').catch(() => ({ data: { history: [] } })),
      ]);
      if (codeRes.data.referralCode) {
        setReferralCode(codeRes.data.referralCode);
        setReferralLink(codeRes.data.referralLink || `https://mkapp.in/join?ref=${codeRes.data.referralCode}`);
      }
      if (codeRes.data.stats) {
        setStats({
          totalEarned:    codeRes.data.stats.totalEarned    || 0,
          pendingCount:   codeRes.data.stats.pendingCount   || 0,
          completedCount: codeRes.data.stats.completedCount || 0,
        });
      }
      const hist = histRes.data.history || histRes.data.referrals;
      if (hist?.length) setHistory(hist);
    } catch {
      // keep mock data as fallback
    } finally {
      setLoading(false);
    }
  };

  const totalEarned    = stats.totalEarned;
  const pendingCount   = stats.pendingCount;
  const completedCount = stats.completedCount;

  const animateCopy = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const copyCode = () => {
    Clipboard.setString(referralCode || 'MKAPP');
    setCopied(true);
    animateCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `Hey! I use MK App for all home services — AC repair, cleaning, electrician & more. Download it and use my code ${referralCode} to get ₹${FRIEND_REWARD} off your first booking! 🏠✨\n\nDownload: ${referralLink || 'https://mkapp.in/download'}`,
        title:   'Join MK App — Best Home Services',
        url:     referralLink || 'https://mkapp.in/download',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open share sheet.');
    }
  };

  const shareVia = (platform) => {
    const msg = `Use my code ${referralCode} on MK App & get ₹${FRIEND_REWARD} off!`;
    Alert.alert(platform, `Sharing on ${platform}:\n\n${msg}`);
  };

  const statusConfig = {
    completed: { color: Colors.success, bg: Colors.successLight, label: 'Earned ₹100',  icon: '✓' },
    pending:   { color: Colors.warning, bg: Colors.warningLight, label: 'Pending',       icon: '⏳' },
    expired:   { color: Colors.midGray, bg: Colors.offWhite,     label: 'Expired',       icon: '✗' },
  };

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={S.hero}>
          <Text style={S.heroEmoji}>🎁</Text>
          <Text style={S.heroTitle}>Earn ₹{REWARD_PER_REFERRAL} per referral!</Text>
          <Text style={S.heroSub}>
            Invite friends to MK App. They get ₹{FRIEND_REWARD} off,{'\n'}you earn ₹{REWARD_PER_REFERRAL} in wallet credits.
          </Text>
        </View>

        {/* Stats */}
        <View style={S.statsRow}>
          <View style={S.statBox}>
            <Text style={[S.statValue, { color: Colors.success }]}>₹{totalEarned}</Text>
            <Text style={S.statLabel}>Total Earned</Text>
          </View>
          <View style={S.statBox}>
            <Text style={[S.statValue, { color: Colors.primary }]}>{completedCount}</Text>
            <Text style={S.statLabel}>Successful</Text>
          </View>
          <View style={S.statBox}>
            <Text style={[S.statValue, { color: Colors.warning }]}>{pendingCount}</Text>
            <Text style={S.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Referral Code */}
        <View style={S.codeSection}>
          <Text style={S.codeSectionLabel}>Your Referral Code</Text>
          <Animated.View style={[S.codeCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={S.codeText}>{referralCode || 'MKAPP'}</Text>
            <TouchableOpacity
              style={[S.copyBtn, copied && S.copyBtnSuccess]}
              onPress={copyCode}
              activeOpacity={0.8}
            >
              <Text style={S.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Share Buttons */}
          <TouchableOpacity style={S.shareMainBtn} onPress={shareCode}>
            <Text style={S.shareMainIcon}>🔗</Text>
            <Text style={S.shareMainText}>Share Your Code</Text>
          </TouchableOpacity>

          <View style={S.shareApps}>
            {[
              { name: 'WhatsApp', icon: '💬', color: '#25D366' },
              { name: 'SMS',      icon: '📱', color: '#007AFF' },
              { name: 'Email',    icon: '📧', color: '#E94560' },
              { name: 'More',     icon: '⋯',  color: '#888' },
            ].map(app => (
              <TouchableOpacity
                key={app.name}
                style={[S.shareApp, { borderColor: app.color + '30', backgroundColor: app.color + '10' }]}
                onPress={() => shareVia(app.name)}
              >
                <Text style={S.shareAppIcon}>{app.icon}</Text>
                <Text style={[S.shareAppLabel, { color: app.color }]}>{app.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={S.howSection}>
          <Text style={S.sectionTitle}>How It Works</Text>
          {REFERRAL_STEPS.map((step, i) => (
            <View key={i} style={S.stepRow}>
              <View style={S.stepLeft}>
                <View style={S.stepCircle}>
                  <Text style={S.stepNum}>{i + 1}</Text>
                </View>
                {i < REFERRAL_STEPS.length - 1 && <View style={S.stepLine} />}
              </View>
              <View style={S.stepContent}>
                <View style={S.stepHeader}>
                  <Text style={S.stepIcon}>{step.icon}</Text>
                  <Text style={S.stepTitle}>{step.title}</Text>
                </View>
                <Text style={S.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Referral History */}
        <View style={S.historySection}>
          <Text style={S.sectionTitle}>Referral History</Text>
          {REFERRALS.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>👥</Text>
              <Text style={S.emptyText}>No referrals yet. Share your code to get started!</Text>
            </View>
          ) : (
            history.map(ref => {
              const cfg = statusConfig[ref.status];
              return (
                <View key={ref.id} style={S.referralRow}>
                  <View style={S.referralAvatar}>
                    <Text style={S.referralAvatarText}>{ref.name[0]}</Text>
                  </View>
                  <View style={S.referralInfo}>
                    <Text style={S.referralName}>{ref.name}</Text>
                    <Text style={S.referralDate}>
                      {new Date(ref.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[S.referralStatus, { backgroundColor: cfg.bg }]}>
                    <Text style={[S.referralStatusText, { color: cfg.color }]}>
                      {cfg.icon} {cfg.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* T&C */}
        <View style={S.tncBox}>
          <Text style={S.tncTitle}>Terms & Conditions</Text>
          {[
            `Both you and your friend must be new to the referral benefit`,
            `Rewards credited after friend's first completed booking`,
            `Minimum booking value of ₹299 required`,
            `Wallet credits expire in 6 months`,
            `Maximum 50 referrals per account per year`,
          ].map((t, i) => (
            <View key={i} style={S.tncRow}>
              <Text style={S.tncBullet}>•</Text>
              <Text style={S.tncText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  hero:      { backgroundColor: Colors.primary, margin: 16, borderRadius: 20, padding: 28, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 10 },
  heroTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center', marginBottom: 8 },
  heroSub:   { ...Typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },

  statsRow:  { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  statBox:   { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: 'center', ...Shadows.sm },
  statValue: { ...Typography.h3, marginBottom: 2 },
  statLabel: { ...Typography.small, color: Colors.gray, textAlign: 'center' },

  codeSection:      { margin: 16, backgroundColor: Colors.white, borderRadius: 20, padding: 20, ...Shadows.sm },
  codeSectionLabel: { ...Typography.caption, color: Colors.gray, fontWeight: '700', textAlign: 'center', marginBottom: 12, letterSpacing: 0.8 },
  codeCard:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, marginBottom: 16 },
  codeText:    { ...Typography.h2, color: Colors.primary, letterSpacing: 2 },
  copyBtn:     { backgroundColor: Colors.primaryLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  copyBtnSuccess: { backgroundColor: Colors.successLight },
  copyBtnText: { ...Typography.body, color: Colors.primary, fontWeight: '700' },

  shareMainBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  shareMainIcon:{ fontSize: 18 },
  shareMainText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  shareApps:    { flexDirection: 'row', gap: 8 },
  shareApp:     { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 4 },
  shareAppIcon: { fontSize: 22 },
  shareAppLabel:{ ...Typography.small, fontWeight: '700' },

  howSection:    { margin: 16, marginTop: 0, backgroundColor: Colors.white, borderRadius: 20, padding: 20, ...Shadows.sm },
  sectionTitle:  { ...Typography.h3, color: Colors.black, marginBottom: 16 },
  stepRow:       { flexDirection: 'row', marginBottom: 4 },
  stepLeft:      { alignItems: 'center', marginRight: 14 },
  stepCircle:    { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepNum:       { ...Typography.body, color: Colors.white, fontWeight: '800' },
  stepLine:      { width: 2, flex: 1, backgroundColor: Colors.primaryLight, marginVertical: 4 },
  stepContent:   { flex: 1, paddingBottom: 20 },
  stepHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepIcon:      { fontSize: 20 },
  stepTitle:     { ...Typography.body, color: Colors.black, fontWeight: '700' },
  stepDesc:      { ...Typography.caption, color: Colors.gray, lineHeight: 18 },

  historySection:{ margin: 16, marginTop: 0, backgroundColor: Colors.white, borderRadius: 20, padding: 20, ...Shadows.sm },
  emptyBox:      { alignItems: 'center', paddingVertical: 24 },
  emptyIcon:     { fontSize: 36, marginBottom: 8 },
  emptyText:     { ...Typography.body, color: Colors.gray, textAlign: 'center' },
  referralRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  referralAvatar:{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  referralAvatarText: { ...Typography.body, color: Colors.primary, fontWeight: '800' },
  referralInfo:  { flex: 1 },
  referralName:  { ...Typography.body, color: Colors.black, fontWeight: '600' },
  referralDate:  { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  referralStatus:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  referralStatusText: { ...Typography.small, fontWeight: '700' },

  tncBox:    { margin: 16, backgroundColor: Colors.offWhite, borderRadius: 14, padding: 16 },
  tncTitle:  { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  tncRow:    { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tncBullet: { ...Typography.caption, color: Colors.midGray },
  tncText:   { ...Typography.caption, color: Colors.gray, flex: 1, lineHeight: 18 },
});
