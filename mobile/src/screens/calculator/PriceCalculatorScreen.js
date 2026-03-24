/**
 * Slot App — PriceCalculatorScreen (Feature #27)
 * Estimate service cost before booking — room size, add-ons, etc.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Dimensions, Alert, Share,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

const SERVICES_CONFIG = {
  'AC Service': {
    units: { label: 'Number of ACs', min: 1, max: 10, step: 1, pricePerUnit: 499 },
    addons: [
      { id: 'deep_clean',  label: 'Deep Cleaning',    icon: '🧹', price: 300 },
      { id: 'gas_refill',  label: 'Gas Refill',        icon: '💨', price: 500 },
      { id: 'filter',      label: 'Filter Replacement',icon: '🔄', price: 150 },
      { id: 'pest_filter', label: 'Pest Protection',   icon: '🐛', price: 200 },
    ],
  },
  'Home Cleaning': {
    units: { label: 'BHK Type', options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'], prices: [899, 1299, 1799, 2499, 3499] },
    addons: [
      { id: 'balcony', label: 'Balcony Cleaning',  icon: '🏠', price: 200 },
      { id: 'sofa',    label: 'Sofa Cleaning',      icon: '🛋️', price: 400 },
      { id: 'fridge',  label: 'Fridge Cleaning',    icon: '🧊', price: 300 },
      { id: 'oven',    label: 'Oven/Microwave',      icon: '📦', price: 250 },
    ],
  },
  'Pest Control': {
    units: { label: 'Flat Size', options: ['1 BHK', '2 BHK', '3 BHK', 'Villa'], prices: [799, 1199, 1599, 2999] },
    addons: [
      { id: 'termite',  label: 'Termite Treatment',  icon: '🐜', price: 800 },
      { id: 'rodent',   label: 'Rodent Control',      icon: '🐀', price: 600 },
      { id: 'mosquito', label: 'Mosquito Fogging',    icon: '🦟', price: 400 },
    ],
  },
  'Electrical': {
    units: { label: 'Number of Points', min: 1, max: 20, step: 1, pricePerUnit: 199, basePrice: 0 },
    addons: [
      { id: 'panel',   label: 'MCB Panel Check',  icon: '⚡', price: 400 },
      { id: 'earth',   label: 'Earthing Check',   icon: '🔌', price: 300 },
      { id: 'surge',   label: 'Surge Protection', icon: '🛡️', price: 250 },
    ],
  },
};

export default function PriceCalculatorScreen({ navigation, route }) {
  const defaultService = route?.params?.service || 'AC Service';
  const [service, setService]     = useState(defaultService);
  const [units, setUnits]         = useState(1);
  const [selectedOption, setOption] = useState(0);
  const [selectedAddons, setAddons] = useState([]);
  const [subscription, setSub]    = useState(null); // null | 'silver' | 'gold' | 'platinum'
  const [coupon, setCoupon]       = useState('');
  const [couponDiscount, setCouponDisc] = useState(0);

  const config      = SERVICES_CONFIG[service] || SERVICES_CONFIG['AC Service'];
  const hasOptions  = !!config.units.options;
  const hasSlider   = !hasOptions;

  const basePrice = hasOptions
    ? config.units.prices[selectedOption]
    : (config.units.basePrice || 0) + config.units.pricePerUnit * units;

  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = config.addons.find(a => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);

  const subDiscount = subscription === 'silver' ? 5 : subscription === 'gold' ? 10 : subscription === 'platinum' ? 15 : 0;
  const subtotal    = basePrice + addonsTotal;
  const subDiscAmt  = Math.round(subtotal * subDiscount / 100);
  const afterSub    = subtotal - subDiscAmt;
  const convFee     = afterSub >= 500 ? 0 : 29;
  const gst         = Math.round(afterSub * 0.18);
  const total       = afterSub - couponDiscount + convFee + gst;

  const toggleAddon = (id) => {
    setAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'SAVE50') {
      setCouponDisc(Math.min(50, afterSub * 0.1));
      Alert.alert('✅ Applied!', '₹50 discount applied!');
    } else {
      Alert.alert('Invalid', 'Invalid coupon code');
      setCouponDisc(0);
    }
  };

  return (
    <View style={PC.container}>
      <View style={PC.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={PC.backBtn}>
          <Text style={PC.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={PC.headerTitle}>Price Calculator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Service selector */}
        <Text style={PC.sectionTitle}>Select Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {Object.keys(SERVICES_CONFIG).map(s => (
            <TouchableOpacity
              key={s}
              style={[PC.serviceChip, service === s && PC.serviceChipActive]}
              onPress={() => { setService(s); setUnits(1); setOption(0); setAddons([]); }}
            >
              <Text style={[PC.serviceChipText, service === s && PC.serviceChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Units / Options */}
        <Text style={PC.sectionTitle}>{config.units.label}</Text>
        {hasOptions ? (
          <View style={PC.optionsGrid}>
            {config.units.options.map((opt, i) => (
              <TouchableOpacity
                key={opt}
                style={[PC.optionCard, selectedOption === i && PC.optionCardActive]}
                onPress={() => setOption(i)}
              >
                <Text style={[PC.optionText, selectedOption === i && PC.optionTextActive]}>{opt}</Text>
                <Text style={[PC.optionPrice, selectedOption === i && PC.optionTextActive]}>₹{config.units.prices[i]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={PC.counterRow}>
            <TouchableOpacity
              style={[PC.counterBtn, units <= config.units.min && PC.counterBtnDisabled]}
              onPress={() => setUnits(u => Math.max(config.units.min, u - config.units.step))}
            >
              <Text style={PC.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={PC.counterValue}>{units}</Text>
            <TouchableOpacity
              style={[PC.counterBtn, units >= config.units.max && PC.counterBtnDisabled]}
              onPress={() => setUnits(u => Math.min(config.units.max, u + config.units.step))}
            >
              <Text style={PC.counterBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={PC.counterNote}>× ₹{config.units.pricePerUnit} = ₹{basePrice}</Text>
          </View>
        )}

        {/* Add-ons */}
        <Text style={[PC.sectionTitle, { marginTop: 16 }]}>Add-ons (Optional)</Text>
        <View style={PC.addonsGrid}>
          {config.addons.map(addon => {
            const selected = selectedAddons.includes(addon.id);
            return (
              <TouchableOpacity
                key={addon.id}
                style={[PC.addonCard, selected && PC.addonCardActive]}
                onPress={() => toggleAddon(addon.id)}
              >
                <Text style={PC.addonIcon}>{addon.icon}</Text>
                <Text style={[PC.addonLabel, selected && { color: Colors.primary }]} numberOfLines={2}>{addon.label}</Text>
                <Text style={[PC.addonPrice, selected && { color: Colors.primary }]}>+₹{addon.price}</Text>
                {selected && <View style={PC.addonCheck}><Text style={PC.addonCheckText}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Subscription discount */}
        <Text style={[PC.sectionTitle, { marginTop: 16 }]}>Apply Membership</Text>
        <View style={PC.subRow}>
          {[null, 'silver', 'gold', 'platinum'].map(s => (
            <TouchableOpacity
              key={String(s)}
              style={[PC.subChip, subscription === s && PC.subChipActive]}
              onPress={() => setSub(s)}
            >
              <Text style={[PC.subChipText, subscription === s && { color: Colors.white }]}>
                {s === null ? 'None' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
              {s !== null && <Text style={PC.subDiscount}>{s === 'silver' ? '5%' : s === 'gold' ? '10%' : '15%'}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Coupon */}
        <Text style={[PC.sectionTitle, { marginTop: 16 }]}>Coupon Code</Text>
        <View style={PC.couponRow}>
          <TextInput
            style={PC.couponInput}
            placeholder="Enter coupon code"
            placeholderTextColor={Colors.lightGray}
            value={coupon}
            onChangeText={setCoupon}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={PC.couponApplyBtn} onPress={applyCoupon}>
            <Text style={PC.couponApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Price Breakdown */}
        <View style={PC.breakdownCard}>
          <Text style={PC.breakdownTitle}>Price Breakdown</Text>
          {[
            { label: `Base Price (${hasOptions ? config.units.options[selectedOption] : `${units}x`})`, value: basePrice },
            selectedAddons.length > 0 && { label: 'Add-ons', value: addonsTotal },
            subDiscAmt > 0 && { label: `${subscription?.toUpperCase()} Discount (${subDiscount}%)`, value: -subDiscAmt, isDiscount: true },
            couponDiscount > 0 && { label: 'Coupon Discount', value: -couponDiscount, isDiscount: true },
            convFee > 0 && { label: 'Convenience Fee', value: convFee },
            { label: 'GST (18%)', value: gst },
          ].filter(Boolean).map((row, i) => (
            <View key={i} style={PC.breakdownRow}>
              <Text style={PC.breakdownLabel}>{row.label}</Text>
              <Text style={[PC.breakdownValue, row.isDiscount && { color: Colors.success }]}>
                {row.isDiscount ? '-' : ''}₹{Math.abs(row.value).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
          <View style={PC.breakdownDivider} />
          <View style={PC.breakdownRow}>
            <Text style={PC.totalLabel}>Total</Text>
            <Text style={PC.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={PC.bookNowBtn}
          onPress={() => navigation.navigate('ServiceDetail', { service, estimatedPrice: total })}
        >
          <Text style={PC.bookNowText}>Book Now for ₹{total.toLocaleString('en-IN')} →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={PC.shareBtn}
          onPress={() => Share.share({ message: `I got a price estimate for ${service} on Slot App: ₹${total}\n\nDownload Slot App: https://slotapp.in` })}
        >
          <Text style={PC.shareBtnText}>📤 Share Estimate</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const PC = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  sectionTitle:{ ...Typography.body, color: Colors.black, fontWeight: '700', marginBottom: 8 },
  serviceChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1.5, borderColor: Colors.lightGray },
  serviceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  serviceChipText: { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  serviceChipTextActive: { color: Colors.white },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionCard:  { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.lightGray, alignItems: 'center', minWidth: (W - 52) / 4 },
  optionCardActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  optionText:  { ...Typography.caption, color: Colors.darkGray, fontWeight: '600', marginBottom: 2 },
  optionPrice: { ...Typography.caption, color: Colors.gray },
  optionTextActive: { color: Colors.primary },
  counterRow:  { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8 },
  counterBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  counterBtnDisabled: { backgroundColor: Colors.lightGray },
  counterBtnText: { ...Typography.h3, color: Colors.white },
  counterValue:{ ...Typography.h2, color: Colors.black, minWidth: 40, textAlign: 'center' },
  counterNote: { ...Typography.body, color: Colors.gray },
  addonsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addonCard:   { width: (W - 48) / 2, backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm, position: 'relative' },
  addonCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  addonIcon:   { fontSize: 24, marginBottom: 6 },
  addonLabel:  { ...Typography.caption, color: Colors.darkGray, fontWeight: '600', marginBottom: 4 },
  addonPrice:  { ...Typography.body, color: Colors.gray, fontWeight: '700' },
  addonCheck:  { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  addonCheckText: { fontSize: 10, color: Colors.white, fontWeight: '800' },
  subRow:      { flexDirection: 'row', gap: 8 },
  subChip:     { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.lightGray },
  subChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  subChipText: { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  subDiscount: { ...Typography.small, color: Colors.success, marginTop: 2 },
  couponRow:   { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray },
  couponApplyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  couponApplyText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
  breakdownCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginTop: 16, ...Shadows.sm },
  breakdownTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  breakdownRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel:{ ...Typography.body, color: Colors.gray },
  breakdownValue:{ ...Typography.body, color: Colors.black, fontWeight: '600' },
  breakdownDivider: { height: 1, backgroundColor: Colors.offWhite, marginVertical: 8 },
  totalLabel:  { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  totalValue:  { ...Typography.bodyLarge, color: Colors.primary, fontWeight: '800' },
  bookNowBtn:  { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  bookNowText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  shareBtn:    { backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.lightGray },
  shareBtnText:{ ...Typography.body, color: Colors.gray, fontWeight: '600' },
});
