/**
 * Slot App — ServiceAddons Component
 * Feature #11: Add-ons/extras during booking (like UC)
 * AC deep clean + gas refill, sofa + carpet cleaning etc.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

export default function ServiceAddons({
  addons = [],
  selectedAddons = [],
  onToggle,
  title = 'Enhance Your Service',
  subtitle = 'Add more to get the best results',
}) {
  const [expanded, setExpanded] = useState(true);

  const totalAddonsPrice = selectedAddons.reduce((sum, id) => {
    const a = addons.find(x => x.id === id);
    return sum + (a?.price || 0);
  }, 0);

  if (!addons.length) return null;

  return (
    <View style={S.container}>
      {/* Header */}
      <TouchableOpacity style={S.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={S.headerLeft}>
          <Text style={S.title}>{title}</Text>
          <Text style={S.subtitle}>{subtitle}</Text>
        </View>
        <View style={S.headerRight}>
          {selectedAddons.length > 0 && (
            <View style={S.selectedBadge}>
              <Text style={S.selectedBadgeText}>{selectedAddons.length} added</Text>
            </View>
          )}
          <Text style={S.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.addonsScroll}>
            {addons.map(addon => {
              const selected = selectedAddons.includes(addon.id);
              return (
                <TouchableOpacity
                  key={addon.id}
                  style={[S.addonCard, selected && S.addonCardSelected]}
                  onPress={() => onToggle?.(addon.id)}
                  activeOpacity={0.85}
                >
                  {addon.popular && (
                    <View style={S.popularTag}><Text style={S.popularText}>Popular</Text></View>
                  )}
                  <View style={[S.addonIconBg, { backgroundColor: addon.color || Colors.primaryLight }]}>
                    <Text style={S.addonIcon}>{addon.icon}</Text>
                  </View>
                  <Text style={[S.addonName, selected && S.addonNameSelected]} numberOfLines={2}>
                    {addon.name}
                  </Text>
                  {addon.description && (
                    <Text style={S.addonDesc} numberOfLines={2}>{addon.description}</Text>
                  )}
                  {addon.duration && (
                    <Text style={S.addonDuration}>⏱ {addon.duration} min</Text>
                  )}
                  <View style={S.addonFooter}>
                    <Text style={[S.addonPrice, selected && S.addonPriceSelected]}>
                      +₹{addon.price}
                    </Text>
                    <View style={[S.addBtn, selected && S.addBtnSelected]}>
                      <Text style={[S.addBtnText, selected && S.addBtnTextSelected]}>
                        {selected ? '✓ Added' : '+ Add'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary bar */}
          {selectedAddons.length > 0 && (
            <View style={S.summaryBar}>
              <Text style={S.summaryLabel}>
                {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''} selected
              </Text>
              <Text style={S.summaryPrice}>+₹{totalAddonsPrice}</Text>
            </View>
          )}

          {/* Recommended bundles */}
          {addons.some(a => a.bundleWith) && (
            <View style={S.bundleSection}>
              <Text style={S.bundleTitle}>💡 Recommended Together</Text>
              {addons.filter(a => a.bundleWith).map(a => {
                const partner = addons.find(x => x.id === a.bundleWith);
                if (!partner) return null;
                const bundlePrice = a.price + partner.price;
                const bundleDiscount = Math.round(bundlePrice * 0.1);
                return (
                  <TouchableOpacity
                    key={`bundle_${a.id}`}
                    style={S.bundleCard}
                    onPress={() => { onToggle?.(a.id); onToggle?.(partner.id); }}
                  >
                    <Text style={S.bundleEmojis}>{a.icon} + {partner.icon}</Text>
                    <View style={S.bundleInfo}>
                      <Text style={S.bundleName}>{a.name} + {partner.name}</Text>
                      <Text style={S.bundleSave}>Save ₹{bundleDiscount}</Text>
                    </View>
                    <View style={S.bundlePriceBox}>
                      <Text style={S.bundleOriginal}>₹{bundlePrice}</Text>
                      <Text style={S.bundleFinal}>₹{bundlePrice - bundleDiscount}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Default addons by service category ───────────────────────
export const ADDONS_BY_SERVICE = {
  'AC Service': [
    { id: 'deep_clean', name: 'Deep Cleaning', icon: '🧹', price: 299, color: '#E8F8F0', popular: true, duration: 30, description: 'Thorough internal cleaning of coils and filters', bundleWith: 'gas_refill' },
    { id: 'gas_refill', name: 'Gas Refill',    icon: '💨', price: 499, color: '#EAF4FB', popular: false, duration: 45, description: 'Recharge refrigerant gas for better cooling' },
    { id: 'filter_rep', name: 'Filter Replace',icon: '🔄', price: 149, color: '#FEF9E7', popular: false, duration: 15, description: 'Replace worn-out air filters' },
    { id: 'pest_prot',  name: 'Pest Guard',    icon: '🛡️', price: 199, color: '#F3E5F5', popular: false, duration: 10, description: 'Apply pest-repellent in AC unit' },
    { id: 'pcb_check',  name: 'PCB Check',     icon: '⚡', price: 249, color: '#FCE4EC', popular: false, duration: 20, description: 'Inspect and clean circuit board' },
  ],
  'Home Cleaning': [
    { id: 'sofa_clean',  name: 'Sofa Cleaning',     icon: '🛋️', price: 399, color: '#E8F8F0', popular: true,  duration: 60, description: 'Deep clean all sofa upholstery' },
    { id: 'carpet',      name: 'Carpet Cleaning',   icon: '🏠', price: 299, color: '#EAF4FB', popular: false, duration: 45, description: 'Steam clean carpets and rugs' },
    { id: 'balcony',     name: 'Balcony Clean',     icon: '🌅', price: 199, color: '#FEF9E7', popular: false, duration: 30, description: 'Thorough balcony and terrace cleaning' },
    { id: 'fridge_clean',name: 'Fridge Deep Clean', icon: '🧊', price: 299, color: '#F3E5F5', popular: false, duration: 30, description: 'Complete refrigerator interior cleaning' },
    { id: 'oven_clean',  name: 'Oven Cleaning',     icon: '📦', price: 249, color: '#FCE4EC', popular: false, duration: 25, description: 'Clean oven, microwave and chimney filters' },
  ],
  'Plumbing': [
    { id: 'drain_clean', name: 'Drain Cleaning', icon: '🔩', price: 199, color: '#E8F8F0', popular: true,  duration: 30, description: 'Unclog and clean all drains' },
    { id: 'tank_clean',  name: 'Tank Cleaning',  icon: '💧', price: 399, color: '#EAF4FB', popular: false, duration: 60, description: 'Clean water storage tank' },
    { id: 'geysir',      name: 'Geyser Service', icon: '🚿', price: 299, color: '#FEF9E7', popular: false, duration: 40, description: 'Service and descale water heater' },
  ],
  'Electrical': [
    { id: 'safety_audit',name: 'Safety Audit',   icon: '🔍', price: 299, color: '#FEF9E7', popular: true,  duration: 30, description: 'Full electrical safety inspection' },
    { id: 'mcb_check',   name: 'MCB Panel Check',icon: '⚡', price: 199, color: '#E8F8F0', popular: false, duration: 20, description: 'Inspect and test MCB panel' },
    { id: 'earthing',    name: 'Earthing Check', icon: '🛡️', price: 249, color: '#EAF4FB', popular: false, duration: 25, description: 'Test earthing connections' },
  ],
};

const S = StyleSheet.create({
  container:      { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', ...Shadows.sm },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerLeft:     { flex: 1 },
  title:          { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  subtitle:       { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedBadge:  { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  selectedBadgeText: { ...Typography.small, color: Colors.primary, fontWeight: '700' },
  chevron:        { fontSize: 12, color: Colors.midGray },
  addonsScroll:   { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  addonCard:      { width: 150, borderRadius: 14, padding: 12, backgroundColor: Colors.offWhite, borderWidth: 1.5, borderColor: 'transparent', position: 'relative' },
  addonCardSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  popularTag:     { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  popularText:    { fontSize: 9, color: Colors.white, fontWeight: '800' },
  addonIconBg:    { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  addonIcon:      { fontSize: 22 },
  addonName:      { ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 2, lineHeight: 20 },
  addonNameSelected: { color: Colors.primary },
  addonDesc:      { ...Typography.small, color: Colors.gray, lineHeight: 16, marginBottom: 4 },
  addonDuration:  { ...Typography.small, color: Colors.midGray, marginBottom: 6 },
  addonFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  addonPrice:     { ...Typography.body, color: Colors.black, fontWeight: '800' },
  addonPriceSelected: { color: Colors.primary },
  addBtn:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.lightGray },
  addBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  addBtnText:     { ...Typography.small, color: Colors.gray, fontWeight: '700' },
  addBtnTextSelected: { color: Colors.white },
  summaryBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryLight, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, borderRadius: 10, marginBottom: 12 },
  summaryLabel:   { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  summaryPrice:   { ...Typography.bodyLarge, color: Colors.primary, fontWeight: '800' },
  bundleSection:  { paddingHorizontal: 16, paddingBottom: 12 },
  bundleTitle:    { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  bundleCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 12, padding: 12, gap: 10 },
  bundleEmojis:   { fontSize: 20, minWidth: 50 },
  bundleInfo:     { flex: 1 },
  bundleName:     { ...Typography.caption, color: Colors.black, fontWeight: '700', marginBottom: 2 },
  bundleSave:     { ...Typography.small, color: Colors.success, fontWeight: '700' },
  bundlePriceBox: { alignItems: 'flex-end' },
  bundleOriginal: { ...Typography.small, color: Colors.midGray, textDecorationLine: 'line-through' },
  bundleFinal:    { ...Typography.body, color: Colors.primary, fontWeight: '800' },
});
