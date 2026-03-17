import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Switch, Alert, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Common, Screen } from '../../utils/theme';
import { usersAPI, bookingsAPI, reviewsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ══════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ══════════════════════════════════════════════════════════════
export function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getStats()
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: '📋', label: 'My Bookings',        screen: 'MyBookings' },
    { icon: '👑', label: 'My Subscription',     screen: 'Subscription', badge: user?.subscriptionPlan ? user.subscriptionPlan : null, highlight: true },
    { icon: '🏆', label: 'Loyalty & Rewards',   screen: 'Loyalty' },
    { icon: '📍', label: 'Saved Addresses',     screen: 'Addresses' },
    { icon: '💳', label: 'Payment Methods',     screen: 'Payments' },
    { icon: '👛', label: 'Wallet & Rewards',    screen: 'Wallet', badge: `₹${stats?.walletBalance || 0}` },
    { icon: '🎁', label: 'Refer & Earn',        screen: 'Refer' },
    { icon: '⭐', label: 'My Reviews',           screen: 'MyReviews' },
    { icon: '🔔', label: 'Notifications',       screen: 'Notifications' },
    { icon: '🔒', label: 'Privacy & Security',  screen: 'Privacy' },
    { icon: '❓', label: 'Help & Support',       screen: 'Help' },
    { icon: '📄', label: 'Terms & Policies',    screen: 'Terms' },
  ];

  return (
    <View style={[Common.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header gradient */}
        <LinearGradient colors={['#1A1A2E', '#0F3460']} style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Text style={{ fontSize: 16 }}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Guest'}</Text>
          <Text style={styles.profilePhone}>{user?.phone}</Text>
          {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>
              {user?.membershipTier || 'Standard'} Member  ·  Since {new Date(user?.createdAt || Date.now()).getFullYear()}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { label: 'Bookings', value: stats.totalBookings || 0 },
              { label: 'Completed', value: stats.completedBookings || 0 },
              { label: 'Spent', value: `₹${((stats.totalSpent || 0) / 1000).toFixed(1)}K` },
              { label: 'Wallet', value: `₹${stats.walletBalance || 0}` },
            ].map(s => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={item.label} onPress={() => navigation.navigate(item.screen)}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder, item.highlight && styles.menuItemHighlight]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.highlight && { color: Colors.primary, fontWeight: '700' }]}>{item.label}</Text>
              <View style={Common.row}>
                {item.badge && (
                  <View style={[styles.menuBadge, item.highlight && { backgroundColor: Colors.primary + '20' }]}>
                    <Text style={[styles.menuBadgeText, item.highlight && { color: Colors.primary }]}>{item.badge}</Text>
                  </View>
                )}
                <Text style={styles.menuArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* App version */}
        <Text style={styles.appVersion}>MK App v1.0.0  ·  © 2026 MK Technologies</Text>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// MY BOOKINGS SCREEN
// ══════════════════════════════════════════════════════════════
const STATUS_CONFIG = {
  pending:                { color: Colors.warning, bg: Colors.warningLight, label: 'Pending' },
  confirmed:              { color: Colors.info, bg: Colors.infoLight, label: 'Confirmed' },
  professional_assigned:  { color: Colors.info, bg: Colors.infoLight, label: 'Pro Assigned' },
  professional_arriving:  { color: '#9C27B0', bg: '#F3E5F5', label: 'On The Way' },
  professional_arrived:   { color: '#9C27B0', bg: '#F3E5F5', label: 'Arrived' },
  in_progress:            { color: '#FF6F00', bg: '#FFF3E0', label: 'In Progress' },
  completed:              { color: Colors.success, bg: Colors.successLight, label: 'Completed' },
  cancelled:              { color: Colors.error, bg: Colors.errorLight, label: 'Cancelled' },
};

function BookingCard({ booking, onTrack, onCancel, onRate, onDetails }) {
  const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const canTrack = ['professional_assigned','professional_arriving','professional_arrived','in_progress'].includes(booking.status);
  const canCancel = ['pending','confirmed','professional_assigned'].includes(booking.status);
  const canRate = booking.status === 'completed' && !booking.isReviewed;

  return (
    <TouchableOpacity onPress={onDetails} style={styles.bookingCard} activeOpacity={0.85}>
      <View style={Common.rowBetween}>
        <View style={Common.row}>
          <Text style={styles.bookingIcon}>{booking.service?.icon || '🔧'}</Text>
          <View>
            <Text style={styles.bookingService}>{booking.service?.name || 'Service'}</Text>
            {booking.subService?.name && (
              <Text style={styles.bookingSub}>{booking.subService.name}</Text>
            )}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={styles.bookingDivider} />

      <View style={[Common.row, { gap: Spacing.base, flexWrap: 'wrap' }]}>
        <Text style={styles.bookingMeta}>📅 {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        <Text style={styles.bookingMeta}>⏰ {booking.scheduledTime}</Text>
        <Text style={styles.bookingMeta}>💰 ₹{booking.pricing?.totalAmount}</Text>
      </View>

      {booking.professional?.user?.name && (
        <Text style={[styles.bookingMeta, { marginTop: Spacing.xs }]}>
          👷 {booking.professional.user.name}
        </Text>
      )}

      <Text style={[styles.bookingMeta, { marginTop: Spacing.xs, color: Colors.midGray }]}>
        ID: {booking.bookingId}
      </Text>

      {(canTrack || canCancel || canRate) && (
        <View style={[Common.row, { gap: Spacing.sm, marginTop: Spacing.base }]}>
          {canTrack && (
            <TouchableOpacity onPress={onTrack} style={[styles.actionBtn, { backgroundColor: Colors.infoLight }]}>
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>📍 Track</Text>
            </TouchableOpacity>
          )}
          {canRate && (
            <TouchableOpacity onPress={onRate} style={[styles.actionBtn, { backgroundColor: Colors.warningLight }]}>
              <Text style={[styles.actionBtnText, { color: Colors.warning }]}>⭐ Rate</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity onPress={onCancel} style={[styles.actionBtn, { backgroundColor: Colors.errorLight }]}>
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>✕ Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MyBookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const FILTERS = ['all', 'confirmed', 'in_progress', 'completed', 'cancelled'];

  useEffect(() => { loadBookings(); }, [filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await bookingsAPI.getAll(params);
      setBookings(data.bookings || []);
    } catch {} finally { setLoading(false); }
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await bookingsAPI.cancel(id, 'Customer cancelled');
          loadBookings();
        } catch {}
      }},
    ]);
  };

  return (
    <View style={[Common.container, { paddingTop: insets.top }]}>
      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={Common.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : bookings.length === 0 ? (
        <View style={[Common.center, { flex: 1 }]}>
          <Text style={{ fontSize: 56, marginBottom: Spacing.base }}>📋</Text>
          <Text style={Typography.h3}>No bookings yet</Text>
          <Text style={[Typography.body, { marginTop: Spacing.sm }]}>Book your first service!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={[Common.primaryBtn, { marginTop: Spacing.xl, paddingHorizontal: Spacing.xxl }]}>
            <Text style={Common.primaryBtnText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: Spacing.base }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onTrack={() => navigation.navigate('Tracking', { bookingId: item._id })}
              onCancel={() => handleCancel(item._id)}
              onRate={() => navigation.navigate('Review', { bookingId: item._id, serviceId: item.service?._id })}
              onDetails={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
            />
          )}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// REVIEW SCREEN
// ══════════════════════════════════════════════════════════════
export function ReviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { bookingId, serviceId } = route.params;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [subRatings, setSubRatings] = useState({ punctuality: 0, professionalism: 0, quality: 0 });
  const [loading, setLoading] = useState(false);
  const { showToast } = useAuth();

  const QUICK_PHRASES = ['Great work!', 'Very professional', 'On time & efficient', 'Highly recommend!', 'Clean & tidy', 'Excellent service'];

  const handleSubmit = async () => {
    if (rating === 0) { Alert.alert('Please rate the service'); return; }
    setLoading(true);
    try {
      await reviewsAPI.create({ bookingId, serviceId, rating, comment, subRatings });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally { setLoading(false); }
  };

  const displayRating = hovered || rating;

  return (
    <View style={[Common.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
        <Text style={[Typography.h2, { marginBottom: Spacing.xs }]}>Rate Your Experience</Text>
        <Text style={[Typography.body, { marginBottom: Spacing.xxl }]}>Help others choose the right service</Text>

        {/* Star rating */}
        <View style={[Common.center, { marginBottom: Spacing.xl }]}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setRating(i)}>
                <Text style={[styles.bigStar, { color: i <= displayRating ? Colors.star : Colors.lightGray }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[Typography.h3, { color: Colors.primary, marginTop: Spacing.sm }]}>
            {displayRating === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][displayRating]}
          </Text>
        </View>

        {/* Sub-ratings */}
        <View style={styles.subRatingsCard}>
          <Text style={[Typography.bodyMed, { marginBottom: Spacing.md }]}>Rate aspects</Text>
          {[
            { key: 'punctuality', label: 'Punctuality ⏰' },
            { key: 'professionalism', label: 'Professionalism 👔' },
            { key: 'quality', label: 'Work Quality 🔧' },
          ].map(({ key, label }) => (
            <View key={key} style={[Common.rowBetween, { marginBottom: Spacing.md }]}>
              <Text style={Typography.body}>{label}</Text>
              <View style={[Common.row, { gap: Spacing.sm }]}>
                {[1, 2, 3, 4, 5].map(i => (
                  <TouchableOpacity key={i} onPress={() => setSubRatings(s => ({ ...s, [key]: i }))}>
                    <Text style={{ color: i <= subRatings[key] ? Colors.star : Colors.lightGray, fontSize: 20 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Quick phrases */}
        <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Quick Add</Text>
        <View style={styles.phrasesRow}>
          {QUICK_PHRASES.map(p => (
            <TouchableOpacity key={p} onPress={() => setComment(c => c ? c + ' ' + p : p)}
              style={[styles.phraseChip, comment.includes(p) && styles.phraseChipActive]}>
              <Text style={[styles.phraseText, comment.includes(p) && { color: Colors.primary }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment */}
        <Text style={[Typography.label, { marginTop: Spacing.xl, marginBottom: Spacing.sm }]}>Your Review</Text>
        <View style={styles.commentBox}>
          <Text
            style={[styles.commentInput, !comment && { color: Colors.lightGray }]}
            onPress={() => {}}
          >
            {comment || 'Tell others about your experience...'}
          </Text>
        </View>
      </ScrollView>

      {/* Submit button */}
      <View style={[styles.submitBarWrapper, { paddingBottom: insets.bottom + Spacing.base }]}>
        <TouchableOpacity onPress={handleSubmit} disabled={loading || rating === 0} activeOpacity={0.85}>
          <LinearGradient
            colors={rating > 0 ? [Colors.primary, Colors.primaryDark] : ['#ccc', '#aaa']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitBtn}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Submit Review</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Profile
  profileHeader: { padding: Spacing.xl, paddingTop: Spacing.xxl, alignItems: 'center', paddingBottom: Spacing.xxxl },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: Colors.white, fontSize: 32, fontWeight: '800' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  profileName: { color: Colors.white, fontSize: 22, fontWeight: '800', marginBottom: Spacing.xs },
  profilePhone: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 },
  profileEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  memberBadge: { marginTop: Spacing.md, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.pill },
  memberBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: Spacing.base, marginTop: -Spacing.xl, borderRadius: Radius.xl, padding: Spacing.base, ...Shadows.md, marginBottom: Spacing.base },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h4, color: Colors.primary },
  statLabel: { ...Typography.caption, marginTop: 2 },
  menuCard: { backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: Radius.xl, ...Shadows.card, marginBottom: Spacing.base, overflow: 'hidden' },
  menuItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.base, paddingHorizontal: Spacing.base },
  menuItemBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  menuItemHighlight: { backgroundColor: Colors.primary + '08' },
  menuIcon:          { fontSize: 22, width: 36 },
  menuLabel:         { ...Typography.bodyMed, flex: 1 },
  menuArrow: { fontSize: 22, color: Colors.lightGray, fontWeight: '300' },
  menuBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, marginRight: Spacing.sm },
  menuBadgeText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  appVersion: { ...Typography.caption, textAlign: 'center', marginVertical: Spacing.base },
  logoutBtn: { marginHorizontal: Spacing.base, marginBottom: Spacing.xxl, padding: Spacing.base, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center' },
  logoutText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  // Bookings
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterPill: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.offWhite },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { ...Typography.small, fontWeight: '600', color: Colors.gray, textTransform: 'capitalize' },
  filterTextActive: { color: Colors.white },
  bookingCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadows.card },
  bookingIcon: { fontSize: 32, marginRight: Spacing.md },
  bookingService: { ...Typography.bodyMed },
  bookingSub: { ...Typography.small },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingDivider: { height: 1, backgroundColor: Colors.offWhite, marginVertical: Spacing.sm },
  bookingMeta: { ...Typography.small, fontWeight: '500' },
  actionBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  // Review
  starsRow: { flexDirection: 'row', gap: Spacing.sm },
  bigStar: { fontSize: 44 },
  subRatingsCard: { backgroundColor: Colors.offWhite, borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.xl },
  phrasesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  phraseChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.lightGray },
  phraseChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  phraseText: { fontSize: 13, color: Colors.gray, fontWeight: '500' },
  commentBox: { backgroundColor: Colors.offWhite, borderRadius: Radius.lg, padding: Spacing.base, minHeight: 100 },
  commentInput: { ...Typography.body, lineHeight: 22 },
  submitBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.offWhite },
  submitBtn: { borderRadius: Radius.xl, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
