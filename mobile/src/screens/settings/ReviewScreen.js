/**
 * MK App — Review / Rating Screen (Full)
 * Post-service rating with category ratings, tags, photos
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { reviewsAPI } from '../../utils/api';

const TAGS = [
  'Great work', 'On time', 'Very professional', 'Good value',
  'Clean & tidy', 'Would recommend', 'Friendly', 'Expert',
];

const CATEGORY_LABELS = [
  { key: 'overall',       label: 'Overall',       icon: '⭐' },
  { key: 'punctuality',   label: 'Punctuality',   icon: '⏰' },
  { key: 'quality',       label: 'Work Quality',  icon: '🔧' },
  { key: 'behaviour',     label: 'Behaviour',     icon: '😊' },
  { key: 'valueForMoney', label: 'Value for Money',icon: '💰' },
];

function StarRow({ label, icon, value, onChange, size = 32 }) {
  return (
    <View style={R.starRow}>
      <Text style={R.starLabel}>{icon} {label}</Text>
      <View style={R.stars}>
        {[1,2,3,4,5].map(star => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} style={{ padding: 4 }}>
            <Text style={[R.star, { fontSize: size, color: star <= value ? '#FFD700' : '#E0E0E0' }]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ReviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { booking } = route.params || {};

  const [ratings, setRatings] = useState({ overall: 0, punctuality: 0, quality: 0, behaviour: 0, valueForMoney: 0 });
  const [tags, setSelectedTags]   = useState([]);
  const [comment, setComment]     = useState('');
  const [title, setTitle]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setRating = (key, val) => setRatings(prev => ({ ...prev, [key]: val }));
  const toggleTag = (tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const QUICK_TITLES = ['Excellent service!', 'Very satisfied', 'Good job', 'Could be better', 'Needs improvement'];

  const handleSubmit = async () => {
    if (!ratings.overall) return Alert.alert('Rating Required', 'Please give an overall rating');
    if (!booking?._id)    return Alert.alert('Error', 'Booking info missing');

    setSubmitting(true);
    try {
      await reviewsAPI.create({
        bookingId: booking._id,
        rating:    ratings,
        title:     title || (ratings.overall >= 4 ? 'Great experience!' : 'Could be improved'),
        comment,
        tags,
      });
      Alert.alert(
        '🌟 Thank you!',
        'Your review has been submitted. It helps us improve!',
        [{ text: 'Done', onPress: () => navigation.navigate('BookingsTab') }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const EMOJIS = ['😠', '😕', '😐', '😊', '🤩'];
  const overall = ratings.overall;

  return (
    <View style={[R.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={R.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={R.backBtn}>
          <Text style={R.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={R.headerTitle}>Rate Your Experience</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Booking info */}
        {booking && (
          <View style={R.bookingCard}>
            <Text style={R.bookingEmoji}>{booking.service?.icon || '🔧'}</Text>
            <View>
              <Text style={R.bookingName}>{booking.service?.name || 'Service'}</Text>
              <Text style={R.bookingDate}>
                {booking.professional?.user?.name || 'Your Professional'} •{' '}
                {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
        )}

        {/* Overall big rating */}
        <View style={R.overallBox}>
          <Text style={R.overallLabel}>How was your overall experience?</Text>
          <View style={R.bigStars}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating('overall', star)} style={{ padding: 8 }}>
                <Text style={[R.bigStar, { color: star <= overall ? '#FFD700' : '#E0E0E0' }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {overall > 0 && <Text style={R.overallEmoji}>{EMOJIS[overall - 1]}</Text>}
          <Text style={R.ratingLabel}>
            {overall === 5 ? 'Excellent!' : overall === 4 ? 'Good' : overall === 3 ? 'Average' : overall === 2 ? 'Below Average' : overall === 1 ? 'Poor' : 'Tap to rate'}
          </Text>
        </View>

        {/* Category ratings */}
        {overall > 0 && (
          <View style={R.categoryCard}>
            <Text style={R.sectionTitle}>Rate Specific Aspects</Text>
            {CATEGORY_LABELS.filter(c => c.key !== 'overall').map(cat => (
              <StarRow
                key={cat.key}
                label={cat.label}
                icon={cat.icon}
                value={ratings[cat.key] || 0}
                onChange={v => setRating(cat.key, v)}
                size={26}
              />
            ))}
          </View>
        )}

        {/* Tags */}
        <View style={R.tagsSection}>
          <Text style={R.sectionTitle}>What stood out? (optional)</Text>
          <View style={R.tagsGrid}>
            {TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[R.tagChip, tags.includes(tag) && R.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[R.tagText, tags.includes(tag) && R.tagTextActive]}>
                  {tags.includes(tag) ? '✓ ' : ''}{tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick titles */}
        <View style={R.quickSection}>
          <Text style={R.sectionTitle}>Review title (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {QUICK_TITLES.map(t => (
              <TouchableOpacity
                key={t}
                style={[R.quickTitle, title === t && R.quickTitleActive]}
                onPress={() => setTitle(prev => prev === t ? '' : t)}
              >
                <Text style={[R.quickTitleText, title === t && R.quickTitleTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={R.titleInput}
            placeholder="Or write your own title..."
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#aaa"
            maxLength={100}
          />
        </View>

        {/* Comment */}
        <View style={R.commentSection}>
          <Text style={R.sectionTitle}>Tell us more (optional)</Text>
          <TextInput
            style={R.commentInput}
            placeholder="Share details about your experience. This helps other customers and our professionals improve..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor="#aaa"
            maxLength={1000}
          />
          <Text style={R.charCount}>{comment.length}/1000</Text>
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={[R.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[R.submitBtn, (!ratings.overall || submitting) && R.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!ratings.overall || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={R.submitBtnText}>Submit Review ⭐</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const R = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  bookingCard:  { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 14, ...Shadows.sm },
  bookingEmoji: { fontSize: 36 },
  bookingName:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  bookingDate:  { fontSize: 13, color: '#999', marginTop: 2 },
  overallBox:   { alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 24, ...Shadows.md },
  overallLabel: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 16 },
  bigStars:     { flexDirection: 'row', gap: 4 },
  bigStar:      { fontSize: 44 },
  overallEmoji: { fontSize: 48, marginTop: 12 },
  ratingLabel:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 8 },
  categoryCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, ...Shadows.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  starRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  starLabel:    { fontSize: 14, color: '#555', flex: 1 },
  stars:        { flexDirection: 'row' },
  star:         {},
  tagsSection:  { paddingHorizontal: 16, marginBottom: 16 },
  tagsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0', ...Shadows.sm },
  tagChipActive:{ backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tagText:      { fontSize: 13, fontWeight: '500', color: '#555' },
  tagTextActive:{ color: Colors.primary, fontWeight: '700' },
  quickSection: { paddingHorizontal: 16, marginBottom: 16 },
  quickTitle:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0' },
  quickTitleActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  quickTitleText: { fontSize: 13, color: '#555', fontWeight: '500' },
  quickTitleTextActive: { color: Colors.primary, fontWeight: '700' },
  titleInput:   { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', borderWidth: 1, borderColor: '#E0E0E0', marginTop: 10 },
  commentSection: { paddingHorizontal: 16, marginBottom: 16 },
  commentInput: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', borderWidth: 1, borderColor: '#E0E0E0', height: 120 },
  charCount:    { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4 },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5', ...Shadows.lg },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.md },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },
});
