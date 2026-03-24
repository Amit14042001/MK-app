/**
 * Slot Professional App — ProReviewsScreen
 * All customer reviews, ratings breakdown, response to reviews
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const REVIEWS = [
  { id: 'r1', customerName: 'Ananya Reddy',    rating: 5, service: 'AC Service',      date: '2025-01-10', comment: 'Excellent work! Very professional and thorough. Fixed our AC perfectly. Will definitely call again.', replied: false, avatar: 'AR' },
  { id: 'r2', customerName: 'Karan Mehta',     rating: 5, service: 'AC Installation', date: '2025-01-08', comment: 'Installed new AC quickly and cleanly. Very knowledgeable about the product.',                         replied: true,  reply: 'Thank you Karan! Happy to serve you. Please call again for any needs.', avatar: 'KM' },
  { id: 'r3', customerName: 'Priya Sharma',    rating: 4, service: 'AC Service',      date: '2025-01-05', comment: 'Good work overall. Was a bit late but the service quality was good.',                                  replied: false, avatar: 'PS' },
  { id: 'r4', customerName: 'Ramesh Kumar',    rating: 3, service: 'AC Repair',       date: '2024-12-28', comment: 'Service was okay. Fixed the issue but took longer than expected.',                                    replied: false, avatar: 'RK' },
  { id: 'r5', customerName: 'Deepika Nair',    rating: 5, service: 'AC Service',      date: '2024-12-20', comment: 'Absolutely wonderful service! Ramesh was on time, polite and did an amazing job.',                    replied: true,  reply: 'Thank you so much Deepika! It was a pleasure serving you.', avatar: 'DN' },
  { id: 'r6', customerName: 'Vijay Pillai',    rating: 4, service: 'AC Installation', date: '2024-12-15', comment: 'Professional work. Cleaned up after themselves which I appreciated.',                                 replied: false, avatar: 'VP' },
  { id: 'r7', customerName: 'Sunita Agarwal',  rating: 5, service: 'AC Service',      date: '2024-12-10', comment: 'Superb service. Very detailed in explaining what was wrong and how they fixed it.',                   replied: false, avatar: 'SA' },
  { id: 'r8', customerName: 'Ajay Tiwari',     rating: 2, service: 'AC Repair',       date: '2024-12-05', comment: 'The issue came back after 3 days. Had to call again. Disappointing.',                                replied: true,  reply: 'Sincere apologies Ajay. We have noted this and will ensure it doesn\'t repeat.', avatar: 'AT' },
];

const AVATAR_COLORS = ['#E94560','#2980B9','#27AE60','#9B59B6','#E67E22','#1ABC9C','#E74C3C','#3498DB'];

export default function ProReviewsScreen({ navigation }) {
  const [reviews, setReviews]       = useState(REVIEWS);
  const [filter, setFilter]         = useState('all'); // all | 5 | 4 | 3 | 2 | 1
  const [replyModal, setReplyModal] = useState(false);
  const [selectedReview, setSel]    = useState(null);
  const [replyText, setReplyText]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const ratingCounts = [5,4,3,2,1].map(r => ({ star: r, count: reviews.filter(rv => rv.rating === r).length }));

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.rating === parseInt(filter));

  const openReply = (review) => {
    setSel(review);
    setReplyText(review.reply || '');
    setReplyModal(true);
  };

  const submitReply = async () => {
    if (!replyText.trim()) { Alert.alert('Error', 'Please write a reply.'); return; }
    setSubmitting(true);
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/reviews/${selectedReview._id || selectedReview.id}/reply`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reply: replyText.trim() }) }
      );
      const data = await resp.json();
      if (!data.success && resp.status >= 400) throw new Error(data.message);
      setReviews(prev => prev.map(r =>
        (r._id || r.id) === (selectedReview._id || selectedReview.id)
          ? { ...r, replied: true, reply: replyText.trim() } : r
      ));
      setSubmitting(false);
      setReplyModal(false);
      Alert.alert('Reply Posted', 'Your reply has been posted successfully.');
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Error', e.message || 'Could not post reply. Try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/reviews/professional/me?limit=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (data.success && data.reviews) setReviews(data.reviews);
    } catch {}
    setRefreshing(false);
  };

  const renderStars = (rating, size = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={{ fontSize: size, color: i < rating ? Colors.star : Colors.lightGray }}>★</Text>
    ));
  };

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Rating Summary */}
        <View style={S.summaryCard}>
          <View style={S.ratingBig}>
            <Text style={S.ratingNumber}>{avgRating}</Text>
            <View style={S.starsRow}>{renderStars(Math.round(parseFloat(avgRating)), 22)}</View>
            <Text style={S.ratingCount}>{reviews.length} reviews</Text>
          </View>
          <View style={S.ratingBars}>
            {ratingCounts.map(({ star, count }) => (
              <View key={star} style={S.ratingBarRow}>
                <Text style={S.ratingBarStar}>{star}★</Text>
                <View style={S.ratingBarTrack}>
                  <View style={[S.ratingBarFill, { width: `${(count / reviews.length) * 100}%`, backgroundColor: star >= 4 ? Colors.success : star === 3 ? Colors.warning : Colors.error }]} />
                </View>
                <Text style={S.ratingBarCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Response Rate */}
        <View style={S.statsRow}>
          <View style={S.statBox}>
            <Text style={S.statValue}>{reviews.filter(r => r.replied).length}/{reviews.length}</Text>
            <Text style={S.statLabel}>Replied</Text>
          </View>
          <View style={S.statBox}>
            <Text style={[S.statValue, { color: Colors.success }]}>
              {Math.round((reviews.filter(r => r.replied).length / reviews.length) * 100)}%
            </Text>
            <Text style={S.statLabel}>Response Rate</Text>
          </View>
          <View style={S.statBox}>
            <Text style={[S.statValue, { color: Colors.warning }]}>
              {reviews.filter(r => !r.replied).length}
            </Text>
            <Text style={S.statLabel}>Pending Reply</Text>
          </View>
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {['all', '5', '4', '3', '2', '1'].map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[S.filterChip, filter === f && S.filterChipActive]}
            >
              <Text style={[S.filterLabel, filter === f && S.filterLabelActive]}>
                {f === 'all' ? 'All' : `${f}★`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reviews List */}
        <View style={S.reviewsList}>
          {filtered.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>⭐</Text>
              <Text style={S.emptyText}>No reviews for this rating</Text>
            </View>
          ) : (
            filtered.map(review => (
              <View key={review.id} style={S.reviewCard}>
                <View style={S.reviewHeader}>
                  <View style={[S.avatar, { backgroundColor: AVATAR_COLORS[review.id.charCodeAt(1) % AVATAR_COLORS.length] }]}>
                    <Text style={S.avatarText}>{review.avatar}</Text>
                  </View>
                  <View style={S.reviewerInfo}>
                    <Text style={S.reviewerName}>{review.customerName}</Text>
                    <Text style={S.reviewService}>{review.service}</Text>
                  </View>
                  <View style={S.reviewRight}>
                    <View style={S.starsRowSm}>{renderStars(review.rating, 13)}</View>
                    <Text style={S.reviewDate}>
                      {new Date(review.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </View>

                <Text style={S.reviewComment}>{review.comment}</Text>

                {review.replied && review.reply && (
                  <View style={S.replyBox}>
                    <Text style={S.replyLabel}>Your reply:</Text>
                    <Text style={S.replyText}>{review.reply}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[S.replyBtn, review.replied && S.replyBtnGray]}
                  onPress={() => openReply(review)}
                >
                  <Text style={[S.replyBtnText, review.replied && S.replyBtnTextGray]}>
                    {review.replied ? '✏️ Edit Reply' : '💬 Reply to Review'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reply Modal */}
      <Modal visible={replyModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Reply to {selectedReview?.customerName}</Text>

            <View style={S.reviewPreview}>
              <View style={S.starsRowSm}>{renderStars(selectedReview?.rating || 5, 14)}</View>
              <Text style={S.reviewPreviewText} numberOfLines={2}>{selectedReview?.comment}</Text>
            </View>

            <TextInput
              style={S.replyInput}
              placeholder="Write your reply here... Be polite and professional."
              placeholderTextColor={Colors.lightGray}
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
              maxLength={300}
            />
            <Text style={S.charCount}>{replyText.length}/300</Text>

            {/* Quick replies */}
            <Text style={S.quickLabel}>Quick Replies:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {[
                'Thank you for your kind feedback!',
                'Sorry for the inconvenience. We\'ll improve.',
                'Happy to serve you again!',
                'Thank you! Please call again.',
              ].map((q, i) => (
                <TouchableOpacity key={i} style={S.quickChip} onPress={() => setReplyText(q)}>
                  <Text style={S.quickChipText} numberOfLines={1}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[S.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={submitReply}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={S.submitBtnText}>Post Reply</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={S.cancelBtn} onPress={() => setReplyModal(false)}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  summaryCard:  { margin: 16, backgroundColor: Colors.white, borderRadius: 20, padding: 20, flexDirection: 'row', ...Shadows.sm },
  ratingBig:    { alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: Colors.offWhite, minWidth: 100 },
  ratingNumber: { fontSize: 48, color: Colors.black, fontWeight: '800', lineHeight: 56 },
  starsRow:     { flexDirection: 'row', gap: 2, marginVertical: 4 },
  ratingCount:  { ...Typography.caption, color: Colors.gray },
  ratingBars:   { flex: 1, paddingLeft: 16 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  ratingBarStar:{ ...Typography.caption, color: Colors.gray, width: 20, textAlign: 'right' },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: Colors.offWhite, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill:  { height: 6, borderRadius: 3 },
  ratingBarCount: { ...Typography.small, color: Colors.gray, width: 16, textAlign: 'right' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  statBox:  { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: 'center', ...Shadows.sm },
  statValue:{ ...Typography.h3, color: Colors.primary },
  statLabel:{ ...Typography.small, color: Colors.gray, marginTop: 2, textAlign: 'center' },

  filterScroll:     { marginVertical: 8 },
  filterChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1.5, borderColor: Colors.lightGray },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterLabel:      { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  filterLabelActive:{ color: Colors.white },

  reviewsList: { paddingHorizontal: 16 },
  emptyBox:    { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:   { fontSize: 40, marginBottom: 8 },
  emptyText:   { ...Typography.body, color: Colors.gray },

  reviewCard:    { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 10, ...Shadows.sm },
  reviewHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar:        { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText:    { ...Typography.caption, color: Colors.white, fontWeight: '800' },
  reviewerInfo:  { flex: 1 },
  reviewerName:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  reviewService: { ...Typography.caption, color: Colors.gray, marginTop: 1 },
  reviewRight:   { alignItems: 'flex-end' },
  starsRowSm:    { flexDirection: 'row', gap: 1 },
  reviewDate:    { ...Typography.small, color: Colors.midGray, marginTop: 2 },
  reviewComment: { ...Typography.body, color: Colors.darkGray, lineHeight: 22, marginBottom: 10 },

  replyBox:  { backgroundColor: Colors.offWhite, borderRadius: 10, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  replyLabel:{ ...Typography.small, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  replyText: { ...Typography.body, color: Colors.darkGray, lineHeight: 20 },

  replyBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight },
  replyBtnGray:   { backgroundColor: Colors.offWhite },
  replyBtnText:   { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  replyBtnTextGray:{ color: Colors.gray },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  bottomSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  reviewPreview:{ backgroundColor: Colors.offWhite, borderRadius: 10, padding: 12, marginBottom: 16 },
  reviewPreviewText: { ...Typography.body, color: Colors.gray, marginTop: 4, lineHeight: 20 },
  replyInput:   { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, ...Typography.body, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray, minHeight: 100, textAlignVertical: 'top', marginBottom: 4 },
  charCount:    { ...Typography.small, color: Colors.midGray, textAlign: 'right', marginBottom: 12 },
  quickLabel:   { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 8 },
  quickChip:    { backgroundColor: Colors.offWhite, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, maxWidth: 180 },
  quickChipText:{ ...Typography.caption, color: Colors.darkGray },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  submitBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText:{ ...Typography.body, color: Colors.gray },
});
