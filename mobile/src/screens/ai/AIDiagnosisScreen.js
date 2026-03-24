/**
 * Slot App — AI Problem Diagnosis Screen
 * Customer describes their home problem in natural language.
 * Claude API analyzes it, identifies the service, estimates cost,
 * and pre-fills the booking form — no category browsing needed.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Alert, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

const EXAMPLE_PROBLEMS = [
  { icon: '❄️', text: 'My AC is making a rattling noise and not cooling properly' },
  { icon: '💧', text: 'Water is leaking under my kitchen sink and the tap is dripping' },
  { icon: '⚡', text: 'My living room lights keep flickering and one switch stopped working' },
  { icon: '🚿', text: 'Bathroom drain is very slow and there is bad smell coming from it' },
  { icon: '🪲', text: 'I am seeing cockroaches in my kitchen and small holes in the walls' },
  { icon: '🖌️', text: 'Paint is peeling on two bedroom walls and there are water stains on the ceiling' },
];

const QUICK_DIAGNOSES = {
  ac:        { service: 'AC Service & Repair',    icon: '❄️', minPrice: 499,  maxPrice: 1499, category: 'ac-appliances' },
  plumbing:  { service: 'Plumbing Service',       icon: '🔧', minPrice: 299,  maxPrice: 899,  category: 'plumbing' },
  electrical:{ service: 'Electrical Service',     icon: '⚡', minPrice: 399,  maxPrice: 999,  category: 'electrical' },
  cleaning:  { service: 'Deep Cleaning',          icon: '🧹', minPrice: 999,  maxPrice: 2999, category: 'cleaning' },
  pest:      { service: 'Pest Control',           icon: '🪲', minPrice: 799,  maxPrice: 1999, category: 'pest-control' },
  painting:  { service: 'Painting Service',       icon: '🖌️', minPrice: 1999, maxPrice: 9999, category: 'painting' },
  beauty:    { service: 'Salon at Home',          icon: '💄', minPrice: 299,  maxPrice: 1499, category: 'beauty' },
  carpenter: { service: 'Carpentry Service',      icon: '🪚', minPrice: 399,  maxPrice: 1499, category: 'carpentry' },
};

export default function AIDiagnosisScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [problem, setProblem] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const resultAnim = useRef(new Animated.Value(0)).current;

  const diagnose = useCallback(async (text) => {
    const query = (text || problem).trim();
    if (query.length < 10) {
      Alert.alert('Describe the problem', 'Please describe your problem in a little more detail (at least 10 characters).');
      return;
    }
    setDiagnosing(true);
    setResult(null);
    setError(null);

    try {
      const { data } = await api.post('/ai-chat/diagnose', { problem: query });
      if (data.success && data.diagnosis) {
        setResult(data.diagnosis);
        Animated.spring(resultAnim, {
          toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
        }).start();
      } else {
        throw new Error(data.message || 'Could not diagnose');
      }
    } catch (e) {
      // Local fallback diagnosis
      const fallback = localDiagnose(query);
      if (fallback) {
        setResult(fallback);
        Animated.spring(resultAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
      } else {
        setError('Could not diagnose the problem. Please try describing it differently or browse services manually.');
      }
    }
    setDiagnosing(false);
  }, [problem]);

  const localDiagnose = (text) => {
    const t = text.toLowerCase();
    if (t.match(/ac|air.?condition|cool|refriger|split|window unit/)) {
      return {
        service: QUICK_DIAGNOSES.ac.service,
        icon: QUICK_DIAGNOSES.ac.icon,
        category: QUICK_DIAGNOSES.ac.category,
        minPrice: QUICK_DIAGNOSES.ac.minPrice,
        maxPrice: QUICK_DIAGNOSES.ac.maxPrice,
        diagnosis: 'Your AC appears to need a service. Common causes include low refrigerant gas, dirty filters, or a faulty compressor.',
        urgency: t.includes('not cool') || t.includes('rattl') ? 'high' : 'medium',
        tips: ['Turn off the AC to prevent compressor damage', 'Clean or replace the air filter if accessible', 'Check that all vents are open and unblocked'],
        checklist: ['Gas level check', 'Filter cleaning', 'Coil cleaning', 'Compressor inspection'],
      };
    }
    if (t.match(/leak|drip|pipe|tap|water|plumb|drain|block|clog/)) {
      return {
        service: QUICK_DIAGNOSES.plumbing.service,
        icon: QUICK_DIAGNOSES.plumbing.icon,
        category: QUICK_DIAGNOSES.plumbing.category,
        minPrice: QUICK_DIAGNOSES.plumbing.minPrice,
        maxPrice: QUICK_DIAGNOSES.plumbing.maxPrice,
        diagnosis: 'You have a plumbing issue. This could be a leaking joint, blocked drain, or faulty tap washer.',
        urgency: t.includes('leak') || t.includes('flood') ? 'high' : 'low',
        tips: ['Turn off the main water valve if leaking severely', 'Avoid using the affected fixture until repaired'],
        checklist: ['Leak detection', 'Joint inspection', 'Drain clearing', 'Tap repair or replacement'],
      };
    }
    if (t.match(/electric|light|switch|socket|power|wire|short|trip|fuse|mcb/)) {
      return {
        service: QUICK_DIAGNOSES.electrical.service,
        icon: QUICK_DIAGNOSES.electrical.icon,
        category: QUICK_DIAGNOSES.electrical.category,
        minPrice: QUICK_DIAGNOSES.electrical.minPrice,
        maxPrice: QUICK_DIAGNOSES.electrical.maxPrice,
        diagnosis: 'You have an electrical issue. Flickering lights and non-working switches often indicate a loose connection or tripped circuit breaker.',
        urgency: t.includes('spark') || t.includes('smell') || t.includes('burn') ? 'high' : 'medium',
        tips: ['Check your MCB/fuse box for any tripped switches', 'Do not attempt to repair electrical issues yourself'],
        checklist: ['Circuit inspection', 'Switch replacement', 'Socket testing', 'MCB check'],
      };
    }
    if (t.match(/cockroach|pest|ant|rat|mouse|insect|termite|mosquito|bedbu/)) {
      return {
        service: QUICK_DIAGNOSES.pest.service,
        icon: QUICK_DIAGNOSES.pest.icon,
        category: QUICK_DIAGNOSES.pest.category,
        minPrice: QUICK_DIAGNOSES.pest.minPrice,
        maxPrice: QUICK_DIAGNOSES.pest.maxPrice,
        diagnosis: 'Pest infestation detected. Professional treatment is recommended to prevent spread to neighbouring units.',
        urgency: 'medium',
        tips: ['Seal food containers and garbage bins', 'Block entry points like cracks and gaps', 'Remove standing water sources'],
        checklist: ['Inspection & identification', 'Targeted treatment', 'Entry point sealing', 'Prevention advisory'],
      };
    }
    if (t.match(/paint|wall|ceiling|peel|crack|damp|stain|whitewash/)) {
      return {
        service: QUICK_DIAGNOSES.painting.service,
        icon: QUICK_DIAGNOSES.painting.icon,
        category: QUICK_DIAGNOSES.painting.category,
        minPrice: QUICK_DIAGNOSES.painting.minPrice,
        maxPrice: QUICK_DIAGNOSES.painting.maxPrice,
        diagnosis: 'Your walls need attention. Peeling paint and water stains usually indicate moisture intrusion or old paint.',
        urgency: 'low',
        tips: ['Address any water leakage before painting', 'Use a moisture meter to check dampness levels first'],
        checklist: ['Surface preparation', 'Primer application', '2-coat paint', 'Crack filling'],
      };
    }
    if (t.match(/clean|dirt|dust|mop|wash|scrub|hygien|deep/)) {
      return {
        service: QUICK_DIAGNOSES.cleaning.service,
        icon: QUICK_DIAGNOSES.cleaning.icon,
        category: QUICK_DIAGNOSES.cleaning.category,
        minPrice: QUICK_DIAGNOSES.cleaning.minPrice,
        maxPrice: QUICK_DIAGNOSES.cleaning.maxPrice,
        diagnosis: 'Your home needs a thorough clean. Our deep cleaning service covers all areas including kitchen, bathrooms, and living spaces.',
        urgency: 'low',
        tips: ['Clear large items from floors before the team arrives', 'Let them know about any sensitive surfaces'],
        checklist: ['Kitchen deep clean', 'Bathroom sanitisation', 'Floor mopping', 'Sofa & carpet vacuuming'],
      };
    }
    return null;
  };

  const handleBookNow = () => {
    if (!result) return;
    navigation.navigate('ServiceDetail', {
      serviceSlug: result.category,
      prefillData: {
        problemDescription: problem,
        estimatedCost:      { min: result.minPrice, max: result.maxPrice },
        aiDiagnosis:        result.diagnosis,
      },
    });
  };

  const urgencyColor = result?.urgency === 'high' ? Colors.error
    : result?.urgency === 'medium' ? Colors.warning : Colors.success;
  const urgencyLabel = result?.urgency === 'high' ? '🔴 Fix urgently'
    : result?.urgency === 'medium' ? '🟡 Fix soon' : '🟢 Non-urgent';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[S.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>AI Problem Diagnosis</Text>
          <Text style={S.headerSub}>Describe your problem — we'll find the right fix</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Input area */}
        <View style={S.inputCard}>
          <Text style={S.inputLabel}>What problem are you facing at home?</Text>
          <TextInput
            ref={inputRef}
            style={S.input}
            value={problem}
            onChangeText={setProblem}
            placeholder="e.g. My AC is making a strange noise and not cooling the room..."
            placeholderTextColor={Colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[S.diagnoseBtn, diagnosing && { opacity: 0.7 }]}
            onPress={() => diagnose()}
            disabled={diagnosing || problem.trim().length < 10}>
            {diagnosing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={S.diagnoseBtnText}>🔍 Diagnose My Problem</Text>}
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Services')}>
              <Text style={S.errorLink}>Browse services manually →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Diagnosis Result */}
        {result && (
          <Animated.View style={[S.resultCard, {
            opacity: resultAnim,
            transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }]}>
            <View style={S.resultHeader}>
              <Text style={S.resultIcon}>{result.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.resultService}>{result.service}</Text>
                <View style={[S.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
                  <Text style={[S.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
                </View>
              </View>
              <View style={S.priceBox}>
                <Text style={S.priceLabel}>Estimated</Text>
                <Text style={S.price}>₹{result.minPrice}–{result.maxPrice}</Text>
              </View>
            </View>

            <Text style={S.diagnosisText}>{result.diagnosis}</Text>

            {/* What's included */}
            {result.checklist?.length > 0 && (
              <View style={S.checklistBox}>
                <Text style={S.checklistTitle}>What our pro will check</Text>
                {result.checklist.map((item, i) => (
                  <View key={i} style={S.checklistRow}>
                    <Text style={S.checklistTick}>✓</Text>
                    <Text style={S.checklistItem}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <View style={S.tipsBox}>
                <Text style={S.tipsTitle}>💡 Quick tips while you wait</Text>
                {result.tips.map((tip, i) => (
                  <Text key={i} style={S.tipItem}>• {tip}</Text>
                ))}
              </View>
            )}

            {/* Book CTA */}
            <TouchableOpacity style={S.bookBtn} onPress={handleBookNow}>
              <Text style={S.bookBtnText}>Book {result.service} →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={S.browseLinkBtn}
              onPress={() => navigation.navigate('Services')}>
              <Text style={S.browseLink}>Browse all services instead</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Example problems */}
        {!result && !diagnosing && (
          <View style={S.examplesSection}>
            <Text style={S.examplesTitle}>Common problems — tap to try</Text>
            {EXAMPLE_PROBLEMS.map((ex, i) => (
              <TouchableOpacity
                key={i}
                style={S.exampleRow}
                onPress={() => { setProblem(ex.text); diagnose(ex.text); }}>
                <Text style={S.exampleIcon}>{ex.icon}</Text>
                <Text style={S.exampleText}>{ex.text}</Text>
                <Text style={S.exampleArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 24, color: '#fff' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  scroll:       { flex: 1, backgroundColor: Colors.bg },
  scrollContent:{ padding: 16, paddingBottom: 60 },

  inputCard:    { backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.card, marginBottom: 16 },
  inputLabel:   { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  input:        { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, minHeight: 100, lineHeight: 22 },
  diagnoseBtn:  { backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  diagnoseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorBox:     { backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.error + '30' },
  errorText:    { color: Colors.error, fontSize: 13, lineHeight: 20 },
  errorLink:    { color: Colors.primary, fontSize: 13, fontWeight: '600', marginTop: 8 },

  resultCard:   { backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.card, marginBottom: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  resultIcon:   { fontSize: 36 },
  resultService:{ fontSize: 16, fontWeight: '700', color: Colors.text },
  urgencyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  urgencyText:  { fontSize: 11, fontWeight: '600' },
  priceBox:     { alignItems: 'flex-end' },
  priceLabel:   { fontSize: 11, color: Colors.textLight },
  price:        { fontSize: 15, fontWeight: '700', color: Colors.primary },

  diagnosisText:{ fontSize: 14, color: Colors.textLight, lineHeight: 22, marginBottom: 14 },

  checklistBox: { backgroundColor: '#F0FBF4', borderRadius: 10, padding: 12, marginBottom: 12 },
  checklistTitle:{ fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  checklistRow: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  checklistTick:{ color: Colors.success, fontWeight: '700', fontSize: 14 },
  checklistItem:{ fontSize: 13, color: Colors.textLight, flex: 1 },

  tipsBox:      { backgroundColor: '#FFFBF0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFE87020' },
  tipsTitle:    { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  tipItem:      { fontSize: 12, color: Colors.textLight, lineHeight: 20, marginBottom: 3 },

  bookBtn:      { backgroundColor: Colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  bookBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  browseLinkBtn:{ alignItems: 'center', marginTop: 10 },
  browseLink:   { color: Colors.textLight, fontSize: 13 },

  examplesSection:{ marginTop: 4 },
  examplesTitle:  { fontSize: 13, fontWeight: '600', color: Colors.textLight, marginBottom: 10 },
  exampleRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 8, ...Shadows.sm },
  exampleIcon:  { fontSize: 20, width: 32 },
  exampleText:  { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },
  exampleArrow: { fontSize: 18, color: Colors.textLight },
});
