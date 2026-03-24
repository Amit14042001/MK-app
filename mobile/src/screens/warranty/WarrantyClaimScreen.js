/**
 * Slot App — WarrantyClaimScreen
 * UC Shield — raise warranty/complaint claim within 7 days
 * Feature #12: Service warranty claim flow
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Image, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const { width: W } = Dimensions.get('window');

const CLAIM_TYPES = [
  { id: 'quality',     icon: '⭐', label: 'Poor Work Quality',     desc: 'Service not done properly' },
  { id: 'damage',      icon: '💔', label: 'Property Damage',       desc: 'Something was damaged' },
  { id: 'incomplete',  icon: '❌', label: 'Incomplete Work',       desc: 'Work was left incomplete' },
  { id: 'recurring',   icon: '🔄', label: 'Issue Recurred',        desc: 'Problem came back within 7 days' },
  { id: 'missing_item',icon: '🔍', label: 'Missing Item',          desc: 'Something is missing from home' },
  { id: 'other',       icon: '❓', label: 'Other Issue',           desc: 'Any other service related issue' },
];

const RESOLUTION_TYPES = [
  { id: 'revisit',  label: 'Free Re-visit',      icon: '🔄', desc: 'Professional will revisit at no charge' },
  { id: 'refund',   label: 'Partial Refund',      icon: '💰', desc: 'Get a partial refund to your wallet' },
  { id: 'full_refund', label: 'Full Refund',      icon: '💳', desc: 'Get full booking amount back' },
  { id: 'compensation',label: 'Compensation',     icon: '🎁', desc: 'For property damage cases' },
];

export default function WarrantyClaimScreen({ navigation, route }) {
  const booking = route?.params?.booking || {
    _id: 'mock_booking',
    bookingId: 'BK12345',
    service:   { name: 'AC Service' },
    professional: { user: { name: 'Rajesh Kumar' } },
    completedAt: new Date(Date.now() - 2 * 86400000),
  };

  const [step, setStep]           = useState(1);   // 1: select type, 2: describe, 3: resolution, 4: submitted
  const [claimType, setClaimType] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [description, setDesc]    = useState('');
  const [photos, setPhotos]       = useState([]);   // mock
  const [submitting, setSubmitting] = useState(false);
  const [claimId, setClaimId]     = useState(null);

  // Days remaining for warranty
  const completedAt = new Date(booking.completedAt);
  const daysLeft    = 7 - Math.floor((Date.now() - completedAt.getTime()) / 86400000);
  const isExpired   = daysLeft <= 0;

  const canSubmit = claimType && description.trim().length >= 20 && resolution;

  const submitClaim = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { warrantyAPI } = require('../../utils/api');
      const { data } = await warrantyAPI.submitClaim({
        bookingId:   route?.params?.bookingId,
        issueType,
        description: issueDescription,
        photos,
      });
      setClaimId(data.claim?.claimId || `WC${Date.now().toString().slice(-6)}`);
      setStep(4);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit claim. Please try again.');
    }
    setSubmitting(false);
  };

  const addPhoto = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      if (!result.didCancel && result.assets?.[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch {
      setPhotos(prev => [...prev, `photo${prev.length + 1}.jpg`]);
    }
  };

  if (isExpired) {
    return (
      <View style={S.container}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
            <Text style={S.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={S.headerTitle}>Slot Shield</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.expiredBox}>
          <Text style={S.expiredIcon}>⏰</Text>
          <Text style={S.expiredTitle}>Warranty Expired</Text>
          <Text style={S.expiredDesc}>
            The 7-day warranty period for this booking has ended.{'\n'}
            You can still contact our support team for assistance.
          </Text>
          <TouchableOpacity style={S.contactBtn} onPress={() => navigation.navigate('Help')}>
            <Text style={S.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => step > 1 && step < 4 ? setStep(s => s - 1) : navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Slot Shield Claim</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      {step < 4 && (
        <View style={S.progress}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[S.progressStep, s <= step && S.progressStepActive]}>
              <Text style={[S.progressNum, s <= step && S.progressNumActive]}>{s}</Text>
            </View>
          ))}
          <View style={[S.progressLine, step >= 2 && S.progressLineActive]} />
          <View style={[S.progressLine, step >= 3 && S.progressLineActive]} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

        {/* Booking Info */}
        {step < 4 && (
          <View style={S.bookingCard}>
            <View style={S.shieldBadge}>
              <Text style={S.shieldIcon}>🛡️</Text>
              <Text style={S.shieldText}>Protected by Slot Shield</Text>
            </View>
            <Text style={S.bookingId}>{booking.bookingId} · {booking.service?.name}</Text>
            <Text style={S.proName}>By {booking.professional?.user?.name}</Text>
            <View style={[S.warrantyBadge, daysLeft <= 2 && S.warrantyBadgeUrgent]}>
              <Text style={[S.warrantyText, daysLeft <= 2 && S.warrantyTextUrgent]}>
                ⏱ Warranty expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* STEP 1: Select Issue Type */}
        {step === 1 && (
          <>
            <Text style={S.stepTitle}>What went wrong?</Text>
            <Text style={S.stepSub}>Select the type of issue you experienced</Text>
            {CLAIM_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[S.typeCard, claimType === type.id && S.typeCardSelected]}
                onPress={() => setClaimType(type.id)}
                activeOpacity={0.85}
              >
                <Text style={S.typeIcon}>{type.icon}</Text>
                <View style={S.typeInfo}>
                  <Text style={[S.typeLabel, claimType === type.id && S.typeLabelSelected]}>{type.label}</Text>
                  <Text style={S.typeDesc}>{type.desc}</Text>
                </View>
                <View style={[S.radio, claimType === type.id && S.radioSelected]}>
                  {claimType === type.id && <View style={S.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[S.nextBtn, !claimType && S.nextBtnDisabled]}
              onPress={() => claimType && setStep(2)}
            >
              <Text style={S.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2: Describe Issue */}
        {step === 2 && (
          <>
            <Text style={S.stepTitle}>Describe the issue</Text>
            <Text style={S.stepSub}>Provide details to help us resolve this quickly</Text>

            <TextInput
              style={S.descInput}
              placeholder="Describe what went wrong in detail... (minimum 20 characters)"
              placeholderTextColor={Colors.lightGray}
              value={description}
              onChangeText={setDesc}
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={S.charCount}>{description.length}/1000</Text>

            {/* Photo upload */}
            <Text style={S.photoLabel}>Add Photos (recommended)</Text>
            <Text style={S.photoSub}>Clear photos help us process your claim faster</Text>
            <View style={S.photosRow}>
              {photos.map((p, i) => (
                <View key={i} style={S.photoThumb}>
                  <Text style={S.photoThumbIcon}>🖼️</Text>
                  <TouchableOpacity style={S.photoRemove} onPress={() => setPhotos(prev => prev.filter((_, pi) => pi !== i))}>
                    <Text style={S.photoRemoveIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 5 && (
                <TouchableOpacity style={S.addPhotoBtn} onPress={addPhoto}>
                  <Text style={S.addPhotoIcon}>📷</Text>
                  <Text style={S.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[S.nextBtn, description.trim().length < 20 && S.nextBtnDisabled]}
              onPress={() => description.trim().length >= 20 && setStep(3)}
            >
              <Text style={S.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3: Choose Resolution */}
        {step === 3 && (
          <>
            <Text style={S.stepTitle}>How can we resolve this?</Text>
            <Text style={S.stepSub}>Choose your preferred resolution</Text>

            {RESOLUTION_TYPES.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[S.resCard, resolution === r.id && S.resCardSelected]}
                onPress={() => setResolution(r.id)}
                activeOpacity={0.85}
              >
                <Text style={S.resIcon}>{r.icon}</Text>
                <View style={S.resInfo}>
                  <Text style={[S.resLabel, resolution === r.id && S.resLabelSelected]}>{r.label}</Text>
                  <Text style={S.resDesc}>{r.desc}</Text>
                </View>
                <View style={[S.radio, resolution === r.id && S.radioSelected]}>
                  {resolution === r.id && <View style={S.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            <View style={S.infoBox}>
              <Text style={S.infoText}>
                ℹ️ Our team will review your claim within 24 hours and reach out to you with the resolution.
              </Text>
            </View>

            <TouchableOpacity
              style={[S.submitBtn, (!canSubmit || submitting) && S.submitBtnDisabled]}
              onPress={submitClaim}
              disabled={!canSubmit || submitting}
            >
              {submitting
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={S.submitBtnText}>Submit Claim</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <View style={S.successBox}>
            <Text style={S.successEmoji}>🛡️</Text>
            <Text style={S.successTitle}>Claim Submitted!</Text>
            <Text style={S.successId}>Claim ID: {claimId}</Text>
            <Text style={S.successDesc}>
              Your Slot Shield claim has been registered. Our team will review it within 24 hours and contact you with the resolution.
            </Text>
            <View style={S.successSteps}>
              {['Claim registered ✓', 'Under review (24h)', 'Resolution communicated', 'Issue resolved'].map((s, i) => (
                <View key={i} style={S.successStep}>
                  <View style={[S.successStepDot, i === 0 && S.successStepDotActive, i === 1 && S.successStepDotPending]} />
                  <Text style={[S.successStepText, i === 0 && { color: Colors.success, fontWeight: '700' }, i === 1 && { color: Colors.warning }]}>{s}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={S.doneBtn} onPress={() => navigation.navigate('BookingsTab')}>
              <Text style={S.doneBtnText}>Go to Bookings</Text>
            </TouchableOpacity>
          </View>
        )}
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

  progress:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 0 },
  progressStep:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.lightGray },
  progressStepActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressNum:    { ...Typography.caption, color: Colors.midGray, fontWeight: '700' },
  progressNumActive: { color: Colors.white },
  progressLine:   { width: 40, height: 2, backgroundColor: Colors.lightGray },
  progressLineActive: { backgroundColor: Colors.primary },

  bookingCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, ...Shadows.sm },
  shieldBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  shieldIcon:  { fontSize: 18 },
  shieldText:  { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  bookingId:   { ...Typography.body, color: Colors.black, fontWeight: '600', marginBottom: 2 },
  proName:     { ...Typography.caption, color: Colors.gray, marginBottom: 8 },
  warrantyBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  warrantyBadgeUrgent: { backgroundColor: Colors.warningLight },
  warrantyText:  { ...Typography.caption, color: Colors.success, fontWeight: '700' },
  warrantyTextUrgent: { color: Colors.warning },

  stepTitle: { ...Typography.h3, color: Colors.black, marginBottom: 4 },
  stepSub:   { ...Typography.body, color: Colors.gray, marginBottom: 16 },

  typeCard:         { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm },
  typeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeIcon:         { fontSize: 24 },
  typeInfo:         { flex: 1 },
  typeLabel:        { ...Typography.body, color: Colors.black, fontWeight: '700' },
  typeLabelSelected:{ color: Colors.primary },
  typeDesc:         { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  radio:            { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  radioSelected:    { borderColor: Colors.primary },
  radioInner:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  descInput:  { backgroundColor: Colors.white, borderRadius: 14, padding: 14, ...Typography.body, color: Colors.black, borderWidth: 1.5, borderColor: Colors.lightGray, minHeight: 120, marginBottom: 4 },
  charCount:  { ...Typography.small, color: Colors.midGray, textAlign: 'right', marginBottom: 16 },
  photoLabel: { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 4 },
  photoSub:   { ...Typography.caption, color: Colors.gray, marginBottom: 10 },
  photosRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.offWhite, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  photoThumbIcon: { fontSize: 28 },
  photoRemove:{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  photoRemoveIcon:{ fontSize: 10, color: Colors.white, fontWeight: '800' },
  addPhotoBtn:{ width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  addPhotoIcon:{ fontSize: 24, marginBottom: 2 },
  addPhotoText:{ ...Typography.small, color: Colors.primary, fontWeight: '600' },

  resCard:         { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm },
  resCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  resIcon:         { fontSize: 28 },
  resInfo:         { flex: 1 },
  resLabel:        { ...Typography.body, color: Colors.black, fontWeight: '700' },
  resLabelSelected:{ color: Colors.primary },
  resDesc:         { ...Typography.caption, color: Colors.gray, marginTop: 2 },

  infoBox:  { backgroundColor: Colors.infoLight, borderRadius: 12, padding: 12, marginVertical: 12 },
  infoText: { ...Typography.caption, color: Colors.info, lineHeight: 18 },

  nextBtn:         { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  nextBtnDisabled: { backgroundColor: Colors.lightGray },
  nextBtnText:     { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  submitBtn:        { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled:{ opacity: 0.5 },
  submitBtnText:    { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },

  successBox:    { alignItems: 'center', paddingVertical: 20 },
  successEmoji:  { fontSize: 72, marginBottom: 14 },
  successTitle:  { ...Typography.h2, color: Colors.black, marginBottom: 6 },
  successId:     { ...Typography.body, color: Colors.primary, fontWeight: '700', marginBottom: 12 },
  successDesc:   { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successSteps:  { alignSelf: 'stretch', gap: 12, marginBottom: 24 },
  successStep:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  successStepDot:{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.lightGray },
  successStepDotActive: { backgroundColor: Colors.success },
  successStepDotPending:{ backgroundColor: Colors.warning },
  successStepText:{ ...Typography.body, color: Colors.gray },
  doneBtn:       { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 15 },
  doneBtnText:   { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },

  expiredBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  expiredIcon:   { fontSize: 64, marginBottom: 16 },
  expiredTitle:  { ...Typography.h2, color: Colors.black, marginBottom: 10 },
  expiredDesc:   { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  contactBtn:    { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  contactBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
});
