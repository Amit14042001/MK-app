/**
 * Slot Professional App — Support Screen
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, StatusBar, Linking, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors, Shadows } from '../../utils/theme';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const FAQS = [
  { q: 'When do I get paid?', a: 'Payouts are processed every Monday for the previous week\'s completed bookings. Funds arrive in your bank within 1-2 business days.' },
  { q: 'How is my commission calculated?', a: 'Slot takes 20% of the booking amount. You receive 80%. Example: For a ₹500 booking, you earn ₹400.' },
  { q: 'What if a customer cancels?', a: 'If a customer cancels after you\'ve been assigned, you\'ll receive a ₹50 cancellation fee. If cancelled more than 2 hours before, no fee is charged.' },
  { q: 'How do I update my service areas?', a: 'Go to Profile → Edit Profile → Working Areas to update the pincodes you serve.' },
  { q: 'What if I can\'t complete a job?', a: 'Mark the booking as "Unable to complete" in the app. Contact support immediately at 1800-XXX-XXXX.' },
  { q: 'How do I improve my rating?', a: 'Arrive on time, be courteous, do quality work, and ask customers to rate you. Ratings above 4.5 get priority booking assignments.' },
  { q: 'Can I reject a booking?', a: 'You can decline a booking once it\'s assigned if you have a genuine reason. Multiple rejections may affect your priority ranking.' },
  { q: 'How does the background check work?', a: 'We verify your Aadhaar, conduct a police verification, and do reference checks. This usually takes 2-3 business days.' },
];

export default function SupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab]         = useState('faq');
  const [expanded, setExpanded] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required', 'Please fill in both subject and message.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/ticket`, { subject, message, type: 'professional' });
      Alert.alert('✅ Submitted', 'Your ticket has been submitted. Our team will respond within 4 hours.');
      setSubject('');
      setMessage('');
    } catch {
      Alert.alert('Error', 'Failed to submit. Please call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFAQs = FAQS.filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS = [
    { key: 'faq',     label: 'FAQ',    icon: '❓' },
    { key: 'ticket',  label: 'Ticket', icon: '📩' },
    { key: 'contact', label: 'Contact',icon: '📞' },
  ];

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[S.tab, tab === t.key && S.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={S.tabIcon}>{t.icon}</Text>
            <Text style={[S.tabLabel, tab === t.key && S.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQ Tab */}
      {tab === 'faq' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <TextInput
            style={S.searchBox}
            placeholder="Search FAQs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#aaa"
          />
          {filteredFAQs.map((faq, i) => (
            <TouchableOpacity key={i} style={S.faqCard} onPress={() => setExpanded(expanded === i ? null : i)} activeOpacity={0.8}>
              <View style={S.faqHeader}>
                <Text style={S.faqQ} numberOfLines={expanded === i ? 99 : 1}>{faq.q}</Text>
                <Text style={[S.faqChevron, expanded === i && S.faqChevronOpen]}>{expanded === i ? '▲' : '▼'}</Text>
              </View>
              {expanded === i && <Text style={S.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
          {filteredFAQs.length === 0 && (
            <View style={S.empty}>
              <Text style={S.emptyText}>No FAQs match your search.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Ticket Tab */}
      {tab === 'ticket' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={S.formLabel}>Subject</Text>
          <TextInput
            style={S.input}
            placeholder="Briefly describe your issue"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor="#aaa"
          />
          <Text style={S.formLabel}>Message</Text>
          <TextInput
            style={[S.input, S.textArea]}
            placeholder="Describe your issue in detail..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={[S.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitTicket} disabled={submitting}>
            <Text style={S.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Ticket 📩'}</Text>
          </TouchableOpacity>
          <View style={S.ticketInfo}>
            <Text style={S.ticketInfoText}>⏱ Expected response time: 4 hours on weekdays, 8 hours on weekends</Text>
          </View>
        </ScrollView>
      )}

      {/* Contact Tab */}
      {tab === 'contact' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {[
            { icon: '📞', label: 'Call Support (Toll-Free)', value: '1800-XXX-XXXX', action: () => Linking.openURL('tel:18001234567'), badge: '24/7' },
            { icon: '💬', label: 'WhatsApp Support', value: '+91 98765 43210', action: () => Linking.openURL('https://wa.me/919876543210'), badge: '9AM-9PM' },
            { icon: '📧', label: 'Email Support', value: 'pro.support@slotapp.in', action: () => Linking.openURL('mailto:pro.support@slotapp.in'), badge: null },
            { icon: '💻', label: 'Online Help Center', value: 'help.slotapp.in', action: () => Linking.openURL('https://help.slotapp.in'), badge: null },
          ].map((c, i) => (
            <TouchableOpacity key={i} style={S.contactCard} onPress={c.action} activeOpacity={0.8}>
              <Text style={S.contactIcon}>{c.icon}</Text>
              <View style={S.contactInfo}>
                <View style={S.contactRow}>
                  <Text style={S.contactLabel}>{c.label}</Text>
                  {c.badge && <View style={S.badge}><Text style={S.badgeText}>{c.badge}</Text></View>}
                </View>
                <Text style={S.contactValue}>{c.value}</Text>
              </View>
              <Text style={S.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={S.officeCard}>
            <Text style={S.officeTitle}>🏢 Slot Services HQ</Text>
            <Text style={S.officeAddr}>Plot 42, HITEC City, Hyderabad — 500081{'\n'}Telangana, India</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#1A1A2E' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  tabs:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: Colors.primary || '#f15c22' },
  tabIcon:      { fontSize: 18, marginBottom: 2 },
  tabLabel:     { fontSize: 12, color: '#999', fontWeight: '500' },
  tabLabelActive: { color: Colors.primary || '#f15c22', fontWeight: '700' },
  searchBox:    { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F5' },
  faqCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, ...Shadows.sm },
  faqHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  faqQ:         { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginRight: 12 },
  faqChevron:   { fontSize: 12, color: '#999' },
  faqChevronOpen: { color: Colors.primary || '#f15c22' },
  faqA:         { fontSize: 13, color: '#555', lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  empty:        { alignItems: 'center', paddingVertical: 40 },
  emptyText:    { fontSize: 14, color: '#999' },
  formLabel:    { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 6, marginTop: 12 },
  input:        { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', borderWidth: 1, borderColor: '#F0F0F5' },
  textArea:     { height: 120, paddingTop: 12 },
  submitBtn:    { backgroundColor: Colors.primary || '#f15c22', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20, ...Shadows.md },
  submitBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },
  ticketInfo:   { backgroundColor: '#FFF8F6', borderRadius: 10, padding: 14, marginTop: 12 },
  ticketInfoText: { fontSize: 13, color: '#666', lineHeight: 18 },
  contactCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, ...Shadows.sm },
  contactIcon:  { fontSize: 28, marginRight: 16 },
  contactInfo:  { flex: 1 },
  contactRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  badge:        { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:    { fontSize: 11, color: '#22c55e', fontWeight: '700' },
  contactValue: { fontSize: 13, color: Colors.primary || '#f15c22', marginTop: 2 },
  chevron:      { fontSize: 20, color: '#CCC' },
  officeCard:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12, ...Shadows.sm },
  officeTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  officeAddr:   { fontSize: 13, color: '#666', lineHeight: 20 },
});
