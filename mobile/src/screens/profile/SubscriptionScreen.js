/**
 * Slot App — Subscription & Corporate Screens (Full)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { Colors, Shadows } from '../../utils/theme';
import { subscriptionsAPI, corporateAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Subscription Plan Card ────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const isAnnual = plan.id === 'annual';
  return (
    <TouchableOpacity
      style={[S.planCard, selected && S.planCardSelected, isAnnual && S.planCardAnnual]}
      onPress={() => onSelect(plan.id)}
      activeOpacity={0.85}
    >
      {isAnnual && <View style={S.bestValueBadge}><Text style={S.bestValueText}>BEST VALUE</Text></View>}
      {plan.id === 'quarterly' && <View style={S.popularBadge}><Text style={S.popularText}>POPULAR</Text></View>}
      <View style={S.planHeader}>
        <Text style={[S.planName, selected && S.planNameSelected]}>{plan.name}</Text>
        <View style={[S.radioBtn, selected && S.radioBtnSelected]}>
          {selected && <View style={S.radioDot} />}
        </View>
      </View>
      <Text style={[S.planPrice, selected && S.planPriceSelected]}>₹{plan.price}</Text>
      <Text style={S.planPeriod}>
        {plan.id === 'monthly' ? '/month' : plan.id === 'quarterly' ? '/3 months' : '/year'}
      </Text>
      {plan.savings > 0 && (
        <Text style={S.savings}>Save ₹{plan.savings} ({plan.savingsPct}% off)</Text>
      )}
      <Text style={S.originalPrice}>MRP ₹{plan.originalPrice}</Text>
    </TouchableOpacity>
  );
}

// ── Benefit Row ───────────────────────────────────────────────
function Benefit({ icon, text, highlight }) {
  return (
    <View style={S.benefitRow}>
      <Text style={S.benefitIcon}>{icon}</Text>
      <Text style={[S.benefitText, highlight && { fontWeight: '700', color: '#1A1A2E' }]}>{text}</Text>
      <Text style={S.checkmark}>✓</Text>
    </View>
  );
}

export default function SubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [plans, setPlans]           = useState([]);
  const [activeSub, setActiveSub]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [subscribing, setSubscribing]   = useState(false);

  useEffect(() => {
    Promise.all([
      subscriptionsAPI.getPlans(),
      subscriptionsAPI.getMy(),
    ]).then(([plansRes, subRes]) => {
      setPlans(plansRes.data.plans || []);
      setActiveSub(subRes.data.subscription);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data: orderData } = await subscriptionsAPI.createOrder(selectedPlan);
      const plan = plans.find(p => p.id === selectedPlan);

      const options = {
        description:  'Slot Prime Subscription',
        image:        'https://slotapp.in/logo.png',
        currency:     'INR',
        key:          orderData.key,
        amount:       plan.price * 100,
        order_id:     orderData.order.id,
        name:         'Slot Services',
        prefill: {
          email:    user?.email   || '',
          contact:  user?.phone   || '',
          name:     user?.name    || '',
        },
        theme: { color: Colors.primary },
      };

      const payment = await RazorpayCheckout.open(options);
      await subscriptionsAPI.activate({
        razorpayOrderId:   payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
        planType:          selectedPlan,
      });

      Alert.alert('👑 Welcome to Slot Prime!', 'Your subscription is now active. Enjoy exclusive benefits!',
        [{ text: 'Awesome!', onPress: () => navigation.goBack() }]);
    } catch (err) {
      if (err.code !== 0) Alert.alert('Error', err.description || 'Subscription failed. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Subscription', 'Are you sure? You will lose access to Prime benefits.',
      [
        { text: 'Keep Prime', style: 'cancel' },
        {
          text: 'Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsAPI.cancel('User requested cancellation');
              setActiveSub(prev => ({ ...prev, status: 'cancelled' }));
              Alert.alert('Cancelled', 'Your subscription will remain active until the end of the billing period.');
            } catch { Alert.alert('Error', 'Could not cancel. Please contact support.'); }
          },
        },
      ]
    );
  };

  const BENEFITS = [
    { icon: '💰', text: '15% discount on all bookings', highlight: true },
    { icon: '🎁', text: '1 free service per month (up to ₹299)' },
    { icon: '⚡', text: 'Priority booking — skip the queue' },
    { icon: '🛡️', text: 'Extended 60-day warranty on all services', highlight: true },
    { icon: '📞', text: 'Dedicated support — 30-min response time' },
    { icon: '🚗', text: 'Free home visits (no convenience fee)' },
    { icon: '⭐', text: 'Exclusive prime professionals' },
    { icon: '🔔', text: 'Early access to new services & offers' },
  ];

  if (loading) return (
    <View style={[S.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero gradient */}
        <LinearGradient colors={['#1A1A2E', '#b8860b', '#f15c22']} style={S.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
            <Text style={S.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={S.heroEmoji}>👑</Text>
          <Text style={S.heroTitle}>Slot Prime</Text>
          <Text style={S.heroSub}>India's most comprehensive home services membership</Text>
          {activeSub?.isActive && (
            <View style={S.activeTag}>
              <Text style={S.activeTagText}>✓ ACTIVE — {activeSub.daysRemaining} days remaining</Text>
            </View>
          )}
        </LinearGradient>

        {/* Active subscription card */}
        {activeSub?.isActive && (
          <View style={S.activeCard}>
            <Text style={S.activeCardTitle}>Your Subscription</Text>
            <View style={S.activeCardRow}>
              <Text style={S.activeLabel}>Plan</Text>
              <Text style={S.activeValue}>{activeSub.plan?.type?.charAt(0).toUpperCase() + activeSub.plan?.type?.slice(1)} — ₹{activeSub.plan?.price}/period</Text>
            </View>
            <View style={S.activeCardRow}>
              <Text style={S.activeLabel}>Valid Until</Text>
              <Text style={S.activeValue}>{new Date(activeSub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={S.activeCardRow}>
              <Text style={S.activeLabel}>Status</Text>
              <Text style={[S.activeValue, { color: '#22c55e', fontWeight: '700' }]}>Active ✓</Text>
            </View>
            <View style={S.activeCardRow}>
              <Text style={S.activeLabel}>Free Services</Text>
              <Text style={S.activeValue}>{activeSub.benefits?.freeServicesLeft || 0} remaining</Text>
            </View>
            <TouchableOpacity style={S.cancelBtn} onPress={handleCancel}>
              <Text style={S.cancelBtnText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits */}
        <View style={S.benefitsCard}>
          <Text style={S.benefitsTitle}>What's included in Slot Prime</Text>
          {BENEFITS.map((b, i) => <Benefit key={i} {...b} />)}
        </View>

        {/* Plans (show only if not subscribed) */}
        {!activeSub?.isActive && (
          <>
            <Text style={S.choosePlan}>Choose Your Plan</Text>
            <View style={S.plansGrid}>
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlan === plan.id}
                  onSelect={setSelectedPlan}
                />
              ))}
            </View>

            {/* Reviews */}
            <View style={S.reviewsCard}>
              <Text style={S.reviewsTitle}>What Prime members say</Text>
              {[
                { name: 'Ananya S.', text: 'Saving ₹800+ every month with Prime! Best subscription ever.', rating: 5 },
                { name: 'Vikram M.', text: 'The priority support alone is worth it. Got an AC repair done in 2 hours!', rating: 5 },
                { name: 'Priya K.', text: 'Free service every month pays for itself. Highly recommend!', rating: 5 },
              ].map((review, i) => (
                <View key={i} style={S.reviewRow}>
                  <Text style={S.reviewerAvatar}>{review.name[0]}</Text>
                  <View style={S.reviewContent}>
                    <Text style={S.reviewerName}>{review.name} <Text style={S.reviewStars}>{'⭐'.repeat(review.rating)}</Text></Text>
                    <Text style={S.reviewText}>{review.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Subscribe button */}
      {!activeSub?.isActive && (
        <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={S.footerNote}>Cancel anytime • Auto-renews • GST included</Text>
          <TouchableOpacity style={[S.subscribeBtn, subscribing && { opacity: 0.6 }]} onPress={handleSubscribe} disabled={subscribing}>
            {subscribing
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={S.subscribeBtnTitle}>Start Prime Membership</Text>
                  <Text style={S.subscribeBtnSub}>₹{plans.find(p => p.id === selectedPlan)?.price || '...'} • {selectedPlan}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Corporate Screen ──────────────────────────────────────────
export function CorporateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep]           = useState('info'); // info | form | submitted
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState({
    companyName: '', contactName: '', email: '', phone: '', employeeCount: '', message: '',
  });

  const handleSubmit = async () => {
    if (!form.companyName || !form.email || !form.phone)
      return Alert.alert('Required', 'Company name, email and phone are required.');
    setSubmitting(true);
    try {
      await corporateAPI.submitEnquiry(form);
      setStep('submitted');
    } catch {
      Alert.alert('Error', 'Could not submit. Please email us at corporate@slotapp.in');
    } finally {
      setSubmitting(false);
    }
  };

  const CORP_BENEFITS = [
    { icon: '💼', title: 'Dedicated Account Manager', desc: 'Single point of contact for all your corporate service needs' },
    { icon: '📊', title: 'Monthly Invoicing', desc: 'Consolidated billing with GST invoices for easy reimbursement' },
    { icon: '💰', title: 'Volume Discounts', desc: 'Up to 25% off on all services based on your usage' },
    { icon: '⚡', title: 'Priority Scheduling', desc: 'Book same-day or next-day services for your employees' },
    { icon: '🗂️', title: 'Employee Management', desc: 'Add up to 500 employees under one corporate account' },
    { icon: '📞', title: '24/7 Corporate Support', desc: 'Dedicated helpline for your corporate account' },
  ];

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={S.corpHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn2}>
          <Text style={S.backIcon2}>←</Text>
        </TouchableOpacity>
        <Text style={S.corpHeaderTitle}>Corporate Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === 'submitted' ? (
        <View style={S.successBox}>
          <Text style={S.successEmoji}>🎉</Text>
          <Text style={S.successTitle}>Enquiry Submitted!</Text>
          <Text style={S.successText}>Our corporate team will contact you within 24 hours. Thank you, {form.contactName}!</Text>
          <TouchableOpacity style={S.successBtn} onPress={() => navigation.goBack()}>
            <Text style={S.successBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {step === 'info' ? (
            <>
              <View style={S.corpHero}>
                <Text style={S.corpHeroIcon}>🏢</Text>
                <Text style={S.corpHeroTitle}>Slot for Business</Text>
                <Text style={S.corpHeroSub}>Professional home services for your employees — all under one account</Text>
              </View>
              {CORP_BENEFITS.map((b, i) => (
                <View key={i} style={S.corpBenefit}>
                  <Text style={S.corpBenefitIcon}>{b.icon}</Text>
                  <View style={S.corpBenefitInfo}>
                    <Text style={S.corpBenefitTitle}>{b.title}</Text>
                    <Text style={S.corpBenefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
              <View style={S.corpPlans}>
                <Text style={S.corpPlansTitle}>Corporate Plans</Text>
                {[
                  { name: 'Starter', price: '₹5,000/mo', employees: 'Up to 50 employees', discount: '10% off' },
                  { name: 'Business', price: '₹15,000/mo', employees: 'Up to 200 employees', discount: '18% off', popular: true },
                  { name: 'Enterprise', price: 'Custom', employees: 'Unlimited employees', discount: 'Up to 25% off' },
                ].map((p, i) => (
                  <View key={i} style={[S.corpPlanCard, p.popular && { borderColor: Colors.primary, borderWidth: 2 }]}>
                    {p.popular && <Text style={S.corpPlanPopular}>Most Popular</Text>}
                    <Text style={S.corpPlanName}>{p.name}</Text>
                    <Text style={S.corpPlanPrice}>{p.price}</Text>
                    <Text style={S.corpPlanDetail}>{p.employees}</Text>
                    <Text style={S.corpPlanDiscount}>{p.discount}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={S.corpGetStarted} onPress={() => setStep('form')}>
                <Text style={S.corpGetStartedText}>Get Started — Request Demo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={S.formTitle}>Corporate Enquiry Form</Text>
              {[
                { key: 'companyName', label: 'Company Name *', placeholder: 'Acme Technologies Pvt Ltd' },
                { key: 'contactName', label: 'Your Name *', placeholder: 'HR Manager Name' },
                { key: 'email', label: 'Work Email *', placeholder: 'hr@company.com', keyboardType: 'email-address' },
                { key: 'phone', label: 'Phone *', placeholder: '9876543210', keyboardType: 'phone-pad' },
                { key: 'employeeCount', label: 'Number of Employees', placeholder: 'e.g. 150', keyboardType: 'numeric' },
                { key: 'message', label: 'Additional Requirements', placeholder: 'Tell us about your specific needs...', multiline: true },
              ].map(field => (
                <View key={field.key}>
                  <Text style={S.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[S.fieldInput, field.multiline && { height: 80, paddingTop: 12 }]}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                    keyboardType={field.keyboardType || 'default'}
                    multiline={field.multiline}
                    textAlignVertical={field.multiline ? 'top' : 'center'}
                    placeholderTextColor="#aaa"
                    autoCapitalize={field.keyboardType ? 'none' : 'words'}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[S.corpSubmitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={S.corpSubmitText}>Submit Enquiry</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  hero:         { paddingTop: 20, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  backBtn:      { position: 'absolute', top: 20, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon:     { fontSize: 20, color: '#fff', fontWeight: '700' },
  heroEmoji:    { fontSize: 56, marginBottom: 12 },
  heroTitle:    { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroSub:      { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  activeTag:    { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 12 },
  activeTagText:{ fontSize: 13, color: '#fff', fontWeight: '700' },
  activeCard:   { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#f59e0b', ...Shadows.md },
  activeCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  activeCardRow:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  activeLabel:  { fontSize: 13, color: '#666' },
  activeValue:  { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  cancelBtn:    { marginTop: 12, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#FEF2F2' },
  cancelBtnText:{ fontSize: 14, fontWeight: '600', color: '#EF4444' },
  benefitsCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadows.md },
  benefitsTitle:{ fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  benefitRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  benefitIcon:  { fontSize: 20, width: 32 },
  benefitText:  { flex: 1, fontSize: 14, color: '#444' },
  checkmark:    { fontSize: 16, color: '#22c55e', fontWeight: '700' },
  choosePlan:   { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginVertical: 12 },
  plansGrid:    { paddingHorizontal: 12 },
  planCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0', ...Shadows.sm, position: 'relative' },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: '#FFF8F0' },
  planCardAnnual: { borderColor: '#f59e0b' },
  bestValueBadge: { position: 'absolute', top: -10, left: 16, backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  bestValueText:  { fontSize: 10, fontWeight: '800', color: '#fff' },
  popularBadge:   { position: 'absolute', top: -10, left: 16, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  popularText:    { fontSize: 10, fontWeight: '800', color: '#fff' },
  planHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  planName:     { fontSize: 16, fontWeight: '700', color: '#555', textTransform: 'capitalize' },
  planNameSelected: { color: Colors.primary },
  radioBtn:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  radioBtnSelected: { borderColor: Colors.primary },
  radioDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  planPrice:    { fontSize: 28, fontWeight: '900', color: '#1A1A2E' },
  planPriceSelected: { color: Colors.primary },
  planPeriod:   { fontSize: 13, color: '#999', marginBottom: 6 },
  savings:      { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  originalPrice:{ fontSize: 12, color: '#CCC', textDecorationLine: 'line-through', marginTop: 2 },
  reviewsCard:  { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadows.md },
  reviewsTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  reviewRow:    { flexDirection: 'row', marginBottom: 14 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, textAlign: 'center', lineHeight: 40, fontSize: 16, fontWeight: '700', color: Colors.primary, marginRight: 12 },
  reviewContent:{ flex: 1 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  reviewStars:  { fontSize: 11 },
  reviewText:   { fontSize: 13, color: '#555', lineHeight: 18, marginTop: 2 },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5', ...Shadows.lg },
  footerNote:   { fontSize: 11, color: '#999', textAlign: 'center', marginBottom: 8 },
  subscribeBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.md },
  subscribeBtnTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  subscribeBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, textTransform: 'capitalize' },
  corpHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn2:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon2:    { fontSize: 22, color: '#1A1A2E' },
  corpHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  corpHero:     { alignItems: 'center', marginBottom: 24 },
  corpHeroIcon: { fontSize: 56 },
  corpHeroTitle:{ fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginTop: 12 },
  corpHeroSub:  { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  corpBenefit:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, ...Shadows.sm },
  corpBenefitIcon: { fontSize: 28, marginRight: 14 },
  corpBenefitInfo: { flex: 1 },
  corpBenefitTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  corpBenefitDesc: { fontSize: 13, color: '#666', marginTop: 3, lineHeight: 18 },
  corpPlans:    { marginTop: 16 },
  corpPlansTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  corpPlanCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0', position: 'relative' },
  corpPlanPopular: { position: 'absolute', top: -10, left: 16, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, fontSize: 10, fontWeight: '800', color: '#fff' },
  corpPlanName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  corpPlanPrice:{ fontSize: 18, fontWeight: '800', color: Colors.primary, marginVertical: 4 },
  corpPlanDetail: { fontSize: 13, color: '#666' },
  corpPlanDiscount: { fontSize: 13, fontWeight: '700', color: '#22c55e', marginTop: 2 },
  corpGetStarted: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20, ...Shadows.md },
  corpGetStartedText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  formTitle:    { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  fieldInput:   { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', borderWidth: 1, borderColor: '#E0E0E0' },
  corpSubmitBtn:{ backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, ...Shadows.md },
  corpSubmitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  successText:  { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successBtn:   { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, ...Shadows.md },
  successBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
