import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { bookingsAPI, paymentsAPI, usersAPI } from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
const STEPS = ['Address', 'Payment', 'Confirm'];

export default function CheckoutScreen({ navigation }) {
  const { cart, clearCart, cartTotal } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', line1: '', area: '', city: '', pincode: '', landmark: '' });
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placedBooking, setPlacedBooking] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);
  const TIP_OPTIONS = [0, 20, 50, 100, 200];
  const placesRef = useRef();

  const subtotal = cartTotal;
  const discount = couponData?.discount || 0;
  const taxes = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + taxes + tipAmount;

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const { data } = await usersAPI.getProfile();
      const addrs = data.user?.addresses || [];
      setAddresses(addrs);
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (def) setSelectedAddress(def);
      else setAddingNew(true);
    } catch {}
  };

  const handlePlaceSelected = (data, details) => {
    const components = details?.address_components || [];
    const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
    setNewAddr(prev => ({
      ...prev,
      line1: details?.formatted_address || data.description,
      area: get('sublocality_level_1') || get('locality'),
      city: get('locality') || get('administrative_area_level_2'),
      pincode: get('postal_code'),
    }));
  };

  const handleSaveAddress = async () => {
    if (!newAddr.line1 || !newAddr.city) {
      Alert.alert('Error', 'Please fill required address fields'); return;
    }
    try {
      const { data } = await usersAPI.addAddress(newAddr);
      setAddresses(data.addresses);
      setSelectedAddress(data.addresses[data.addresses.length - 1]);
      setAddingNew(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const { data } = await paymentsAPI.applyCoupon(couponCode, subtotal);
      setCouponData(data);
      Alert.alert('🎉 Coupon Applied!', data.message);
    } catch (err) {
      Alert.alert('Invalid Coupon', err.response?.data?.message || 'Coupon not valid');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { Alert.alert('Select Address', 'Please select a delivery address'); return; }
    setLoading(true);
    try {
      const booking = await bookingsAPI.create({
        serviceId: cart[0]?.serviceId,
        subServiceName: cart[0]?.subServiceName,
        scheduledDate: cart[0]?.date,
        scheduledTime: cart[0]?.time,
        address: selectedAddress,
        paymentMethod,
        couponCode: couponData?.coupon?.code,
      });
      const bookingId = booking.data.booking._id;

      if (paymentMethod === 'online') {
        const orderRes = await paymentsAPI.createOrder(bookingId);
        const { order, key, prefill } = orderRes.data;

        RazorpayCheckout.open({
          key,
          amount: order.amount,
          currency: order.currency,
          name: 'Slot App',
          description: cart[0]?.serviceName,
          order_id: order.id,
          prefill: {
            name: prefill?.name || user?.name,
            email: prefill?.email || user?.email || '',
            contact: `+91${user?.phone}`,
          },
          theme: { color: '#E94560' },
          retry: { enabled: true, max_count: 3 },
        }).then(async (data) => {
          try {
            await paymentsAPI.verify({
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
              bookingId,
            });
            setPlacedBooking(booking.data.booking);
            clearCart();
            setStep(3);
          } catch {
            Alert.alert('Payment Error', 'Payment verification failed. Contact support.');
          }
        }).catch((err) => {
          if (err.code !== 'PAYMENT_CANCELLED') {
            Alert.alert('Payment Failed', err.description || 'Payment could not be processed');
          }
        });
      } else {
        setPlacedBooking(booking.data.booking);
        clearCart();
        setStep(3);
      }
    } catch (err) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Please try again');
    } finally { setLoading(false); }
  };

  const input = (placeholder, key, opts = {}) => (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.lightGray}
      value={newAddr[key]}
      onChangeText={v => setNewAddr(a => ({ ...a, [key]: v }))}
      {...opts}
    />
  );

  // Success screen
  if (step === 3 && placedBooking) {
    return (
      <View style={[Common.container, Common.center, { padding: 32 }]}>
        <View style={styles.successIcon}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
        </View>
        <Text style={[Typography.h1, { textAlign: 'center', marginBottom: 8 }]}>Booking Confirmed!</Text>
        <Text style={[Typography.body, { textAlign: 'center', marginBottom: 24 }]}>
          Booking ID: {placedBooking.bookingId}
        </Text>
        <View style={styles.confirmCard}>
          {cart[0]?.date && <Text style={styles.confirmLine}>📅 {cart[0].date} · {cart[0].time}</Text>}
          {selectedAddress && <Text style={styles.confirmLine}>📍 {selectedAddress.line1}, {selectedAddress.city}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Tracking', { bookingId: placedBooking._id })}
          style={[Common.primaryBtn, { width: '100%', marginBottom: 12 }]}>
          <Text style={Common.primaryBtnText}>📍 Track Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={[Common.outlineBtn, { width: '100%' }]}>
          <Text style={Common.outlineBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={Common.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>
                  {i < step ? '✓' : (i + 1).toString()}
                </Text>
              </View>
              <Text style={[styles.stepLabel, i === step && { color: Colors.primary }]}>{s}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: i < step ? Colors.success : Colors.lightGray }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        {/* STEP 0 - ADDRESS */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📍 Service Address</Text>

            {addresses.map(addr => (
              <TouchableOpacity
                key={addr._id}
                onPress={async () => {
                  setSelectedAddress(addr);
                  setAddingNew(false);
                  // Check serviceability for this pincode
                  if (addr.pincode) {
                    try {
                      const resp = await fetch(
                        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/service-areas/check/${addr.pincode}`
                      );
                      const data = await resp.json();
                      if (data.success && !data.data?.available) {
                        Alert.alert(
                          '⚠️ Service Not Available',
                          `Sorry, we don't currently serve ${addr.pincode} (${addr.city}). Please select a different address.`,
                          [{ text: 'OK' }]
                        );
                      }
                    } catch {} // non-blocking — allow booking even if check fails
                  }
                }}
                style={[styles.addrCard, selectedAddress?._id === addr._id && styles.addrCardActive]}>
                <Text style={styles.addrIcon}>{addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '🏢' : '📍'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addrLabel}>{addr.label}</Text>
                  <Text style={styles.addrText} numberOfLines={2}>{addr.line1}, {addr.area || ''}, {addr.city} - {addr.pincode}</Text>
                  {addr.landmark && <Text style={styles.addrLandmark}>Near {addr.landmark}</Text>}
                </View>
                {selectedAddress?._id === addr._id && <Text style={{ color: Colors.primary, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setAddingNew(v => !v)} style={styles.addAddrBtn}>
              <Text style={styles.addAddrBtnText}>+ Add New Address</Text>
            </TouchableOpacity>

            {addingNew && (
              <View style={styles.newAddrForm}>
                {/* Google Places Search */}
                <GooglePlacesAutocomplete
                  ref={placesRef}
                  placeholder="Search address..."
                  onPress={handlePlaceSelected}
                  query={{ key: GOOGLE_MAPS_KEY, language: 'en', components: 'country:in' }}
                  fetchDetails
                  styles={{
                    textInputContainer: styles.placesContainer,
                    textInput: styles.placesInput,
                    listView: styles.placesList,
                    row: styles.placesRow,
                    description: { fontSize: 14, color: Colors.black },
                  }}
                  enablePoweredByContainer={false}
                />

                {input('House No., Building, Street *', 'line1', { style: [styles.input, { marginTop: 8 }] })}
                <View style={styles.inputRow}>
                  {input('Area / Locality', 'area')}
                  {input('City *', 'city')}
                </View>
                <View style={styles.inputRow}>
                  {input('Pincode *', 'pincode', { keyboardType: 'number-pad', maxLength: 6 })}
                  {input('Landmark', 'landmark')}
                </View>

                <View style={styles.labelRow}>
                  {['Home', 'Work', 'Other'].map(l => (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setNewAddr(a => ({ ...a, label: l }))}
                      style={[styles.labelChip, newAddr.label === l && styles.labelChipActive]}>
                      <Text style={[styles.labelChipText, newAddr.label === l && { color: Colors.primary }]}>
                        {l === 'Home' ? '🏠' : l === 'Work' ? '🏢' : '📍'} {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity onPress={handleSaveAddress} style={[Common.primaryBtn, { marginTop: 12 }]}>
                  <Text style={Common.primaryBtnText}>Save Address</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              disabled={!selectedAddress}
              onPress={() => setStep(1)}
              style={[Common.primaryBtn, { margin: 16, marginTop: 24, opacity: selectedAddress ? 1 : 0.4 }]}>
              <Text style={Common.primaryBtnText}>Continue to Payment →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 1 - PAYMENT */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>💳 Payment Method</Text>

            {[
              { id: 'online', icon: '💳', label: 'Pay Online', desc: 'UPI, Cards, Net Banking, Wallets' },
              { id: 'cash', icon: '💵', label: 'Pay After Service', desc: 'Cash or card on completion' },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setPaymentMethod(m.id)}
                style={[styles.payCard, paymentMethod === m.id && styles.payCardActive]}>
                <Text style={{ fontSize: 28 }}>{m.icon}</Text>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.payLabel}>{m.label}</Text>
                  <Text style={styles.payDesc}>{m.desc}</Text>
                </View>
                <View style={[styles.radioOuter, paymentMethod === m.id && styles.radioOuterActive]}>
                  {paymentMethod === m.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Coupon */}
            <View style={styles.couponBox}>
              <Text style={styles.couponTitle}>🎟️ Apply Coupon</Text>
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter code"
                  placeholderTextColor={Colors.lightGray}
                  value={couponCode}
                  onChangeText={v => setCouponCode(v.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity onPress={handleApplyCoupon} style={styles.couponApply}>
                  <Text style={styles.couponApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
              {couponData && (
                <Text style={styles.couponSuccess}>✅ {couponData.message}</Text>
              )}
              <Text style={styles.couponHint}>Try: SlotWELCOME · Slot100 · AUTOCARE</Text>
            </View>

            <TouchableOpacity onPress={() => setStep(2)} style={[Common.primaryBtn, { margin: 16 }]}>
              <Text style={Common.primaryBtnText}>Review & Confirm →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 - CONFIRM */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>✅ Review Order</Text>

            {cart.map(item => (
              <View key={item.cartId} style={styles.orderItem}>
                <Text style={{ fontSize: 32 }}>{item.serviceIcon || '🔧'}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.orderItemName}>{item.serviceName}</Text>
                  {item.subServiceName && <Text style={styles.orderItemSub}>{item.subServiceName}</Text>}
                  {item.date && <Text style={styles.orderItemDate}>📅 {item.date} · {item.time}</Text>}
                </View>
                <Text style={styles.orderItemPrice}>₹{item.price}</Text>
              </View>
            ))}

            {selectedAddress && (
              <View style={styles.addressSummary}>
                <Text style={styles.addressSummaryText}>
                  📍 {selectedAddress.line1}, {selectedAddress.area || ''}, {selectedAddress.city} - {selectedAddress.pincode}
                </Text>
              </View>
            )}

            {/* Tip your professional */}
            <View style={{ marginBottom: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderLight }}>
              <Text style={{ ...Typography.bodyMed, marginBottom: 10 }}>💝 Tip your professional (optional)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TIP_OPTIONS.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setTipAmount(amt)}
                    style={{
                      flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                      backgroundColor: tipAmount === amt ? Colors.primary : Colors.offWhite,
                      borderWidth: 1, borderColor: tipAmount === amt ? Colors.primary : Colors.borderLight,
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: tipAmount === amt ? Colors.white : Colors.gray }}>
                      {amt === 0 ? 'No tip' : `₹${amt}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {tipAmount > 0 && <Text style={{ fontSize: 11, color: Colors.gray, marginTop: 8 }}>100% goes directly to your professional. Thank you! 🙏</Text>}
            </View>

            {/* Price breakdown */}
            <View style={styles.priceBreakdown}>
              {[
                ['Subtotal', subtotal, false],
                ['Coupon Discount', discount, true],
                ['GST (18%)', taxes, false],
                ['Tip for Professional', tipAmount, false],
              ].filter(([, v]) => v > 0).map(([l, v, neg]) => (
                <View key={l} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{l}</Text>
                  <Text style={[styles.priceValue, neg && { color: Colors.success }]}>{neg ? '-' : ''}₹{v}</Text>
                </View>
              ))}
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePlaceOrder}
              disabled={loading}
              style={[Common.primaryBtn, { margin: 16 }]}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={Common.primaryBtnText}>🎉 Place Order — ₹{total}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.offWhite,
  },
  headerBack: { fontSize: 22, color: Colors.black, padding: 4 },
  headerTitle: { ...Typography.h3 },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 20, backgroundColor: Colors.white, marginBottom: 2,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.offWhite,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: Colors.midGray },
  stepNumActive: { color: Colors.white },
  stepLabel: { fontSize: 11, color: Colors.midGray, fontWeight: '500' },
  stepLine: { width: 48, height: 2, marginHorizontal: 4, marginBottom: 20 },

  stepContent: { padding: 16 },
  stepTitle: { ...Typography.h3, marginBottom: 16 },

  addrCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14,
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.lightGray, ...Shadows.sm,
  },
  addrCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  addrIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  addrLabel: { ...Typography.bodyMed, marginBottom: 2 },
  addrText: { ...Typography.small, lineHeight: 18 },
  addrLandmark: { fontSize: 12, color: Colors.midGray, marginTop: 2 },

  addAddrBtn: {
    borderWidth: 1.5, borderColor: Colors.lightGray, borderStyle: 'dashed',
    borderRadius: Radius.lg, padding: 14, alignItems: 'center', marginBottom: 12,
  },
  addAddrBtnText: { color: Colors.primary, fontWeight: '600' },

  newAddrForm: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, ...Shadows.card },
  placesContainer: { marginBottom: 0 },
  placesInput: {
    borderWidth: 1.5, borderColor: Colors.lightGray, borderRadius: Radius.lg,
    paddingHorizontal: 14, fontSize: 14, color: Colors.black, height: 48,
  },
  placesList: { borderRadius: Radius.lg, ...Shadows.md },
  placesRow: { padding: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.lightGray, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.black,
    marginBottom: 10, flex: 1,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  labelRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  labelChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: Colors.lightGray,
  },
  labelChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  labelChipText: { fontSize: 13, fontWeight: '600', color: Colors.gray },

  payCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.lightGray, ...Shadows.sm,
  },
  payCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  payLabel: { ...Typography.bodyMed, marginBottom: 2 },
  payDesc: { ...Typography.small },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.lightGray,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  couponBox: {
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: 16, marginTop: 8,
  },
  couponTitle: { ...Typography.bodyMed, marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.lightGray, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '700',
    color: Colors.black, letterSpacing: 2, backgroundColor: Colors.white,
  },
  couponApply: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
  },
  couponApplyText: { color: Colors.white, fontWeight: '700' },
  couponSuccess: { color: Colors.success, fontWeight: '600', fontSize: 13, marginTop: 8 },
  couponHint: { color: Colors.midGray, fontSize: 11, marginTop: 6 },

  orderItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: 10, ...Shadows.sm,
  },
  orderItemName: { ...Typography.bodyMed },
  orderItemSub: { ...Typography.small },
  orderItemDate: { color: Colors.success, fontSize: 12, marginTop: 2 },
  orderItemPrice: { ...Typography.h4, color: Colors.black },

  addressSummary: {
    backgroundColor: Colors.infoLight, borderRadius: Radius.lg, padding: 12, marginBottom: 16,
  },
  addressSummaryText: { fontSize: 13, color: Colors.info, lineHeight: 18 },

  priceBreakdown: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, ...Shadows.sm,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priceLabel: { ...Typography.body },
  priceValue: { ...Typography.bodyMed },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.offWhite, paddingTop: 12, marginTop: 4 },
  totalLabel: { ...Typography.h4 },
  totalValue: { ...Typography.h3, color: Colors.primary },

  successIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  confirmCard: {
    backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: 16,
    width: '100%', marginBottom: 24,
  },
  confirmLine: { fontSize: 14, color: Colors.gray, marginBottom: 6 },
});
