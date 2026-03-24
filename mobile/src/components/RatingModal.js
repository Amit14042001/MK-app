/**
 * Slot App — RatingModal Component
 * Urban Company style post-booking review popup
 * Feature #6: Star rating modal after service completion
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Animated, Alert, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const QUICK_TAGS = {
  5: ['On time 🕐', 'Very professional 💼', 'Great quality ✨', 'Would recommend 👍', 'Clean work 🧹', 'Friendly 😊'],
  4: ['Good service 👌', 'On time', 'Professional', 'Satisfactory'],
  3: ['Average service', 'Could be better', 'Okay quality'],
  2: ['Late arrival ⏰', 'Average quality', 'Needs improvement'],
  1: ['Very late', 'Poor quality', 'Not professional', 'Would not recommend'],
};

const RATING_LABELS = { 5: 'Excellent! 🤩', 4: 'Good 😊', 3: 'Average 😐', 2: 'Poor 😕', 1: 'Terrible 😞' };
const RATING_COLORS = { 5: Colors.success, 4: '#4CAF50', 3: Colors.warning, 2: '#FF7043', 1: Colors.error };

const SUB_RATINGS = [
  { key: 'punctuality',  label: 'Punctuality',   icon: '🕐' },
  { key: 'quality',      label: 'Work Quality',  icon: '⭐' },
  { key: 'behaviour',    label: 'Behaviour',     icon: '😊' },
  { key: 'cleanliness',  label: 'Cleanliness',   icon: '🧹' },
];

export default function RatingModal({
  visible,
  booking,
  onClose,
  onSubmit,
}) {
  const [step, setStep]            = useState(1);  // 1: rating, 2: tags+comment, 3: sub-ratings, 4: success
  const [rating, setRating]        = useState(0);
  const [hoveredStar, setHovered]  = useState(0);
  const [selectedTags, setTags]    = useState([]);
  const [comment, setComment]      = useState('');
  const [subRatings, setSubRatings]= useState({ punctuality: 0, quality: 0, behaviour: 0, cleanliness: 0 });
  const [submitting, setSubmitting]= useState(false);
  const scaleAnim  = useRef(new Animated.Value(0.8)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;
  const starAnims  = useRef([1,2,3,4,5].map(() => new Animated.Value(1))).current;
  const successAnim= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1); setRating(0); setTags([]); setComment('');
      setSubRatings({ punctuality: 0, quality: 0, behaviour: 0, cleanliness: 0 });
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, useNativeDriver: true }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateStar = (idx) => {
    Animated.sequence([
      Animated.timing(starAnims[idx], { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(starAnims[idx], { toValue: 1.0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const selectRating = (r) => {
    setRating(r);
    for (let i = 0; i < r; i++) {
      setTimeout(() => animateStar(i), i * 60);
    }
    setTimeout(() => setStep(2), 600);
  };

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Rate First', 'Please select a star rating.'); return; }
    setSubmitting(true);
    try {
      await onSubmit?.({
        bookingId:        booking?._id,
        rating,
        comment:          comment.trim(),
        tags:             selectedTags,
        punctualityRating:subRatings.punctuality || rating,
        qualityRating:    subRatings.quality     || rating,
        behaviourRating:  subRatings.behaviour   || rating,
        cleanlinessRating:subRatings.cleanliness || rating,
      });
      setStep(4);
      Animated.spring(successAnim, { toValue: 1, tension: 60, useNativeDriver: true }).start();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
    setSubmitting(false);
  };

  const proName = booking?.professional?.user?.name || 'your professional';
  const service = booking?.service?.name || 'the service';
  const displayRating = hoveredStar || rating;
  const ratingColor   = RATING_COLORS[displayRating] || Colors.primary;
  const ratingLabel   = RATING_LABELS[displayRating] || 'How was it?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[S.overlay, { opacity: opacAnim }]}>
        <Animated.View style={[S.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Step 1: Star Rating */}
          {step === 1 && (
            <>
              <TouchableOpacity style={S.skipBtn} onPress={onClose}>
                <Text style={S.skipText}>Skip</Text>
              </TouchableOpacity>

              <View style={[S.proAvatar, { backgroundColor: Colors.primaryLight }]}>
                <Text style={S.proAvatarText}>{proName[0]?.toUpperCase()}</Text>
              </View>
              <Text style={S.rateTitle}>How was {proName}?</Text>
              <Text style={S.rateSub}>{service}</Text>

              <View style={S.starsRow}>
                {[1,2,3,4,5].map(s => (
                  <Animated.View key={s} style={{ transform: [{ scale: starAnims[s-1] }] }}>
                    <TouchableOpacity
                      onPress={() => selectRating(s)}
                      onPressIn={() => setHovered(s)}
                      onPressOut={() => setHovered(0)}
                      activeOpacity={0.8}
                    >
                      <Text style={[S.star, { color: s <= displayRating ? Colors.star : Colors.lightGray }]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <Text style={[S.ratingLabel, { color: ratingColor }]}>
                {ratingLabel}
              </Text>
            </>
          )}

          {/* Step 2: Tags + Comment */}
          {step === 2 && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={S.stepHeader}>
                <View style={S.starsRowSmall}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} onPress={() => { setRating(s); setTags([]); }}>
                      <Text style={[S.starSm, { color: s <= rating ? Colors.star : Colors.lightGray }]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[S.ratingLabelSm, { color: ratingColor }]}>{RATING_LABELS[rating]}</Text>
              </View>

              <Text style={S.tagsTitle}>What did you like?</Text>
              <View style={S.tagsWrap}>
                {(QUICK_TAGS[rating] || QUICK_TAGS[3]).map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[S.tagChip, selectedTags.includes(tag) && S.tagChipSelected]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[S.tagText, selectedTags.includes(tag) && S.tagTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={S.commentLabel}>Add a comment (optional)</Text>
              <TextInput
                style={S.commentInput}
                placeholder={`Tell us more about ${proName}...`}
                placeholderTextColor={Colors.lightGray}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <Text style={S.charCount}>{comment.length}/500</Text>

              <View style={S.stepBtns}>
                <TouchableOpacity style={S.nextBtn} onPress={() => setStep(3)}>
                  <Text style={S.nextBtnText}>Next →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.skipStepBtn} onPress={handleSubmit}>
                  <Text style={S.skipStepText}>Submit without details</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Step 3: Sub-ratings */}
          {step === 3 && (
            <>
              <Text style={S.subTitle}>Rate specific aspects</Text>
              <Text style={S.subSubtitle}>Your detailed feedback helps professionals improve</Text>

              {SUB_RATINGS.map(item => (
                <View key={item.key} style={S.subRow}>
                  <Text style={S.subLabel}>{item.icon} {item.label}</Text>
                  <View style={S.subStarsRow}>
                    {[1,2,3,4,5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setSubRatings(p => ({ ...p, [item.key]: s }))}>
                        <Text style={[S.subStar, { color: s <= (subRatings[item.key] || 0) ? Colors.star : Colors.lightGray }]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[S.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={S.submitBtnText}>Submit Review ✓</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={S.backStepBtn} onPress={() => setStep(2)}>
                <Text style={S.backStepText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <Animated.View style={[S.successBox, { transform: [{ scale: successAnim }] }]}>
              <Text style={S.successEmoji}>🎉</Text>
              <Text style={S.successTitle}>Thanks for your review!</Text>
              <Text style={S.successSub}>
                Your feedback helps {proName} grow and helps other customers make better decisions.
              </Text>
              {rating >= 4 && (
                <View style={S.shareSuggestion}>
                  <Text style={S.shareText}>💬 Share your experience on WhatsApp?</Text>
                  <TouchableOpacity style={S.shareBtn}>
                    <Text style={S.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={S.doneBtn} onPress={onClose}>
                <Text style={S.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { backgroundColor: Colors.white, borderRadius: 24, padding: 28, width: '100%', alignItems: 'center' },
  skipBtn:     { position: 'absolute', top: 16, right: 16 },
  skipText:    { ...Typography.body, color: Colors.midGray },
  proAvatar:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  proAvatarText:{ fontSize: 28, color: Colors.primary, fontWeight: '800' },
  rateTitle:   { ...Typography.h2, color: Colors.black, marginBottom: 4, textAlign: 'center' },
  rateSub:     { ...Typography.body, color: Colors.gray, marginBottom: 20 },
  starsRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star:        { fontSize: 44 },
  ratingLabel: { ...Typography.h3, fontWeight: '700', marginBottom: 8 },
  stepHeader:  { alignItems: 'center', marginBottom: 16 },
  starsRowSmall:{ flexDirection: 'row', gap: 4, marginBottom: 4 },
  starSm:      { fontSize: 28 },
  ratingLabelSm:{ ...Typography.body, fontWeight: '700' },
  tagsTitle:   { ...Typography.body, color: Colors.black, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 10 },
  tagsWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignSelf: 'stretch' },
  tagChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.lightGray, backgroundColor: Colors.white },
  tagChipSelected:{ backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tagText:     { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  tagTextSelected:{ color: Colors.primary, fontWeight: '700' },
  commentLabel:{ ...Typography.caption, color: Colors.gray, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 6 },
  commentInput:{ backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14, ...Typography.body, color: Colors.black, width: '100%', borderWidth: 1, borderColor: Colors.lightGray, textAlignVertical: 'top', minHeight: 80 },
  charCount:   { ...Typography.small, color: Colors.midGray, alignSelf: 'flex-end', marginTop: 4, marginBottom: 12 },
  stepBtns:    { width: '100%', gap: 8 },
  nextBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  nextBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  skipStepBtn: { paddingVertical: 10, alignItems: 'center' },
  skipStepText:{ ...Typography.body, color: Colors.gray },
  subTitle:    { ...Typography.h3, color: Colors.black, marginBottom: 4, alignSelf: 'flex-start' },
  subSubtitle: { ...Typography.caption, color: Colors.gray, marginBottom: 16, alignSelf: 'flex-start' },
  subRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  subLabel:    { ...Typography.body, color: Colors.black, fontWeight: '600' },
  subStarsRow: { flexDirection: 'row', gap: 4 },
  subStar:     { fontSize: 22 },
  submitBtn:   { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', width: '100%', marginTop: 16 },
  submitBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  backStepBtn: { paddingVertical: 10 },
  backStepText:{ ...Typography.body, color: Colors.gray },
  successBox:  { alignItems: 'center', width: '100%' },
  successEmoji:{ fontSize: 64, marginBottom: 14 },
  successTitle:{ ...Typography.h2, color: Colors.black, marginBottom: 8, textAlign: 'center' },
  successSub:  { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  shareSuggestion:{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successLight, borderRadius: 12, padding: 12, gap: 10, width: '100%', marginBottom: 16 },
  shareText:   { ...Typography.caption, color: Colors.success, flex: 1 },
  shareBtn:    { backgroundColor: Colors.success, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  shareBtnText:{ ...Typography.caption, color: Colors.white, fontWeight: '700' },
  doneBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40 },
  doneBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
});
