import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, TextInput, FlatList, Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import axios from 'axios';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const hdr = (nav, title, right) => (
  <View style={S.header}>
    <TouchableOpacity onPress={() => nav.goBack()} style={S.backBtn}>
      <Text style={S.backIcon}>←</Text>
    </TouchableOpacity>
    <Text style={S.headerTitle}>{title}</Text>
    <View style={{ width:40 }}>{right}</View>
  </View>
);

// ═══════════════════════════════════════════════════════════
// JOB DETAIL SCREEN
// ═══════════════════════════════════════════════════════════
export function JobDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    axios.get(`${API}/bookings/${bookingId}`)
      .then(({ data }) => setBooking(data.booking))
      .catch(() => Alert.alert('Error','Could not load job details'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await axios.put(`${API}/bookings/${bookingId}/status`, { status: newStatus });
      setBooking(prev => ({ ...prev, status: newStatus }));
      if (newStatus === 'completed') {
        Alert.alert('Job Completed! 🎉', 'Great work! Your earnings will be credited within 24 hours.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch { Alert.alert('Error','Could not update status.'); }
    finally { setUpdating(false); }
  };

  if (loading) return <View style={[S.container,Common.center]}><ActivityIndicator color={Colors.primary} size="large"/></View>;

  const canNavigate = booking?.status === 'professional_assigned';
  const canStart    = booking?.status === 'professional_arrived';
  const canComplete = booking?.status === 'in_progress';
  const isCompleted = booking?.status === 'completed';

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {hdr(navigation, 'Job Details')}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Service hero */}
        <LinearGradient colors={['#1A1A2E','#0F3460']} style={S.jobHero}>
          <Text style={S.jobHeroIcon}>{booking?.service?.icon || '🔧'}</Text>
          <View style={{ flex:1 }}>
            <Text style={S.jobHeroService}>{booking?.service?.name}</Text>
            {booking?.subService?.name && <Text style={S.jobHeroSub}>{booking.subService.name}</Text>}
          </View>
          <View style={S.jobHeroEarn}>
            <Text style={S.jobHeroEarnLabel}>Your Earnings</Text>
            <Text style={S.jobHeroEarnAmt}>₹{Math.round((booking?.pricing?.totalAmount||0)*0.80)}</Text>
          </View>
        </LinearGradient>

        {/* Status flow */}
        <View style={{ padding:Spacing.base }}>
          <Text style={S.sectionTitle}>Job Status</Text>
          <View style={S.statusSteps}>
            {['confirmed','professional_assigned','professional_arriving','in_progress','completed'].map((st,i) => {
              const statuses = ['confirmed','professional_assigned','professional_arriving','in_progress','completed'];
              const currentIdx = statuses.indexOf(booking?.status);
              const done   = i < currentIdx;
              const active = i === currentIdx;
              const labels = ['Accepted','Assigned','On The Way','In Progress','Completed'];
              return (
                <View key={st} style={S.statusStep}>
                  <View style={[S.statusDot, done&&S.statusDotDone, active&&S.statusDotActive]}>
                    <Text style={{ fontSize:12, color:done||active?Colors.white:Colors.midGray }}>
                      {done ? '✓' : i+1}
                    </Text>
                  </View>
                  <Text style={[S.statusLabel, active&&{color:Colors.primary,fontWeight:'700'}]}>{labels[i]}</Text>
                  {i < 4 && <View style={[S.statusLine, done&&S.statusLineDone]} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Customer info */}
        <View style={{ paddingHorizontal:Spacing.base }}>
          <Text style={S.sectionTitle}>Customer</Text>
          <View style={S.customerCard}>
            <View style={S.custAvatar}>
              <Text style={S.custAvatarText}>{booking?.customer?.name?.charAt(0)||'C'}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={S.custName}>{booking?.customer?.name}</Text>
              <Text style={S.custPhone}>{booking?.customer?.phone}</Text>
              <Text style={S.custAddr} numberOfLines={2}>
                📍 {booking?.address?.line1}, {booking?.address?.area}, {booking?.address?.city}
              </Text>
            </View>
            <View style={S.custActions}>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking?.customer?.phone}`)} style={S.custBtn}>
                <Text style={{ fontSize:20 }}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CustomerChat', { bookingId, customer: booking?.customer })} style={[S.custBtn,{backgroundColor:Colors.successLight}]}>
                <Text style={{ fontSize:20 }}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Schedule */}
        <View style={{ padding:Spacing.base }}>
          <Text style={S.sectionTitle}>Schedule</Text>
          <View style={S.scheduleCard}>
            <View style={S.scheduleRow}>
              <Text style={S.scheduleIcon}>📅</Text>
              <Text style={S.scheduleText}>
                {new Date(booking?.scheduledDate||Date.now()).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </Text>
            </View>
            <View style={S.scheduleRow}>
              <Text style={S.scheduleIcon}>⏰</Text>
              <Text style={S.scheduleText}>{booking?.scheduledTime}</Text>
            </View>
            <View style={S.scheduleRow}>
              <Text style={S.scheduleIcon}>💰</Text>
              <Text style={[S.scheduleText, { fontWeight:'700', color:Colors.success }]}>
                You earn ₹{Math.round((booking?.pricing?.totalAmount||0)*0.80)} for this job
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ padding:Spacing.base, gap:12 }}>
          {canNavigate && (
            <TouchableOpacity onPress={() => navigation.navigate('MapNavigation', { booking })}
              style={[S.bigBtn, { backgroundColor:Colors.infoLight }]}>
              <Text style={[S.bigBtnText, { color:Colors.info }]}>🗺️ Navigate to Customer</Text>
            </TouchableOpacity>
          )}
          {canNavigate && (
            <TouchableOpacity onPress={() => updateStatus('professional_arriving')} disabled={updating}
              style={[S.bigBtn, { backgroundColor:Colors.warningLight }]}>
              <Text style={[S.bigBtnText, { color:Colors.warning }]}>🚗 I'm On The Way</Text>
            </TouchableOpacity>
          )}
          {booking?.status === 'professional_arriving' && (
            <TouchableOpacity onPress={() => updateStatus('professional_arrived')} disabled={updating}
              style={[S.bigBtn, { backgroundColor:Colors.primaryLight }]}>
              <Text style={[S.bigBtnText, { color:Colors.primary }]}>🏠 I've Arrived</Text>
            </TouchableOpacity>
          )}
          {canStart && (
            <TouchableOpacity onPress={() => updateStatus('in_progress')} disabled={updating}
              style={[S.bigBtn, { backgroundColor:Colors.primary }]}>
              <Text style={[S.bigBtnText, { color:Colors.white }]}>▶️ Start Job</Text>
            </TouchableOpacity>
          )}
          {canComplete && (
            <TouchableOpacity onPress={() => {
              Alert.alert('Complete Job?','Confirm the job is complete and collect payment.',
                [{text:'Cancel',style:'cancel'},{text:'Confirm Complete',onPress:()=>updateStatus('completed')}]);
            }} disabled={updating} style={[S.bigBtn, { backgroundColor:Colors.success }]}>
              <Text style={[S.bigBtnText, { color:Colors.white }]}>✅ Mark Job Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// WITHDRAW SCREEN
// ═══════════════════════════════════════════════════════════
export function WithdrawScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [balance, setBalance]       = useState(3480);
  const [amount, setAmount]         = useState('');
  const [method, setMethod]         = useState('upi');
  const [withdrawing, setWithdrawing] = useState(false);

  const MIN_WITHDRAWAL = 100;
  const numAmount = parseInt(amount) || 0;

  const handleWithdraw = async () => {
    if (numAmount < MIN_WITHDRAWAL) { Alert.alert(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`); return; }
    if (numAmount > balance) { Alert.alert('Insufficient balance'); return; }
    setWithdrawing(true);
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('proToken');
      const resp = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/payout`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: numAmount, method }) }
      );
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);
      setBalance(prev => prev - numAmount);
      Alert.alert('Withdrawal Initiated! 💰', `₹${numAmount} will be credited to your ${method === 'upi' ? 'UPI' : 'bank account'} within ${method === 'upi' ? '30 minutes' : '24 hours'}.\n\nRef: ${data.payoutId || ''}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) { Alert.alert('Error', e.message || 'Withdrawal failed. Try again.'); }
    finally { setWithdrawing(false); }
  };

  const QUICK_AMOUNTS = [500, 1000, 2000, balance];

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {hdr(navigation, 'Withdraw Earnings')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:120 }}>

        {/* Balance card */}
        <LinearGradient colors={['#1A1A2E','#0F3460']} style={S.balanceCard}>
          <Text style={S.balanceLabel}>Available Balance</Text>
          <Text style={S.balanceAmt}>₹{balance.toLocaleString()}</Text>
          <Text style={S.balanceSub}>Cleared earnings ready to withdraw</Text>
        </LinearGradient>

        {/* Method */}
        <Text style={S.sectionTitle}>Withdrawal Method</Text>
        <View style={S.methodRow}>
          {[{key:'upi',label:'UPI (Instant)',icon:'📱'},{key:'bank',label:'Bank Account',icon:'🏦'}].map(m => (
            <TouchableOpacity key={m.key} onPress={() => setMethod(m.key)}
              style={[S.methodCard, method===m.key && S.methodCardActive]}>
              <Text style={{ fontSize:24 }}>{m.icon}</Text>
              <Text style={[S.methodLabel, method===m.key && { color:Colors.primary }]}>{m.label}</Text>
              {method===m.key && <Text style={{ color:Colors.primary, fontSize:18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={S.sectionTitle}>Enter Amount</Text>
        <View style={S.amountInputWrap}>
          <Text style={S.rupeeSign}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.lightGray}
            style={S.amountInput}
            maxLength={5}
          />
        </View>
        <Text style={{ ...Typography.small, color:Colors.midGray, marginBottom:Spacing.md }}>Minimum ₹{MIN_WITHDRAWAL}</Text>

        <View style={S.quickAmts}>
          {QUICK_AMOUNTS.map(amt => (
            <TouchableOpacity key={amt} onPress={() => setAmount(String(amt))}
              style={[S.quickAmt, amount===String(amt) && S.quickAmtActive]}>
              <Text style={[S.quickAmtText, amount===String(amt) && { color:Colors.primary }]}>
                {amt === balance ? 'All ₹'+amt : '₹'+amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timing note */}
        <View style={S.timingNote}>
          <Text style={S.timingIcon}>{method === 'upi' ? '⚡' : '🕐'}</Text>
          <View>
            <Text style={S.timingTitle}>{method === 'upi' ? 'Instant Transfer' : 'Bank Transfer: 24 hrs'}</Text>
            <Text style={S.timingSub}>Processing fee: ₹0 (Free for all withdrawals)</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[S.ctaBar, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={handleWithdraw} disabled={!numAmount || withdrawing}
          activeOpacity={0.85} style={{ borderRadius:Radius.xl, overflow:'hidden', flex:1 }}>
          <LinearGradient colors={['#E94560','#C0392B']} start={{x:0,y:0}} end={{x:1,y:0}}
            style={{ paddingVertical:17, alignItems:'center', opacity: !numAmount ? 0.5 : 1 }}>
            <Text style={{ color:Colors.white, fontWeight:'800', fontSize:16 }}>
              {withdrawing ? 'Processing...' : `Withdraw ₹${numAmount || '—'}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// RATING DETAIL SCREEN — Pro's reviews breakdown
// ═══════════════════════════════════════════════════════════
export function RatingDetailScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reviews] = useState([
    { id:'1', customer:'Priya S.', rating:5, comment:'Excellent work! Very professional and on time.', service:'AC Service', date:'2 days ago', response:null },
    { id:'2', customer:'Rahul M.', rating:4, comment:'Good service, minor delay but overall great.', service:'Washing Machine', date:'5 days ago', response:'Thank you for your feedback!' },
    { id:'3', customer:'Anita K.', rating:5, comment:'Best AC technician I have seen. Thorough work.', service:'AC Gas Refill', date:'1 week ago', response:null },
    { id:'4', customer:'Vikram P.', rating:3, comment:'Service was okay. Could be faster.', service:'AC Service', date:'2 weeks ago', response:null },
  ]);

  const avgRating = reviews.reduce((s,r) => s + r.rating, 0) / reviews.length;
  const dist = [5,4,3,2,1].map(r => ({ stars:r, count:reviews.filter(rv => rv.rating===r).length, pct: (reviews.filter(rv=>rv.rating===r).length/reviews.length)*100 }));

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {hdr(navigation, 'My Ratings & Reviews')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:60 }}>

        {/* Summary */}
        <View style={S.ratingSummary}>
          <View style={S.ratingBig}>
            <Text style={S.ratingBigNum}>{avgRating.toFixed(1)}</Text>
            <View style={S.ratingBigStars}>
              {[1,2,3,4,5].map(i => <Text key={i} style={{ color:i<=Math.round(avgRating)?Colors.star:Colors.lightGray, fontSize:20 }}>★</Text>)}
            </View>
            <Text style={S.ratingBigCount}>{reviews.length} reviews</Text>
          </View>
          <View style={S.ratingBars}>
            {dist.map(d => (
              <View key={d.stars} style={S.ratingBarRow}>
                <Text style={S.ratingBarLabel}>{d.stars}★</Text>
                <View style={S.ratingBarTrack}>
                  <View style={[S.ratingBarFill, { width:`${d.pct}%`, backgroundColor: d.stars>=4?Colors.success:d.stars>=3?Colors.warning:Colors.error }]} />
                </View>
                <Text style={S.ratingBarCount}>{d.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <Text style={[S.sectionTitle, { marginTop:Spacing.xl }]}>Customer Reviews</Text>
        {reviews.map(r => (
          <View key={r.id} style={S.reviewCard}>
            <View style={S.reviewHeader}>
              <View style={S.reviewAvatar}><Text style={S.reviewAvatarText}>{r.customer.charAt(0)}</Text></View>
              <View style={{ flex:1 }}>
                <Text style={S.reviewCustomer}>{r.customer}</Text>
                <Text style={S.reviewService}>{r.service}</Text>
              </View>
              <View>
                <Text style={{ color:Colors.star, fontSize:14 }}>{'★'.repeat(r.rating)}</Text>
                <Text style={S.reviewDate}>{r.date}</Text>
              </View>
            </View>
            <Text style={S.reviewComment}>{r.comment}</Text>
            {r.response ? (
              <View style={S.responseBox}>
                <Text style={S.responseLabel}>Your response:</Text>
                <Text style={S.responseText}>{r.response}</Text>
              </View>
            ) : (
              <TouchableOpacity style={S.replyBtn}>
                <Text style={S.replyBtnText}>Reply to review</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPLAINT SCREEN — File complaint about a booking
// ═══════════════════════════════════════════════════════════
export function ComplaintScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route?.params || {};
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES = [
    'Customer was rude / threatening',
    'Customer cancelled without reason',
    'Wrong address / unreachable',
    'Payment issue / not paid',
    'Unsafe work environment',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!category || !description) { Alert.alert('Please fill all fields'); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('Complaint Submitted', 'Our team will investigate within 24 hours. Thank you for letting us know.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1500);
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {hdr(navigation, 'File Complaint')}
      <ScrollView contentContainerStyle={{ padding:Spacing.base, paddingBottom:120 }}>
        <Text style={[S.sectionTitle, { color:Colors.error }]}>🚨 Report an Issue</Text>
        <Text style={{ ...Typography.body, color:Colors.midGray, marginBottom:Spacing.xl, lineHeight:21 }}>
          Your safety and wellbeing is our top priority. All reports are confidential and reviewed by our Pro Support team.
        </Text>

        <Text style={S.sectionTitle}>Issue Category</Text>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[S.compCatRow, category===cat && S.compCatRowActive]}>
            <View style={[S.compRadio, category===cat && S.compRadioActive]}>
              {category===cat && <View style={S.compRadioDot} />}
            </View>
            <Text style={[S.compCatText, category===cat && { color:Colors.primary, fontWeight:'700' }]}>{cat}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[S.sectionTitle, { marginTop:Spacing.xl }]}>Describe the Issue</Text>
        <TextInput
          value={description} onChangeText={setDescription} multiline numberOfLines={5}
          placeholder="What happened? Be as specific as possible..."
          placeholderTextColor={Colors.lightGray}
          style={S.compTextInput} textAlignVertical="top"
        />

        <View style={S.compHelpNote}>
          <Text style={S.compHelpText}>🔒 For urgent safety concerns, call our 24/7 Pro Safety Line: 1800-999-1234</Text>
        </View>
      </ScrollView>

      <View style={[S.ctaBar, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting}
          activeOpacity={0.85} style={{ borderRadius:Radius.xl, overflow:'hidden', flex:1 }}>
          <LinearGradient colors={['#C62828','#B71C1C']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ paddingVertical:16, alignItems:'center' }}>
            <Text style={{ color:Colors.white, fontWeight:'800', fontSize:16 }}>{submitting ? 'Submitting...' : 'Submit Complaint'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex:1, backgroundColor:Colors.bg },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.base, paddingVertical:12, backgroundColor:Colors.white, borderBottomWidth:1, borderBottomColor:Colors.offWhite },
  backBtn: { width:40 },
  backIcon: { fontSize:22, color:Colors.black, fontWeight:'600' },
  headerTitle: { ...Typography.h4 },
  sectionTitle: { ...Typography.h4, marginBottom:Spacing.md },
  // Job Detail
  jobHero: { padding:Spacing.base, flexDirection:'row', alignItems:'center', gap:14, paddingVertical:Spacing.xl },
  jobHeroIcon: { fontSize:44 },
  jobHeroService: { color:Colors.white, fontWeight:'800', fontSize:17, lineHeight:22 },
  jobHeroSub: { color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:3 },
  jobHeroEarn: { alignItems:'flex-end' },
  jobHeroEarnLabel: { color:'rgba(255,255,255,0.6)', fontSize:11 },
  jobHeroEarnAmt: { color:Colors.white, fontWeight:'900', fontSize:24 },
  statusSteps: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  statusStep: { flex:1, alignItems:'center', position:'relative' },
  statusDot: { width:28, height:28, borderRadius:14, borderWidth:2, borderColor:Colors.lightGray, backgroundColor:Colors.white, alignItems:'center', justifyContent:'center', zIndex:1 },
  statusDotDone: { backgroundColor:Colors.success, borderColor:Colors.success },
  statusDotActive: { backgroundColor:Colors.primary, borderColor:Colors.primary },
  statusLabel: { fontSize:9, color:Colors.midGray, textAlign:'center', marginTop:4, fontWeight:'500' },
  statusLine: { position:'absolute', top:14, left:'50%', right:'-50%', height:2, backgroundColor:Colors.offWhite, zIndex:0 },
  statusLineDone: { backgroundColor:Colors.success },
  customerCard: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, gap:14, ...Shadows.card },
  custAvatar: { width:48, height:48, borderRadius:24, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  custAvatarText: { color:Colors.white, fontWeight:'800', fontSize:18 },
  custName: { ...Typography.bodyMed },
  custPhone: { ...Typography.small, color:Colors.gray, marginTop:2 },
  custAddr: { ...Typography.small, color:Colors.midGray, marginTop:3 },
  custActions: { gap:8 },
  custBtn: { width:36, height:36, borderRadius:18, backgroundColor:Colors.successLight, alignItems:'center', justifyContent:'center' },
  scheduleCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, ...Shadows.card },
  scheduleRow: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:Spacing.sm },
  scheduleIcon: { fontSize:18, width:24 },
  scheduleText: { ...Typography.body },
  bigBtn: { paddingVertical:15, borderRadius:Radius.xl, alignItems:'center' },
  bigBtnText: { fontWeight:'700', fontSize:15 },
  // Withdraw
  balanceCard: { borderRadius:Radius.xxl, padding:Spacing.xl, alignItems:'center', marginBottom:Spacing.xl },
  balanceLabel: { color:'rgba(255,255,255,0.6)', fontSize:14, marginBottom:6 },
  balanceAmt: { color:Colors.white, fontSize:48, fontWeight:'900', letterSpacing:-2, marginBottom:4 },
  balanceSub: { color:'rgba(255,255,255,0.5)', fontSize:12 },
  methodRow: { flexDirection:'row', gap:12, marginBottom:Spacing.xl },
  methodCard: { flex:1, backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, alignItems:'center', gap:8, borderWidth:1.5, borderColor:Colors.offWhite, ...Shadows.sm },
  methodCardActive: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  methodLabel: { fontWeight:'600', fontSize:13, color:Colors.gray, textAlign:'center' },
  amountInputWrap: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.md, borderWidth:1.5, borderColor:Colors.offWhite, marginBottom:6 },
  rupeeSign: { fontSize:28, color:Colors.midGray, marginRight:8 },
  amountInput: { flex:1, fontSize:36, fontWeight:'900', color:Colors.black, fontFamily:'System' },
  quickAmts: { flexDirection:'row', gap:10, flexWrap:'wrap', marginBottom:Spacing.xl },
  quickAmt: { paddingHorizontal:16, paddingVertical:9, borderRadius:Radius.pill, borderWidth:1.5, borderColor:Colors.offWhite, backgroundColor:Colors.white },
  quickAmtActive: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  quickAmtText: { fontSize:13, fontWeight:'700', color:Colors.gray },
  timingNote: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.successLight, borderRadius:Radius.xl, padding:Spacing.base, gap:12 },
  timingIcon: { fontSize:26 },
  timingTitle: { fontWeight:'700', fontSize:14, color:Colors.success },
  timingSub: { fontSize:12, color:Colors.success, marginTop:2 },
  ctaBar: { position:'absolute', bottom:0, left:0, right:0, padding:Spacing.base, backgroundColor:Colors.white, borderTopWidth:1, borderTopColor:Colors.offWhite, ...Shadows.lg, flexDirection:'row', gap:10 },
  // Rating
  ratingSummary: { flexDirection:'row', backgroundColor:Colors.white, borderRadius:Radius.xxl, padding:Spacing.xl, gap:Spacing.xl, ...Shadows.card, marginBottom:4 },
  ratingBig: { alignItems:'center' },
  ratingBigNum: { fontSize:52, fontWeight:'900', color:Colors.black, lineHeight:56 },
  ratingBigStars: { flexDirection:'row', gap:3 },
  ratingBigCount: { ...Typography.small, color:Colors.midGray, marginTop:6 },
  ratingBars: { flex:1, gap:6, justifyContent:'center' },
  ratingBarRow: { flexDirection:'row', alignItems:'center', gap:8 },
  ratingBarLabel: { fontSize:12, color:Colors.gray, width:22 },
  ratingBarTrack: { flex:1, height:6, backgroundColor:Colors.offWhite, borderRadius:3, overflow:'hidden' },
  ratingBarFill: { height:'100%', borderRadius:3 },
  ratingBarCount: { fontSize:11, color:Colors.midGray, width:16 },
  reviewCard: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, marginBottom:Spacing.sm, ...Shadows.sm },
  reviewHeader: { flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:Spacing.sm },
  reviewAvatar: { width:36, height:36, borderRadius:18, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  reviewAvatarText: { color:Colors.white, fontWeight:'700', fontSize:14 },
  reviewCustomer: { ...Typography.bodyMed },
  reviewService: { ...Typography.small, color:Colors.gray },
  reviewDate: { ...Typography.caption, color:Colors.midGray },
  reviewComment: { ...Typography.body, lineHeight:21, fontStyle:'italic', color:Colors.gray },
  responseBox: { backgroundColor:Colors.offWhite, borderRadius:Radius.lg, padding:Spacing.sm, marginTop:Spacing.sm },
  responseLabel: { fontSize:11, fontWeight:'700', color:Colors.midGray, marginBottom:3 },
  responseText: { ...Typography.small },
  replyBtn: { marginTop:Spacing.sm },
  replyBtnText: { color:Colors.primary, fontWeight:'600', fontSize:13 },
  // Complaint
  compCatRow: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.white, borderRadius:Radius.lg, padding:Spacing.base, marginBottom:Spacing.sm, gap:14, borderWidth:1.5, borderColor:Colors.offWhite },
  compCatRowActive: { borderColor:Colors.primary, backgroundColor:Colors.primaryLight },
  compRadio: { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:Colors.lightGray, alignItems:'center', justifyContent:'center' },
  compRadioActive: { borderColor:Colors.primary },
  compRadioDot: { width:9, height:9, borderRadius:5, backgroundColor:Colors.primary },
  compCatText: { flex:1, ...Typography.body, color:Colors.gray },
  compTextInput: { backgroundColor:Colors.white, borderRadius:Radius.xl, padding:Spacing.base, borderWidth:1.5, borderColor:Colors.offWhite, fontSize:14, color:Colors.black, minHeight:120, fontFamily:'System' },
  compHelpNote: { backgroundColor:'#FFF3E0', borderRadius:Radius.xl, padding:Spacing.base, marginTop:Spacing.xl },
  compHelpText: { fontSize:13, color:'#E65100', lineHeight:19 },
});
