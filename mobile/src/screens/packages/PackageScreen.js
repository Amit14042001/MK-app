/**
 * Slot App — PackageScreen
 * Feature #15: Service packages/bundles (Annual AC package etc.)
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Alert,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const PACKAGES = [
  {
    id: 'pkg_ac_annual',
    name: 'Annual AC Care Plan',
    icon: '❄️',
    color: '#2980B9',
    bgColor: '#EAF4FB',
    price: 1499,
    originalPrice: 2997,
    savings: 1498,
    savingsPct: 50,
    validity: '12 months',
    services: [
      { name: 'AC Service',     count: 2, icon: '🔧', value: 998 },
      { name: 'AC Gas Refill',  count: 1, icon: '💨', value: 499 },
      { name: 'Deep Cleaning',  count: 2, icon: '🧹', value: 598 },
      { name: 'Filter Replace', count: 2, icon: '🔄', value: 298 },
      { name: '24/7 Priority Support', count: null, icon: '📞', value: 200 },
    ],
    badge: '⭐ Best Seller',
    popular: true,
    description: 'Complete AC care for a year. Service reminders included. Covers all major AC brands.',
    bookingsIncluded: 6,
    termsAndConditions: ['Valid for 12 months from purchase', 'Appointments must be scheduled in advance', 'One service per month', 'Non-transferable'],
  },
  {
    id: 'pkg_home_quarterly',
    name: 'Home Deep Clean — Quarterly',
    icon: '🏠',
    color: '#27AE60',
    bgColor: '#E8F8F0',
    price: 2499,
    originalPrice: 3996,
    savings: 1497,
    savingsPct: 37,
    validity: '12 months',
    services: [
      { name: 'Full Home Cleaning', count: 4, icon: '🧹', value: 3196 },
      { name: 'Sofa Cleaning',      count: 2, icon: '🛋️', value: 798 },
      { name: 'Balcony Cleaning',   count: 4, icon: '🌅', value: 796 },
    ],
    badge: '💰 Great Value',
    popular: false,
    description: '4 deep cleans spread over a year — quarterly. Perfect for busy families.',
    bookingsIncluded: 4,
    termsAndConditions: ['Quarterly scheduling required', 'Valid for one home address', 'Reschedule up to 48 hours before'],
  },
  {
    id: 'pkg_pest_annual',
    name: 'Annual Pest Shield',
    icon: '🛡️',
    color: '#9B59B6',
    bgColor: '#F3E5F5',
    price: 1999,
    originalPrice: 3196,
    savings: 1197,
    savingsPct: 37,
    validity: '12 months',
    services: [
      { name: 'General Pest Control', count: 4, icon: '🐛', value: 3196 },
      { name: 'Termite Inspection',   count: 1, icon: '🔍', value: 299 },
      { name: 'Rodent Control',       count: 1, icon: '🐀', value: 599 },
    ],
    badge: '🏅 Most Popular',
    popular: true,
    description: 'Year-round protection against pests. 4 treatments + termite & rodent control.',
    bookingsIncluded: 6,
    termsAndConditions: ['Minimum 30 days between treatments', 'Valid for one property', 'Re-treatment if pests return within 30 days'],
  },
  {
    id: 'pkg_electrical_annual',
    name: 'Annual Electrical Safety',
    icon: '⚡',
    color: '#F39C12',
    bgColor: '#FEF9E7',
    price: 2999,
    originalPrice: 4794,
    savings: 1795,
    savingsPct: 37,
    validity: '12 months',
    services: [
      { name: 'Electrical Inspection', count: 2, icon: '🔍', value: 998 },
      { name: 'Wiring Work (5 points)',count: 2, icon: '🔌', value: 1990 },
      { name: 'MCB Panel Service',     count: 1, icon: '⚡', value: 399 },
      { name: 'Emergency Support',     count: null, icon: '🚨', value: 500 },
    ],
    badge: '🔒 Safety First',
    popular: false,
    description: 'Complete electrical safety coverage. Bi-annual inspections + emergency support.',
    bookingsIncluded: 5,
    termsAndConditions: ['Emergency support within 4 hours', 'Valid for one household', 'Wiring work up to 5 points per visit'],
  },
];

export default function PackageScreen({ navigation }) {
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [expandedPkg, setExpanded]    = useState(null);

  const handleBuyPackage = (pkg) => {
    Alert.alert(
      `Buy ${pkg.name}?`,
      `₹${pkg.price} for ${pkg.validity}\nSave ₹${pkg.savings} (${pkg.savingsPct}% off)\n\n${pkg.bookingsIncluded} services included`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now →',
          onPress: () => navigation.navigate('Checkout', { isPackage: true, packageId: pkg.id, amount: pkg.price }),
        },
      ]
    );
  };

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Service Packages</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Hero */}
        <View style={S.hero}>
          <Text style={S.heroEmoji}>🎁</Text>
          <Text style={S.heroTitle}>Save up to 50% with Packages</Text>
          <Text style={S.heroSub}>Pre-book multiple services and save big. Reminders sent automatically.</Text>
        </View>

        {/* Benefits strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.benefitsScroll}>
          {[
            { icon: '💰', text: 'Save up to 50%' },
            { icon: '📅', text: 'Flexible scheduling' },
            { icon: '🔔', text: 'Auto reminders' },
            { icon: '🛡️', text: 'Service guarantee' },
            { icon: '♻️', text: 'Unused credits refunded' },
          ].map(b => (
            <View key={b.text} style={S.benefitChip}>
              <Text style={S.benefitIcon}>{b.icon}</Text>
              <Text style={S.benefitText}>{b.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Packages */}
        {PACKAGES.map(pkg => {
          const isExpanded = expandedPkg === pkg.id;
          return (
            <View key={pkg.id} style={[S.pkgCard, { borderColor: pkg.color + '40' }]}>
              {/* Badge */}
              {pkg.badge && (
                <View style={[S.badge, { backgroundColor: pkg.color }]}>
                  <Text style={S.badgeText}>{pkg.badge}</Text>
                </View>
              )}

              {/* Header */}
              <View style={[S.pkgHeader, { backgroundColor: pkg.bgColor }]}>
                <Text style={S.pkgIcon}>{pkg.icon}</Text>
                <View style={S.pkgHeaderInfo}>
                  <Text style={[S.pkgName, { color: pkg.color }]}>{pkg.name}</Text>
                  <Text style={S.pkgValidity}>Valid {pkg.validity}</Text>
                </View>
                <View style={S.pkgPriceBox}>
                  <Text style={S.pkgOriginalPrice}>₹{pkg.originalPrice.toLocaleString('en-IN')}</Text>
                  <Text style={[S.pkgPrice, { color: pkg.color }]}>₹{pkg.price.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Description */}
              <Text style={S.pkgDesc}>{pkg.description}</Text>

              {/* Savings highlight */}
              <View style={[S.savingsRow, { backgroundColor: pkg.bgColor }]}>
                <Text style={[S.savingsText, { color: pkg.color }]}>
                  🎉 You save ₹{pkg.savings.toLocaleString('en-IN')} ({pkg.savingsPct}% off)
                </Text>
              </View>

              {/* Services list */}
              <TouchableOpacity
                style={S.servicesToggle}
                onPress={() => setExpanded(isExpanded ? null : pkg.id)}
              >
                <Text style={S.servicesToggleText}>
                  {pkg.bookingsIncluded} services included {isExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={S.servicesList}>
                  {pkg.services.map((svc, i) => (
                    <View key={i} style={S.svcRow}>
                      <Text style={S.svcIcon}>{svc.icon}</Text>
                      <Text style={S.svcName}>{svc.name}</Text>
                      {svc.count && <Text style={S.svcCount}>×{svc.count}</Text>}
                      <Text style={S.svcValue}>₹{svc.value}</Text>
                    </View>
                  ))}
                  <View style={S.tcSection}>
                    <Text style={S.tcTitle}>Terms & Conditions</Text>
                    {pkg.termsAndConditions.map((tc, i) => (
                      <Text key={i} style={S.tcItem}>• {tc}</Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Buy button */}
              <TouchableOpacity
                style={[S.buyBtn, { backgroundColor: pkg.color }]}
                onPress={() => handleBuyPackage(pkg)}
                activeOpacity={0.85}
              >
                <Text style={S.buyBtnText}>Buy at ₹{pkg.price} →</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Custom package note */}
        <View style={S.customNote}>
          <Text style={S.customNoteTitle}>🏢 Need a custom package?</Text>
          <Text style={S.customNoteText}>For businesses or bulk requirements, contact our team for a custom quote.</Text>
          <TouchableOpacity style={S.customNoteBtn} onPress={() => navigation.navigate('Corporate')}>
            <Text style={S.customNoteBtnText}>Contact Corporate Team →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  hero:        { backgroundColor: Colors.black, borderRadius: 20, padding: 22, alignItems: 'center', marginBottom: 16 },
  heroEmoji:   { fontSize: 44, marginBottom: 8 },
  heroTitle:   { ...Typography.h2, color: Colors.white, textAlign: 'center', marginBottom: 6 },
  heroSub:     { ...Typography.body, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },

  benefitsScroll: { marginBottom: 16 },
  benefitChip:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, gap: 6, ...Shadows.sm },
  benefitIcon:    { fontSize: 16 },
  benefitText:    { ...Typography.caption, color: Colors.darkGray, fontWeight: '600' },

  pkgCard:      { backgroundColor: Colors.white, borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, ...Shadows.sm },
  badge:        { paddingVertical: 6, alignItems: 'center' },
  badgeText:    { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  pkgHeader:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pkgIcon:      { fontSize: 36 },
  pkgHeaderInfo:{ flex: 1 },
  pkgName:      { ...Typography.bodyLarge, fontWeight: '800', marginBottom: 2 },
  pkgValidity:  { ...Typography.caption, color: Colors.gray },
  pkgPriceBox:  { alignItems: 'flex-end' },
  pkgOriginalPrice: { ...Typography.caption, color: Colors.midGray, textDecorationLine: 'line-through' },
  pkgPrice:     { ...Typography.h3, fontWeight: '800' },
  pkgDesc:      { ...Typography.body, color: Colors.gray, paddingHorizontal: 14, paddingBottom: 8, lineHeight: 22 },
  savingsRow:   { paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8 },
  savingsText:  { ...Typography.body, fontWeight: '700' },
  servicesToggle:{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.offWhite },
  servicesToggleText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  servicesList: { paddingHorizontal: 14, paddingBottom: 8 },
  svcRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.offWhite, gap: 8 },
  svcIcon:      { fontSize: 18 },
  svcName:      { ...Typography.body, color: Colors.black, flex: 1 },
  svcCount:     { ...Typography.caption, color: Colors.primary, fontWeight: '700', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  svcValue:     { ...Typography.caption, color: Colors.midGray, textDecorationLine: 'line-through' },
  tcSection:    { marginTop: 10, backgroundColor: Colors.offWhite, borderRadius: 10, padding: 12 },
  tcTitle:      { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 6 },
  tcItem:       { ...Typography.caption, color: Colors.gray, marginBottom: 4, lineHeight: 18 },
  buyBtn:       { margin: 14, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  buyBtnText:   { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },

  customNote:      { backgroundColor: Colors.offWhite, borderRadius: 16, padding: 16, marginTop: 8 },
  customNoteTitle: { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700', marginBottom: 6 },
  customNoteText:  { ...Typography.body, color: Colors.gray, marginBottom: 12, lineHeight: 22 },
  customNoteBtn:   { backgroundColor: Colors.black, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  customNoteBtnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
});
