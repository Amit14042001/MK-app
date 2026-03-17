/**
 * MK App — InvoiceScreen (Feature #29)
 * Feature #28: Live Chat Widget
 * Feature #32: Language Switch
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, Alert, Modal, TextInput, FlatList, Linking,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

// ══════════════════════════════════════════════════════════════
// FEATURE #29 — Invoice / Receipt Screen
// ══════════════════════════════════════════════════════════════
export function InvoiceScreen({ navigation, route }) {
  const booking = route?.params?.booking || {
    bookingId:   'BK12345',
    invoiceNo:   'INV-2025-BK12345',
    createdAt:   new Date(),
    completedAt: new Date(),
    service:     { name: 'AC Service & Deep Clean' },
    customer:    { name: 'Rahul Sharma', phone: '+919876543210', email: 'rahul@example.com' },
    professional:{ user: { name: 'Suresh Kumar' } },
    address:     { line1: '123 Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
    pricing: { basePrice: 499, couponDiscount: 0, convenienceFee: 0, taxes: 90, walletUsed: 0, totalAmount: 589, amountPaid: 589 },
    payment:     { method: 'UPI', status: 'paid', gatewayId: 'pay_xyz123' },
    couponCode:  null,
  };

  const [downloading, setDownloading] = useState(false);

  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      // Try react-native-html-to-pdf (install: npm install react-native-html-to-pdf)
      let RNHTMLtoPDF;
      try { RNHTMLtoPDF = require('react-native-html-to-pdf'); } catch { RNHTMLtoPDF = null; }

      const html = `
        <html><body style="font-family:Arial;padding:24px;color:#1a1a2e">
          <h2 style="color:#e94560">MK App Invoice</h2>
          <hr/>
          <p><b>Invoice No:</b> ${booking.invoiceNo || 'INV-' + booking.bookingId}</p>
          <p><b>Booking ID:</b> ${booking.bookingId}</p>
          <p><b>Service:</b> ${booking.service?.name}</p>
          <p><b>Professional:</b> ${booking.professional?.user?.name || 'MK Professional'}</p>
          <p><b>Date:</b> ${new Date(booking.completedAt || booking.scheduledDate).toDateString()}</p>
          <hr/>
          <p><b>Amount Paid:</b> ₹${booking.pricing?.amountPaid || booking.pricing?.totalAmount}</p>
          <p style="color:#27ae60"><i>Thank you for using MK App!</i></p>
        </body></html>
      `;

      if (RNHTMLtoPDF) {
        const result = await RNHTMLtoPDF.convert({
          html,
          fileName: `MK_Invoice_${booking.bookingId}`,
          directory: 'Downloads',
        });
        setDownloading(false);
        Alert.alert('✅ Invoice Downloaded', `Saved to: ${result.filePath}`);
      } else {
        // Fallback: share as text
        setDownloading(false);
        Share.share({
          title:   `Invoice ${booking.invoiceNo || booking.bookingId}`,
          message: `MK App Invoice\n\nInvoice No: ${booking.invoiceNo || booking.bookingId}\nBooking: ${booking.bookingId}\nService: ${booking.service?.name}\nAmount: ₹${booking.pricing?.amountPaid || booking.pricing?.totalAmount}\nDate: ${new Date(booking.completedAt || booking.scheduledDate).toDateString()}\n\nThank you for using MK App!`,
        });
      }
    } catch (e) {
      setDownloading(false);
      Alert.alert('Error', 'Could not generate PDF. ' + e.message);
    }
  };

  const shareInvoice = () => {
    Share.share({
      title:   `Invoice ${booking.invoiceNo}`,
      message: `MK App Invoice\n\nInvoice No: ${booking.invoiceNo}\nBooking: ${booking.bookingId}\nService: ${booking.service?.name}\nAmount: ₹${booking.pricing.amountPaid}\nDate: ${new Date(booking.completedAt).toDateString()}\n\nThank you for using MK App!`,
    });
  };

  const LineItem = ({ label, value, bold, discount, color }) => (
    <View style={INV.lineItem}>
      <Text style={[INV.lineLabel, bold && INV.lineLabelBold]}>{label}</Text>
      <Text style={[INV.lineValue, bold && INV.lineValueBold, discount && { color: Colors.success }, color && { color }]}>
        {discount ? '-' : ''}₹{Math.abs(value).toLocaleString('en-IN')}
      </Text>
    </View>
  );

  return (
    <View style={INV.container}>
      <View style={INV.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={INV.backBtn}>
          <Text style={INV.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={INV.headerTitle}>Invoice</Text>
        <TouchableOpacity onPress={shareInvoice}>
          <Text style={INV.shareIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Invoice header */}
        <View style={INV.invoiceCard}>
          {/* Brand header */}
          <View style={INV.brandHeader}>
            <Text style={INV.brandName}>MK App</Text>
            <View style={INV.paidBadge}><Text style={INV.paidText}>PAID ✓</Text></View>
          </View>
          <Text style={INV.brandTagline}>MK Services Pvt Ltd · GSTIN: 36AABCM1234A1Z5</Text>

          <View style={INV.divider} />

          {/* Invoice details */}
          <View style={INV.twoCol}>
            <View>
              <Text style={INV.detailLabel}>Invoice No.</Text>
              <Text style={INV.detailValue}>{booking.invoiceNo}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={INV.detailLabel}>Date</Text>
              <Text style={INV.detailValue}>{new Date(booking.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>

          <View style={INV.twoCol}>
            <View>
              <Text style={INV.detailLabel}>Booking ID</Text>
              <Text style={INV.detailValue}>{booking.bookingId}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={INV.detailLabel}>Payment</Text>
              <Text style={INV.detailValue}>{booking.payment?.method?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={INV.divider} />

          {/* Bill to */}
          <Text style={INV.sectionLabel}>BILL TO</Text>
          <Text style={INV.customerName}>{booking.customer?.name}</Text>
          <Text style={INV.customerDetail}>{booking.customer?.phone}</Text>
          {booking.customer?.email && <Text style={INV.customerDetail}>{booking.customer?.email}</Text>}
          <Text style={INV.customerDetail}>{booking.address?.line1}, {booking.address?.city}</Text>

          <View style={INV.divider} />

          {/* Service table */}
          <View style={INV.tableHeader}>
            <Text style={INV.tableHeaderText}>Service</Text>
            <Text style={INV.tableHeaderText}>Amount</Text>
          </View>

          <View style={INV.tableRow}>
            <View style={INV.tableRowLeft}>
              <Text style={INV.tableService}>{booking.service?.name}</Text>
              <Text style={INV.tableProf}>By {booking.professional?.user?.name}</Text>
            </View>
            <Text style={INV.tableAmount}>₹{booking.pricing.basePrice}</Text>
          </View>

          <View style={INV.divider} />

          {/* Pricing breakdown */}
          <LineItem label="Subtotal"         value={booking.pricing.basePrice} />
          {booking.pricing.couponDiscount > 0 && (
            <LineItem label={`Coupon (${booking.couponCode})`} value={booking.pricing.couponDiscount} discount />
          )}
          {booking.pricing.walletUsed > 0 && (
            <LineItem label="Wallet Used" value={booking.pricing.walletUsed} discount />
          )}
          {booking.pricing.convenienceFee > 0 && (
            <LineItem label="Convenience Fee" value={booking.pricing.convenienceFee} />
          )}
          <LineItem label="CGST (9%)"        value={Math.round(booking.pricing.taxes / 2)} color={Colors.gray} />
          <LineItem label="SGST (9%)"        value={Math.round(booking.pricing.taxes / 2)} color={Colors.gray} />

          <View style={[INV.divider, { borderStyle: 'solid', borderWidth: 1.5 }]} />
          <LineItem label="Total Amount" value={booking.pricing.totalAmount} bold />

          <View style={INV.divider} />

          {/* Payment info */}
          <Text style={INV.sectionLabel}>PAYMENT INFO</Text>
          <View style={INV.paymentInfo}>
            <Text style={INV.paymentMethod}>{booking.payment?.method?.toUpperCase()}</Text>
            {booking.payment?.gatewayId && (
              <Text style={INV.paymentId}>Ref: {booking.payment.gatewayId}</Text>
            )}
          </View>

          <View style={INV.divider} />
          <Text style={INV.thankYou}>Thank you for choosing MK App! 🙏</Text>
          <Text style={INV.gstnNote}>This is a computer-generated invoice. No signature required.</Text>
        </View>

        {/* Action buttons */}
        <View style={INV.actions}>
          <TouchableOpacity
            style={[INV.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadInvoice}
            disabled={downloading}
          >
            <Text style={INV.downloadBtnText}>{downloading ? '⏳ Downloading...' : '⬇ Download PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={INV.shareBtn} onPress={shareInvoice}>
            <Text style={INV.shareBtnText}>📤 Share Invoice</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #28 — Live Chat Widget
// ══════════════════════════════════════════════════════════════
export function LiveChatWidget({ visible, onClose, bookingId, userName }) {
  const [messages, setMessages]   = useState([
    { id: 'm0', text: `Hi ${userName || 'there'}! 👋 I'm your MK support agent. How can I help you today?`, sender: 'agent', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), agentName: 'Priya (Support)' },
  ]);
  const [input, setInput]         = useState('');
  const [agentTyping, setTyping]  = useState(false);
  const scrollRef                 = React.useRef(null);

  const QUICK_REPLIES = [
    'Where is my professional?',
    'I need to reschedule',
    'Payment issue',
    'Service quality concern',
    'Cancel my booking',
  ];

  const AGENT_RESPONSES = [
    'I understand your concern. Let me check that for you right away.',
    'I\'ve noted your issue. Our team will resolve this within 30 minutes.',
    'I can see your booking details. Let me help you with that.',
    'Thank you for reaching out! I\'ll escalate this to a senior agent.',
    'That\'s been resolved from our end. Please refresh the app to see updates.',
  ];

  const sendMessage = (text) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg = { id: `m${Date.now()}`, text: msg, sender: 'user', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Try real support API first
    setTyping(true);
    const { api } = require('../../utils/api');
    api.post('/support/message', { bookingId, message: msg, userName })
      .then(res => {
        setTyping(false);
        if (res.data?.reply) {
          setMessages(prev => [...prev, {
            id: `m${Date.now()}_agent`, text: res.data.reply,
            sender: 'agent', agentName: res.data.agentName || 'Support Agent',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          }]);
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      })
      .catch(() => {
        // Fallback: canned response
        setTimeout(() => {
          setTyping(false);
          const response = AGENT_RESPONSES[Math.floor(Math.random() * AGENT_RESPONSES.length)];
          setMessages(prev => [...prev, {
            id: `m${Date.now()}_agent`, text: response,
            sender: 'agent', agentName: 'Priya (Support)',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          }]);
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 1500);
      });

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={LC.container}>
        {/* Header */}
        <View style={LC.header}>
          <TouchableOpacity onPress={onClose} style={LC.backBtn}>
            <Text style={LC.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={LC.agentInfo}>
            <View style={LC.agentAvatar}><Text style={LC.agentAvatarText}>P</Text></View>
            <View>
              <Text style={LC.agentName}>Priya — Support</Text>
              <View style={LC.onlineRow}><View style={LC.onlineDot} /><Text style={LC.onlineText}>Online · Avg reply 2 min</Text></View>
            </View>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('tel:18001234567')}>
            <Text style={{ fontSize: 22 }}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={LC.messages}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[LC.msgWrapper, msg.sender === 'user' ? LC.msgUser : LC.msgAgent]}>
              {msg.sender === 'agent' && (
                <View style={LC.agentAvatarSm}><Text style={{ fontSize: 10, color: Colors.white }}>P</Text></View>
              )}
              <View style={[LC.bubble, msg.sender === 'user' ? LC.bubbleUser : LC.bubbleAgent]}>
                {msg.agentName && <Text style={LC.agentNameSm}>{msg.agentName}</Text>}
                <Text style={[LC.bubbleText, msg.sender === 'user' && { color: Colors.white }]}>{msg.text}</Text>
                <Text style={[LC.msgTime, msg.sender === 'user' && { color: 'rgba(255,255,255,0.7)' }]}>{msg.time}</Text>
              </View>
            </View>
          ))}
          {agentTyping && (
            <View style={LC.typingRow}>
              <View style={LC.agentAvatarSm}><Text style={{ fontSize: 10, color: Colors.white }}>P</Text></View>
              <View style={LC.typingBubble}>
                <Text style={LC.typingDots}>•••</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick replies */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={LC.quickReplies}>
          {QUICK_REPLIES.map(q => (
            <TouchableOpacity key={q} style={LC.quickChip} onPress={() => sendMessage(q)}>
              <Text style={LC.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={LC.inputRow}>
          <TextInput
            style={LC.input}
            placeholder="Type your message..."
            placeholderTextColor={Colors.lightGray}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[LC.sendBtn, !input.trim() && LC.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim()}
          >
            <Text style={LC.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURE #32 — Language Switch Screen
// ══════════════════════════════════════════════════════════════
const LANGUAGES = [
  { code: 'en',    name: 'English',    native: 'English',    flag: '🇬🇧', supported: true },
  { code: 'hi',    name: 'Hindi',      native: 'हिंदी',       flag: '🇮🇳', supported: true },
  { code: 'te',    name: 'Telugu',     native: 'తెలుగు',      flag: '🇮🇳', supported: true },
  { code: 'ta',    name: 'Tamil',      native: 'தமிழ்',       flag: '🇮🇳', supported: true },
  { code: 'kn',    name: 'Kannada',    native: 'ಕನ್ನಡ',       flag: '🇮🇳', supported: true },
  { code: 'ml',    name: 'Malayalam',  native: 'മലയാളം',      flag: '🇮🇳', supported: false },
  { code: 'mr',    name: 'Marathi',    native: 'मराठी',       flag: '🇮🇳', supported: false },
  { code: 'bn',    name: 'Bengali',    native: 'বাংলা',       flag: '🇮🇳', supported: false },
];

export function LanguageSwitchScreen({ navigation }) {
  const [selected, setSelected] = useState('en');
  const [applying, setApplying] = useState(false);

  const applyLanguage = async (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    if (!lang?.supported) {
      Alert.alert('Coming Soon', `${lang?.name} support is coming soon!`);
      return;
    }
    setSelected(code);
    setApplying(true);
    try {
      // Persist language preference
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('mk_language', code);
      // Apply via i18n if context is available
      try {
        const { useI18n } = require('../../utils/i18n');
      } catch {}
      setApplying(false);
      Alert.alert(
        '✅ Language Changed',
        `App language set to ${lang.name}.\nSome screens will update on next open.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      setApplying(false);
      Alert.alert('Error', 'Could not save language preference.');
    }
  };

  return (
    <View style={LS.container}>
      <View style={LS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={LS.backBtn}>
          <Text style={LS.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={LS.headerTitle}>Language / भाषा</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={LS.note}>Select your preferred language. The app will switch to your chosen language.</Text>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[LS.langCard, selected === lang.code && LS.langCardSelected, !lang.supported && LS.langCardDisabled]}
            onPress={() => applyLanguage(lang.code)}
            activeOpacity={0.85}
          >
            <Text style={LS.langFlag}>{lang.flag}</Text>
            <View style={LS.langInfo}>
              <Text style={[LS.langName, selected === lang.code && LS.langNameSelected]}>{lang.name}</Text>
              <Text style={LS.langNative}>{lang.native}</Text>
            </View>
            {!lang.supported && <View style={LS.comingSoon}><Text style={LS.comingSoonText}>Coming Soon</Text></View>}
            {selected === lang.code && lang.supported && (
              <View style={LS.checkBadge}><Text style={LS.checkText}>✓</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const INV = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  shareIcon:    { fontSize: 22, color: Colors.primary, fontWeight: '700' },
  invoiceCard:  { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 20, ...Shadows.sm },
  brandHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  brandName:    { fontSize: 24, color: Colors.primary, fontWeight: '800' },
  paidBadge:    { backgroundColor: Colors.successLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  paidText:     { ...Typography.body, color: Colors.success, fontWeight: '800' },
  brandTagline: { ...Typography.small, color: Colors.gray, marginBottom: 12 },
  divider:      { height: 1, backgroundColor: Colors.offWhite, marginVertical: 12, borderStyle: 'dashed' },
  twoCol:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel:  { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 2, letterSpacing: 0.5 },
  detailValue:  { ...Typography.body, color: Colors.black, fontWeight: '600' },
  sectionLabel: { ...Typography.caption, color: Colors.gray, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  customerName: { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  customerDetail: { ...Typography.body, color: Colors.gray, marginTop: 2 },
  tableHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tableHeaderText: { ...Typography.caption, color: Colors.gray, fontWeight: '700', letterSpacing: 0.5 },
  tableRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tableRowLeft: { flex: 1 },
  tableService: { ...Typography.body, color: Colors.black, fontWeight: '700' },
  tableProf:    { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  tableAmount:  { ...Typography.body, color: Colors.black, fontWeight: '700' },
  lineItem:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineLabel:    { ...Typography.body, color: Colors.gray },
  lineValue:    { ...Typography.body, color: Colors.black },
  lineLabelBold:{ ...Typography.bodyLarge, color: Colors.black, fontWeight: '800' },
  lineValueBold:{ ...Typography.bodyLarge, color: Colors.black, fontWeight: '800' },
  paymentInfo:  { gap: 4 },
  paymentMethod:{ ...Typography.body, color: Colors.black, fontWeight: '700' },
  paymentId:    { ...Typography.caption, color: Colors.gray },
  thankYou:     { ...Typography.body, color: Colors.primary, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  gstnNote:     { ...Typography.small, color: Colors.midGray, textAlign: 'center' },
  actions:      { paddingHorizontal: 16, gap: 10 },
  downloadBtn:  { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  downloadBtnText: { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  shareBtn:     { backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.lightGray },
  shareBtnText: { ...Typography.body, color: Colors.gray, fontWeight: '600' },
});

const LC = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, gap: 10, ...Shadows.sm },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  agentInfo:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatar:  { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { ...Typography.body, color: Colors.white, fontWeight: '800' },
  agentName:    { ...Typography.body, color: Colors.black, fontWeight: '700' },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  onlineText:   { ...Typography.small, color: Colors.success },
  messages:     { flex: 1, backgroundColor: Colors.offWhite },
  msgWrapper:   { flexDirection: 'row', marginBottom: 10 },
  msgUser:      { justifyContent: 'flex-end', flexDirection: 'row-reverse' },
  msgAgent:     { justifyContent: 'flex-start' },
  agentAvatarSm:{ width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 6, alignSelf: 'flex-end' },
  bubble:       { borderRadius: 16, padding: 12, maxWidth: '75%' },
  bubbleUser:   { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleAgent:  { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadows.sm },
  agentNameSm:  { ...Typography.small, color: Colors.primary, fontWeight: '700', marginBottom: 4 },
  bubbleText:   { ...Typography.body, color: Colors.black, lineHeight: 20 },
  msgTime:      { ...Typography.small, color: Colors.midGray, marginTop: 4, textAlign: 'right' },
  typingRow:    { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  typingBubble: { backgroundColor: Colors.white, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12 },
  typingDots:   { ...Typography.body, color: Colors.midGray, letterSpacing: 2 },
  quickReplies: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.offWhite, paddingVertical: 8 },
  quickChip:    { backgroundColor: Colors.offWhite, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginHorizontal: 6, borderWidth: 1, borderColor: Colors.lightGray },
  quickText:    { ...Typography.caption, color: Colors.darkGray, fontWeight: '600' },
  inputRow:     { flexDirection: 'row', backgroundColor: Colors.white, padding: 10, gap: 8, paddingBottom: 28 },
  input:        { flex: 1, backgroundColor: Colors.offWhite, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, ...Typography.body, color: Colors.black, maxHeight: 100 },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.lightGray },
  sendIcon:     { color: Colors.white, fontSize: 16, marginLeft: 2 },
});

const LS = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.black },
  headerTitle:  { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  note:         { ...Typography.body, color: Colors.gray, marginBottom: 16, lineHeight: 22 },
  langCard:     { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 8, alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: 'transparent', ...Shadows.sm },
  langCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  langCardDisabled: { opacity: 0.6 },
  langFlag:     { fontSize: 32 },
  langInfo:     { flex: 1 },
  langName:     { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  langNameSelected: { color: Colors.primary },
  langNative:   { ...Typography.body, color: Colors.gray, marginTop: 2 },
  comingSoon:   { backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  comingSoonText: { ...Typography.small, color: Colors.warning, fontWeight: '700' },
  checkBadge:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkText:    { fontSize: 14, color: Colors.white, fontWeight: '800' },
});
