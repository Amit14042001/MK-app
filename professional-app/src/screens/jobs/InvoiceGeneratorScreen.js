/**
 * MK App Professional — Invoice Generator Screen (Full)
 * Create itemized invoice, add extra charges, get customer digital signature
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal, Dimensions, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

export default function InvoiceGeneratorScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    bookingId = 'BK00123456', customerName = 'Ravi Kumar',
    serviceName = 'AC Service & Repair', basePrice = 599, address = '123, Banjara Hills, Hyderabad',
  } = route?.params || {};

  const [lineItems, setLineItems] = useState([
    { id: '1', description: serviceName, qty: 1, rate: basePrice, isBase: true },
  ]);
  const [addItemModal, setAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ description: '', qty: 1, rate: '' });
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [customerSigned, setCustomerSigned] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitted, setSubmitted] = useState(false);

  const COMMON_EXTRAS = [
    { label: 'Gas refill (R-22, per kg)', rate: 800 },
    { label: 'Gas refill (R-32, per kg)', rate: 1000 },
    { label: 'Capacitor replacement', rate: 350 },
    { label: 'Thermostat replacement', rate: 450 },
    { label: 'PCB repair', rate: 800 },
    { label: 'Additional cleaning', rate: 200 },
    { label: 'Parts (as applicable)', rate: 0 },
    { label: 'Emergency/after-hours charge', rate: 200 },
    { label: 'Travel charge (extra distance)', rate: 100 },
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * (parseFloat(item.rate) || 0), 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const platformFee = Math.round(total * 0.15);
  const proEarning = total - platformFee;

  const addLineItem = () => {
    if (!newItem.description || !newItem.rate) {
      Alert.alert('Missing Info', 'Please fill in description and rate.');
      return;
    }
    setLineItems(prev => [
      ...prev,
      { id: String(Date.now()), description: newItem.description, qty: parseInt(newItem.qty) || 1, rate: parseFloat(newItem.rate) || 0 },
    ]);
    setNewItem({ description: '', qty: 1, rate: '' });
    setAddItemModal(false);
  };

  const removeItem = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id || item.isBase));
  };

  const handleSubmitInvoice = () => {
    if (!customerSigned) {
      Alert.alert('Signature Required', 'Please get the customer\'s digital signature before submitting the invoice.');
      return;
    }
    Alert.alert(
      'Submit Invoice?',
      `Total: ₹${total.toLocaleString()}\nPayment: ${paymentMethod.toUpperCase()}\n\nThis will finalize the job and release payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit', onPress: () => {
            setSubmitted(true);
            setTimeout(() => {
              navigation.navigate('ProDashboard');
              Alert.alert('✅ Job Complete!', `Invoice submitted. ₹${proEarning.toLocaleString()} will be credited to your wallet within 24 hours.`);
            }, 1000);
          }
        },
      ]
    );
  };

  if (submitted) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>✅</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A2E' }}>Invoice Submitted!</Text>
        <Text style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Job #{bookingId.slice(-8).toUpperCase()} completed</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Invoice</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Invoice header card */}
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceHeaderRow}>
            <View>
              <Text style={styles.invoiceTitle}>SERVICE INVOICE</Text>
              <Text style={styles.invoiceId}>#{bookingId.slice(-8).toUpperCase()}</Text>
              <Text style={styles.invoiceDate}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
            <View style={styles.mkLogo}><Text style={styles.mkLogoText}>MK</Text></View>
          </View>
          <View style={styles.invoiceMeta}>
            <View style={styles.invoiceMetaCol}>
              <Text style={styles.invoiceMetaLabel}>BILLED TO</Text>
              <Text style={styles.invoiceMetaValue}>{customerName}</Text>
              <Text style={styles.invoiceMetaSubValue}>{address}</Text>
            </View>
            <View style={styles.invoiceMetaCol}>
              <Text style={styles.invoiceMetaLabel}>PAYMENT DUE</Text>
              <Text style={[styles.invoiceMetaValue, { color: '#E94560' }]}>TODAY</Text>
              <Text style={styles.invoiceMetaSubValue}>Upon completion</Text>
            </View>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Service Items</Text>
            <TouchableOpacity style={styles.addItemBtn} onPress={() => setAddItemModal(true)}>
              <Text style={styles.addItemBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.lineItemsTable}>
            <View style={styles.lineItemHeader}>
              <Text style={[styles.lineItemCol, { flex: 3 }]}>Description</Text>
              <Text style={styles.lineItemCol}>Qty</Text>
              <Text style={styles.lineItemCol}>Rate</Text>
              <Text style={styles.lineItemCol}>Amount</Text>
              <View style={{ width: 24 }} />
            </View>
            {lineItems.map(item => (
              <View key={item.id} style={styles.lineItem}>
                <Text style={[styles.lineItemText, { flex: 3 }]}>{item.description}</Text>
                <Text style={styles.lineItemText}>{item.qty}</Text>
                <Text style={styles.lineItemText}>₹{item.rate}</Text>
                <Text style={[styles.lineItemText, { fontWeight: '700' }]}>₹{(item.qty * (parseFloat(item.rate) || 0)).toLocaleString()}</Text>
                {!item.isBase ? (
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={{ width: 24 }}>
                    <Text style={{ color: '#E94560', fontSize: 16, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                ) : <View style={{ width: 24 }} />}
              </View>
            ))}
          </View>
        </View>

        {/* Quick add extras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Extras</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {COMMON_EXTRAS.map((extra, i) => (
              <TouchableOpacity
                key={i}
                style={styles.extraChip}
                onPress={() => {
                  if (extra.rate === 0) {
                    setNewItem({ description: extra.label, qty: 1, rate: '' });
                    setAddItemModal(true);
                  } else {
                    setLineItems(prev => [...prev, { id: String(Date.now() + i), description: extra.label, qty: 1, rate: extra.rate }]);
                  }
                }}
              >
                <Text style={styles.extraChipText}>{extra.label}</Text>
                {extra.rate > 0 && <Text style={styles.extraChipRate}>₹{extra.rate}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          {[['Subtotal', subtotal], ['GST (18%)', gst]].map(([label, value], i) => (
            <View key={i} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{label}</Text>
              <Text style={styles.totalValue}>₹{value.toLocaleString()}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>₹{total.toLocaleString()}</Text>
          </View>
          <View style={styles.earningsPreview}>
            <Text style={styles.earningsPreviewText}>Your earnings after platform fee (15%): <Text style={styles.earningsAmount}>₹{proEarning.toLocaleString()}</Text></Text>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            {[
              { key: 'cash', label: '💵 Cash', desc: 'Collect from customer' },
              { key: 'upi', label: '📱 UPI', desc: 'Customer pays via UPI' },
              { key: 'wallet', label: '💳 Wallet', desc: 'Deducted from app wallet' },
              { key: 'card', label: '💳 Card', desc: 'Customer pays by card' },
            ].map(method => (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentOption, paymentMethod === method.key && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Text style={styles.paymentOptionLabel}>{method.label}</Text>
                <Text style={styles.paymentOptionDesc}>{method.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={invoiceNotes}
            onChangeText={setInvoiceNotes}
            placeholder="Add any notes, observations or recommendations for customer..."
            placeholderTextColor="#AAA"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Customer Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Customer Signature</Text>
          <Text style={styles.signatureDesc}>Get the customer's digital signature to confirm they are satisfied with the service.</Text>
          {customerSigned ? (
            <View style={styles.signedBadge}>
              <Text style={styles.signedBadgeText}>✅ Customer has signed — {customerName}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.signatureBtn} onPress={() => setShowSignatureModal(true)}>
              <Text style={styles.signatureBtnText}>✍️  Get Customer Signature</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Submit footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalAmount}>₹{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, !customerSigned && styles.submitBtnDisabled]}
          onPress={handleSubmitInvoice}
        >
          <Text style={styles.submitBtnText}>Submit Invoice ✓</Text>
        </TouchableOpacity>
      </View>

      {/* Add Item Modal */}
      <Modal visible={addItemModal} transparent animationType="slide" onRequestClose={() => setAddItemModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Line Item</Text>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={styles.fieldInput} value={newItem.description} onChangeText={t => setNewItem(prev => ({ ...prev, description: t }))} placeholder="e.g. Gas refill R-22" />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput style={styles.fieldInput} value={String(newItem.qty)} onChangeText={t => setNewItem(prev => ({ ...prev, qty: t }))} keyboardType="numeric" />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Rate (₹)</Text>
                <TextInput style={styles.fieldInput} value={String(newItem.rate)} onChangeText={t => setNewItem(prev => ({ ...prev, rate: t }))} keyboardType="numeric" placeholder="0" />
              </View>
            </View>
            {newItem.description && newItem.rate > 0 && (
              <Text style={styles.itemPreview}>Amount: ₹{((parseInt(newItem.qty) || 1) * (parseFloat(newItem.rate) || 0)).toLocaleString()}</Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddItemModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAddBtn} onPress={addLineItem}>
                <Text style={styles.modalAddText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal visible={showSignatureModal} transparent animationType="slide" onRequestClose={() => setShowSignatureModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Customer Signature</Text>
            <Text style={styles.signatureInstr}>Ask {customerName} to sign below to confirm service completion</Text>
            <View style={styles.signaturePad}>
              <Text style={styles.signaturePadText}>Touch here to sign →</Text>
              <Text style={styles.signaturePadNote}>(Signature pad — uses react-native-signature-canvas in production)</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSignatureModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAddBtn} onPress={() => { setCustomerSigned(true); setShowSignatureModal(false); }}>
                <Text style={styles.modalAddText}>Confirm Signature</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 15, fontWeight: '600', color: '#E94560' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  invoiceHeader: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  invoiceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  invoiceTitle: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 2 },
  invoiceId: { fontSize: 18, fontWeight: '900', color: '#1A1A2E', marginTop: 4 },
  invoiceDate: { fontSize: 12, color: '#888', marginTop: 2 },
  mkLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  mkLogoText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  invoiceMeta: { flexDirection: 'row', gap: 20 },
  invoiceMetaCol: { flex: 1 },
  invoiceMetaLabel: { fontSize: 10, fontWeight: '800', color: '#AAA', letterSpacing: 1, marginBottom: 4 },
  invoiceMetaValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  invoiceMetaSubValue: { fontSize: 11, color: '#888', marginTop: 2, lineHeight: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  addItemBtn: { backgroundColor: '#FFF0F3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: '#E94560' },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: '#E94560' },
  lineItemsTable: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  lineItemHeader: { flexDirection: 'row', backgroundColor: '#F5F6FA', paddingHorizontal: 12, paddingVertical: 8 },
  lineItemCol: { flex: 1, fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F5F6FA' },
  lineItemText: { flex: 1, fontSize: 12, color: '#444' },
  extraChip: { backgroundColor: '#F5F6FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  extraChipText: { fontSize: 12, fontWeight: '600', color: '#444' },
  extraChipRate: { fontSize: 10, color: '#4CAF50', fontWeight: '700', marginTop: 2 },
  totalsSection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  totalLabel: { fontSize: 13, color: '#666' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  grandTotalRow: { borderBottomWidth: 0, paddingTop: 12, marginTop: 4 },
  grandTotalLabel: { fontSize: 16, fontWeight: '900', color: '#1A1A2E' },
  grandTotalValue: { fontSize: 22, fontWeight: '900', color: '#E94560' },
  earningsPreview: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginTop: 12 },
  earningsPreviewText: { fontSize: 12, color: '#444' },
  earningsAmount: { fontWeight: '800', color: '#27AE60' },
  paymentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentOption: { width: (W - 68) / 2, backgroundColor: '#F5F6FA', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0E0E0' },
  paymentOptionSelected: { backgroundColor: '#FFF0F3', borderColor: '#E94560' },
  paymentOptionLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  paymentOptionDesc: { fontSize: 11, color: '#888', marginTop: 4 },
  notesInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 13, color: '#1A1A2E', minHeight: 80, textAlignVertical: 'top', backgroundColor: '#FAFAFA' },
  signatureSection: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  signatureDesc: { fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 18 },
  signedBadge: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, alignItems: 'center' },
  signedBadgeText: { fontSize: 14, fontWeight: '700', color: '#27AE60' },
  signatureBtn: { backgroundColor: '#1A1A2E', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  signatureBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  footerTotal: {},
  footerTotalLabel: { fontSize: 11, color: '#888' },
  footerTotalAmount: { fontSize: 20, fontWeight: '900', color: '#1A1A2E' },
  submitBtn: { flex: 1, backgroundColor: '#27AE60', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#C8CAD0' },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1A1A2E', marginBottom: 12, backgroundColor: '#FAFAFA' },
  fieldRow: { flexDirection: 'row' },
  itemPreview: { fontSize: 14, fontWeight: '700', color: '#27AE60', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#666' },
  modalAddBtn: { flex: 2, backgroundColor: '#1A1A2E', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalAddText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  signatureInstr: { fontSize: 13, color: '#666', marginBottom: 16 },
  signaturePad: { height: 150, backgroundColor: '#F5F6FA', borderRadius: 14, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  signaturePadText: { fontSize: 15, color: '#888' },
  signaturePadNote: { fontSize: 10, color: '#BBB', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
});
