/**
 * Slot Professional App — VerificationScreen
 * KYC flow: Aadhaar, PAN, Police Clearance, Skill Certificates, Bank Details verification
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, TextInput, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows, Radius } from '../../utils/theme';

const { width: W } = Dimensions.get('window');

const DOCS = [
  {
    id: 'aadhaar',
    title: 'Aadhaar Card',
    description: 'Government issued identity card (12-digit)',
    icon: '🪪',
    required: true,
    status: 'verified', // 'pending' | 'uploaded' | 'verified' | 'rejected'
    hint: 'Both sides of your Aadhaar card',
    fields: [{ key: 'number', label: 'Aadhaar Number', placeholder: 'XXXX XXXX XXXX', keyboardType: 'numeric', maxLength: 14 }],
  },
  {
    id: 'pan',
    title: 'PAN Card',
    description: 'Permanent Account Number for tax verification',
    icon: '💳',
    required: true,
    status: 'verified',
    hint: 'Clear photo of your PAN card',
    fields: [{ key: 'number', label: 'PAN Number', placeholder: 'ABCDE1234F', maxLength: 10 }],
  },
  {
    id: 'police',
    title: 'Police Clearance Certificate',
    description: 'Background verification certificate',
    icon: '👮',
    required: true,
    status: 'uploaded',
    hint: 'Certificate issued within last 6 months',
    fields: [{ key: 'number', label: 'Certificate Number', placeholder: 'Enter certificate number' }],
  },
  {
    id: 'skill',
    title: 'Skill Certificate',
    description: 'Trade or skill certification',
    icon: '🎓',
    required: false,
    status: 'pending',
    hint: 'ITI, NSDC, or other recognized certification',
    fields: [
      { key: 'institute', label: 'Institute Name', placeholder: 'e.g. ITI Mumbai' },
      { key: 'year', label: 'Year of Completion', placeholder: 'e.g. 2022', keyboardType: 'numeric', maxLength: 4 },
    ],
  },
  {
    id: 'selfie',
    title: 'Live Selfie',
    description: 'Real-time photo for face verification',
    icon: '🤳',
    required: true,
    status: 'verified',
    hint: 'Take a selfie in good lighting',
    fields: [],
  },
  {
    id: 'bank',
    title: 'Bank Account',
    description: 'Bank details for earnings transfer',
    icon: '🏦',
    required: true,
    status: 'verified',
    hint: 'Cancelled cheque or passbook front page',
    fields: [
      { key: 'account', label: 'Account Number', placeholder: 'Enter account number', keyboardType: 'numeric' },
      { key: 'ifsc', label: 'IFSC Code', placeholder: 'e.g. HDFC0001234' },
      { key: 'name', label: 'Account Holder Name', placeholder: 'As per bank records' },
    ],
  },
];

const STATUS_CONFIG = {
  pending:  { label: 'Not Uploaded',  color: Colors.midGray,    bg: Colors.offWhite,     icon: '○' },
  uploaded: { label: 'Under Review',  color: Colors.warning,    bg: Colors.warningLight, icon: '⏳' },
  verified: { label: 'Verified',      color: Colors.success,    bg: Colors.successLight, icon: '✓' },
  rejected: { label: 'Rejected',      color: Colors.error,      bg: Colors.errorLight,   icon: '✗' },
};

export default function VerificationScreen({ navigation }) {
  const [docs, setDocs]         = useState(DOCS);
  const [selectedDoc, setSelDoc]= useState(null);
  const [modal, setModal]       = useState(false);
  const [formValues, setForm]   = useState({});
  const [uploading, setUploading] = useState(false);

  const verifiedCount = docs.filter(d => d.status === 'verified').length;
  const totalRequired = docs.filter(d => d.required).length;
  const requiredVerified = docs.filter(d => d.required && d.status === 'verified').length;
  const overallProgress = Math.round((verifiedCount / docs.length) * 100);

  const openDoc = (doc) => {
    setSelDoc(doc);
    const initial = {};
    doc.fields?.forEach(f => { initial[f.key] = ''; });
    setForm(initial);
    setModal(true);
  };

  const handleUpload = async () => {
    if (!selectedDoc) return;
    setUploading(true);
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 1 });
      if (result.didCancel) { setUploading(false); return; }
      const asset = result.assets?.[0];
      if (!asset) throw new Error('No image selected');

      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const formData = new FormData();
      formData.append('document', { uri: asset.uri, type: asset.type || 'image/jpeg', name: `${selectedDoc.id}.jpg` });
      formData.append('documentType', selectedDoc.id);
      await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/documents`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, body: formData }
      );
      setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, status: 'uploaded' } : d));
      setUploading(false);
      setModal(false);
      Alert.alert('✅ Submitted!', `${selectedDoc.title} submitted for review. We'll verify within 24 hours.`);
    } catch (e) {
      setUploading(false);
      Alert.alert('Error', e.message || 'Upload failed. Please try again.');
    }
  };

  const allRequiredVerified = requiredVerified === totalRequired;

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View style={S.progressCard}>
          <View style={S.progressCircle}>
            <Text style={S.progressPct}>{overallProgress}%</Text>
            <Text style={S.progressLabel}>Complete</Text>
          </View>
          <View style={S.progressRight}>
            <Text style={S.progressTitle}>Profile Verification</Text>
            <Text style={S.progressSub}>{verifiedCount} of {docs.length} documents verified</Text>
            <View style={S.progressBar}>
              <View style={[S.progressFill, { width: `${overallProgress}%` }]} />
            </View>
            {!allRequiredVerified && (
              <View style={S.warningBadge}>
                <Text style={S.warningText}>⚠ Complete to start receiving jobs</Text>
              </View>
            )}
            {allRequiredVerified && (
              <View style={S.successBadge}>
                <Text style={S.successText}>✓ All required docs verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Required Notice */}
        <View style={S.noticeBox}>
          <Text style={S.noticeText}>
            🔒 Your documents are encrypted and stored securely. We only use them for identity verification.
          </Text>
        </View>

        {/* Documents List */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Required Documents</Text>
          {docs.filter(d => d.required).map(doc => renderDocCard(doc, openDoc))}

          <Text style={[S.sectionTitle, { marginTop: 20 }]}>Optional Documents</Text>
          <Text style={S.sectionSub}>Boost your profile ranking and earn more jobs</Text>
          {docs.filter(d => !d.required).map(doc => renderDocCard(doc, openDoc))}
        </View>

        {/* Tips */}
        <View style={S.tipsCard}>
          <Text style={S.tipsTitle}>📋 Verification Tips</Text>
          {[
            'Ensure documents are clear and not blurry',
            'All 4 corners of the document must be visible',
            'No glare or shadow on important details',
            'Documents must be valid and not expired',
            'Selfie must show your face clearly',
          ].map((tip, i) => (
            <View key={i} style={S.tipRow}>
              <Text style={S.tipBullet}>•</Text>
              <Text style={S.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Document Upload Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            {selectedDoc && (
              <>
                <View style={S.sheetHeader}>
                  <Text style={S.sheetEmoji}>{selectedDoc.icon}</Text>
                  <View style={S.sheetHeaderText}>
                    <Text style={S.sheetTitle}>{selectedDoc.title}</Text>
                    <Text style={S.sheetDesc}>{selectedDoc.description}</Text>
                  </View>
                </View>

                <View style={S.hintBox}>
                  <Text style={S.hintText}>💡 {selectedDoc.hint}</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                  {selectedDoc.fields.map(field => (
                    <View key={field.key} style={S.fieldRow}>
                      <Text style={S.fieldLabel}>{field.label}</Text>
                      <TextInput
                        style={S.fieldInput}
                        placeholder={field.placeholder}
                        placeholderTextColor={Colors.lightGray}
                        keyboardType={field.keyboardType || 'default'}
                        maxLength={field.maxLength}
                        value={formValues[field.key] || ''}
                        onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                      />
                    </View>
                  ))}

                  <TouchableOpacity style={S.uploadArea}>
                    <Text style={S.uploadIcon}>📁</Text>
                    <Text style={S.uploadTitle}>Upload Document</Text>
                    <Text style={S.uploadSub}>JPG, PNG or PDF · Max 5MB</Text>
                  </TouchableOpacity>

                  {selectedDoc.id === 'selfie' && (
                    <TouchableOpacity style={S.cameraBtn}>
                      <Text style={S.cameraBtnText}>📷 Take Live Selfie</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[S.submitBtn, uploading && S.submitBtnDisabled]}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={S.submitBtnText}>Submit for Verification</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={S.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={S.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function renderDocCard(doc, openDoc) {
  const cfg = STATUS_CONFIG[doc.status];
  return (
    <TouchableOpacity
      key={doc.id}
      style={S.docCard}
      onPress={() => doc.status !== 'verified' && openDoc(doc)}
      activeOpacity={doc.status === 'verified' ? 1 : 0.85}
    >
      <View style={[S.docIcon, { backgroundColor: cfg.bg }]}>
        <Text style={S.docEmoji}>{doc.icon}</Text>
      </View>
      <View style={S.docInfo}>
        <View style={S.docTitleRow}>
          <Text style={S.docTitle}>{doc.title}</Text>
          {doc.required && <View style={S.requiredBadge}><Text style={S.requiredText}>Required</Text></View>}
        </View>
        <Text style={S.docDesc} numberOfLines={1}>{doc.description}</Text>
        <View style={[S.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[S.statusText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
        </View>
      </View>
      {doc.status !== 'verified' && <Text style={S.arrowIcon}>›</Text>}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:    { width: 40, height: 40, justifyContent: 'center' },
  backIcon:   { fontSize: 22, color: Colors.black },
  headerTitle:{ flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  progressCard:  { margin: 16, backgroundColor: Colors.white, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', ...Shadows.sm },
  progressCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  progressPct:   { ...Typography.h2, color: Colors.primary, lineHeight: 28 },
  progressLabel: { ...Typography.small, color: Colors.primary, fontWeight: '600' },
  progressRight: { flex: 1 },
  progressTitle: { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 4 },
  progressSub:   { ...Typography.caption, color: Colors.gray, marginBottom: 8 },
  progressBar:   { height: 8, backgroundColor: Colors.offWhite, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  warningBadge:  { backgroundColor: Colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  warningText:   { ...Typography.small, color: Colors.warning, fontWeight: '600' },
  successBadge:  { backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  successText:   { ...Typography.small, color: Colors.success, fontWeight: '600' },

  noticeBox:   { marginHorizontal: 16, backgroundColor: Colors.infoLight, borderRadius: 12, padding: 12, marginBottom: 8 },
  noticeText:  { ...Typography.caption, color: Colors.info, lineHeight: 18 },

  section:      { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 4 },
  sectionSub:   { ...Typography.caption, color: Colors.gray, marginBottom: 12 },

  docCard:     { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 8, alignItems: 'center', ...Shadows.sm },
  docIcon:     { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docEmoji:    { fontSize: 24 },
  docInfo:     { flex: 1 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  docTitle:    { ...Typography.body, color: Colors.black, fontWeight: '700' },
  requiredBadge: { backgroundColor: Colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  requiredText:  { ...Typography.small, color: Colors.error, fontWeight: '700' },
  docDesc:     { ...Typography.caption, color: Colors.gray, marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  statusText:  { ...Typography.small, fontWeight: '700' },
  arrowIcon:   { fontSize: 20, color: Colors.midGray },

  tipsCard:   { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.sm },
  tipsTitle:  { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 12 },
  tipRow:     { flexDirection: 'row', marginBottom: 8, gap: 8 },
  tipBullet:  { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  tipText:    { ...Typography.body, color: Colors.darkGray, flex: 1, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  bottomSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  sheetEmoji:   { fontSize: 36 },
  sheetHeaderText: { flex: 1 },
  sheetTitle:   { ...Typography.h3, color: Colors.black },
  sheetDesc:    { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  hintBox:      { backgroundColor: Colors.infoLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  hintText:     { ...Typography.caption, color: Colors.info, lineHeight: 18 },
  fieldRow:     { marginBottom: 14 },
  fieldLabel:   { ...Typography.caption, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  fieldInput:   { backgroundColor: Colors.offWhite, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray },
  uploadArea:   { borderWidth: 2, borderColor: Colors.lightGray, borderStyle: 'dashed', borderRadius: 14, padding: 24, alignItems: 'center', marginVertical: 16 },
  uploadIcon:   { fontSize: 32, marginBottom: 8 },
  uploadTitle:  { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 4 },
  uploadSub:    { ...Typography.caption, color: Colors.gray },
  cameraBtn:    { backgroundColor: Colors.primaryLight, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  cameraBtnText:{ ...Typography.body, color: Colors.primary, fontWeight: '700' },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:{ ...Typography.body, color: Colors.gray },
});
