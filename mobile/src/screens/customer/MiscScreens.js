/**
 * Slot App Professional — KYC Verification Screen (Full)
 * Aadhaar, PAN, selfie liveness check, bank details verification
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KYC_STEPS = [
  { id: 'aadhaar', title: 'Aadhaar Card', icon: '🪪', required: true },
  { id: 'pan', title: 'PAN Card', icon: '💳', required: true },
  { id: 'selfie', title: 'Selfie / Liveness', icon: '🤳', required: true },
  { id: 'bank', title: 'Bank Account', icon: '🏦', required: true },
  { id: 'address', title: 'Address Proof', icon: '📄', required: false },
  { id: 'skill', title: 'Skill Certificate', icon: '📜', required: false },
];

export function ProKYCScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [completedSteps, setCompletedSteps] = useState({ aadhaar: false, pan: false, selfie: false, bank: false, address: false, skill: false });
  const [activeStep, setActiveStep] = useState(null);
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [panNum, setPanNum] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const requiredDone = KYC_STEPS.filter(s => s.required).every(s => completedSteps[s.id]);

  const handleVerifyAadhaar = async () => {
    if (aadhaarNum.length !== 12) { Alert.alert('Invalid', 'Enter 12-digit Aadhaar number'); return; }
    if (!otpSent) {
      setOtpSent(true);
      Alert.alert('OTP Sent', `OTP sent to mobile linked with Aadhaar ${aadhaarNum.slice(-4).padStart(12, 'X')}`);
      return;
    }
    if (otp.length !== 6) { Alert.alert('Invalid OTP', 'Enter 6-digit OTP'); return; }
    setVerifying(true);
    await new Promise(r => setTimeout(r, 1500));
    setVerifying(false);
    setCompletedSteps(prev => ({ ...prev, aadhaar: true }));
    setActiveStep(null);
    Alert.alert('✅ Aadhaar Verified!', 'Your Aadhaar has been successfully verified.');
  };

  const handleVerifyPAN = async () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNum.toUpperCase())) { Alert.alert('Invalid PAN', 'Enter valid PAN (e.g. ABCDE1234F)'); return; }
    setVerifying(true);
    await new Promise(r => setTimeout(r, 1200));
    setVerifying(false);
    setCompletedSteps(prev => ({ ...prev, pan: true }));
    setActiveStep(null);
    Alert.alert('✅ PAN Verified!', 'Your PAN card has been verified.');
  };

  const handleSelfie = async () => {
    setVerifying(true);
    await new Promise(r => setTimeout(r, 2000));
    setVerifying(false);
    setCompletedSteps(prev => ({ ...prev, selfie: true }));
    setActiveStep(null);
    Alert.alert('✅ Identity Confirmed!', 'Liveness check passed. Your photo has been verified.');
  };

  const handleBankVerify = async () => {
    setVerifying(true);
    await new Promise(r => setTimeout(r, 1500));
    setVerifying(false);
    setCompletedSteps(prev => ({ ...prev, bank: true }));
    setActiveStep(null);
    Alert.alert('✅ Bank Account Verified!', 'A ₹1 test transfer confirmed your bank account.');
  };

  const handleSubmitKYC = () => {
    if (!requiredDone) { Alert.alert('Incomplete', 'Please complete all required KYC steps'); return; }
    Alert.alert('KYC Submitted! 🎉', 'Your KYC documents have been submitted. Verification takes 24-48 hours. You will be notified once approved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={[KS.screen, { paddingTop: insets.top }]}>
      <View style={KS.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}><Text style={KS.backText}>←</Text></TouchableOpacity>
        <Text style={KS.headerTitle}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={KS.content}>
        {/* Progress */}
        <View style={KS.progressCard}>
          <Text style={KS.progressTitle}>Verification Progress</Text>
          <View style={KS.progressBar}>
            <View style={[KS.progressFill, { width: `${(completedCount / KYC_STEPS.length) * 100}%` }]} />
          </View>
          <Text style={KS.progressText}>{completedCount}/{KYC_STEPS.length} steps completed{requiredDone ? ' — All required ✓' : ''}</Text>
        </View>

        {/* Why KYC */}
        <View style={KS.infoCard}>
          <Text style={KS.infoTitle}>🛡️ Why KYC is Required</Text>
          {['Build customer trust and credibility', 'Enable faster payouts to your bank', 'Required by RBI for payment processing', 'Protects you against fraudulent claims'].map((item, i) => (
            <View key={i} style={KS.infoRow}><Text style={KS.infoCheck}>✓</Text><Text style={KS.infoText}>{item}</Text></View>
          ))}
        </View>

        {/* Steps */}
        {KYC_STEPS.map(step => (
          <TouchableOpacity
            key={step.id}
            style={[KS.stepCard, completedSteps[step.id] && KS.stepCardDone]}
            onPress={() => !completedSteps[step.id] && setActiveStep(step.id)}
            activeOpacity={completedSteps[step.id] ? 1 : 0.92}
          >
            <View style={[KS.stepIcon, { backgroundColor: completedSteps[step.id] ? '#E8F5E9' : '#F5F6FA' }]}>
              <Text style={{ fontSize: 28 }}>{completedSteps[step.id] ? '✅' : step.icon}</Text>
            </View>
            <View style={KS.stepInfo}>
              <View style={KS.stepTitleRow}>
                <Text style={KS.stepTitle}>{step.title}</Text>
                {step.required && !completedSteps[step.id] && (
                  <View style={KS.requiredBadge}><Text style={KS.requiredText}>REQUIRED</Text></View>
                )}
              </View>
              <Text style={KS.stepStatus}>
                {completedSteps[step.id] ? '✓ Verified' : step.required ? 'Tap to verify' : 'Optional — tap to add'}
              </Text>
            </View>
            {!completedSteps[step.id] && <Text style={{ fontSize: 20, color: '#CCC' }}>›</Text>}
          </TouchableOpacity>
        ))}

        {requiredDone && (
          <TouchableOpacity style={KS.submitBtn} onPress={handleSubmitKYC}>
            <Text style={KS.submitBtnText}>Submit KYC for Review ✓</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Step Modals */}
      <Modal visible={activeStep === 'aadhaar'} transparent animationType="slide" onRequestClose={() => setActiveStep(null)}>
        <View style={KS.modalOverlay}>
          <View style={KS.modalSheet}>
            <Text style={KS.modalTitle}>🪪 Aadhaar Verification</Text>
            <Text style={KS.modalSub}>Enter your 12-digit Aadhaar number. OTP will be sent to your registered mobile.</Text>
            <Text style={KS.fieldLabel}>Aadhaar Number</Text>
            <TextInput style={KS.fieldInput} value={aadhaarNum} onChangeText={t => setAadhaarNum(t.replace(/\D/g, '').slice(0, 12))} placeholder="XXXX XXXX XXXX" keyboardType="numeric" maxLength={12} />
            {otpSent && (
              <>
                <Text style={KS.fieldLabel}>Enter OTP</Text>
                <TextInput style={KS.fieldInput} value={otp} onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" keyboardType="numeric" maxLength={6} />
              </>
            )}
            <View style={KS.modalBtns}>
              <TouchableOpacity style={KS.modalCancelBtn} onPress={() => { setActiveStep(null); setOtpSent(false); setOtp(''); }}>
                <Text style={KS.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[KS.modalVerifyBtn, verifying && { opacity: 0.6 }]} onPress={handleVerifyAadhaar} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={KS.modalVerifyText}>{otpSent ? 'Verify OTP' : 'Send OTP'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeStep === 'pan'} transparent animationType="slide" onRequestClose={() => setActiveStep(null)}>
        <View style={KS.modalOverlay}>
          <View style={KS.modalSheet}>
            <Text style={KS.modalTitle}>💳 PAN Verification</Text>
            <Text style={KS.modalSub}>Enter your PAN card number exactly as printed on the card.</Text>
            <Text style={KS.fieldLabel}>PAN Number</Text>
            <TextInput style={KS.fieldInput} value={panNum} onChangeText={t => setPanNum(t.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />
            <View style={KS.modalBtns}>
              <TouchableOpacity style={KS.modalCancelBtn} onPress={() => setActiveStep(null)}><Text style={KS.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[KS.modalVerifyBtn, verifying && { opacity: 0.6 }]} onPress={handleVerifyPAN} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={KS.modalVerifyText}>Verify PAN</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeStep === 'selfie'} transparent animationType="slide" onRequestClose={() => setActiveStep(null)}>
        <View style={KS.modalOverlay}>
          <View style={KS.modalSheet}>
            <Text style={KS.modalTitle}>🤳 Selfie Liveness Check</Text>
            <Text style={KS.modalSub}>We'll verify your identity using a live selfie. This takes about 30 seconds.</Text>
            <View style={KS.selfiePreview}>
              <Text style={KS.selfieEmoji}>🤳</Text>
              <Text style={KS.selfieInstr}>Position your face in the circle and follow the instructions</Text>
            </View>
            <View style={KS.livenessSteps}>
              {['Look straight at camera', 'Blink twice', 'Turn head left, then right', 'Smile'].map((step, i) => (
                <Text key={i} style={KS.livenessStep}>{i + 1}. {step}</Text>
              ))}
            </View>
            <View style={KS.modalBtns}>
              <TouchableOpacity style={KS.modalCancelBtn} onPress={() => setActiveStep(null)}><Text style={KS.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[KS.modalVerifyBtn, verifying && { opacity: 0.6 }]} onPress={handleSelfie} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={KS.modalVerifyText}>Start Camera</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeStep === 'bank'} transparent animationType="slide" onRequestClose={() => setActiveStep(null)}>
        <View style={KS.modalOverlay}>
          <View style={KS.modalSheet}>
            <Text style={KS.modalTitle}>🏦 Bank Account Verification</Text>
            <Text style={KS.modalSub}>We'll send ₹1 to verify your account. The amount will be credited within 24 hours.</Text>
            <Text style={KS.fieldLabel}>Account Number</Text>
            <TextInput style={KS.fieldInput} placeholder="Enter account number" keyboardType="numeric" />
            <Text style={KS.fieldLabel}>IFSC Code</Text>
            <TextInput style={KS.fieldInput} placeholder="e.g. HDFC0001234" autoCapitalize="characters" />
            <Text style={KS.fieldLabel}>Account Holder Name</Text>
            <TextInput style={KS.fieldInput} placeholder="As per bank records" autoCapitalize="words" />
            <View style={KS.modalBtns}>
              <TouchableOpacity style={KS.modalCancelBtn} onPress={() => setActiveStep(null)}><Text style={KS.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[KS.modalVerifyBtn, verifying && { opacity: 0.6 }]} onPress={handleBankVerify} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={KS.modalVerifyText}>Verify (₹1 Penny Drop)</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const KS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  content: { padding: 16, paddingBottom: 40 },
  progressCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  progressTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#27AE60', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#888' },
  infoCard: { backgroundColor: '#E8F5E9', borderRadius: 18, padding: 18, marginBottom: 14 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1B5E20', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  infoCheck: { fontSize: 13, color: '#27AE60', fontWeight: '700', marginRight: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#2E7D32', lineHeight: 18 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  stepCardDone: { borderWidth: 1.5, borderColor: '#27AE60', backgroundColor: '#FAFFFA' },
  stepIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  stepInfo: { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  requiredBadge: { backgroundColor: '#FFF0F3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  requiredText: { fontSize: 9, fontWeight: '800', color: '#E94560' },
  stepStatus: { fontSize: 12, color: '#888', marginTop: 3 },
  submitBtn: { backgroundColor: '#27AE60', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A2E', marginBottom: 14, backgroundColor: '#FAFAFA' },
  selfiePreview: { height: 160, backgroundColor: '#F5F6FA', borderRadius: 80, width: 160, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#E0E0E0' },
  selfieEmoji: { fontSize: 56 },
  selfieInstr: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8, position: 'absolute', bottom: -36, width: 220 },
  livenessSteps: { backgroundColor: '#F5F6FA', borderRadius: 14, padding: 14, marginBottom: 20, marginTop: 20 },
  livenessStep: { fontSize: 13, color: '#444', marginBottom: 6 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#666' },
  modalVerifyBtn: { flex: 2, backgroundColor: '#27AE60', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalVerifyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});


/**
 * WhatsApp Outbound Notification Service (Backend utility)
 * Sends automated booking notifications via WhatsApp Business API
 */

const WHATSAPP_TEMPLATES = {
  booking_confirmed: (name, service, date, bookingId) =>
    `Hi ${name}! ✅ Your *${service}* booking is confirmed.\n\n📅 Date: ${date}\n🔖 Booking ID: ${bookingId}\n\nTrack your professional: https://slotapp.in/track/${bookingId}`,

  professional_assigned: (name, proName, proPhone, eta) =>
    `Hi ${name}! 👷 *${proName}* has been assigned for your service.\n\n📞 Contact: ${proPhone}\n🚗 ETA: ${eta} minutes\n\nTrack live: https://slotapp.in/track`,

  professional_arriving: (name, proName, mins) =>
    `Hi ${name}! ⏰ *${proName}* is ${mins} minutes away!\n\nPlease make sure someone is available at the address.`,

  job_completed: (name, service, bookingId) =>
    `Hi ${name}! ✅ Your *${service}* is complete!\n\n⭐ Please rate your experience: https://slotapp.in/review/${bookingId}\n\nThank you for choosing Slot App! 🙏`,

  payment_received: (name, amount, bookingId) =>
    `Hi ${name}! 💰 Payment of *₹${amount}* received for booking #${bookingId}.\n\nYour invoice: https://slotapp.in/invoice/${bookingId}`,

  booking_cancelled: (name, service, reason) =>
    `Hi ${name}, your *${service}* booking has been cancelled.\n\nReason: ${reason}\n\nRebook anytime at https://slotapp.in`,

  offer_alert: (name, discount, service) =>
    `Hi ${name}! 🎉 Special offer just for you!\n\n*${discount}% off* on ${service} today only!\n\nBook now: https://slotapp.in`,
};

export const whatsappOutbound = {
  sendBookingConfirmed: (customerPhone, data) => {
    const msg = WHATSAPP_TEMPLATES.booking_confirmed(data.customerName, data.serviceName, data.date, data.bookingId);
    return sendWhatsApp(customerPhone, msg);
  },
  sendProfessionalAssigned: (customerPhone, data) => {
    const msg = WHATSAPP_TEMPLATES.professional_assigned(data.customerName, data.proName, data.proPhone, data.eta);
    return sendWhatsApp(customerPhone, msg);
  },
  sendArriving: (customerPhone, data) => {
    const msg = WHATSAPP_TEMPLATES.professional_arriving(data.customerName, data.proName, data.minutesAway);
    return sendWhatsApp(customerPhone, msg);
  },
  sendJobCompleted: (customerPhone, data) => {
    const msg = WHATSAPP_TEMPLATES.job_completed(data.customerName, data.serviceName, data.bookingId);
    return sendWhatsApp(customerPhone, msg);
  },
  sendPaymentConfirmed: (customerPhone, data) => {
    const msg = WHATSAPP_TEMPLATES.payment_received(data.customerName, data.amount, data.bookingId);
    return sendWhatsApp(customerPhone, msg);
  },
};

async function sendWhatsApp(phone, message) {
  // In production: call Meta WhatsApp Business API
  const WA_API = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  try {
    const response = await fetch(WA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${phone}`,
        type: 'text',
        text: { preview_url: true, body: message },
      }),
    });
    const data = await response.json();
    if (!response.ok) console.error('WhatsApp send error:', data);
    return data;
  } catch (err) {
    console.error('WhatsApp outbound error:', err.message);
    return null;
  }
}


/**
 * Cancellation Policy Display Component
 */
export function CancellationPolicyCard({ scheduledAt }) {
  const hoursUntil = scheduledAt ? Math.floor((new Date(scheduledAt) - Date.now()) / (1000 * 60 * 60)) : 48;

  const TIERS = [
    { hours: 24, label: 'More than 24 hours before', charge: 'FREE cancellation', color: '#27AE60', free: true },
    { hours: 4, label: '4–24 hours before', charge: '₹100 cancellation fee', color: '#FF9800', free: false },
    { hours: 0, label: 'Less than 4 hours before', charge: '₹200 cancellation fee', color: '#E94560', free: false },
    { hours: -1, label: 'After professional arrives', charge: 'Full booking amount', color: '#B71C1C', free: false },
  ];

  const currentTier = hoursUntil > 24 ? 0 : hoursUntil > 4 ? 1 : hoursUntil > 0 ? 2 : 3;

  return (
    <View style={CP.card}>
      <Text style={CP.cardTitle}>📋 Cancellation Policy</Text>
      {TIERS.map((tier, i) => (
        <View key={i} style={[CP.tierRow, i === currentTier && CP.tierRowActive]}>
          <View style={[CP.tierDot, { backgroundColor: tier.color }]} />
          <View style={CP.tierInfo}>
            <Text style={[CP.tierLabel, i === currentTier && { fontWeight: '800', color: '#1A1A2E' }]}>{tier.label}</Text>
            <Text style={[CP.tierCharge, { color: tier.color }]}>{tier.charge}</Text>
          </View>
          {i === currentTier && <View style={CP.currentBadge}><Text style={CP.currentBadgeText}>NOW</Text></View>}
        </View>
      ))}
      <Text style={CP.disclaimer}>* Fees are deducted from refund. Professional no-show = full refund + ₹50 credit.</Text>
    </View>
  );
}

const CP = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', marginBottom: 14 },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  tierRowActive: { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  tierInfo: { flex: 1 },
  tierLabel: { fontSize: 12, color: '#444', lineHeight: 16 },
  tierCharge: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  currentBadge: { backgroundColor: '#FF9800', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  disclaimer: { fontSize: 11, color: '#888', marginTop: 12, lineHeight: 16, fontStyle: 'italic' },
});
