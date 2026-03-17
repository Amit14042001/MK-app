/**
 * MK Professional App — ProOnboardingScreen
 * Welcome, registration steps, service selection, area pinning
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, FlatList, Alert, ActivityIndicator,
  Dimensions, Animated,
} from 'react-native';
import { Colors, Typography, Shadows } from '../../utils/theme';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    title: 'Welcome to MK Professionals',
    subtitle: 'India\'s most trusted home services platform. Join 50,000+ professionals earning ₹40,000–₹80,000/month.',
    icon: '🏆',
    color: '#E94560',
    bullets: ['Work on your own schedule', 'Guaranteed payments', 'Free training & support'],
  },
  {
    id: 1,
    title: 'Choose Your Services',
    subtitle: 'Select the services you offer. You can add more later from your profile.',
    icon: '🔧',
    color: '#2980B9',
    bullets: null,
  },
  {
    id: 2,
    title: 'Set Your Work Area',
    subtitle: 'Select the neighborhoods or areas where you want to receive booking requests.',
    icon: '📍',
    color: '#27AE60',
    bullets: null,
  },
  {
    id: 3,
    title: 'Complete Your Profile',
    subtitle: 'Add your details to start receiving bookings. Verified professionals get 3x more jobs.',
    icon: '👤',
    color: '#9B59B6',
    bullets: null,
  },
  {
    id: 4,
    title: 'You\'re All Set!',
    subtitle: 'Your account is under review. We\'ll activate it within 24 hours after document verification.',
    icon: '🎉',
    color: '#E67E22',
    bullets: ['Background check in progress', 'Skill verification pending', 'Account activation: 24h'],
  },
];

const SERVICES = [
  { id: 'ac',    name: 'AC Service & Repair', icon: '❄️',  category: 'HVAC' },
  { id: 'elec',  name: 'Electrical Work',     icon: '⚡',  category: 'Electrical' },
  { id: 'plumb', name: 'Plumbing',            icon: '🔧',  category: 'Plumbing' },
  { id: 'clean', name: 'Home Cleaning',       icon: '🧹',  category: 'Cleaning' },
  { id: 'pest',  name: 'Pest Control',        icon: '🐛',  category: 'Pest' },
  { id: 'paint', name: 'Painting',            icon: '🖌️', category: 'Painting' },
  { id: 'salon', name: 'Salon at Home',       icon: '💇',  category: 'Salon' },
  { id: 'app',   name: 'Appliance Repair',    icon: '📺',  category: 'Appliance' },
  { id: 'car',   name: 'Car Wash',            icon: '🚗',  category: 'Automotive' },
  { id: 'cook',  name: 'Cooking',             icon: '👨‍🍳', category: 'Cooking' },
  { id: 'fit',   name: 'Fitness Training',    icon: '💪',  category: 'Fitness' },
  { id: 'yoga',  name: 'Yoga',               icon: '🧘',  category: 'Wellness' },
];

const AREAS = [
  'Banjara Hills', 'Jubilee Hills', 'Hitech City', 'Kondapur', 'Gachibowli',
  'Madhapur', 'Kukatpally', 'Miyapur', 'Ameerpet', 'SR Nagar',
  'Begumpet', 'Secunderabad', 'Dilsukhnagar', 'LB Nagar', 'Uppal',
];

export default function ProOnboardingScreen({ navigation }) {
  const [slide, setSlide]         = useState(0);
  const [selServices, setSelServices] = useState([]);
  const [selAreas, setSelAreas]   = useState([]);
  const [form, setForm]           = useState({ name: '', phone: '', email: '', experience: '' });
  const [loading, setLoading]     = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (slide < SLIDES.length - 1) {
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        slideAnim.setValue(0);
        setSlide(s => s + 1);
      });
    }
  };

  const goBack = () => {
    if (slide > 0) setSlide(s => s - 1);
  };

  const handleFinish = async () => {
    if (!form.name || !form.phone) {
      Alert.alert('Required', 'Please fill in your name and phone number.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/auth/register-professional`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:         form.name,
            phone:        form.phone,
            city:         form.city,
            skills:       selServices,
            serviceAreas: selAreas || [],
            referralCode: form.referralCode,
          }),
        }
      );
      const data = await resp.json();
      if (data.success && data.accessToken) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('proToken', data.accessToken);
        if (data.refreshToken) await AsyncStorage.setItem('proRefreshToken', data.refreshToken);
      }
      setLoading(false);
      goNext(); // go to success slide
    } catch (e) {
      setLoading(false);
      // Still proceed to next slide even on network error (can re-register)
      goNext();
    }
  };

  const toggleService = (id) => {
    setSelServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleArea = (area) => {
    setSelAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  };

  const canProceed = () => {
    if (slide === 1) return selServices.length > 0;
    if (slide === 2) return selAreas.length > 0;
    if (slide === 3) return form.name.trim() && form.phone.trim().length === 10;
    return true;
  };

  const s = SLIDES[slide];

  return (
    <View style={S.container}>
      {/* Progress Bar */}
      <View style={S.progressBar}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[S.progressDot, i <= slide && S.progressDotActive, { flex: 1 }]} />
        ))}
      </View>

      {/* Back Button */}
      {slide > 0 && slide < SLIDES.length - 1 && (
        <TouchableOpacity style={S.backBtn} onPress={goBack}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
        {/* Hero */}
        <View style={[S.hero, { backgroundColor: s.color + '20' }]}>
          <Text style={S.heroIcon}>{s.icon}</Text>
        </View>

        <Text style={S.title}>{s.title}</Text>
        <Text style={S.subtitle}>{s.subtitle}</Text>

        {/* Bullets for intro/outro */}
        {s.bullets && (
          <View style={S.bullets}>
            {s.bullets.map((b, i) => (
              <View key={i} style={S.bulletRow}>
                <View style={[S.bulletDot, { backgroundColor: s.color }]} />
                <Text style={S.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Service Selection */}
        {slide === 1 && (
          <View style={S.serviceGrid}>
            {SERVICES.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={[S.serviceCard, selServices.includes(svc.id) && S.serviceCardSelected]}
                onPress={() => toggleService(svc.id)}
                activeOpacity={0.8}
              >
                <Text style={S.serviceEmoji}>{svc.icon}</Text>
                <Text style={[S.serviceName, selServices.includes(svc.id) && S.serviceNameSelected]} numberOfLines={2}>
                  {svc.name}
                </Text>
                {selServices.includes(svc.id) && <View style={S.serviceCheck}><Text style={S.serviceCheckText}>✓</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Area Selection */}
        {slide === 2 && (
          <>
            <Text style={S.selCount}>{selAreas.length} area{selAreas.length !== 1 ? 's' : ''} selected</Text>
            <View style={S.areaWrap}>
              {AREAS.map(area => (
                <TouchableOpacity
                  key={area}
                  style={[S.areaChip, selAreas.includes(area) && S.areaChipActive]}
                  onPress={() => toggleArea(area)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.areaLabel, selAreas.includes(area) && S.areaLabelActive]}>
                    {selAreas.includes(area) ? '✓ ' : ''}{area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Profile Form */}
        {slide === 3 && (
          <View style={S.form}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Your full name', keyboardType: 'default' },
              { key: 'phone', label: 'Mobile Number *', placeholder: '10-digit mobile number', keyboardType: 'phone-pad', maxLength: 10 },
              { key: 'email', label: 'Email (Optional)', placeholder: 'your@email.com', keyboardType: 'email-address' },
              { key: 'experience', label: 'Years of Experience', placeholder: 'e.g. 5', keyboardType: 'numeric', maxLength: 2 },
            ].map(f => (
              <View key={f.key} style={S.fieldRow}>
                <Text style={S.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={S.fieldInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.lightGray}
                  keyboardType={f.keyboardType}
                  maxLength={f.maxLength}
                  value={form[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
          </View>
        )}

        {/* Success slide */}
        {slide === SLIDES.length - 1 && (
          <View style={S.successBox}>
            <View style={S.successItem}><Text style={S.successCheck}>✓</Text><Text style={S.successText}>Profile submitted</Text></View>
            <View style={S.successItem}><Text style={S.successCheck}>✓</Text><Text style={S.successText}>{selServices.length} services selected</Text></View>
            <View style={S.successItem}><Text style={S.successCheck}>✓</Text><Text style={S.successText}>{selAreas.length} areas covered</Text></View>
            <View style={[S.successItem, { opacity: 0.5 }]}><Text style={S.successPending}>⏳</Text><Text style={S.successText}>Documents pending verification</Text></View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={S.bottomBar}>
        {slide < SLIDES.length - 1 ? (
          <TouchableOpacity
            style={[S.nextBtn, { backgroundColor: s.color }, !canProceed() && S.nextBtnDisabled]}
            onPress={slide === 3 ? handleFinish : goNext}
            disabled={!canProceed() || loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={S.nextBtnText}>{slide === 3 ? 'Submit Application' : 'Continue →'}</Text>
            }
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[S.nextBtn, { backgroundColor: s.color }]}
              onPress={() => navigation.replace('Login')}
            >
              <Text style={S.nextBtnText}>Go to Login →</Text>
            </TouchableOpacity>
            <Text style={S.reviewNote}>We'll send you an SMS once your account is approved.</Text>
          </>
        )}
        <Text style={S.slideCount}>{slide + 1} / {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.white },
  progressBar:   { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 52, gap: 4 },
  progressDot:   { height: 4, borderRadius: 2, backgroundColor: Colors.offWhite },
  progressDotActive: { backgroundColor: Colors.primary },
  backBtn:       { position: 'absolute', top: 52, left: 16, width: 40, height: 40, justifyContent: 'center', zIndex: 10 },
  backIcon:      { fontSize: 22, color: Colors.black },
  scroll:        { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 },
  hero:          { width: W - 48, height: 180, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 28, alignSelf: 'center' },
  heroIcon:      { fontSize: 72 },
  title:         { ...Typography.h1, color: Colors.black, textAlign: 'center', marginBottom: 12 },
  subtitle:      { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  bullets:       { gap: 10 },
  bulletRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot:     { width: 8, height: 8, borderRadius: 4 },
  bulletText:    { ...Typography.body, color: Colors.darkGray },
  serviceGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  serviceCard:   { width: (W - 48 - 20) / 3, backgroundColor: Colors.offWhite, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  serviceCardSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  serviceEmoji:  { fontSize: 28, marginBottom: 6 },
  serviceName:   { ...Typography.small, color: Colors.darkGray, textAlign: 'center', fontWeight: '600', lineHeight: 16 },
  serviceNameSelected: { color: Colors.primary },
  serviceCheck:  { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  serviceCheckText: { fontSize: 10, color: Colors.white, fontWeight: '800' },
  selCount:      { ...Typography.caption, color: Colors.gray, marginBottom: 12 },
  areaWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip:      { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.offWhite, borderWidth: 1.5, borderColor: Colors.lightGray },
  areaChipActive:{ backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  areaLabel:     { ...Typography.body, color: Colors.darkGray, fontWeight: '500' },
  areaLabelActive: { color: Colors.primary, fontWeight: '700' },
  form:          { gap: 14 },
  fieldRow:      {},
  fieldLabel:    { ...Typography.caption, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  fieldInput:    { backgroundColor: Colors.offWhite, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, ...Typography.body, color: Colors.black, borderWidth: 1.5, borderColor: Colors.lightGray },
  successBox:    { gap: 12, marginTop: 8 },
  successItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.offWhite, borderRadius: 12, padding: 14 },
  successCheck:  { ...Typography.body, color: Colors.success, fontWeight: '800', fontSize: 18 },
  successPending:{ ...Typography.body, color: Colors.warning, fontSize: 18 },
  successText:   { ...Typography.body, color: Colors.darkGray, fontWeight: '500' },
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.offWhite, ...Shadows.sm },
  nextBtn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText:   { ...Typography.bodyLarge, color: Colors.white, fontWeight: '700' },
  slideCount:    { ...Typography.caption, color: Colors.midGray, textAlign: 'center' },
  reviewNote:    { ...Typography.caption, color: Colors.gray, textAlign: 'center', marginBottom: 4 },
});
