import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, Alert, ActivityIndicator, StatusBar, Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common } from '../../utils/theme';
import { bookingsAPI } from '../../utils/api';

const STATUS_FLOW = [
  { status: 'pending',                icon: '📋', label: 'Booking Placed' },
  { status: 'confirmed',              icon: '✅', label: 'Confirmed' },
  { status: 'professional_assigned',  icon: '👷', label: 'Pro Assigned' },
  { status: 'professional_arriving',  icon: '🚗', label: 'Pro On The Way' },
  { status: 'professional_arrived',   icon: '🏠', label: 'Pro Arrived' },
  { status: 'in_progress',            icon: '⚡', label: 'Service In Progress' },
  { status: 'completed',              icon: '🎉', label: 'Completed' },
];

const STATUS_ORDER = STATUS_FLOW.map(s => s.status);

function TimelineStep({ step, isActive, isDone, time }) {
  return (
    <View style={styles.tlStep}>
      <View style={styles.tlLeft}>
        <View style={[
          styles.tlDot,
          isDone && styles.tlDotDone,
          isActive && styles.tlDotActive,
        ]}>
          <Text style={styles.tlDotText}>{isDone ? '✓' : step.icon}</Text>
        </View>
        {step.status !== 'completed' && (
          <View style={[styles.tlLine, isDone && styles.tlLineDone]} />
        )}
      </View>
      <View style={styles.tlRight}>
        <Text style={[styles.tlLabel, isActive && { color: Colors.primary, fontWeight: '700' }]}>
          {step.label}
        </Text>
        {time && <Text style={styles.tlTime}>{time}</Text>}
        {isActive && <Text style={styles.tlActiveNote}>Current status</Text>}
      </View>
    </View>
  );
}

function InvoiceRow({ label, value, bold, highlight }) {
  return (
    <View style={[styles.invoiceRow, bold && styles.invoiceRowBold]}>
      <Text style={[styles.invoiceLabel, bold && styles.invoiceLabelBold]}>{label}</Text>
      <Text style={[styles.invoiceValue, bold && styles.invoiceValueBold, highlight && { color: Colors.success }]}>
        {value}
      </Text>
    </View>
  );
}

export default function BookingDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const { data } = await bookingsAPI.getOne(bookingId);
      setBooking(data.booking);
    } catch { Alert.alert('Error', 'Could not load booking details'); }
    finally { setLoading(false); }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `MK Booking #${booking.bookingId}\n${booking.service?.name}\n${new Date(booking.scheduledDate).toDateString()} at ${booking.scheduledTime}`,
      });
    } catch {}
  };

  const handleInvoice = () => {
    Linking.openURL(`https://api.mkapp.in/api/v1/bookings/${bookingId}/invoice`);
  };

  if (loading) return (
    <View style={[Common.container, Common.center]}><ActivityIndicator color={Colors.primary} size="large" /></View>
  );

  if (!booking) return (
    <View style={[Common.container, Common.center]}>
      <Text style={Typography.h4}>Booking not found</Text>
    </View>
  );

  const currentIdx = STATUS_ORDER.indexOf(booking.status);
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';
  const canTrack = ['professional_assigned','professional_arriving','professional_arrived','in_progress'].includes(booking.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={isCancelled ? ['#C62828','#B71C1C'] : isCompleted ? ['#2E7D32','#1B5E20'] : ['#1A1A2E','#0F3460']}
        style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Text style={{ fontSize: 20 }}>📤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBody}>
          <Text style={styles.serviceIcon}>{booking.service?.icon || '🔧'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{booking.service?.name}</Text>
            {booking.subService?.name && <Text style={styles.subServiceName}>{booking.subService.name}</Text>}
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{booking.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.headerAmount}>₹{booking.pricing?.totalAmount}</Text>
        </View>

        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaText}>📅 {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>
          <Text style={styles.headerMetaText}>⏰ {booking.scheduledTime}</Text>
          <Text style={styles.bookingIdText}>ID: {booking.bookingId}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Action buttons */}
        {!isCancelled && (
          <View style={styles.actionsRow}>
            {canTrack && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.infoLight }]}
                onPress={() => navigation.navigate('Tracking', { bookingId })}>
                <Text style={styles.actionBtnIcon}>📍</Text>
                <Text style={[styles.actionBtnText, { color: Colors.info }]}>Track Pro</Text>
              </TouchableOpacity>
            )}
            {isCompleted && !booking.isReviewed && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.warningLight }]}
                onPress={() => navigation.navigate('Review', { bookingId, serviceId: booking.service?._id })}>
                <Text style={styles.actionBtnIcon}>⭐</Text>
                <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Rate</Text>
              </TouchableOpacity>
            )}
            {isCompleted && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.offWhite }]}
                onPress={() => navigation.navigate('ServiceDetail', { serviceId: booking.service?._id })}>
                <Text style={styles.actionBtnIcon}>🔄</Text>
                <Text style={styles.actionBtnText}>Rebook</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.offWhite }]}
              onPress={handleInvoice}>
              <Text style={styles.actionBtnIcon}>🧾</Text>
              <Text style={styles.actionBtnText}>Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Professional Card */}
        {booking.professional?.user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Professional</Text>
            <View style={styles.proCard}>
              <View style={styles.proAvatar}>
                <Text style={styles.proAvatarText}>
                  {booking.professional.user.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proName}>{booking.professional.user.name}</Text>
                <View style={styles.proRatingRow}>
                  <Text style={styles.proRatingStar}>★</Text>
                  <Text style={styles.proRatingVal}>{booking.professional.rating || 4.8}</Text>
                  <Text style={styles.proRatingCount}>· {booking.professional.totalBookings} jobs</Text>
                </View>
                {booking.professional.skills?.slice(0,3).map(s => (
                  <Text key={s} style={styles.proSkill}>{s}</Text>
                ))}
              </View>
              <View style={styles.proActions}>
                <TouchableOpacity style={styles.proCallBtn}
                  onPress={() => Linking.openURL(`tel:${booking.professional.user.phone}`)}>
                  <Text style={{ fontSize: 20 }}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.proCallBtn, { backgroundColor: Colors.successLight }]}
                  onPress={() => navigation.navigate('Tracking', { bookingId })}>
                  <Text style={{ fontSize: 20 }}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Booking Timeline */}
        {!isCancelled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Timeline</Text>
            <View style={styles.timeline}>
              {STATUS_FLOW.filter(s => s.status !== 'cancelled').map((step, i) => (
                <TimelineStep
                  key={step.status}
                  step={step}
                  isDone={i < currentIdx}
                  isActive={i === currentIdx}
                  time={i === 0 ? new Date(booking.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : null}
                />
              ))}
            </View>
          </View>
        )}

        {/* Service Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Address</Text>
          <View style={styles.addressCard}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>
              {booking.address?.label === 'Home' ? '🏠' : booking.address?.label === 'Work' ? '🏢' : '📍'}
            </Text>
            <Text style={styles.addressLabel}>{booking.address?.label}</Text>
            <Text style={styles.addressLine}>{booking.address?.line1}</Text>
            {booking.address?.area && <Text style={styles.addressLine}>{booking.address.area}</Text>}
            <Text style={styles.addressLine}>{booking.address?.city} - {booking.address?.pincode}</Text>
            {booking.address?.landmark && <Text style={styles.addressMeta}>Landmark: {booking.address.landmark}</Text>}
          </View>
        </View>

        {/* Invoice / Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.invoiceCard}>
            <InvoiceRow label={booking.service?.name} value={`₹${booking.pricing?.serviceAmount}`} />
            {booking.pricing?.couponDiscount > 0 && (
              <InvoiceRow label={`Coupon (${booking.couponCode})`} value={`-₹${booking.pricing.couponDiscount}`} highlight />
            )}
            {booking.pricing?.walletUsed > 0 && (
              <InvoiceRow label="Wallet Used" value={`-₹${booking.pricing.walletUsed}`} highlight />
            )}
            <InvoiceRow label="GST (18%)" value={`₹${booking.pricing?.taxes || 0}`} />
            <View style={styles.invoiceDivider} />
            <InvoiceRow label="Total Paid" value={`₹${booking.pricing?.totalAmount}`} bold />
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentMethodLabel}>
                {booking.paymentMethod === 'online' ? '💳 Paid Online' : booking.paymentMethod === 'wallet' ? '👛 Paid via Wallet' : '💵 Cash/COD'}
              </Text>
              {booking.payment?.status === 'captured' && (
                <Text style={styles.paymentSuccess}>✓ Verified</Text>
              )}
            </View>
          </View>
        </View>

        {/* Rating given */}
        {booking.isReviewed && booking.myRating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.ratingCard}>
              <View style={styles.ratingStarsRow}>
                {[1,2,3,4,5].map(i => (
                  <Text key={i} style={[styles.ratingStar, { color: i <= booking.myRating ? Colors.star : Colors.lightGray }]}>★</Text>
                ))}
                <Text style={styles.ratingVal}>{booking.myRating}/5</Text>
              </View>
              {booking.myComment && <Text style={styles.ratingComment}>"{booking.myComment}"</Text>}
            </View>
          </View>
        )}

        {/* Health Report — only for completed bookings */}
        {isCompleted && (
          <TouchableOpacity
            style={[styles.helpBtn, { backgroundColor: '#E8F5E9', marginBottom: 8 }]}
            onPress={() => navigation.navigate('HealthReport', { bookingId })}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.helpText, { color: '#2E7D32', fontWeight: '700' }]}>View Service Health Report</Text>
              <Text style={{ fontSize: 11, color: '#4CAF50', marginTop: 1 }}>What was done · Warranty · Next service date</Text>
            </View>
            <Text style={styles.helpArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Help / Support */}
        <TouchableOpacity style={styles.helpBtn}
          onPress={() => navigation.navigate('Help')}>
          <Text style={{ fontSize: 20 }}>❓</Text>
          <Text style={styles.helpText}>Need help with this booking?</Text>
          <Text style={styles.helpArrow}>›</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  backBtn: { width: 40 },
  backIcon: { fontSize: 22, color: Colors.white, fontWeight: '600' },
  headerTitle: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  shareBtn: { width: 40, alignItems: 'flex-end' },
  headerBody: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.base, gap: Spacing.md, marginBottom: Spacing.md },
  serviceIcon: { fontSize: 44 },
  serviceName: { color: Colors.white, fontWeight: '800', fontSize: 18, lineHeight: 22, marginBottom: 4 },
  subServiceName: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 },
  statusChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  statusChipText: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  headerAmount: { color: Colors.white, fontWeight: '900', fontSize: 24 },
  headerMeta: { paddingHorizontal: Spacing.base, gap: 4 },
  headerMetaText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  bookingIdText: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 },
  actionsRow: { flexDirection: 'row', padding: Spacing.base, gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.lg, gap: 4 },
  actionBtnIcon: { fontSize: 20 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: Colors.gray },
  section: { margin: Spacing.base, marginBottom: 0 },
  sectionTitle: { ...Typography.h4, marginBottom: Spacing.md },
  proCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, flexDirection: 'row', gap: Spacing.md, alignItems: 'center', ...Shadows.card },
  proAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  proAvatarText: { color: Colors.white, fontWeight: '800', fontSize: 20 },
  proName: { ...Typography.bodyMed },
  proRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  proRatingStar: { color: Colors.star, fontSize: 13 },
  proRatingVal: { fontWeight: '700', fontSize: 13, color: Colors.black },
  proRatingCount: { fontSize: 12, color: Colors.midGray },
  proSkill: { fontSize: 11, color: Colors.midGray, marginTop: 2 },
  proActions: { gap: 8 },
  proCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },
  timeline: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, ...Shadows.card },
  tlStep: { flexDirection: 'row', gap: Spacing.md },
  tlLeft: { alignItems: 'center', width: 36 },
  tlDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.offWhite, alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: Colors.successLight },
  tlDotActive: { backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primary },
  tlDotText: { fontSize: 16 },
  tlLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: Colors.offWhite, marginVertical: 2 },
  tlLineDone: { backgroundColor: Colors.success },
  tlRight: { flex: 1, paddingBottom: Spacing.base, paddingTop: 6 },
  tlLabel: { ...Typography.bodyMed, color: Colors.midGray },
  tlTime: { ...Typography.small, marginTop: 2 },
  tlActiveNote: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  addressCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, ...Shadows.card },
  addressLabel: { ...Typography.bodyMed, marginBottom: 4 },
  addressLine: { ...Typography.body, lineHeight: 20 },
  addressMeta: { ...Typography.small, color: Colors.midGray, marginTop: 4 },
  invoiceCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, ...Shadows.card },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  invoiceRowBold: { marginTop: 4 },
  invoiceLabel: { ...Typography.body },
  invoiceLabelBold: { fontWeight: '700', fontSize: 16 },
  invoiceValue: { ...Typography.body, fontWeight: '600' },
  invoiceValueBold: { fontWeight: '900', fontSize: 18, color: Colors.black },
  invoiceDivider: { height: 1, backgroundColor: Colors.offWhite, marginVertical: Spacing.sm },
  paymentMethodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  paymentMethodLabel: { ...Typography.small, color: Colors.gray },
  paymentSuccess: { fontSize: 12, color: Colors.success, fontWeight: '700' },
  ratingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, ...Shadows.card },
  ratingStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  ratingStar: { fontSize: 28 },
  ratingVal: { fontSize: 16, fontWeight: '700', color: Colors.black, marginLeft: 8 },
  ratingComment: { ...Typography.body, fontStyle: 'italic', color: Colors.gray },
  helpBtn: { flexDirection: 'row', alignItems: 'center', margin: Spacing.base, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, gap: 12, ...Shadows.card, marginBottom: Spacing.xxxl },
  helpText: { flex: 1, ...Typography.bodyMed },
  helpArrow: { fontSize: 22, color: Colors.lightGray },
});
