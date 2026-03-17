/**
 * MK App — Customer Notification & Profile Screens (Full)
 * NotificationsScreen, OffersScreen, ReferScreen, HelpScreen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, StatusBar, TextInput, Share,
  ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Shadows } from '../../utils/theme';
import { notificationsAPI, usersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── NOTIFICATIONS SCREEN ─────────────────────────────────────
const NOTIF_ICONS = {
  booking_confirmed:    '✅', booking_cancelled: '❌', booking_completed: '🎉',
  professional_assigned:'👷', professional_arriving: '🚗', professional_arrived: '🏠',
  payment_success:      '💳', refund_processed: '↩️', review_reminder: '⭐',
  offer:                '🎁', promo: '📣', system: '📢',
  subscription_activated:'👑', wallet_credit: '💰', wallet_debit: '💸',
  referral_bonus:       '🎊', default: '🔔',
};

export function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread]   = useState(0);

  const fetch = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data } = await notificationsAPI.getAll({ limit: 50 });
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  const markAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifs(p => p.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {}
  };

  const markOne = async (id) => {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifs(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(c => Math.max(0, c - 1));
  };

  const deleteOne = async (id) => {
    await notificationsAPI.delete(id).catch(() => {});
    setNotifs(p => p.filter(n => n._id !== id));
  };

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 60000);
    if (diff < 1)    return 'Just now';
    if (diff < 60)   return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[NS.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={NS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={NS.backBtn}>
          <Text style={NS.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={NS.title}>Notifications</Text>
          {unread > 0 && <Text style={NS.badge}>{unread} unread</Text>}
        </View>
        {unread > 0
          ? <TouchableOpacity style={NS.markAllBtn} onPress={markAll}><Text style={NS.markAllText}>Mark all read</Text></TouchableOpacity>
          : <View style={{ width: 80 }} />
        }
      </View>

      {loading ? (
        <View style={NS.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : notifs.length === 0 ? (
        <View style={NS.empty}>
          <Text style={NS.emptyEmoji}>🔔</Text>
          <Text style={NS.emptyTitle}>All caught up!</Text>
          <Text style={NS.emptyText}>Your booking updates and offers will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={n => n._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch(true)} colors={[Colors.primary]} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              style={[NS.item, !n.isRead && NS.itemUnread]}
              onPress={() => { markOne(n._id); if (n.relatedBooking) navigation.navigate('BookingDetail', { bookingId: n.relatedBooking }); }}
              onLongPress={() => Alert.alert('Delete', 'Remove this notification?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteOne(n._id) },
              ])}
            >
              <View style={[NS.iconBox, !n.isRead && { backgroundColor: Colors.primaryLight }]}>
                <Text style={NS.icon}>{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</Text>
              </View>
              <View style={NS.body}>
                <View style={NS.row}>
                  <Text style={[NS.notifTitle, !n.isRead && { fontWeight: '700' }]} numberOfLines={1}>{n.title}</Text>
                  <Text style={NS.time}>{timeAgo(n.createdAt)}</Text>
                </View>
                <Text style={NS.msg} numberOfLines={2}>{n.message}</Text>
              </View>
              {!n.isRead && <View style={NS.dot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ── OFFERS SCREEN ─────────────────────────────────────────────
const MOCK_OFFERS = [
  { id: '1', code: 'FIRST200', title: 'First Booking Offer', desc: '₹200 off on your first booking above ₹500', discount: '₹200 OFF', validUntil: '31 Dec 2026', category: 'new_user', color: '#E8F5E9', accent: '#2E7D32' },
  { id: '2', code: 'PRIME15',  title: 'MK Prime Discount',   desc: '15% off on all bookings for Prime members', discount: '15% OFF', validUntil: 'Ongoing', category: 'prime', color: '#FFF8E1', accent: '#F59E0B' },
  { id: '3', code: 'MONSOON30',title: 'Monsoon Special',     desc: '30% off on waterproofing & pest control', discount: '30% OFF', validUntil: '30 Sep 2026', category: 'seasonal', color: '#E3F2FD', accent: '#1565C0' },
  { id: '4', code: 'WEEKEND50',title: 'Weekend Saver',       desc: 'Flat ₹50 off on weekend bookings', discount: '₹50 OFF', validUntil: 'Every Weekend', category: 'weekend', color: '#F3E5F5', accent: '#6A1B9A' },
  { id: '5', code: 'REFER100', title: 'Referral Reward',     desc: '₹100 cashback when your friend books using your code', discount: '₹100 CASHBACK', validUntil: 'Ongoing', category: 'referral', color: '#FFF3E0', accent: '#E65100' },
  { id: '6', code: 'CLEAN299', title: 'Home Cleaning Special',desc: 'Home cleaning services starting at ₹299', discount: 'From ₹299', validUntil: '31 Aug 2026', category: 'category', color: '#F3E5F5', accent: '#7B1FA2' },
];

export function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState('');

  const copyCode = (code) => {
    // In real app: Clipboard.setString(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <View style={[NS.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={NS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={NS.backBtn}><Text style={NS.backIcon}>←</Text></TouchableOpacity>
        <Text style={NS.title}>Offers & Coupons</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={NS.offersBanner}>
          <Text style={NS.offersBannerText}>🎉 New offers added every week! Check back often.</Text>
        </View>

        {MOCK_OFFERS.map(offer => (
          <View key={offer.id} style={[NS.offerCard, { backgroundColor: offer.color, borderColor: offer.accent }]}>
            <View style={NS.offerTop}>
              <View style={NS.offerLeft}>
                <Text style={NS.offerTitle}>{offer.title}</Text>
                <Text style={NS.offerDesc}>{offer.desc}</Text>
                <Text style={NS.offerValidity}>Valid until: {offer.validUntil}</Text>
              </View>
              <View style={[NS.discountBadge, { backgroundColor: offer.accent }]}>
                <Text style={NS.discountText}>{offer.discount}</Text>
              </View>
            </View>
            <View style={NS.codeRow}>
              <View style={NS.codeBox}>
                <Text style={[NS.codeText, { color: offer.accent }]}>{offer.code}</Text>
              </View>
              <TouchableOpacity
                style={[NS.copyBtn, { backgroundColor: offer.accent }]}
                onPress={() => copyCode(offer.code)}
              >
                <Text style={NS.copyBtnText}>{copied === offer.code ? '✓ Copied!' : 'Copy Code'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── REFER SCREEN ──────────────────────────────────────────────
export function ReferScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const referralCode = user?.referralCode || 'MK' + (user?._id?.slice(-6).toUpperCase() || 'XXXXXX');

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏠 Book home services with MK App! Use my referral code *${referralCode}* and get ₹100 off your first booking.\n\nDownload: https://mkapp.in/download`,
        title: 'MK App — Refer & Earn',
      });
    } catch {}
  };

  const HOW_IT_WORKS = [
    { icon: '📤', step: '1', title: 'Share your code', desc: 'Send your unique referral code to friends & family' },
    { icon: '📱', step: '2', title: 'Friend downloads & books', desc: 'Your friend uses your code during their first booking' },
    { icon: '💰', step: '3', title: 'Both earn rewards', desc: 'You get ₹50, your friend gets ₹100 off — instantly!' },
  ];

  return (
    <View style={[NS.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A1A2E', '#f15c22']} style={NS.referHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={NS.referBack}><Text style={NS.referBackText}>←</Text></TouchableOpacity>
        <Text style={NS.referEmoji}>🎊</Text>
        <Text style={NS.referTitle}>Refer & Earn</Text>
        <Text style={NS.referSub}>Invite friends, earn ₹50 for each referral!</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Code */}
        <View style={NS.codeCard}>
          <Text style={NS.codeCardLabel}>Your Referral Code</Text>
          <Text style={NS.bigCode}>{referralCode}</Text>
          <View style={NS.codeActions}>
            <TouchableOpacity style={NS.shareBtn} onPress={handleShare}>
              <Text style={NS.shareBtnText}>📤 Share Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How it works */}
        <Text style={NS.howTitle}>How It Works</Text>
        {HOW_IT_WORKS.map((step, i) => (
          <View key={i} style={NS.stepCard}>
            <View style={NS.stepNumBadge}><Text style={NS.stepNumText}>{step.step}</Text></View>
            <Text style={NS.stepIcon}>{step.icon}</Text>
            <View style={NS.stepInfo}>
              <Text style={NS.stepTitle}>{step.title}</Text>
              <Text style={NS.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        {/* Rewards summary */}
        <View style={NS.rewardCard}>
          <Text style={NS.rewardTitle}>Your Rewards</Text>
          <View style={NS.rewardRow}>
            <View style={NS.rewardBox}><Text style={NS.rewardAmt}>₹50</Text><Text style={NS.rewardLabel}>You Earn (per referral)</Text></View>
            <View style={NS.rewardDivider} />
            <View style={NS.rewardBox}><Text style={NS.rewardAmt}>₹100</Text><Text style={NS.rewardLabel}>Friend Gets (1st booking)</Text></View>
          </View>
        </View>

        <View style={NS.termsBox}>
          <Text style={NS.termsText}>• Maximum 50 referrals per user per month{'\n'}• Reward credited after friend's first booking is completed{'\n'}• Code valid for 90 days from account creation</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── HELP SCREEN ───────────────────────────────────────────────
const FAQS = [
  { q: 'How do I book a service?', a: 'Browse services → Select a slot → Pay → Done! Our professional arrives at your doorstep.' },
  { q: 'Can I reschedule my booking?', a: 'Yes, you can reschedule up to 4 hours before the scheduled time from the Bookings section.' },
  { q: 'What if I\'m not satisfied?', a: 'Contact our support within 24 hours of service completion. We offer free re-service or full refund.' },
  { q: 'How do I track my professional?', a: 'Once assigned, you can track your professional in real-time from the Bookings > Track section.' },
  { q: 'What payment methods are accepted?', a: 'UPI, Credit/Debit cards, Net Banking, MK Wallet, and Cash on Delivery.' },
  { q: 'How do I cancel a booking?', a: 'Go to Bookings → Select booking → Cancel. Refund depends on cancellation time.' },
  { q: 'Are your professionals verified?', a: 'Yes! All professionals undergo background checks, skill verification, and training before joining.' },
  { q: 'What is the warranty on services?', a: 'Most services come with a 30-day warranty. MK Prime members get 60 days.' },
];

export function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState('');

  const filtered = FAQS.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  const CONTACTS = [
    { icon: '📞', label: 'Call Support', value: '1800-XXX-XXXX', action: () => Linking.openURL('tel:18001234567'), badge: '24/7' },
    { icon: '💬', label: 'WhatsApp', value: '+91 98765 43210', action: () => Linking.openURL('https://wa.me/919876543210'), badge: '9AM-9PM' },
    { icon: '📧', label: 'Email', value: 'support@mkapp.in', action: () => Linking.openURL('mailto:support@mkapp.in') },
  ];

  return (
    <View style={[NS.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={NS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={NS.backBtn}><Text style={NS.backIcon}>←</Text></TouchableOpacity>
        <Text style={NS.title}>Help & Support</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Search */}
        <View style={NS.searchBox}>
          <Text style={NS.searchIcon}>🔍</Text>
          <TextInput style={NS.searchInput} placeholder="Search FAQs..." value={search} onChangeText={setSearch} placeholderTextColor="#aaa" />
        </View>

        {/* Contact cards */}
        <Text style={NS.sectionTitle}>Contact Us</Text>
        {CONTACTS.map((c, i) => (
          <TouchableOpacity key={i} style={NS.contactCard} onPress={c.action} activeOpacity={0.8}>
            <Text style={NS.contactIcon}>{c.icon}</Text>
            <View style={NS.contactInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={NS.contactLabel}>{c.label}</Text>
                {c.badge && <View style={NS.contactBadge}><Text style={NS.contactBadgeText}>{c.badge}</Text></View>}
              </View>
              <Text style={NS.contactValue}>{c.value}</Text>
            </View>
            <Text style={NS.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* FAQs */}
        <Text style={NS.sectionTitle}>Frequently Asked Questions</Text>
        {filtered.map((faq, i) => (
          <TouchableOpacity key={i} style={NS.faqCard} onPress={() => setExpanded(expanded === i ? null : i)}>
            <View style={NS.faqTop}>
              <Text style={NS.faqQ} numberOfLines={expanded === i ? 99 : 1}>{faq.q}</Text>
              <Text style={[NS.faqChevron, expanded === i && { color: Colors.primary }]}>{expanded === i ? '▲' : '▼'}</Text>
            </View>
            {expanded === i && <Text style={NS.faqA}>{faq.a}</Text>}
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No FAQs found</Text>}
      </ScrollView>
    </View>
  );
}

const NS = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F7F7FA' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  title:       { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  badge:       { fontSize: 11, color: Colors.primary },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.primaryLight },
  markAllText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  item:        { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F7F7FA' },
  itemUnread:  { backgroundColor: '#FFFAF8' },
  iconBox:     { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon:        { fontSize: 22 },
  body:        { flex: 1 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  notifTitle:  { flex: 1, fontSize: 14, color: '#1A1A2E', marginRight: 8, fontWeight: '500' },
  time:        { fontSize: 11, color: '#aaa' },
  msg:         { fontSize: 13, color: '#666', lineHeight: 18 },
  dot:         { position: 'absolute', top: 20, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji:  { fontSize: 64, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText:   { fontSize: 14, color: '#999', textAlign: 'center' },
  offersBanner:{ backgroundColor: '#FFF8F0', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFE0C4' },
  offersBannerText: { fontSize: 13, color: '#E65100', fontWeight: '500' },
  offerCard:   { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  offerTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  offerLeft:   { flex: 1, marginRight: 12 },
  offerTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  offerDesc:   { fontSize: 13, color: '#555', marginTop: 4, lineHeight: 18 },
  offerValidity: { fontSize: 11, color: '#999', marginTop: 4 },
  discountBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  discountText:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  codeRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBox:     { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CCC' },
  codeText:    { fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  copyBtn:     { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  referHeader: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  referBack:   { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  referBackText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  referEmoji:  { fontSize: 56, marginBottom: 12 },
  referTitle:  { fontSize: 28, fontWeight: '900', color: '#fff' },
  referSub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  codeCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', ...Shadows.lg, marginBottom: 24 },
  codeCardLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  bigCode:     { fontSize: 32, fontWeight: '900', color: Colors.primary, letterSpacing: 4, marginBottom: 16 },
  codeActions: { flexDirection: 'row', gap: 10 },
  shareBtn:    { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, ...Shadows.md },
  shareBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  howTitle:    { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  stepCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, ...Shadows.sm },
  stepNumBadge:{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepIcon:    { fontSize: 28, marginRight: 12 },
  stepInfo:    { flex: 1 },
  stepTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  stepDesc:    { fontSize: 13, color: '#666', marginTop: 2 },
  rewardCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 16, ...Shadows.md },
  rewardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  rewardRow:   { flexDirection: 'row', alignItems: 'center' },
  rewardBox:   { flex: 1, alignItems: 'center' },
  rewardAmt:   { fontSize: 28, fontWeight: '900', color: Colors.primary },
  rewardLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  rewardDivider: { width: 1, height: 48, backgroundColor: '#F0F0F5' },
  termsBox:    { backgroundColor: '#F7F7FA', borderRadius: 12, padding: 14 },
  termsText:   { fontSize: 12, color: '#666', lineHeight: 20 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, ...Shadows.sm },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, ...Shadows.sm },
  contactIcon: { fontSize: 28, marginRight: 14 },
  contactInfo: { flex: 1 },
  contactLabel:{ fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  contactBadge:{ backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  contactBadgeText: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },
  contactValue:{ fontSize: 13, color: Colors.primary, marginTop: 2 },
  chevron:     { fontSize: 20, color: '#CCC' },
  faqCard:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, ...Shadows.sm },
  faqTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  faqQ:        { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginRight: 12 },
  faqChevron:  { fontSize: 11, color: '#999' },
  faqA:        { fontSize: 13, color: '#555', lineHeight: 19, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
});
