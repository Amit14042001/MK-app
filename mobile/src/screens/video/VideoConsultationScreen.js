/**
 * Slot App — VideoConsultationScreen
 * ₹99 for a 5-minute video diagnosis call with a specialist.
 * ₹99 is credited back if customer books the full service.
 * Agora already integrated — extend to one-way consultation.
 * Unlocks remote markets, reduces no-show rate, filters intent.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

const CONSULT_FEE = 99;

const SPECIALISTS = [
  { id: 'ac',        name: 'AC & Appliance Specialist', icon: '❄️', expertise: ['AC not cooling', 'Strange noise', 'Water leaking', 'Not starting'], avgWait: '< 5 min', available: true  },
  { id: 'plumbing',  name: 'Plumbing Specialist',       icon: '🔧', expertise: ['Water leak', 'Blocked drain', 'Low pressure', 'Geyser issue'],   avgWait: '< 8 min', available: true  },
  { id: 'electrical',name: 'Electrical Specialist',     icon: '⚡', expertise: ['Lights flickering', 'MCB tripping', 'No power', 'Short circuit'], avgWait: '< 10 min', available: true },
  { id: 'cleaning',  name: 'Cleaning Specialist',       icon: '🧹', expertise: ['Deep clean quote', 'Stain removal', 'Post-renovation', 'Move out'], avgWait: '< 3 min', available: true },
  { id: 'pest',      name: 'Pest Control Expert',       icon: '🪲', expertise: ['Cockroaches', 'Termites', 'Rats', 'Bedbugs'],                      avgWait: '< 5 min', available: false },
];

export default function VideoConsultationScreen({ navigation }) {
  const insets  = useSafeAreaInsets();
  const [selected,  setSelected]  = useState(null);
  const [booking,   setBooking]   = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    try {
      // Create Razorpay order for ₹99
      const orderRes = await api.post('/payments/create-order', {
        amount:   CONSULT_FEE,
        purpose:  'video_consultation',
        metadata: { specialistId: selected.id },
      });
      const { orderId, currency } = orderRes.data;

      const RazorpayCheckout = require('react-native-razorpay').default;
      const paymentData = await RazorpayCheckout.open({
        description:  `${selected.name} — 5 min consultation`,
        image:        'https://slotapp.in/logo.png',
        currency:     currency || 'INR',
        key:          process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx',
        amount:       CONSULT_FEE * 100,
        name:         'Slot Video Consult',
        order_id:     orderId,
        theme:        { color: Colors.primary },
        prefill:      { contact: '', email: '' },
      });

      // Verify and create consultation booking
      const verifyRes = await api.post('/video-calls/consultation', {
        specialistId:      selected.id,
        razorpayOrderId:   paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
        amount:            CONSULT_FEE,
      });

      if (verifyRes.data.success) {
        setConfirmed({ ...selected, consultId: verifyRes.data.consultId, callData: verifyRes.data.callData });
      }
    } catch (e) {
      if (e?.code !== 0) {
        Alert.alert('Error', e?.description || 'Could not book consultation. Please try again.');
      }
    }
    setBooking(false);
  };

  const joinCall = () => {
    if (!confirmed?.callData) return;
    navigation.navigate('VideoCall', {
      bookingId:   confirmed.consultId,
      channelName: confirmed.callData.channelName,
      token:       confirmed.callData.callerToken,
      uid:         confirmed.callData.callerUid,
      isConsult:   true,
    });
  };

  if (confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: insets.top + 24 }}>
        <View style={S.confirmedCard}>
          <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 12 }}>📹</Text>
          <Text style={S.confirmedTitle}>Consultation Booked!</Text>
          <Text style={S.confirmedSub}>Your {confirmed.name} is ready</Text>
          <View style={S.confirmedDetails}>
            <Text style={S.confirmedLine}>💬 5-minute video call</Text>
            <Text style={S.confirmedLine}>💳 ₹{CONSULT_FEE} paid</Text>
            <Text style={S.confirmedLine}>🎁 ₹{CONSULT_FEE} credited if you book</Text>
          </View>
          <TouchableOpacity style={S.joinBtn} onPress={joinCall}>
            <Text style={S.joinBtnText}>📹 Join Consultation Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.laterBtn} onPress={() => navigation.goBack()}>
            <Text style={S.laterBtnText}>Join Later from Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>📹 Video Consultation</Text>
          <Text style={S.headerSub}>5-min expert call · ₹{CONSULT_FEE} · Credited if you book</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
        {/* Value prop */}
        <View style={S.valueRow}>
          {[['🎯', 'Get diagnosis', 'before spending ₹1000+'],
            ['💰', '₹99 credited', 'if you book full service'],
            ['⏱️', '5 minutes', 'with a real expert']].map(([icon, title, sub]) => (
            <View key={title} style={S.valueItem}>
              <Text style={S.valueIcon}>{icon}</Text>
              <Text style={S.valueTitle}>{title}</Text>
              <Text style={S.valueSub}>{sub}</Text>
            </View>
          ))}
        </View>

        <Text style={S.sectionTitle}>Choose a specialist</Text>

        {SPECIALISTS.map(sp => (
          <TouchableOpacity
            key={sp.id}
            style={[S.specialistCard, selected?.id === sp.id && S.specialistCardActive, !sp.available && S.specialistCardDisabled]}
            onPress={() => sp.available && setSelected(sp)}
            activeOpacity={sp.available ? 0.9 : 1}>
            <View style={S.spTop}>
              <View style={[S.spIcon, !sp.available && { opacity: 0.5 }]}>
                <Text style={{ fontSize: 28 }}>{sp.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.spName, !sp.available && { color: Colors.textLight }]}>{sp.name}</Text>
                <View style={S.spWaitRow}>
                  <View style={[S.onlineDot, { backgroundColor: sp.available ? '#1DB954' : Colors.textLight }]} />
                  <Text style={[S.spWait, { color: sp.available ? '#1DB954' : Colors.textLight }]}>
                    {sp.available ? `Online · ${sp.avgWait}` : 'Offline'}
                  </Text>
                </View>
              </View>
              <View style={[S.radio, selected?.id === sp.id && S.radioActive]}>
                {selected?.id === sp.id && <View style={S.radioDot} />}
              </View>
            </View>

            <View style={S.expertiseTags}>
              {sp.expertise.map((ex, i) => (
                <View key={i} style={S.expertiseTag}>
                  <Text style={S.expertiseText}>{ex}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        <View style={S.faqBox}>
          <Text style={S.faqTitle}>How it works</Text>
          {[
            ['1', 'Pay ₹99 to connect with a specialist'],
            ['2', 'Get a 5-minute video call — show them the problem'],
            ['3', 'They diagnose and give you an exact price estimate'],
            ['4', 'If you book the full service, ₹99 is automatically credited back'],
          ].map(([n, t]) => (
            <View key={n} style={S.faqRow}>
              <View style={S.faqNum}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{n}</Text></View>
              <Text style={S.faqText}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {selected && (
        <View style={[S.cta, { paddingBottom: insets.bottom + 12 }]}>
          <View style={S.ctaInfo}>
            <Text style={S.ctaTitle}>{selected.icon} {selected.name}</Text>
            <Text style={S.ctaSub}>₹{CONSULT_FEE} · credited on booking</Text>
          </View>
          <TouchableOpacity
            style={[S.ctaBtn, booking && { opacity: 0.7 }]}
            onPress={handleBook}
            disabled={booking}>
            {booking
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={S.ctaBtnText}>Pay ₹{CONSULT_FEE} & Call →</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  scroll:       { padding: 16, paddingBottom: 100 },
  valueRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  valueItem:    { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center', ...Shadows.sm },
  valueIcon:    { fontSize: 22, marginBottom: 4 },
  valueTitle:   { fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  valueSub:     { fontSize: 10, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  specialistCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm },
  specialistCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
  specialistCardDisabled: { opacity: 0.65 },
  spTop:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  spIcon:       { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  spName:       { fontSize: 14, fontWeight: '700', color: Colors.text },
  spWaitRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  onlineDot:    { width: 7, height: 7, borderRadius: 3.5 },
  spWait:       { fontSize: 12, fontWeight: '600' },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive:  { borderColor: Colors.primary },
  radioDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  expertiseTags:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expertiseTag: { backgroundColor: Colors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  expertiseText:{ fontSize: 11, color: Colors.textLight },
  faqBox:       { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginTop: 8, ...Shadows.sm },
  faqTitle:     { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  faqRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  faqNum:       { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  faqText:      { fontSize: 13, color: Colors.textLight, flex: 1, lineHeight: 20 },
  cta:          { backgroundColor: Colors.white, padding: 16, borderTopWidth: 0.5, borderTopColor: Colors.border },
  ctaInfo:      { marginBottom: 10 },
  ctaTitle:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  ctaSub:       { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  ctaBtn:       { backgroundColor: Colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
  ctaBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  confirmedCard:{ margin: 20, backgroundColor: Colors.white, borderRadius: 20, padding: 28, ...Shadows.card },
  confirmedTitle:{ fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  confirmedSub: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  confirmedDetails: { backgroundColor: Colors.bg, borderRadius: 12, padding: 14, gap: 8, marginBottom: 20 },
  confirmedLine:{ fontSize: 14, color: Colors.text, lineHeight: 24 },
  joinBtn:      { backgroundColor: Colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  joinBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  laterBtn:     { alignItems: 'center', padding: 10 },
  laterBtnText: { color: Colors.textLight, fontSize: 13 },
});
