/**
 * MK Professional App — Notifications Screen
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../utils/theme';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const ICONS = {
  booking_confirmed:    '✅',
  booking_cancelled:    '❌',
  booking_completed:    '🎉',
  professional_assigned:'👷',
  payment_success:      '💳',
  new_booking:          '🔔',
  review:               '⭐',
  system:               '📢',
  wallet_credit:        '💰',
  default:              '📬',
};

export default function ProNotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const { data } = await axios.get(`${API}/notifications`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await axios.delete(`${API}/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[S.item, !item.isRead && S.itemUnread]}
      onPress={() => {
        markRead(item._id);
        if (item.data?.bookingId) navigation.navigate('JobDetail', { bookingId: item.data.bookingId });
      }}
      onLongPress={() =>
        Alert.alert('Delete', 'Remove this notification?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteNotif(item._id) },
        ])
      }
    >
      <View style={[S.iconWrap, !item.isRead && S.iconWrapActive]}>
        <Text style={S.icon}>{ICONS[item.type] || ICONS.default}</Text>
      </View>
      <View style={S.content}>
        <View style={S.row}>
          <Text style={[S.title, !item.isRead && S.titleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={S.time}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={S.message} numberOfLines={2}>{item.message}</Text>
        {!item.isRead && <View style={S.dot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={S.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={S.unreadBadge}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={S.markAllBtn}>
            <Text style={S.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={S.center}>
          <Text style={S.loadingText}>Loading...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={S.center}>
          <Text style={S.emptyIcon}>🔔</Text>
          <Text style={S.emptyTitle}>All caught up!</Text>
          <Text style={S.emptyText}>No notifications yet. New job alerts will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight || '#F7F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: Colors.dark || '#1A1A2E' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: Colors.dark || '#1A1A2E' },
  unreadBadge:  { fontSize: 12, color: Colors.primary || '#f15c22' },
  markAllBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.primaryLight || '#fff3f0' },
  markAllText:  { fontSize: 12, color: Colors.primary || '#f15c22', fontWeight: '600' },
  item: {
    flexDirection: 'row', padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F7F7FA',
  },
  itemUnread: { backgroundColor: '#FFFAF8' },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  iconWrapActive: { backgroundColor: Colors.primaryLight || '#fff3f0' },
  icon:       { fontSize: 22 },
  content:    { flex: 1, position: 'relative' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:      { flex: 1, fontSize: 14, color: Colors.dark || '#1A1A2E', marginRight: 8 },
  titleBold:  { fontWeight: '700' },
  time:       { fontSize: 11, color: Colors.gray || '#999' },
  message:    { fontSize: 13, color: Colors.midGray || '#666', marginTop: 3, lineHeight: 18 },
  dot: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary || '#f15c22',
  },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText:{ fontSize: 16, color: Colors.gray || '#999' },
  emptyIcon:  { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark || '#1A1A2E', marginBottom: 8 },
  emptyText:  { fontSize: 14, color: Colors.gray || '#999', textAlign: 'center', lineHeight: 20 },
});
