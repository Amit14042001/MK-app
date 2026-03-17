/**
 * MK App — Bookings Screen (Full)
 * My bookings with tabs: All / Upcoming / Completed / Cancelled
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { bookingsAPI } from '../../utils/api';

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_MAP = {
  pending:               { color: '#E65100', bg: '#FFF3E0', label: 'Pending',      icon: '⏳' },
  confirmed:             { color: '#1565C0', bg: '#E3F2FD', label: 'Confirmed',    icon: '✅' },
  professional_assigned: { color: '#1565C0', bg: '#E3F2FD', label: 'Pro Assigned', icon: '👷' },
  professional_arriving: { color: '#6A1B9A', bg: '#F3E5F5', label: 'On The Way',   icon: '🚗' },
  professional_arrived:  { color: '#6A1B9A', bg: '#F3E5F5', label: 'Arrived',      icon: '🏠' },
  in_progress:           { color: '#E65100', bg: '#FFF3E0', label: 'In Progress',  icon: '🔧' },
  completed:             { color: '#2E7D32', bg: '#E8F5E9', label: 'Completed',    icon: '🎉' },
  cancelled:             { color: '#C62828', bg: '#FFEBEE', label: 'Cancelled',    icon: '❌' },
  rescheduled:           { color: '#1565C0', bg: '#E3F2FD', label: 'Rescheduled', icon: '📅' },
  no_show:               { color: '#C62828', bg: '#FFEBEE', label: 'No Show',      icon: '👻' },
};

const UPCOMING_STATUSES  = new Set(['pending','confirmed','professional_assigned','professional_arriving','professional_arrived','in_progress']);
const LIVE_STATUSES      = new Set(['professional_assigned','professional_arriving','professional_arrived','in_progress']);

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const target   = new Date(d);    target.setHours(0,0,0,0);
  if (target.getTime() === today.getTime())    return 'Today';
  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BookingCard({ booking, onPress, onCancel, onReschedule, onTrack, onReview, onRebook }) {
  const st     = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const isLive = LIVE_STATUSES.has(booking.status);

  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.92}>
      {/* Header */}
      <View style={S.cardHeader}>
        <View style={S.serviceRow}>
          <Text style={S.serviceIcon}>{booking.service?.icon || '🔧'}</Text>
          <View style={S.serviceInfo}>
            <Text style={S.serviceName} numberOfLines={1}>{booking.service?.name || 'Service'}</Text>
            <Text style={S.bookingId}>#{booking.bookingId}</Text>
          </View>
        </View>
        <View style={[S.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={S.statusIcon}>{st.icon}</Text>
          <Text style={[S.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={S.cardBody}>
        <View style={S.detailRow}>
          <Text style={S.detailIcon}>📅</Text>
          <Text style={S.detailText}>{formatDate(booking.scheduledDate)} • {booking.scheduledTime}</Text>
        </View>
        {booking.address?.line1 && (
          <View style={S.detailRow}>
            <Text style={S.detailIcon}>📍</Text>
            <Text style={S.detailText} numberOfLines={1}>
              {booking.address.area ? `${booking.address.area}, ` : ''}{booking.address.city}
            </Text>
          </View>
        )}
        {booking.professional?.user && (
          <View style={S.detailRow}>
            <Text style={S.detailIcon}>👷</Text>
            <Text style={S.detailText}>{booking.professional.user.name} • ⭐ {booking.professional.rating?.toFixed(1) || '4.8'}</Text>
          </View>
        )}
        <View style={S.amountRow}>
          <Text style={S.amountLabel}>Total Paid</Text>
          <Text style={S.amount}>₹{booking.pricing?.totalAmount || 0}</Text>
        </View>
      </View>

      {/* Live pulse indicator */}
      {isLive && (
        <View style={S.liveBar}>
          <View style={S.liveDot} />
          <Text style={S.liveText}>LIVE — Tap to track</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={S.cardActions}>
        {UPCOMING_STATUSES.has(booking.status) && (
          <>
            {isLive && (
              <TouchableOpacity style={[S.actionBtn, S.primaryBtn]} onPress={onTrack}>
                <Text style={S.primaryBtnText}>📍 Track Now</Text>
              </TouchableOpacity>
            )}
            {['pending','confirmed'].includes(booking.status) && (
              <>
                <TouchableOpacity style={[S.actionBtn, S.secondaryBtn]} onPress={onReschedule}>
                  <Text style={S.secondaryBtnText}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.actionBtn, S.dangerBtn]} onPress={onCancel}>
                  <Text style={S.dangerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
        {booking.status === 'completed' && !booking.isReviewed && (
          <TouchableOpacity style={[S.actionBtn, S.primaryBtn, { flex: 1 }]} onPress={onReview}>
            <Text style={S.primaryBtnText}>⭐ Rate & Review</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'completed' && booking.isReviewed && (
          <View style={[S.actionBtn, S.reviewedBtn]}>
            <Text style={S.reviewedText}>✅ Reviewed</Text>
          </View>
        )}
        {booking.status === 'completed' && (
          <TouchableOpacity
            style={[S.actionBtn, { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryMid }]}
            onPress={() => onRebook && onRebook(booking)}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>🔄 Book Again</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'cancelled' && (
          <TouchableOpacity style={[S.actionBtn, S.secondaryBtn, { flex: 1 }]}
            onPress={() => {}}>
            <Text style={S.secondaryBtnText}>🔄 Book Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBookings = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh) { setRefreshing(true); setPage(1); pageNum = 1; }
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pageNum, limit: 10 };
      if (activeTab === 'upcoming')  params.status = Array.from(UPCOMING_STATUSES).join(',');
      if (activeTab === 'completed') params.status = 'completed';
      if (activeTab === 'cancelled') params.status = 'cancelled,no_show';

      const { data } = await bookingsAPI.getAll(params);
      const newBookings = data.bookings || [];

      if (isRefresh || pageNum === 1) setBookings(newBookings);
      else setBookings(prev => [...prev, ...newBookings]);

      setHasMore(newBookings.length === 10);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchBookings(false, 1); }, [activeTab]);

  const handleCancel = (booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel booking for ${booking.service?.name}?\n\nCancellation charges may apply based on our policy.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking', style: 'destructive',
          onPress: async () => {
            try {
              await bookingsAPI.cancel(booking._id, 'Customer cancelled');
              fetchBookings(true);
            } catch { Alert.alert('Error', 'Could not cancel. Please try again.'); }
          },
        },
      ]
    );
  };

  const filteredBookings = activeTab === 'all' ? bookings : bookings;

  if (loading) {
    return (
      <View style={[S.container, { paddingTop: insets.top }]}>
        <View style={S.header}>
          <Text style={S.headerTitle}>My Bookings</Text>
        </View>
        <View style={S.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>My Bookings</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Rebook')}
            style={[S.notifBtn, { backgroundColor: Colors.primaryLight, paddingHorizontal: 10 }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.primary }}>⭐ Fav Pros</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={S.notifBtn}>
            <Text style={S.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[S.tab, activeTab === tab.key && S.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[S.tabLabel, activeTab === tab.key && S.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <View style={S.empty}>
          <Text style={S.emptyIcon}>📋</Text>
          <Text style={S.emptyTitle}>No {activeTab === 'all' ? '' : activeTab} bookings</Text>
          <Text style={S.emptyText}>
            {activeTab === 'upcoming'
              ? "You don't have any upcoming bookings. Book a service now!"
              : activeTab === 'completed'
              ? "Your completed bookings will appear here."
              : activeTab === 'cancelled'
              ? "No cancelled bookings."
              : "You haven't made any bookings yet."}
          </Text>
          {activeTab !== 'completed' && activeTab !== 'cancelled' && (
            <TouchableOpacity style={S.bookNowBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={S.bookNowText}>Browse Services</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
              onCancel={() => handleCancel(item)}
              onReschedule={() => navigation.navigate('Reschedule', { booking: item })}
              onTrack={() => navigation.navigate('Tracking', { bookingId: item._id })}
              onReview={() => navigation.navigate('Review', { booking: item })}
              onRebook={() => navigation.navigate('Rebook')}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          onEndReached={() => { if (hasMore && !loadingMore) fetchBookings(false, page + 1); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => loadingMore
            ? <ActivityIndicator style={{ margin: 20 }} color={Colors.primary} />
            : null}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  notifBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7F7FA', justifyContent: 'center', alignItems: 'center' },
  notifIcon:    { fontSize: 20 },
  tabs:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel:     { fontSize: 13, fontWeight: '500', color: '#999' },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  card:         { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...Shadows.md },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F7F7FA' },
  serviceRow:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  serviceIcon:  { fontSize: 32, marginRight: 12 },
  serviceInfo:  { flex: 1 },
  serviceName:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  bookingId:    { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  statusIcon:   { fontSize: 12 },
  statusText:   { fontSize: 12, fontWeight: '700' },
  cardBody:     { padding: 16 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailIcon:   { fontSize: 14, marginRight: 8, width: 20 },
  detailText:   { fontSize: 13, color: '#555', flex: 1 },
  amountRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F7F7FA' },
  amountLabel:  { fontSize: 13, color: '#999' },
  amount:       { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  liveBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  liveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  liveText:     { fontSize: 12, fontWeight: '700', color: Colors.primary },
  cardActions:  { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  actionBtn:    { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtn:   { backgroundColor: Colors.primary },
  primaryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  secondaryBtn: { backgroundColor: '#F0F0F5' },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  dangerBtn:    { backgroundColor: '#FFEBEE' },
  dangerBtnText:{ fontSize: 13, fontWeight: '600', color: '#C62828' },
  reviewedBtn:  { backgroundColor: '#E8F5E9' },
  reviewedText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon:    { fontSize: 64, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  emptyText:    { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  bookNowBtn:   { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 20, ...Shadows.md },
  bookNowText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
