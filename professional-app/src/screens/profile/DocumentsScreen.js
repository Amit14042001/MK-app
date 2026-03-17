/**
 * MK Professional App — Documents Screen
 * Upload & manage identity documents for verification
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors, Shadows } from '../../utils/theme';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const DOCS = [
  { key: 'aadhaarFront', label: 'Aadhaar Card (Front)', required: true, icon: '🪪' },
  { key: 'aadhaarBack',  label: 'Aadhaar Card (Back)',  required: true, icon: '🪪' },
  { key: 'pan',          label: 'PAN Card',             required: false, icon: '💳' },
  { key: 'photo',        label: 'Passport Photo',       required: true,  icon: '📸' },
  { key: 'certificate',  label: 'Skill Certificate',    required: false, icon: '📜' },
  { key: 'police',       label: 'Police Verification',  required: false, icon: '🚔' },
];

export default function DocumentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [docs, setDocs]         = useState({});
  const [uploading, setUploading] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [verStatus, setVerStatus] = useState('pending');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await axios.get(`${API}/professionals/me`);
      setDocs(data.professional?.documents || {});
      setVerStatus(data.professional?.verificationStatus || 'pending');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docKey) => {
    try {
      // In a real app, use react-native-image-picker / react-native-document-picker
      Alert.alert(
        'Upload Document',
        'Choose source',
        [
          { text: 'Camera',  onPress: () => uploadDocument(docKey, 'camera') },
          { text: 'Gallery', onPress: () => uploadDocument(docKey, 'gallery') },
          { text: 'Cancel',  style: 'cancel' },
        ]
      );
    } catch {}
  };

  const uploadDocument = async (docKey, source) => {
    setUploading(docKey);
    try {
      // Pick document via ImagePicker
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 1 });
      if (result.didCancel) { setUploading(null); return; }
      const asset = result.assets?.[0];
      if (!asset) throw new Error('No image selected');

      // Upload via FormData
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const formData = new FormData();
      formData.append('document', { uri: asset.uri, type: asset.type || 'image/jpeg', name: `${docKey}.jpg` });
      formData.append('documentType', docKey);

      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/documents`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, body: formData }
      );
      const data = await resp.json();
      const uploadedUrl = data.document?.url || asset.uri;
      setDocs(prev => ({ ...prev, [docKey]: { url: uploadedUrl, status: 'uploaded', uploadedAt: new Date() } }));
      Alert.alert('✅ Uploaded', 'Document uploaded successfully! Under review within 24 hours.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const getStatusColor = (status) => {
    const map = { approved: '#22c55e', rejected: '#ef4444', uploaded: Colors.primary, pending: '#999' };
    return map[status] || '#999';
  };

  const STATUS_BANNERS = {
    approved:         { icon: '✅', text: 'Verification Approved! You are verified.', bg: '#f0fdf4', border: '#22c55e' },
    under_review:     { icon: '⏳', text: 'Documents under review. We\'ll notify you within 24-48 hrs.', bg: '#fff7ed', border: Colors.primary },
    rejected:         { icon: '❌', text: 'Verification rejected. Please re-upload marked documents.', bg: '#fef2f2', border: '#ef4444' },
    pending:          { icon: '📋', text: 'Please upload all required documents to get verified.', bg: '#f8f9fa', border: '#ddd' },
  };

  const banner = STATUS_BANNERS[verStatus] || STATUS_BANNERS.pending;
  const allRequired = DOCS.filter(d => d.required).every(d => docs[d.key]?.status === 'uploaded' || docs[d.key]?.status === 'approved');

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Status Banner */}
        <View style={[S.statusBanner, { backgroundColor: banner.bg, borderColor: banner.border }]}>
          <Text style={S.statusIcon}>{banner.icon}</Text>
          <Text style={S.statusText}>{banner.text}</Text>
        </View>

        {/* Progress */}
        {verStatus !== 'approved' && (
          <View style={S.progressCard}>
            <View style={S.progressRow}>
              <Text style={S.progressLabel}>Verification Progress</Text>
              <Text style={S.progressPct}>{Math.round((Object.keys(docs).length / DOCS.length) * 100)}%</Text>
            </View>
            <View style={S.progressBar}>
              <View style={[S.progressFill, { width: `${Math.round((Object.keys(docs).length / DOCS.length) * 100)}%` }]} />
            </View>
          </View>
        )}

        {/* Document Cards */}
        <Text style={S.sectionTitle}>Required Documents</Text>
        {DOCS.map(doc => {
          const uploaded = docs[doc.key];
          const isUploading = uploading === doc.key;
          return (
            <View key={doc.key} style={S.docCard}>
              <View style={S.docLeft}>
                <Text style={S.docIcon}>{doc.icon}</Text>
                <View style={S.docInfo}>
                  <Text style={S.docLabel}>{doc.label}</Text>
                  <View style={S.docMeta}>
                    {doc.required && <Text style={S.requiredTag}>Required</Text>}
                    {uploaded && (
                      <Text style={[S.statusTag, { color: getStatusColor(uploaded.status) }]}>
                        {uploaded.status === 'approved' ? '✅ Verified' :
                         uploaded.status === 'uploaded' ? '⏳ Under review' :
                         uploaded.status === 'rejected' ? '❌ Rejected' : '⬆️ Uploaded'}
                      </Text>
                    )}
                  </View>
                  {uploaded?.uploadedAt && (
                    <Text style={S.uploadDate}>
                      Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString('en-IN')}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[S.uploadBtn, uploaded && S.uploadBtnSecondary]}
                onPress={() => handleUpload(doc.key)}
                disabled={isUploading || uploaded?.status === 'approved'}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[S.uploadBtnText, uploaded && S.uploadBtnTextSecondary]}>
                    {uploaded ? (uploaded.status === 'approved' ? '✅' : 'Re-upload') : 'Upload'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Submit Button */}
        {allRequired && verStatus === 'pending' && (
          <TouchableOpacity
            style={S.submitBtn}
            onPress={() => Alert.alert('Submitted', 'Your documents have been submitted for verification!')}
          >
            <Text style={S.submitBtnText}>Submit for Verification 🚀</Text>
          </TouchableOpacity>
        )}

        {/* Tips */}
        <View style={S.tipsCard}>
          <Text style={S.tipsTitle}>📌 Tips for faster approval</Text>
          {[
            'Upload clear, high-resolution images',
            'All four corners of the document must be visible',
            'Avoid glare or shadows on the document',
            'File size should be under 5MB',
          ].map((tip, i) => (
            <Text key={i} style={S.tip}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: '#1A1A2E' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 12 },
  statusIcon:   { fontSize: 28 },
  statusText:   { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },

  progressCard:  { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, ...Shadows.sm },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  progressPct:   { fontSize: 14, fontWeight: '700', color: Colors.primary || '#f15c22' },
  progressBar:   { height: 6, backgroundColor: '#F0F0F5', borderRadius: 3 },
  progressFill:  { height: '100%', backgroundColor: Colors.primary || '#f15c22', borderRadius: 3 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  docCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, ...Shadows.sm,
  },
  docLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
  docIcon:     { fontSize: 28, marginRight: 12 },
  docInfo:     { flex: 1 },
  docLabel:    { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  docMeta:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  requiredTag: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  statusTag:   { fontSize: 11, fontWeight: '600' },
  uploadDate:  { fontSize: 11, color: '#999', marginTop: 2 },
  uploadBtn:   { backgroundColor: Colors.primary || '#f15c22', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  uploadBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary || '#f15c22' },
  uploadBtnText:      { fontSize: 13, fontWeight: '600', color: '#fff' },
  uploadBtnTextSecondary: { color: Colors.primary || '#f15c22' },

  submitBtn:     { backgroundColor: Colors.primary || '#f15c22', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginVertical: 16, ...Shadows.md },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  tipsCard:    { backgroundColor: '#FFF8F6', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#FFDDD3' },
  tipsTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  tip:         { fontSize: 13, color: '#555', marginBottom: 4, lineHeight: 18 },
});
