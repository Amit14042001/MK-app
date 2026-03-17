/**
 * MK App — BundleBuilderScreen
 * Customer builds a personalised home maintenance plan.
 * Pick services + frequency = monthly price with 10% bundle discount.
 * UC's Prime is platform-defined. Yours is customer-defined.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { api, servicesAPI } from '../../utils/api';

const BILLING_CYCLES = [
  { key: 'monthly',   label: 'Monthly',   discount: '10%', months: 1  },
  { key: 'quarterly', label: 'Quarterly', discount: '15%', months: 3  },
  { key: 'annual',    label: 'Annual',    discount: '20%', months: 12 },
];

const FREQ_OPTIONS = [
  { value: 1, label: '1×/month' },
  { value: 2, label: '2×/month' },
  { value: 0.5, label: 'Every 2 months' },
  { value: 0.25, label: 'Every 4 months' },
];

const POPULAR_SERVICES = [
  { id: 'deep-cleaning', name: 'Deep Cleaning',     icon: '🧹', price: 1299, defaultFreq: 1   },
  { id: 'ac-service',    name: 'AC Service',         icon: '❄️', price: 699,  defaultFreq: 0.5 },
  { id: 'pest-control',  name: 'Pest Control',       icon: '🪲', price: 999,  defaultFreq: 0.25},
  { id: 'plumbing',      name: 'Plumbing Check',     icon: '🔧', price: 399,  defaultFreq: 0.5 },
  { id: 'electrical',    name: 'Electrical Check',   icon: '⚡', price: 399,  defaultFreq: 0.5 },
  { id: 'sofa-clean',    name: 'Sofa Cleaning',      icon: '🛋️', price: 799,  defaultFreq: 0.25},
  { id: 'car-wash',      name: 'Car Wash',           icon: '🚗', price: 299,  defaultFreq: 2   },
  { id: 'salon',         name: 'Salon at Home',      icon: '💄', price: 499,  defaultFreq: 1   },
];

export default function BundleBuilderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selected,  setSelected]  = useState([]); // [{ ...service, freq }]
  const [bundleName, setBundleName] = useState('');
  const [cycle,     setCycle]     = useState('monthly');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [myBundles, setMyBundles] = useState([]);
  const [tab,       setTab]       = useState('build'); // 'build' | 'my'

  useEffect(() => { fetchMyBundles(); }, []);

  const fetchMyBundles = async () => {
    try {
      const { data } = await api.get('/subscriptions/bundles');
      if (data.success) setMyBundles(data.bundles || []);
    } catch {}
  };

  const toggleService = (svc) => {
    setSelected(prev => {
      const exists = prev.find(s => s.id === svc.id);
      if (exists) return prev.filter(s => s.id !== svc.id);
      return [...prev, { ...svc, freq: svc.defaultFreq }];
    });
  };

  const setFreq = (svcId, freq) => {
    setSelected(prev => prev.map(s => s.id === svcId ? { ...s, freq } : s));
  };

  const cycleData   = BILLING_CYCLES.find(c => c.key === cycle);
  const discountPct = parseFloat(cycleData.discount);
  const rawMonthly  = selected.reduce((sum, s) => sum + s.price * s.freq, 0);
  const monthly     = Math.round(rawMonthly * (1 - discountPct / 100));
  const totalCycle  = Math.round(monthly * cycleData.months);
  const savings     = Math.round(rawMonthly * cycleData.months * (discountPct / 100));

  const handleSave = async () => {
    if (!selected.length) { Alert.alert('Add services', 'Please select at least one service.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/subscriptions/bundles', {
        name:         bundleName || `My Home Plan`,
        billingCycle: cycle,
        services:     selected.map(s => ({ serviceId: s.id, frequency: s.freq })),
      });
      if (data.success) {
        setSaved(true);
        fetchMyBundles();
        setTimeout(() => {
          setSaved(false);
          setTab('my');
        }, 1500);
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save bundle. Please try again.');
    }
    setSaving(false);
  };

  const cancelBundle = async (bundleId) => {
    Alert.alert('Cancel Bundle', 'Are you sure you want to cancel this home maintenance plan?', [
      { text: 'No',  style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/subscriptions/bundles/${bundleId}`);
          fetchMyBundles();
        } catch {}
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={['#1A1A2E', '#0F3460']}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>📦 Bundle Builder</Text>
          <Text style={S.headerSub}>Build your personalised home plan</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={S.tabs}>
        {['build', 'my'].map(t => (
          <TouchableOpacity key={t} style={[S.tab, tab === t && S.tabActive]} onPress={() => setTab(t)}>
            <Text style={[S.tabText, tab === t && S.tabTextActive]}>
              {t === 'build' ? '➕ Build Plan' : `📦 My Plans (${myBundles.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'my' ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {myBundles.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
              <Text style={S.emptyTitle}>No plans yet</Text>
              <Text style={S.emptySub}>Build your first home maintenance plan</Text>
              <TouchableOpacity style={S.emptyBtn} onPress={() => setTab('build')}>
                <Text style={S.emptyBtnText}>Build a Plan →</Text>
              </TouchableOpacity>
            </View>
          ) : myBundles.map(bundle => (
            <View key={bundle.id} style={S.bundleCard}>
              <View style={S.bundleCardTop}>
                <Text style={S.bundleCardName}>{bundle.name}</Text>
                <View style={S.activeBadge}><Text style={S.activeBadgeText}>Active</Text></View>
              </View>
              <Text style={S.bundleCardCycle}>{bundle.billingCycle} · ₹{bundle.finalPrice?.toLocaleString('en-IN')}/{bundle.billingCycle === 'monthly' ? 'month' : bundle.billingCycle === 'quarterly' ? 'quarter' : 'year'}</Text>
              <View style={S.bundleServices}>
                {bundle.services?.map((s, i) => (
                  <Text key={i} style={S.bundleServiceChip}>{s.icon} {s.name} ({s.frequency}×/mo)</Text>
                ))}
              </View>
              <Text style={S.bundleNext}>
                Next billing: {new Date(bundle.nextBillingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <TouchableOpacity style={S.cancelBtn} onPress={() => cancelBundle(bundle.id)}>
                <Text style={S.cancelBtnText}>Cancel Plan</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          {/* Bundle name */}
          <View style={S.section}>
            <Text style={S.sectionLabel}>Plan Name (optional)</Text>
            <TextInput
              style={S.nameInput}
              value={bundleName}
              onChangeText={setBundleName}
              placeholder="e.g. My Home Care Plan"
              placeholderTextColor={Colors.placeholder}
            />
          </View>

          {/* Billing cycle */}
          <View style={S.section}>
            <Text style={S.sectionLabel}>Billing Cycle</Text>
            <View style={S.cycleRow}>
              {BILLING_CYCLES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[S.cycleChip, cycle === c.key && S.cycleChipActive]}
                  onPress={() => setCycle(c.key)}>
                  <Text style={[S.cycleLabel, cycle === c.key && S.cycleLabelActive]}>{c.label}</Text>
                  <Text style={[S.cycleSave, cycle === c.key && { color: Colors.primary }]}>Save {c.discount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Services */}
          <View style={S.section}>
            <Text style={S.sectionLabel}>Select Services</Text>
            {POPULAR_SERVICES.map(svc => {
              const sel = selected.find(s => s.id === svc.id);
              return (
                <View key={svc.id} style={[S.svcRow, sel && S.svcRowActive]}>
                  <TouchableOpacity
                    style={S.svcLeft}
                    onPress={() => toggleService(svc)}>
                    <View style={[S.checkbox, sel && S.checkboxActive]}>
                      {sel && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <Text style={S.svcIcon}>{svc.icon}</Text>
                    <View>
                      <Text style={S.svcName}>{svc.name}</Text>
                      <Text style={S.svcPrice}>₹{svc.price} per visit</Text>
                    </View>
                  </TouchableOpacity>
                  {sel && (
                    <View style={S.freqRow}>
                      {FREQ_OPTIONS.map(f => (
                        <TouchableOpacity
                          key={f.value}
                          style={[S.freqChip, sel.freq === f.value && S.freqChipActive]}
                          onPress={() => setFreq(svc.id, f.value)}>
                          <Text style={[S.freqText, sel.freq === f.value && S.freqTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Price summary + save CTA */}
      {tab === 'build' && selected.length > 0 && (
        <View style={[S.cta, { paddingBottom: insets.bottom + 12 }]}>
          <View style={S.ctaRow}>
            <View>
              <Text style={S.ctaLabel}>
                {selected.length} service{selected.length > 1 ? 's' : ''} · {cycleData.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={S.ctaPrice}>₹{monthly.toLocaleString('en-IN')}</Text>
                <Text style={S.ctaMonth}>/month</Text>
              </View>
              {savings > 0 && (
                <Text style={S.ctaSaving}>You save ₹{savings.toLocaleString('en-IN')} {cycle !== 'monthly' ? `over ${cycleData.months} months` : ''}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[S.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}>
              {saved ? <Text style={S.saveBtnText}>✅ Saved!</Text>
                : saving ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={S.saveBtnText}>Create Plan →</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabs:        { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tab:         { flex: 1, padding: 13, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabText:     { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  tabTextActive:{ color: Colors.primary },
  scroll:      { padding: 16, paddingBottom: 120 },
  section:     { marginBottom: 20 },
  sectionLabel:{ fontSize: 13, fontWeight: '700', color: Colors.textLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  nameInput:   { backgroundColor: Colors.white, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  cycleRow:    { flexDirection: 'row', gap: 8 },
  cycleChip:   { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  cycleChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  cycleLabel:  { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  cycleLabelActive:{ color: Colors.primary },
  cycleSave:   { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  svcRow:      { backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm },
  svcRowActive:{ borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
  svcLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  svcIcon:     { fontSize: 22 },
  svcName:     { fontSize: 14, fontWeight: '600', color: Colors.text },
  svcPrice:    { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  freqRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: Colors.border },
  freqChip:    { backgroundColor: Colors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  freqChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  freqText:    { fontSize: 11, color: Colors.textLight },
  freqTextActive:{ color: '#fff', fontWeight: '600' },
  cta:         { backgroundColor: Colors.white, padding: 16, borderTopWidth: 0.5, borderTopColor: Colors.border },
  ctaRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaLabel:    { fontSize: 12, color: Colors.textLight },
  ctaPrice:    { fontSize: 22, fontWeight: '800', color: Colors.text },
  ctaMonth:    { fontSize: 12, color: Colors.textLight },
  ctaSaving:   { fontSize: 11, color: Colors.success, fontWeight: '600', marginTop: 1 },
  saveBtn:     { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox:    { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub:    { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
  emptyBtn:    { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText:{ color: '#fff', fontWeight: '700' },
  bundleCard:  { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.card },
  bundleCardTop:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bundleCardName:{ fontSize: 15, fontWeight: '700', color: Colors.text },
  activeBadge: { backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText:{ fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  bundleCardCycle:{ fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 10 },
  bundleServices:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  bundleServiceChip:{ fontSize: 12, color: Colors.textLight, backgroundColor: Colors.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  bundleNext:  { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  cancelBtn:   { borderWidth: 1, borderColor: Colors.error, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  cancelBtnText:{ fontSize: 13, color: Colors.error, fontWeight: '600' },
});
