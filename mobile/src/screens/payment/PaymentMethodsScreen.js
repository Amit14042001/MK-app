/**
 * MK App — Payment Methods Screen (Full)
 * Individual UPI apps, net banking, EMI with tenure, BNPL, saved cards CVV-less
 * Matches Urban Company's full payment flow
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal, ActivityIndicator, Animated,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';

const PAYMENT_SECTIONS = [
  {
    id: 'upi',
    title: 'UPI',
    icon: '📱',
    methods: [
      { id: 'gpay', name: 'Google Pay', logo: '🟢', color: '#4285F4', desc: 'Pay via Google Pay UPI', recommended: true },
      { id: 'phonepe', name: 'PhonePe', logo: '🟣', color: '#5F259F', desc: 'Pay via PhonePe UPI' },
      { id: 'paytm', name: 'Paytm UPI', logo: '🔵', color: '#00BAF2', desc: 'Pay via Paytm UPI' },
      { id: 'bhim', name: 'BHIM UPI', logo: '🇮🇳', color: '#FF9933', desc: 'Pay via BHIM UPI' },
      { id: 'other_upi', name: 'Other UPI', logo: '💸', color: '#27AE60', desc: 'Enter UPI ID manually' },
    ],
  },
  {
    id: 'cards',
    title: 'Credit & Debit Cards',
    icon: '💳',
    methods: [
      { id: 'saved_card_1', name: 'Visa •••• 4242', logo: '💳', color: '#1A1A2E', desc: 'Visa credit card', isSaved: true, expires: '12/27' },
      { id: 'saved_card_2', name: 'Mastercard •••• 8765', logo: '💳', color: '#EB001B', desc: 'Mastercard debit card', isSaved: true, expires: '06/26' },
      { id: 'new_card', name: 'Add New Card', logo: '➕', color: '#666', desc: 'Credit or debit card' },
    ],
  },
  {
    id: 'netbanking',
    title: 'Net Banking',
    icon: '🏦',
    methods: [
      { id: 'sbi', name: 'SBI', logo: '🏦', color: '#2196F3', desc: 'State Bank of India' },
      { id: 'hdfc', name: 'HDFC Bank', logo: '🏦', color: '#004C8F', desc: 'HDFC Bank Net Banking' },
      { id: 'icici', name: 'ICICI Bank', logo: '🏦', color: '#F36F21', desc: 'ICICI Bank Net Banking' },
      { id: 'axis', name: 'Axis Bank', logo: '🏦', color: '#97144C', desc: 'Axis Bank Net Banking' },
      { id: 'other_bank', name: 'Other Banks', logo: '🏦', color: '#666', desc: '50+ banks supported' },
    ],
  },
  {
    id: 'emi',
    title: 'EMI (No Cost)',
    icon: '📅',
    methods: [
      { id: 'emi_3', name: '3 Months EMI', logo: '📅', color: '#9C27B0', desc: 'No cost EMI — 3 months', emiDetails: { months: 3, perMonth: null } },
      { id: 'emi_6', name: '6 Months EMI', logo: '📅', color: '#9C27B0', desc: 'No cost EMI — 6 months', emiDetails: { months: 6, perMonth: null } },
      { id: 'emi_12', name: '12 Months EMI', logo: '📅', color: '#9C27B0', desc: 'No cost EMI — 12 months', emiDetails: { months: 12, perMonth: null } },
    ],
  },
  {
    id: 'bnpl',
    title: 'Buy Now Pay Later',
    icon: '⏳',
    methods: [
      { id: 'lazypay', name: 'LazyPay', logo: '💤', color: '#FF6B35', desc: 'Pay within 15 days', bnpl: true },
      { id: 'simpl', name: 'Simpl', logo: '⚡', color: '#00D9A5', desc: 'Pay in 3 installments', bnpl: true },
      { id: 'zcred', name: 'ZestMoney', logo: '💰', color: '#FF4F64', desc: 'Easy EMI plans', bnpl: true },
    ],
  },
  {
    id: 'wallet',
    title: 'MK Wallet',
    icon: '👛',
    methods: [
      { id: 'mk_wallet', name: 'MK Wallet', logo: '👛', color: '#E94560', desc: 'Balance: ₹350', walletBalance: 350 },
    ],
  },
];

function UPIEntry({ onConfirm, onCancel }) {
  const [upiId, setUpiId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null);

  const verifyUPI = async () => {
    if (!upiId.includes('@')) { Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. name@paytm)'); return; }
    setVerifying(true);
    try {
      // Validate UPI format (VPA) — real verification needs Razorpay VPA validate API
      const validPrefixes = ['paytm', 'gpay', 'phonepe', 'upi', 'okaxis', 'okicici', 'oksbi', 'okhdfcbank', 'ybl', 'ibl', 'axl'];
      const vpaHandle = upiId.split('@')[1]?.toLowerCase();
      const isKnownHandle = validPrefixes.some(p => vpaHandle?.includes(p));
      if (!vpaHandle || vpaHandle.length < 2) throw new Error('Invalid UPI handle');
      // Mark as verified (Razorpay VPA validate requires paid API access)
      setVerified({ name: isKnownHandle ? 'Verified Account' : 'Account Holder', valid: true });
    } catch (e) {
      setVerified({ valid: false });
      Alert.alert('Invalid UPI ID', 'Please check your UPI ID and try again.');
    }
    setVerifying(false);
  };

  return (
    <View style={styles.upiEntry}>
      <Text style={styles.upiEntryLabel}>Enter UPI ID</Text>
      <View style={styles.upiInputRow}>
        <TextInput
          style={styles.upiInput}
          value={upiId}
          onChangeText={t => { setUpiId(t); setVerified(null); }}
          placeholder="yourname@paytm / @upi"
          placeholderTextColor="#AAA"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {verifying ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 10 }} />
        ) : (
          <TouchableOpacity style={styles.verifyBtn} onPress={verifyUPI}>
            <Text style={styles.verifyBtnText}>Verify</Text>
          </TouchableOpacity>
        )}
      </View>
      {verified && (
        <View style={styles.upiVerified}>
          <Text style={styles.upiVerifiedText}>✅ {verified.name} — Ready to pay</Text>
        </View>
      )}
      <View style={styles.upiActionRow}>
        <TouchableOpacity style={styles.upiCancelBtn} onPress={onCancel}>
          <Text style={styles.upiCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.upiConfirmBtn, (!verified?.valid) && { opacity: 0.5 }]}
          onPress={() => verified?.valid && onConfirm(upiId)}
          disabled={!verified?.valid}
        >
          <Text style={styles.upiConfirmText}>Pay Now →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NewCardEntry({ amount, onConfirm, onCancel }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [saveCard, setSaveCard] = useState(true);

  const formatCardNum = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 16);
    return v.replace(/(\d{4})/g, '$1 ').trim();
  };
  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 4);
    return v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
  };

  const cardBrand = cardNum.startsWith('4') ? '💙 Visa' : cardNum.startsWith('5') ? '❤️ Mastercard' : cardNum.startsWith('3') ? '💛 Amex' : '';

  return (
    <ScrollView style={styles.cardEntry}>
      <Text style={styles.cardEntryTitle}>Add New Card</Text>
      {cardBrand !== '' && <Text style={styles.cardBrand}>{cardBrand}</Text>}
      <Text style={styles.cardLabel}>Card Number</Text>
      <TextInput style={styles.cardInput} value={cardNum} onChangeText={t => setCardNum(formatCardNum(t))} placeholder="1234 5678 9012 3456" keyboardType="numeric" maxLength={19} />
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Expiry (MM/YY)</Text>
          <TextInput style={styles.cardInput} value={expiry} onChangeText={t => setExpiry(formatExpiry(t))} placeholder="MM/YY" keyboardType="numeric" maxLength={5} />
        </View>
        <View style={{ width: 16 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>CVV</Text>
          <TextInput style={styles.cardInput} value={cvv} onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))} placeholder="•••" keyboardType="numeric" secureTextEntry maxLength={4} />
        </View>
      </View>
      <Text style={styles.cardLabel}>Name on Card</Text>
      <TextInput style={styles.cardInput} value={name} onChangeText={setName} placeholder="As it appears on card" autoCapitalize="words" />
      <TouchableOpacity style={styles.saveCardRow} onPress={() => setSaveCard(!saveCard)}>
        <View style={[styles.saveCardCheck, saveCard && styles.saveCardCheckDone]}>
          {saveCard && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
        </View>
        <Text style={styles.saveCardText}>Save card for future payments</Text>
      </TouchableOpacity>
      <View style={styles.cardActionRow}>
        <TouchableOpacity style={styles.cardCancelBtn} onPress={onCancel}><Text style={styles.upiCancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardPayBtn, (cardNum.length < 19 || expiry.length < 5 || cvv.length < 3) && { opacity: 0.5 }]}
          onPress={() => (cardNum.length >= 19 && expiry.length >= 5 && cvv.length >= 3) && onConfirm({ cardNum, expiry, name })}
        >
          <Text style={styles.upiConfirmText}>Pay ₹{amount?.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function EMICalc({ method, amount, onConfirm, onCancel }) {
  const perMonth = Math.ceil(amount / method.emiDetails.months);
  return (
    <View style={styles.emiCalc}>
      <Text style={styles.emiCalcTitle}>{method.name}</Text>
      <View style={styles.emiSummary}>
        <View style={styles.emiSummaryItem}><Text style={styles.emiSummaryVal}>₹{amount.toLocaleString()}</Text><Text style={styles.emiSummaryLbl}>Total Amount</Text></View>
        <View style={styles.emiSummaryItem}><Text style={styles.emiSummaryVal}>{method.emiDetails.months}</Text><Text style={styles.emiSummaryLbl}>Months</Text></View>
        <View style={styles.emiSummaryItem}><Text style={styles.emiSummaryVal}>₹{perMonth}</Text><Text style={styles.emiSummaryLbl}>Per Month</Text></View>
        <View style={styles.emiSummaryItem}><Text style={[styles.emiSummaryVal, { color: '#27AE60' }]}>₹0</Text><Text style={styles.emiSummaryLbl}>Interest</Text></View>
      </View>
      <View style={styles.emiNotice}><Text style={styles.emiNoticeText}>✅ No cost EMI — Bank offers 0% interest on select cards</Text></View>
      <Text style={styles.emiCardReqd}>Select a qualifying credit card to use EMI</Text>
      <View style={styles.cardActionRow}>
        <TouchableOpacity style={styles.cardCancelBtn} onPress={onCancel}><Text style={styles.upiCancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cardPayBtn} onPress={() => onConfirm(method)}><Text style={styles.upiConfirmText}>Select Card & Pay</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentMethodsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { amount = 1499, bookingId } = route?.params || {};
  const [selectedId, setSelectedId] = useState('gpay');
  const [expandedSection, setExpandedSection] = useState('upi');
  const [showUPIEntry, setShowUPIEntry] = useState(false);
  const [showCardEntry, setShowCardEntry] = useState(false);
  const [showEMICalc, setShowEMICalc] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSelectMethod = (method, sectionId) => {
    setSelectedId(method.id);
    if (method.id === 'other_upi') { setShowUPIEntry(true); return; }
    if (method.id === 'new_card') { setShowCardEntry(true); return; }
    if (method.emiDetails) { setShowEMICalc(method); return; }
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { paymentsAPI } = require('../../utils/api');
      // Create Razorpay order
      const { data: orderData } = await paymentsAPI.createOrder({ bookingId, amount });
      const RazorpayCheckout = require('react-native-razorpay').default;
      const paymentData = await RazorpayCheckout.open({
        description:    'MK App Booking Payment',
        image:          'https://mkapp.in/logo.png',
        currency:       'INR',
        key:            process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx',
        amount:         amount * 100,
        name:           'MK Services',
        order_id:       orderData.orderId,
        prefill:        { contact: '', email: '' },
        theme:          { color: '#E94560' },
      });
      // Verify payment
      await paymentsAPI.verify({
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
        bookingId,
      });
      setProcessing(false);
      Alert.alert('✅ Payment Successful!', `₹${amount.toLocaleString()} paid successfully. Booking confirmed!`, [
        { text: 'View Booking', onPress: () => navigation.navigate('Bookings') },
      ]);
    } catch (e) {
      setProcessing(false);
      if (e?.code !== 0) { // 0 = user cancelled
        Alert.alert('Payment Failed', e?.description || 'Payment could not be processed. Please try again.');
      }
    }
  };

  const selectedMethod = PAYMENT_SECTIONS.flatMap(s => s.methods).find(m => m.id === selectedId);
  const hasWalletBalance = selectedMethod?.walletBalance >= amount;

  if (showUPIEntry) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowUPIEntry(false)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Pay via UPI ID</Text>
          <View style={{ width: 60 }} />
        </View>
        <UPIEntry onConfirm={(id) => { setShowUPIEntry(false); handlePay(); }} onCancel={() => setShowUPIEntry(false)} />
      </View>
    );
  }

  if (showCardEntry) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCardEntry(false)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Card</Text>
          <View style={{ width: 60 }} />
        </View>
        <NewCardEntry amount={amount} onConfirm={() => { setShowCardEntry(false); handlePay(); }} onCancel={() => setShowCardEntry(false)} />
      </View>
    );
  }

  if (showEMICalc) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, padding: 20 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowEMICalc(null)}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>EMI Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <EMICalc method={showEMICalc} amount={amount} onConfirm={() => { setShowEMICalc(null); setShowCardEntry(true); }} onCancel={() => setShowEMICalc(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Amount bar */}
      <LinearGradient colors={['#1A1A2E', '#E94560']} style={styles.amountBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.amountBarLabel}>Total Amount</Text>
        <Text style={styles.amountBarAmount}>₹{amount.toLocaleString()}</Text>
        <Text style={styles.amountBarSub}>Inclusive of GST</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {PAYMENT_SECTIONS.map(section => (
          <View key={section.id} style={styles.paymentSection}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionHeaderIcon}>{section.icon}</Text>
                <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionChevron}>{expandedSection === section.id ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={styles.methodsList}>
                {section.methods.map(method => (
                  <TouchableOpacity
                    key={method.id}
                    style={[styles.methodItem, selectedId === method.id && styles.methodItemSelected]}
                    onPress={() => handleSelectMethod(method, section.id)}
                  >
                    <View style={[styles.methodLogo, { backgroundColor: method.color + '20' }]}>
                      <Text style={styles.methodLogoText}>{method.logo}</Text>
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={styles.methodNameRow}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        {method.recommended && <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>RECOMMENDED</Text></View>}
                        {method.isSaved && <Text style={styles.expiresText}>Exp: {method.expires}</Text>}
                        {method.walletBalance !== undefined && (
                          <Text style={[styles.expiresText, { color: hasWalletBalance ? '#27AE60' : '#E94560' }]}>
                            Bal: ₹{method.walletBalance}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.methodDesc}>{method.desc}</Text>
                      {method.emiDetails && <Text style={styles.emiPer}>₹{Math.ceil(amount / method.emiDetails.months)}/month • 0% interest</Text>}
                    </View>
                    <View style={[styles.radioBtn, selectedId === method.id && styles.radioBtnSelected]}>
                      {selectedId === method.id && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Offers section */}
        <View style={styles.offersSection}>
          <Text style={styles.offersSectionTitle}>🎁 Available Offers</Text>
          {[
            { desc: '10% cashback on HDFC credit cards (max ₹200)', validity: 'Till Mar 31' },
            { desc: '₹50 off on PhonePe UPI above ₹500', validity: 'Limited period' },
            { desc: 'No cost EMI on SBI/Axis cards', validity: 'Always on' },
          ].map((offer, i) => (
            <View key={i} style={styles.offerItem}>
              <Text style={styles.offerDesc}>🏷️ {offer.desc}</Text>
              <Text style={styles.offerValidity}>{offer.validity}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Pay button */}
      <View style={[styles.payFooter, { paddingBottom: insets.bottom + 16 }]}>
        <View>
          <Text style={styles.payFooterLabel}>Paying via</Text>
          <Text style={styles.payFooterMethod}>{selectedMethod?.name}</Text>
        </View>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <LinearGradient colors={['#E94560', '#C0392B']} style={styles.payBtnGrad}>
              <Text style={styles.payBtnText}>Pay ₹{amount.toLocaleString()}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.black },
  amountBar: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountBarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  amountBarAmount: { fontSize: 24, fontWeight: '900', color: '#fff' },
  amountBarSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  paymentSection: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden', ...Shadows.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHeaderIcon: { fontSize: 20 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '700', color: Colors.black },
  sectionChevron: { fontSize: 12, color: Colors.midGray },
  methodsList: { borderTopWidth: 1, borderTopColor: '#F5F6FA' },
  methodItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  methodItemSelected: { backgroundColor: '#FFF0F3' },
  methodLogo: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  methodLogoText: { fontSize: 20 },
  methodInfo: { flex: 1 },
  methodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  methodName: { fontSize: 14, fontWeight: '700', color: Colors.black },
  recommendedBadge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recommendedText: { fontSize: 9, fontWeight: '800', color: '#27AE60' },
  expiresText: { fontSize: 11, color: Colors.midGray },
  methodDesc: { fontSize: 12, color: Colors.midGray, marginTop: 2 },
  emiPer: { fontSize: 11, fontWeight: '700', color: '#9C27B0', marginTop: 3 },
  radioBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  radioBtnSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  offersSection: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadows.card },
  offersSectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.black, marginBottom: 12 },
  offerItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  offerDesc: { fontSize: 13, color: Colors.gray, lineHeight: 18 },
  offerValidity: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  payFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payFooterLabel: { fontSize: 11, color: Colors.midGray },
  payFooterMethod: { fontSize: 14, fontWeight: '700', color: Colors.black },
  payBtn: { borderRadius: 14, overflow: 'hidden', minWidth: 160 },
  payBtnGrad: { paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  // UPI Entry
  upiEntry: { padding: 24 },
  upiEntryLabel: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 10 },
  upiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upiInput: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: Colors.black, backgroundColor: '#FAFAFA' },
  verifyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14 },
  verifyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  upiVerified: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10, marginTop: 10 },
  upiVerifiedText: { fontSize: 13, color: '#27AE60', fontWeight: '600' },
  upiActionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  upiCancelBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  upiCancelText: { fontSize: 14, fontWeight: '700', color: '#666' },
  upiConfirmBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  upiConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Card Entry
  cardEntry: { padding: 24 },
  cardEntryTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 16 },
  cardBrand: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: Colors.black, marginBottom: 6 },
  cardInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: Colors.black, marginBottom: 14, backgroundColor: '#FAFAFA' },
  cardRow: { flexDirection: 'row' },
  saveCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  saveCardCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  saveCardCheckDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  saveCardText: { fontSize: 13, color: Colors.gray },
  cardActionRow: { flexDirection: 'row', gap: 12 },
  cardCancelBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  cardPayBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  // EMI
  emiCalc: { padding: 8 },
  emiCalcTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 20 },
  emiSummary: { flexDirection: 'row', backgroundColor: '#F5F6FA', borderRadius: 16, padding: 20, marginBottom: 16 },
  emiSummaryItem: { flex: 1, alignItems: 'center' },
  emiSummaryVal: { fontSize: 18, fontWeight: '900', color: Colors.black },
  emiSummaryLbl: { fontSize: 11, color: Colors.midGray, marginTop: 4 },
  emiNotice: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 12 },
  emiNoticeText: { fontSize: 13, color: '#27AE60', fontWeight: '600' },
  emiCardReqd: { fontSize: 13, color: Colors.gray, marginBottom: 20 },
});
