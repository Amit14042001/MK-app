/**
 * MK App — Pro Bidding Screen
 * Auction-style: customer posts job → pros submit bids → customer picks
 * UC does NOT have this — competitive advantage
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Radius } from '../../utils/theme';
import { bidsAPI, bookingsAPI } from '../../utils/api';

const { width: W } = Dimensions.get('window');

// Kept for reference only — never shown to users
const DEMO_BIDS = [
  { _id: 'b1', professional: { _id: 'p1', name: 'Rajesh Kumar', rating: 4.9, totalBookings: 234, city: 'Hyderabad', skills: ['AC Service', 'Electrical'] }, bidAmount: 449, timeline: '2 hours', message: 'I have 8 years of AC servicing experience. Will do a thorough job including coil cleaning, gas check, and filter replacement.', createdAt: new Date(Date.now() - 600000) },
  { _id: 'b2', professional: { _id: 'p2', name: 'Suresh Patel', rating: 4.7, totalBookings: 178, city: 'Hyderabad', skills: ['AC Service', 'Appliances'] }, bidAmount: 399, timeline: '1.5 hours', message: 'Certified HVAC technician. Quick and efficient service. Carry genuine spare parts.', createdAt: new Date(Date.now() - 1200000) },
  { _id: 'b3', professional: { _id: 'p3', name: 'Amit Sharma', rating: 4.8, totalBookings: 312, city: 'Hyderabad', skills: ['AC Service', 'Carpentry'] }, bidAmount: 499, timeline: '2.5 hours', message: 'Premium service with 30-day warranty on all work. I use eco-friendly cleaning agents.', createdAt: new Date(Date.now() - 1800000) },
];

function BidCard({ bid, onAccept, isAccepted, rank }) {
  const [expanded, setExpanded] = useState(false);
  const pro = bid.professional;
  const timeAgo = Math.round((Date.now() - new Date(bid.createdAt)) / 60000);

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankLabels = ['🥇 Lowest Bid', '🥈 2nd', '🥉 3rd'];

  return (
    <View style={[S.bidCard, isAccepted && S.bidCardAccepted]}>
      {rank < 3 && (
        <View style={[S.rankBadge, { backgroundColor: rankColors[rank] + '20', borderColor: rankColors[rank] }]}>
          <Text style={[S.rankText, { color: rankColors[rank] }]}>{rankLabels[rank]}</Text>
        </View>
      )}

      <View style={S.bidHeader}>
        {/* Pro avatar */}
        <View style={S.proAvatar}>
          <Text style={S.proAvatarText}>{pro.name?.charAt(0) || 'P'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={S.proName}>{pro.name}</Text>
          <View style={S.proMeta}>
            <Text style={S.proRating}>★ {pro.rating?.toFixed(1)}</Text>
            <Text style={S.proMetaDot}>·</Text>
            <Text style={S.proJobs}>{pro.totalBookings}+ jobs</Text>
            <Text style={S.proMetaDot}>·</Text>
            <Text style={S.proCity}>{pro.city}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {pro.skills?.slice(0, 2).map(s => (
              <View key={s} style={S.skillChip}>
                <Text style={S.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.bidAmountBox}>
          <Text style={S.bidAmount}>₹{bid.bidAmount}</Text>
          <Text style={S.bidTimeline}>⏱ {bid.timeline}</Text>
          <Text style={S.bidAgo}>{timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo/60)}h ago`}</Text>
        </View>
      </View>

      {/* Message */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={S.messageRow}>
        <Text style={S.messageText} numberOfLines={expanded ? undefined : 2}>
          {bid.message}
        </Text>
        <Text style={S.expandText}>{expanded ? 'Show less' : 'Read more'}</Text>
      </TouchableOpacity>

      {/* Accept button */}
      {isAccepted ? (
        <View style={S.acceptedBanner}>
          <Text style={S.acceptedText}>✅ Bid Accepted — Professional Assigned!</Text>
        </View>
      ) : (
        <TouchableOpacity style={S.acceptBtn} onPress={() => onAccept(bid)} activeOpacity={0.85}>
          <Text style={S.acceptBtnText}>Accept Bid — ₹{bid.bidAmount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProBiddingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const bookingId = route?.params?.bookingId;

  const [bids, setBids]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [acceptedBid, setAcceptedBid] = useState(null);
  const [postModal, setPostModal]     = useState(false);
  const [newJob, setNewJob]           = useState({ description: '', budget: '', service: '' });
  const [posting, setPosting]         = useState(false);
  const [timeLeft, setTimeLeft]       = useState(1800); // 30 min countdown

  useEffect(() => {
    loadBids();
  }, [bookingId]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadBids = async () => {
    setLoading(true);
    try {
      if (bookingId) {
        const { data } = await bidsAPI.getForBooking(bookingId);
        setBids(data.data || []);
      } else {
        // No booking selected — empty state, not fake data
        setBids([]);
      }
    } catch {
      setBids([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (bid) => {
    Alert.alert(
      `Accept ${bid.professional.name}'s bid?`,
      `₹${bid.bidAmount} · ${bid.timeline}\n\nThey will be assigned to your booking immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              if (bookingId) await bidsAPI.acceptBid(bid._id);
              setAcceptedBid(bid._id);
              setTimeout(() => {
                Alert.alert('🎉 Confirmed!', `${bid.professional.name} has been assigned to your booking.`, [
                  { text: 'View Booking', onPress: () => navigation.navigate('BookingDetail', { bookingId }) },
                  { text: 'OK' },
                ]);
              }, 300);
            } catch (e) {
              Alert.alert('Error', 'Failed to accept bid. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePostJob = async () => {
    if (!newJob.description || !newJob.service) {
      Alert.alert('Required', 'Please fill service type and job description');
      return;
    }
    setPosting(true);
    try {
      const { instantAPI } = require('../../utils/api');
      await instantAPI.create({
        serviceType:  newJob.service,
        description:  newJob.description,
        budget:       newJob.budget ? Number(newJob.budget) : undefined,
        type:         'bidding',
      });
      setPosting(false);
      setPostModal(false);
      setNewJob({ description: '', budget: '', service: '' });
      Alert.alert('✅ Job Posted!', 'Professionals in your area are being notified. You will receive bids within 30 minutes.', [{ text: 'OK' }]);
    } catch (e) {
      setPosting(false);
      Alert.alert('Error', e?.response?.data?.message || 'Could not post job. Please try again.');
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const sortedBids = [...bids].sort((a, b) => a.bidAmount - b.bidAmount);

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Pro Bidding</Text>
          <Text style={S.headerSub}>Professionals compete for your job</Text>
        </View>
        <TouchableOpacity style={S.postBtn} onPress={() => setPostModal(true)}>
          <Text style={S.postBtnText}>+ Post Job</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* How it works banner */}
      <View style={S.howBanner}>
        {[['📢', 'Post Job'], ['👷', 'Get Bids'], ['✅', 'Pick Best']].map(([icon, label]) => (
          <View key={label} style={S.howStep}>
            <Text style={S.howIcon}>{icon}</Text>
            <Text style={S.howLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Timer + bid count */}
      {bids.length > 0 && (
        <View style={S.timerRow}>
          <View style={S.timerBox}>
            <Text style={S.timerLabel}>Bids expire in</Text>
            <Text style={[S.timerValue, timeLeft < 300 && { color: Colors.error }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
          <View style={S.bidCountBox}>
            <Text style={S.bidCountNum}>{bids.length}</Text>
            <Text style={S.bidCountLabel}>bids received</Text>
          </View>
          <View style={S.savingsBox}>
            <Text style={S.savingsLabel}>Lowest bid</Text>
            <Text style={S.savingsValue}>₹{Math.min(...bids.map(b => b.bidAmount))}</Text>
          </View>
        </View>
      )}

      {/* Bids list */}
      {loading ? (
        <View style={S.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={S.loadingText}>Fetching bids…</Text>
        </View>
      ) : bids.length === 0 ? (
        <View style={S.emptyBox}>
          {bookingId ? (
            <>
              <Text style={S.emptyIcon}>⏳</Text>
              <Text style={S.emptyTitle}>Waiting for bids…</Text>
              <Text style={S.emptySub}>Professionals have been notified and will submit bids shortly. Check back in a few minutes.</Text>
            </>
          ) : (
            <>
              <Text style={S.emptyIcon}>🏷️</Text>
              <Text style={S.emptyTitle}>No booking selected</Text>
              <Text style={S.emptySub}>Post a job request and let professionals bid for your service. You pick the best price.</Text>
              <TouchableOpacity style={S.postBtn} onPress={() => setPostModal(true)}>
                <Text style={S.postBtnText}>+ Post a Job Request</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          <Text style={S.listTitle}>{sortedBids.length} Bids — sorted by lowest price</Text>
          {sortedBids.map((bid, idx) => (
            <BidCard
              key={bid._id}
              bid={bid}
              rank={idx}
              onAccept={handleAccept}
              isAccepted={acceptedBid === bid._id}
            />
          ))}
        </ScrollView>
      )}

      {/* Post Job Modal */}
      <Modal visible={postModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPostModal(false)} />
          <View style={[S.postSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Post a Job for Bidding</Text>
            <Text style={S.sheetSub}>Tell pros what you need — they'll bid for it</Text>

            <View style={S.field}>
              <Text style={S.fieldLabel}>Service type *</Text>
              <TextInput
                value={newJob.service}
                onChangeText={v => setNewJob(j => ({ ...j, service: v }))}
                placeholder="e.g. AC Service, Deep Cleaning, Plumbing"
                placeholderTextColor={Colors.lightGray}
                style={S.fieldInput}
              />
            </View>

            <View style={S.field}>
              <Text style={S.fieldLabel}>Job description *</Text>
              <TextInput
                value={newJob.description}
                onChangeText={v => setNewJob(j => ({ ...j, description: v }))}
                placeholder="Describe what you need done, any special requirements…"
                placeholderTextColor={Colors.lightGray}
                style={[S.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
              />
            </View>

            <View style={S.field}>
              <Text style={S.fieldLabel}>Your budget (optional)</Text>
              <TextInput
                value={newJob.budget}
                onChangeText={v => setNewJob(j => ({ ...j, budget: v }))}
                placeholder="e.g. ₹500 (leave blank to accept any bid)"
                placeholderTextColor={Colors.lightGray}
                keyboardType="number-pad"
                style={S.fieldInput}
              />
            </View>

            <View style={S.benefitRow}>
              {['Pros compete = lower price', 'Read reviews before choosing', 'No obligation to accept'].map(b => (
                <View key={b} style={S.benefit}>
                  <Text style={S.benefitCheck}>✓</Text>
                  <Text style={S.benefitText}>{b}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={S.postConfirmBtn} onPress={handlePostJob} disabled={posting}>
              {posting ? <ActivityIndicator color="#fff" /> : <Text style={S.postConfirmText}>📢 Post Job & Invite Bids</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#fff' },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  postBtn:      { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  postBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  howBanner:    { flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 14, paddingHorizontal: 24, justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  howStep:      { alignItems: 'center', gap: 4 },
  howIcon:      { fontSize: 22 },
  howLabel:     { fontSize: 12, fontWeight: '700', color: Colors.gray },

  timerRow:     { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: 'hidden', ...Shadows.sm },
  timerBox:     { flex: 1, alignItems: 'center', padding: 12, borderRightWidth: 1, borderRightColor: Colors.borderLight },
  timerLabel:   { fontSize: 10, color: Colors.gray, fontWeight: '600', textTransform: 'uppercase' },
  timerValue:   { fontSize: 22, fontWeight: '800', color: Colors.black, fontVariant: ['tabular-nums'] },
  bidCountBox:  { flex: 1, alignItems: 'center', padding: 12, borderRightWidth: 1, borderRightColor: Colors.borderLight },
  bidCountNum:  { fontSize: 22, fontWeight: '800', color: Colors.primary },
  bidCountLabel:{ fontSize: 10, color: Colors.gray, fontWeight: '600' },
  savingsBox:   { flex: 1, alignItems: 'center', padding: 12 },
  savingsLabel: { fontSize: 10, color: Colors.gray, fontWeight: '600' },
  savingsValue: { fontSize: 22, fontWeight: '800', color: Colors.success },

  loadingBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { fontSize: 14, color: Colors.gray },
  emptyBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon:    { fontSize: 56, marginBottom: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: Colors.black, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 22 },

  listTitle:    { fontSize: 13, fontWeight: '700', color: Colors.gray, marginBottom: 4 },

  bidCard:      { backgroundColor: Colors.white, borderRadius: 18, padding: 16, ...Shadows.sm },
  bidCardAccepted: { borderWidth: 2, borderColor: Colors.success },
  rankBadge:    { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  rankText:     { fontSize: 11, fontWeight: '800' },

  bidHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  proAvatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryMid || '#FFD6DE', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  proAvatarText:{ fontSize: 18, fontWeight: '800', color: Colors.primary },
  proName:      { fontSize: 15, fontWeight: '700', color: Colors.black },
  proMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  proRating:    { fontSize: 12, fontWeight: '700', color: Colors.star },
  proMetaDot:   { fontSize: 10, color: Colors.lightGray },
  proJobs:      { fontSize: 12, color: Colors.gray },
  proCity:      { fontSize: 12, color: Colors.gray },
  skillChip:    { backgroundColor: Colors.offWhite, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  skillText:    { fontSize: 10, fontWeight: '600', color: Colors.gray },

  bidAmountBox: { alignItems: 'flex-end' },
  bidAmount:    { fontSize: 20, fontWeight: '900', color: Colors.black },
  bidTimeline:  { fontSize: 11, color: Colors.gray, marginTop: 2 },
  bidAgo:       { fontSize: 10, color: Colors.midGray, marginTop: 2 },

  messageRow:   { marginBottom: 12 },
  messageText:  { fontSize: 13, color: Colors.gray, lineHeight: 19 },
  expandText:   { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 4 },

  acceptBtn:    { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', ...Shadows.brand },
  acceptBtnText:{ fontSize: 14, fontWeight: '700', color: Colors.white },
  acceptedBanner: { backgroundColor: Colors.successLight, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.success },
  acceptedText: { fontSize: 14, fontWeight: '700', color: Colors.success },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  postSheet:    { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: Colors.black, marginBottom: 4 },
  sheetSub:     { fontSize: 13, color: Colors.gray, marginBottom: 20 },
  field:        { marginBottom: 14 },
  fieldLabel:   { fontSize: 12, fontWeight: '700', color: Colors.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput:   { backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.black, borderWidth: 1, borderColor: Colors.borderLight },
  benefitRow:   { gap: 8, marginBottom: 20 },
  benefit:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitCheck: { fontSize: 14, color: Colors.success, fontWeight: '700' },
  benefitText:  { fontSize: 13, color: Colors.gray },
  postConfirmBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  postConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
