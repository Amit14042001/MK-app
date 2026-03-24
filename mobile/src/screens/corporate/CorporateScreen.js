/**
 * Slot App — CorporateScreen
 * Corporate account registration, plans, team management, invoicing
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹2,999/mo',
    color: '#2980B9',
    bg: '#EAF4FB',
    credits: '₹5,000',
    discount: '10%',
    users: '10',
    manager: false,
    invoicing: false,
    features: ['₹5,000 monthly service credits', '10% discount on all bookings', 'Up to 10 team members', 'Monthly usage reports', 'Priority email support'],
  },
  {
    id: 'business',
    name: 'Business',
    price: '₹9,999/mo',
    color: Colors.primary,
    bg: Colors.primaryLight,
    credits: '₹20,000',
    discount: '15%',
    users: '50',
    manager: true,
    invoicing: true,
    popular: true,
    features: ['₹20,000 monthly service credits', '15% discount on all bookings', 'Up to 50 team members', 'Dedicated account manager', 'GST invoicing & reports', 'Priority phone support', 'Custom booking portal'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    color: '#5B2C6F',
    bg: '#F3E5F5',
    credits: 'Unlimited',
    discount: '20%+',
    users: 'Unlimited',
    manager: true,
    invoicing: true,
    features: ['Unlimited service credits', '20%+ negotiated discounts', 'Unlimited team members', 'Dedicated success team', 'Custom SLA & contracts', 'API integration', 'White-label booking portal', 'Annual business reviews'],
  },
];

const FEATURES_LIST = [
  { icon: '💳', title: 'Corporate Wallet', desc: 'Pre-fund your account and let employees book without individual payments.' },
  { icon: '📊', title: 'Usage Analytics', desc: 'Track service spend, team usage, and category breakdowns in real-time.' },
  { icon: '🧾', title: 'GST Invoicing', desc: 'Receive consolidated monthly invoices with full GST compliance.' },
  { icon: '👥', title: 'Team Management', desc: 'Add/remove employees, set booking limits, and manage permissions.' },
  { icon: '🏢', title: 'Multi-Location', desc: 'Manage bookings across all your offices, branches, and campuses.' },
  { icon: '📞', title: 'Dedicated Support', desc: 'A dedicated relationship manager for all your service needs.' },
];

const CLIENTS = ['🏦 HDFC Bank', '🏥 Apollo Hospitals', '🏗️ Shapoorji', '🏭 Mahindra', '🏬 Prestige Group', '✈️ IndiGo'];

export default function CorporateScreen({ navigation }) {
  const [selectedPlan, setSelected]  = useState('business');
  const [enquiryModal, setModal]     = useState(false);
  const [submitting, setSubmitting]  = useState(false);
  const [form, setForm] = useState({
    companyName: '', contactName: '', contactEmail: '', contactPhone: '',
    employeeCount: '', city: '', message: '',
  });

  const submitEnquiry = async () => {
    if (!form.companyName || !form.contactEmail || !form.contactPhone) {
      Alert.alert('Required', 'Please fill company name, email and phone.');
      return;
    }
    setSubmitting(true);
    try {
      const { corporateAPI } = require('../../utils/api');
      await corporateAPI.submitEnquiry({
        companyName:   form.companyName,
        contactName:   form.contactName,
        contactEmail:  form.contactEmail,
        contactPhone:  form.contactPhone,
        employeeCount: form.employeeCount,
        city:          form.city,
        message:       form.message,
        selectedPlan,
      });
      setSubmitting(false);
      setModal(false);
      Alert.alert(
        '🎉 Enquiry Received!',
        'Our corporate team will contact you within 24 hours to set up your account.',
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Error', e?.response?.data?.message || 'Could not submit. Please try again.');
    }
  };

  const selected = PLANS.find(p => p.id === selectedPlan);

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Corporate Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={S.hero}>
          <Text style={S.heroEmoji}>🏢</Text>
          <Text style={S.heroTitle}>Slot for Business</Text>
          <Text style={S.heroSub}>Streamline home services for your employees and offices. Trusted by 500+ companies across India.</Text>
        </View>

        {/* Trusted clients */}
        <View style={S.clientsBar}>
          <Text style={S.clientsLabel}>Trusted By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CLIENTS.map((c, i) => (
              <View key={i} style={S.clientChip}>
                <Text style={S.clientText}>{c}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Features */}
        <View style={S.featuresSection}>
          <Text style={S.sectionTitle}>Why Choose Slot Corporate?</Text>
          <View style={S.featuresGrid}>
            {FEATURES_LIST.map((f, i) => (
              <View key={i} style={S.featureCard}>
                <Text style={S.featureIcon}>{f.icon}</Text>
                <Text style={S.featureTitle}>{f.title}</Text>
                <Text style={S.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Plans */}
        <View style={S.plansSection}>
          <Text style={S.sectionTitle}>Choose Your Plan</Text>
          {PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[S.planCard, { borderColor: selectedPlan === plan.id ? plan.color : Colors.lightGray, borderWidth: selectedPlan === plan.id ? 2 : 1 }]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.85}
            >
              {plan.popular && (
                <View style={[S.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={S.popularText}>⭐ Most Popular</Text>
                </View>
              )}
              <View style={S.planHeader}>
                <View style={[S.planIconBg, { backgroundColor: plan.bg }]}>
                  <Text style={S.planPrice}>{plan.price}</Text>
                </View>
                <View style={S.planInfo}>
                  <Text style={[S.planName, { color: plan.color }]}>{plan.name}</Text>
                  <View style={S.planStats}>
                    <Text style={S.planStat}>💰 {plan.credits} credits</Text>
                    <Text style={S.planStat}>🏷️ {plan.discount} off</Text>
                    <Text style={S.planStat}>👥 {plan.users} users</Text>
                  </View>
                </View>
                <View style={[S.radioOuter, { borderColor: plan.color }]}>
                  {selectedPlan === plan.id && <View style={[S.radioInner, { backgroundColor: plan.color }]} />}
                </View>
              </View>
              {selectedPlan === plan.id && (
                <View style={S.planFeatures}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={S.planFeatureRow}>
                      <Text style={[S.planFeatureCheck, { color: plan.color }]}>✓</Text>
                      <Text style={S.planFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={S.statsBar}>
          {[
            { value: '500+', label: 'Companies' },
            { value: '50K+', label: 'Employees Served' },
            { value: '4.8★', label: 'Avg Rating' },
            { value: '24h', label: 'Setup Time' },
          ].map((s, i) => (
            <View key={i} style={S.statItem}>
              <Text style={S.statValue}>{s.value}</Text>
              <Text style={S.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={S.ctaSection}>
          <TouchableOpacity
            style={[S.ctaBtn, { backgroundColor: selected?.color || Colors.primary }]}
            onPress={() => setModal(true)}
          >
            <Text style={S.ctaBtnText}>
              {selectedPlan === 'enterprise' ? '📞 Talk to Sales' : '🚀 Get Started — ' + (selected?.price || '')}
            </Text>
          </TouchableOpacity>
          <Text style={S.ctaNote}>No credit card required. Free 14-day trial for Starter & Business plans.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Enquiry Modal */}
      <Modal visible={enquiryModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Corporate Enquiry</Text>
            <Text style={S.sheetSub}>Fill in your details and we'll set up your {selected?.name} account.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {[
                { key: 'companyName',   label: 'Company Name *',         placeholder: 'e.g. Infosys Limited',   type: 'default' },
                { key: 'contactName',   label: 'Contact Person *',        placeholder: 'Your full name',         type: 'default' },
                { key: 'contactEmail',  label: 'Work Email *',            placeholder: 'you@company.com',        type: 'email-address' },
                { key: 'contactPhone',  label: 'Phone Number *',          placeholder: '10-digit mobile',        type: 'phone-pad', max: 10 },
                { key: 'employeeCount', label: 'Number of Employees',     placeholder: 'e.g. 500',               type: 'numeric' },
                { key: 'city',          label: 'Primary City',            placeholder: 'e.g. Hyderabad',         type: 'default' },
                { key: 'message',       label: 'Additional Requirements', placeholder: 'Tell us your needs...', type: 'default', multi: true },
              ].map(f => (
                <View key={f.key} style={S.fieldRow}>
                  <Text style={S.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[S.fieldInput, f.multi && { height: 80, textAlignVertical: 'top' }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.lightGray}
                    keyboardType={f.type}
                    maxLength={f.max}
                    multiline={f.multi}
                    value={form[f.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    autoCapitalize={f.key === 'contactEmail' ? 'none' : 'words'}
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[S.submitBtn, { backgroundColor: selected?.color }, submitting && { opacity: 0.7 }]}
              onPress={submitEnquiry}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={S.submitBtnText}>Submit Enquiry →</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setModal(false)}>
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

  hero:      { backgroundColor: Colors.black, margin: 16, borderRadius: 20, padding: 28, alignItems: 'center' },
  heroEmoji: { fontSize: 52, marginBottom: 10 },
  heroTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center', marginBottom: 8 },
  heroSub:   { ...Typography.body, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },

  clientsBar:   { paddingHorizontal: 16, marginBottom: 8 },
  clientsLabel: { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 8, letterSpacing: 0.8 },
  clientChip:   { backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, ...Shadows.sm },
  clientText:   { ...Typography.caption, color: Colors.darkGray, fontWeight: '600' },

  featuresSection: { margin: 16, marginTop: 0 },
  sectionTitle:    { ...Typography.h3, color: Colors.black, marginBottom: 14 },
  featuresGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard:     { width: (W - 48) / 2, backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.sm },
  featureIcon:     { fontSize: 28, marginBottom: 8 },
  featureTitle:    { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 4 },
  featureDesc:     { ...Typography.caption, color: Colors.gray, lineHeight: 18 },

  plansSection:    { paddingHorizontal: 16, marginBottom: 8 },
  planCard:        { backgroundColor: Colors.white, borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...Shadows.sm },
  popularBadge:    { paddingVertical: 6, alignItems: 'center' },
  popularText:     { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  planHeader:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  planIconBg:      { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 80, alignItems: 'center' },
  planPrice:       { ...Typography.body, color: Colors.black, fontWeight: '800' },
  planInfo:        { flex: 1 },
  planName:        { ...Typography.h3, marginBottom: 4 },
  planStats:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planStat:        { ...Typography.small, color: Colors.gray },
  radioOuter:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner:      { width: 12, height: 12, borderRadius: 6 },
  planFeatures:    { paddingHorizontal: 16, paddingBottom: 16 },
  planFeatureRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  planFeatureCheck:{ ...Typography.body, fontWeight: '700' },
  planFeatureText: { ...Typography.body, color: Colors.darkGray, flex: 1, lineHeight: 20 },

  statsBar:    { flexDirection: 'row', backgroundColor: Colors.primary, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16 },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { ...Typography.h3, color: Colors.white },
  statLabel:   { ...Typography.small, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2 },

  ctaSection: { paddingHorizontal: 16, marginBottom: 8 },
  ctaBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  ctaBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  ctaNote:    { ...Typography.caption, color: Colors.gray, textAlign: 'center', lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  bottomSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%', paddingBottom: 36 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { ...Typography.h3, color: Colors.black, marginBottom: 4 },
  sheetSub:     { ...Typography.caption, color: Colors.gray, marginBottom: 16 },
  fieldRow:     { marginBottom: 14 },
  fieldLabel:   { ...Typography.caption, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  fieldInput:   { backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray },
  submitBtn:    { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  submitBtnText:{ ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText:{ ...Typography.body, color: Colors.gray },
});
