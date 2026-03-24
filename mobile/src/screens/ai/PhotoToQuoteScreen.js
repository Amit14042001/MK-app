/**
 * Slot App — PhotoToQuoteScreen
 * Customer takes a photo of their problem (peeling wall, broken AC, dirty room).
 * Claude Vision analyzes the image and generates an instant price quote.
 * No forms, no dropdowns — the camera IS the booking form.
 * No home services company anywhere in the world has shipped this.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

const PHOTO_TIPS = [
  { icon: '💡', tip: 'Take in good lighting' },
  { icon: '📐', tip: 'Show the full affected area' },
  { icon: '🔍', tip: 'Get close to show damage detail' },
];

const EXAMPLE_PHOTOS = [
  { icon: '🖌️', label: 'Peeling wall',         hint: 'Photograph the wall area needing paint' },
  { icon: '❄️', label: 'AC not cooling',         hint: 'Photo of your AC unit' },
  { icon: '💧', label: 'Leaking pipe',           hint: 'Show the leak area under sink / wall' },
  { icon: '🧹', label: 'Dirty room',             hint: 'Show the space that needs cleaning' },
  { icon: '🪲', label: 'Pest problem',           hint: 'Show where you spotted them' },
  { icon: '⚡', label: 'Electrical issue',        hint: 'Show the switchboard / wiring area' },
];

export default function PhotoToQuoteScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [photo,      setPhoto]      = useState(null); // { uri, base64 }
  const [analyzing,  setAnalyzing]  = useState(false);
  const [quote,      setQuote]      = useState(null);
  const [error,      setError]      = useState(null);

  const pickPhoto = useCallback(async (fromCamera = true) => {
    try {
      const { launchCamera, launchImageLibrary } = require('react-native-image-picker');
      const options = {
        mediaType: 'photo', quality: 0.7,
        includeBase64: true,
        maxWidth: 1280, maxHeight: 1280,
      };
      const result = await new Promise((resolve) => {
        if (fromCamera) launchCamera(options, resolve);
        else            launchImageLibrary(options, resolve);
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, base64: asset.base64, type: asset.type || 'image/jpeg' });
      setQuote(null);
      setError(null);
    } catch (e) {
      Alert.alert('Camera Error', 'Could not open camera. Please check permissions.');
    }
  }, []);

  const analyzePhoto = useCallback(async () => {
    if (!photo?.base64) return;
    setAnalyzing(true);
    setQuote(null);
    setError(null);
    try {
      const { data } = await api.post('/ai-chat/photo-quote', {
        imageBase64: photo.base64,
        imageType:   photo.type,
      });
      if (data.success && data.quote) {
        setQuote(data.quote);
      } else throw new Error(data.message || 'Analysis failed');
    } catch (e) {
      setError('Could not analyze the photo. Please try with better lighting or describe the problem instead.');
    }
    setAnalyzing(false);
  }, [photo]);

  const handleBookNow = () => {
    if (!quote) return;
    navigation.navigate('ServiceDetail', {
      serviceSlug: quote.category,
      prefillData: {
        fromPhotoQuote: true,
        photoUri:       photo?.uri,
        aiQuote:        quote,
      },
    });
  };

  const confidenceColor = quote?.confidence === 'high' ? Colors.success
    : quote?.confidence === 'medium' ? Colors.warning : Colors.textLight;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>📸 Photo to Quote</Text>
          <Text style={S.headerSub}>Take a photo — get an instant price estimate</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* Photo area */}
        {photo ? (
          <View style={S.photoPreview}>
            <Image source={{ uri: photo.uri }} style={S.photo} resizeMode="cover" />
            <TouchableOpacity style={S.retakeBtn} onPress={() => { setPhoto(null); setQuote(null); }}>
              <Text style={S.retakeBtnText}>🔄 Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={S.photoPlaceholder}>
            <Text style={S.cameraIcon}>📷</Text>
            <Text style={S.placeholderTitle}>Take a photo of your problem</Text>
            <Text style={S.placeholderSub}>We'll analyze it and give you an instant price quote</Text>
            <View style={S.tipsRow}>
              {PHOTO_TIPS.map((t, i) => (
                <View key={i} style={S.tipChip}>
                  <Text style={S.tipEmoji}>{t.icon}</Text>
                  <Text style={S.tipText}>{t.tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Camera / Gallery buttons */}
        {!photo && (
          <View style={S.captureRow}>
            <TouchableOpacity style={S.captureBtn} onPress={() => pickPhoto(true)}>
              <Text style={S.captureBtnIcon}>📷</Text>
              <Text style={S.captureBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.captureBtn, S.captureBtnSecondary]} onPress={() => pickPhoto(false)}>
              <Text style={S.captureBtnIcon}>🖼️</Text>
              <Text style={[S.captureBtnText, { color: Colors.primary }]}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analyze button */}
        {photo && !quote && (
          <TouchableOpacity
            style={[S.analyzeBtn, analyzing && { opacity: 0.7 }]}
            onPress={analyzePhoto}
            disabled={analyzing}>
            {analyzing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={S.analyzeBtnText}>Analyzing with AI...</Text>
              </View>
            ) : (
              <Text style={S.analyzeBtnText}>🔍 Get Instant Quote</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Error */}
        {error && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AIDiagnosis')}>
              <Text style={S.errorLink}>Try text diagnosis instead →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quote result */}
        {quote && (
          <View style={S.quoteCard}>
            <View style={S.quoteHeader}>
              <Text style={{ fontSize: 36 }}>{quote.icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={S.quotedService}>{quote.service}</Text>
                <View style={[S.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
                  <Text style={[S.confidenceText, { color: confidenceColor }]}>
                    {quote.confidence === 'high' ? '✅ High confidence estimate'
                      : quote.confidence === 'medium' ? '⚡ Good estimate'
                      : '📊 Rough estimate'}
                  </Text>
                </View>
              </View>
              <View>
                <Text style={S.priceRange}>₹{quote.minPrice}–{quote.maxPrice}</Text>
                <Text style={S.priceLabel}>estimated</Text>
              </View>
            </View>

            <Text style={S.quoteAnalysis}>{quote.analysis}</Text>

            {/* What AI detected */}
            {quote.detected?.length > 0 && (
              <View style={S.detectedBox}>
                <Text style={S.detectedTitle}>AI detected in your photo</Text>
                {quote.detected.map((d, i) => (
                  <View key={i} style={S.detectedRow}>
                    <Text style={S.detectedDot}>•</Text>
                    <Text style={S.detectedItem}>{d}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Inclusions */}
            {quote.includes?.length > 0 && (
              <View style={S.includesBox}>
                <Text style={S.includesTitle}>What's included</Text>
                {quote.includes.map((inc, i) => (
                  <Text key={i} style={S.includesItem}>✓ {inc}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={S.bookBtn} onPress={handleBookNow}>
              <Text style={S.bookBtnText}>Book {quote.service} →</Text>
            </TouchableOpacity>
            <Text style={S.quoteDisclaimer}>
              Final price confirmed after professional assessment on site.
            </Text>
          </View>
        )}

        {/* Examples */}
        {!photo && (
          <View style={S.examplesSection}>
            <Text style={S.examplesTitle}>Works great for</Text>
            <View style={S.examplesGrid}>
              {EXAMPLE_PHOTOS.map((ex, i) => (
                <View key={i} style={S.exampleItem}>
                  <Text style={S.exampleIcon}>{ex.icon}</Text>
                  <Text style={S.exampleLabel}>{ex.label}</Text>
                  <Text style={S.exampleHint}>{ex.hint}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  header:          { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:         { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:     { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll:          { padding: 16, paddingBottom: 60 },

  photoPlaceholder:{ backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', ...Shadows.card, marginBottom: 16 },
  cameraIcon:      { fontSize: 56, marginBottom: 12 },
  placeholderTitle:{ fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  placeholderSub:  { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 6, lineHeight: 20, marginBottom: 16 },
  tipsRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tipChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tipEmoji:        { fontSize: 14 },
  tipText:         { fontSize: 11, color: Colors.textLight },

  photoPreview:    { borderRadius: 16, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  photo:           { width: '100%', height: 260, borderRadius: 16 },
  retakeBtn:       { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  retakeBtnText:   { color: '#fff', fontSize: 12, fontWeight: '600' },

  captureRow:      { gap: 10, marginBottom: 16 },
  captureBtn:      { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  captureBtnSecondary: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  captureBtnIcon:  { fontSize: 20 },
  captureBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },

  analyzeBtn:      { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  analyzeBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorBox:        { backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14, marginBottom: 12 },
  errorText:       { color: Colors.error, fontSize: 13, lineHeight: 20 },
  errorLink:       { color: Colors.primary, fontSize: 13, fontWeight: '600', marginTop: 8 },

  quoteCard:       { backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.card, marginBottom: 16 },
  quoteHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  quotedService:   { fontSize: 16, fontWeight: '700', color: Colors.text },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  confidenceText:  { fontSize: 11, fontWeight: '600' },
  priceRange:      { fontSize: 18, fontWeight: '800', color: Colors.primary, textAlign: 'right' },
  priceLabel:      { fontSize: 11, color: Colors.textLight, textAlign: 'right' },
  quoteAnalysis:   { fontSize: 13, color: Colors.textLight, lineHeight: 22, marginBottom: 12 },
  detectedBox:     { backgroundColor: '#F0F4FF', borderRadius: 10, padding: 12, marginBottom: 10 },
  detectedTitle:   { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  detectedRow:     { flexDirection: 'row', gap: 6, marginBottom: 3 },
  detectedDot:     { color: Colors.primary, fontWeight: '700' },
  detectedItem:    { fontSize: 12, color: Colors.textLight, flex: 1 },
  includesBox:     { backgroundColor: '#F0FBF4', borderRadius: 10, padding: 12, marginBottom: 12 },
  includesTitle:   { fontSize: 12, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  includesItem:    { fontSize: 12, color: Colors.textLight, lineHeight: 22 },
  bookBtn:         { backgroundColor: Colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  bookBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  quoteDisclaimer: { fontSize: 11, color: Colors.placeholder, textAlign: 'center', marginTop: 8 },

  examplesSection: { marginTop: 8 },
  examplesTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  examplesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exampleItem:     { backgroundColor: Colors.white, borderRadius: 12, padding: 12, width: '47%', ...Shadows.sm },
  exampleIcon:     { fontSize: 24, marginBottom: 6 },
  exampleLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text },
  exampleHint:     { fontSize: 11, color: Colors.textLight, marginTop: 3, lineHeight: 16 },
});
