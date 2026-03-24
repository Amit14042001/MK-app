/**
 * Slot App — HelpScreen (full support hub)
 * FAQs, chat support, raise ticket, call center
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Linking, ActivityIndicator,
  FlatList, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const { width: W } = Dimensions.get('window');

const FAQ_CATEGORIES = [
  { id: 'booking',  label: 'Bookings',     icon: '📋' },
  { id: 'payment',  label: 'Payments',     icon: '💳' },
  { id: 'account',  label: 'My Account',   icon: '👤' },
  { id: 'professional', label: 'Professionals', icon: '👨‍🔧' },
  { id: 'safety',   label: 'Safety',       icon: '🛡️' },
  { id: 'general',  label: 'General',      icon: '❓' },
];

const FAQS = [
  { id: 'f1', q: 'How do I book a service?', a: 'Open the app → Select a service category → Choose your service → Pick date & time → Enter your address → Confirm booking. You will receive a confirmation SMS and in-app notification.', cat: 'booking' },
  { id: 'f2', q: 'Can I cancel or reschedule a booking?', a: 'Yes! Go to Bookings tab → Tap on your booking → Select "Cancel" or "Reschedule". Cancellations made more than 24 hours before the scheduled time get a full refund. Cancellations 4–24 hours before get 50% refund.', cat: 'booking' },
  { id: 'f3', q: 'What payment methods are accepted?', a: 'We accept UPI, Credit/Debit cards, Net Banking, Slot Wallet, and Cash on Service. All online payments are processed securely via Razorpay.', cat: 'payment' },
  { id: 'f4', q: 'How do I get a refund?', a: 'Refunds are credited to your Slot Wallet within 24 hours of cancellation. To refund to the original payment method, contact support within 7 days.', cat: 'payment' },
  { id: 'f5', q: 'How do I add money to my wallet?', a: 'Go to Profile → Wallet → Add Money. You can add via UPI, card, or net banking. There is no minimum top-up amount.', cat: 'payment' },
  { id: 'f6', q: 'Are the professionals verified?', a: 'Yes, all professionals undergo background checks, ID verification, and skill assessments before being listed on the platform. Look for the ✓ verified badge on professional profiles.', cat: 'professional' },
  { id: 'f7', q: 'What if the professional doesn\'t show up?', a: 'Contact us immediately via the Help section or call our helpline 1800-123-4567. We will either reschedule with another professional or issue a full refund within 2 hours.', cat: 'professional' },
  { id: 'f8', q: 'How do I change my registered phone number?', a: 'Go to Profile → Settings → Account Settings → Change Phone. You will need to verify the new number via OTP.', cat: 'account' },
  { id: 'f9', q: 'Is my address and personal data safe?', a: 'Yes. We use bank-level encryption to store your data. We never share personal information with third parties except professionals assigned to your bookings.', cat: 'safety' },
  { id: 'f10', q: 'How does the Slot Shield safety guarantee work?', a: 'Every professional is background verified. Your booking is insured up to ₹10,000 for any service damage. Simply report the issue within 48 hours with photos.', cat: 'safety' },
];

export default function HelpScreen({ navigation }) {
  const [activeCategory, setCat] = useState('all');
  const [search, setSearch]      = useState('');
  const [expandedFaq, setExpand] = useState(null);
  const [ticketModal, setTicket] = useState(false);
  const [submitting, setSubmit]  = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general' });

  const filteredFaqs = FAQS.filter(f => {
    const matchCat  = activeCategory === 'all' || f.cat === activeCategory;
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const submitTicket = async () => {
    if (!form.subject || !form.description) {
      Alert.alert('Required', 'Please fill in subject and description.'); return;
    }
    setSubmit(true);
    try {
      const { api } = require('../../utils/api');
      const { data } = await api.post('/support', {
        subject:     form.subject,
        description: form.description,
        category:    form.category,
      });
      setSubmit(false);
      setTicket(false);
      setForm({ subject: '', description: '', category: 'general' });
      Alert.alert(
        '✅ Ticket Raised!',
        `Ticket #${data.ticket?.ticketId || data.ticketId || 'TK' + Date.now().toString().slice(-6)} created.\nOur support team will respond within 2-4 hours.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      setSubmit(false);
      Alert.alert('Error', e?.response?.data?.message || 'Could not submit ticket. Please try again.');
    }
  };

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Quick Contact */}
        <View style={S.quickContact}>
          {[
            { icon: '📞', label: 'Call Us',    sub: '1800-123-4567',  action: () => Linking.openURL('tel:18001234567'), color: Colors.success },
            { icon: '💬', label: 'Live Chat',  sub: 'Avg 2 min',      action: () => Alert.alert('Chat', 'Live chat launching...'), color: Colors.info },
            { icon: '📧', label: 'Email',      sub: 'help@slotapp.in',  action: () => Linking.openURL('mailto:help@slotapp.in'), color: Colors.warning },
          ].map(item => (
            <TouchableOpacity key={item.label} style={S.contactCard} onPress={item.action}>
              <View style={[S.contactIcon, { backgroundColor: item.color + '20' }]}>
                <Text style={S.contactEmoji}>{item.icon}</Text>
              </View>
              <Text style={S.contactLabel}>{item.label}</Text>
              <Text style={S.contactSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Raise Ticket */}
        <TouchableOpacity style={S.ticketBanner} onPress={() => setTicket(true)}>
          <View style={S.ticketLeft}>
            <Text style={S.ticketIcon}>🎫</Text>
            <View>
              <Text style={S.ticketTitle}>Raise a Support Ticket</Text>
              <Text style={S.ticketSub}>Get help with bookings, payments, or account issues</Text>
            </View>
          </View>
          <Text style={S.ticketArrow}>›</Text>
        </TouchableOpacity>

        {/* FAQ Search */}
        <View style={S.searchContainer}>
          <Text style={S.faqTitle}>Frequently Asked Questions</Text>
          <View style={S.searchBar}>
            <Text>🔍 </Text>
            <TextInput
              style={S.searchInput}
              placeholder="Search FAQs..."
              placeholderTextColor={Colors.lightGray}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[{ id: 'all', label: 'All', icon: '📚' }, ...FAQ_CATEGORIES].map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[S.catChip, activeCategory === cat.id && S.catChipActive]}
              onPress={() => setCat(cat.id)}
            >
              <Text style={S.catChipIcon}>{cat.icon}</Text>
              <Text style={[S.catChipLabel, activeCategory === cat.id && S.catChipLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQs */}
        <View style={S.faqList}>
          {filteredFaqs.map(faq => (
            <TouchableOpacity key={faq.id} style={S.faqCard} onPress={() => setExpand(expandedFaq === faq.id ? null : faq.id)} activeOpacity={0.85}>
              <View style={S.faqHeader}>
                <Text style={S.faqQ} numberOfLines={expandedFaq === faq.id ? undefined : 2}>{faq.q}</Text>
                <Text style={S.faqToggle}>{expandedFaq === faq.id ? '▲' : '▼'}</Text>
              </View>
              {expandedFaq === faq.id && (
                <Text style={S.faqA}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
          {filteredFaqs.length === 0 && (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>🔍</Text>
              <Text style={S.emptyText}>No FAQs found. Try a different search.</Text>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={S.appInfo}>
          <Text style={S.appInfoTitle}>Slot App</Text>
          <Text style={S.appInfoText}>Version 2.1.0 · {new Date().getFullYear()} Slot Services Pvt Ltd</Text>
          <View style={S.linksRow}>
            {['Privacy Policy', 'Terms of Service', 'About Us'].map(link => (
              <TouchableOpacity key={link} onPress={() => navigation.navigate('About')}>
                <Text style={S.linkText}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ticket Modal */}
      <Modal visible={ticketModal} transparent animationType="slide">
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Raise Support Ticket</Text>

            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {['booking', 'payment', 'account', 'professional', 'other'].map(cat => (
                  <TouchableOpacity key={cat} style={[S.catPill, form.category === cat && S.catPillActive]} onPress={() => setForm(p => ({ ...p, category: cat }))}>
                    <Text style={[S.catPillText, form.category === cat && S.catPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Subject *</Text>
              <TextInput style={S.input} placeholder="Brief description of your issue" placeholderTextColor={Colors.lightGray} value={form.subject} onChangeText={v => setForm(p => ({ ...p, subject: v }))} maxLength={100} />
            </View>

            <View style={S.fieldRow}>
              <Text style={S.fieldLabel}>Description *</Text>
              <TextInput style={[S.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Provide details about your issue..." placeholderTextColor={Colors.lightGray} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} multiline maxLength={500} />
            </View>

            <TouchableOpacity style={[S.submitBtn, submitting && { opacity: 0.7 }]} onPress={submitTicket} disabled={submitting}>
              {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={S.submitText}>Submit Ticket</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setTicket(false)}>
              <Text style={S.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },

  quickContact:  { flexDirection: 'row', padding: 16, gap: 10 },
  contactCard:   { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 14, alignItems: 'center', ...Shadows.sm },
  contactIcon:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  contactEmoji:  { fontSize: 20 },
  contactLabel:  { ...Typography.caption, color: Colors.black, fontWeight: '700', marginBottom: 2 },
  contactSub:    { ...Typography.small, color: Colors.gray, textAlign: 'center' },

  ticketBanner:  { flexDirection: 'row', backgroundColor: Colors.primary, marginHorizontal: 16, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  ticketLeft:    { flexDirection: 'row', flex: 1, gap: 12, alignItems: 'center' },
  ticketIcon:    { fontSize: 28 },
  ticketTitle:   { ...Typography.body, color: Colors.white, fontWeight: '700' },
  ticketSub:     { ...Typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ticketArrow:   { fontSize: 24, color: Colors.white },

  searchContainer: { paddingHorizontal: 16 },
  faqTitle:        { ...Typography.h3, color: Colors.black, marginBottom: 10 },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, ...Shadows.sm },
  searchInput:     { flex: 1, ...Typography.body, color: Colors.black },

  catScroll:        { marginBottom: 12 },
  catChip:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, gap: 4, borderWidth: 1, borderColor: Colors.lightGray },
  catChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipIcon:      { fontSize: 14 },
  catChipLabel:     { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  catChipLabelActive: { color: Colors.white },

  faqList:     { paddingHorizontal: 16 },
  faqCard:     { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 8, ...Shadows.sm },
  faqHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  faqQ:        { flex: 1, ...Typography.body, color: Colors.black, fontWeight: '600', lineHeight: 22 },
  faqToggle:   { ...Typography.caption, color: Colors.primary, marginTop: 2 },
  faqA:        { ...Typography.body, color: Colors.gray, lineHeight: 22, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.offWhite },

  emptyBox:    { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:   { fontSize: 36, marginBottom: 8 },
  emptyText:   { ...Typography.body, color: Colors.gray, textAlign: 'center' },

  appInfo:     { margin: 16, padding: 16, alignItems: 'center' },
  appInfoTitle:{ ...Typography.h3, color: Colors.black, marginBottom: 4 },
  appInfoText: { ...Typography.caption, color: Colors.gray, marginBottom: 12 },
  linksRow:    { flexDirection: 'row', gap: 16 },
  linkText:    { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  overlay:     { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:       { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { ...Typography.h3, color: Colors.black, marginBottom: 16 },
  fieldRow:    { marginBottom: 14 },
  fieldLabel:  { ...Typography.caption, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  input:       { backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body, color: Colors.black, borderWidth: 1, borderColor: Colors.lightGray },
  catPill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.lightGray, marginRight: 8 },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catPillText:   { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  catPillTextActive: { color: Colors.white },
  submitBtn:   { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  submitText:  { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  cancelBtn:   { paddingVertical: 10, alignItems: 'center' },
  cancelText:  { ...Typography.body, color: Colors.gray },
});
