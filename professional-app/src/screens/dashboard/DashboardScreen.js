import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, FlatList, Animated, ActivityIndicator, Alert,
  RefreshControl, StatusBar, AppState,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import Geolocation from 'react-native-geolocation-service';
import { useProfAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';
const SOCKET_URL = process.env.SOCKET_URL || 'http://10.0.2.2:5000';

const STATUS_COLORS = {
  pending:               { bg: '#FFF3E0', color: '#E65100', dot: '#FF9800' },
  confirmed:             { bg: '#E3F2FD', color: '#1565C0', dot: '#2196F3' },
  professional_assigned: { bg: '#E3F2FD', color: '#1565C0', dot: '#2196F3' },
  in_progress:           { bg: '#F3E5F5', color: '#6A1B9A', dot: '#9C27B0' },
  completed:             { bg: '#E8F5E9', color: '#2E7D32', dot: '#4CAF50' },
};

function JobCard({ job, onAccept, onStart, onComplete, onNavigate }) {
  const sc = STATUS_COLORS[job.status] || STATUS_COLORS.pending;
  const isPending = job.status === 'pending' || job.status === 'confirmed';
  const isAssigned = job.status === 'professional_assigned';
  const isInProgress = job.status === 'in_progress';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={styles.jobCard}>
        {/* Header */}
        <View style={styles.jobHeader}>
          <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.jobService}>{job.service?.name}</Text>
            {job.subService?.name && <Text style={styles.jobSub}>{job.subService.name}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>
              {job.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.jobDivider} />

        {/* Customer info */}
        <View style={styles.jobCustomer}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {job.customer?.name?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View>
            <Text style={styles.customerName}>{job.customer?.name}</Text>
            <Text style={styles.customerPhone}>{job.customer?.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => {/* call */}}
            style={styles.callBtn}>
            <Text style={{ fontSize: 18 }}>📞</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobDivider} />

        {/* Details */}
        <View style={styles.jobDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              {new Date(job.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}  ·  {job.scheduledTime}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText} numberOfLines={1}>
              {job.address?.line1}, {job.address?.area}, {job.address?.city}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={[styles.detailText, { fontWeight: '700', color: '#27AE60' }]}>
              You earn: ₹{Math.round((job.pricing?.totalAmount || 0) * 0.80)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.jobActions}>
          {isPending && (
            <>
              <TouchableOpacity onPress={onAccept}
                style={[styles.actionBtn, { backgroundColor: '#E8F5E9', flex: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#2E7D32' }]}>✓ Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {}}
                style={[styles.actionBtn, { backgroundColor: '#FFEBEE', flex: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#C62828' }]}>✕ Decline</Text>
              </TouchableOpacity>
            </>
          )}
          {isAssigned && (
            <>
              <TouchableOpacity onPress={onNavigate}
                style={[styles.actionBtn, { backgroundColor: '#E3F2FD', flex: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#1565C0' }]}>🗺️ Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onStart}
                style={[styles.actionBtn, { backgroundColor: '#E94560', flex: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>▶ Start Job</Text>
              </TouchableOpacity>
            </>
          )}
          {isInProgress && (
            <TouchableOpacity onPress={onComplete}
              style={[styles.actionBtn, { backgroundColor: '#4CAF50', flex: 1 }]}>
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>✅ Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { professional, isOnline, updateOnlineStatus } = useProfAuth();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState(null);
  const locationInterval = useRef(null);

  useEffect(() => {
    loadData();
    initSocket();
    return () => {
      socket?.disconnect();
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, []);

  // Start/stop GPS tracking based on online status
  useEffect(() => {
    if (isOnline) {
      startLocationTracking();
    } else {
      if (locationInterval.current) clearInterval(locationInterval.current);
    }
  }, [isOnline]);

  const initSocket = () => {
    const s = io(SOCKET_URL, {
      auth: { token: axios.defaults.headers.common['Authorization']?.split(' ')[1] },
    });
    s.emit('join_professional', professional?._id);
    s.on('new_booking', (data) => {
      // New job incoming notification
      Alert.alert('🔔 New Job!', `${data.service} - ₹${data.amount}`, [
        { text: 'View', onPress: loadData },
        { text: 'Later', style: 'cancel' },
      ]);
      loadData();
    });
    setSocket(s);
  };

  const startLocationTracking = () => {
    locationInterval.current = setInterval(() => {
      Geolocation.getCurrentPosition(
        pos => {
          socket?.emit('location_update', {
            professionalId: professional?._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
          });
        },
        err => console.warn('Location error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }, 10000); // Every 10 seconds
  };

  const loadData = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/bookings?professional=me&status=pending,confirmed,professional_assigned,in_progress&limit=20`),
        axios.get(`${API}/professionals/me/stats`),
      ]);
      setJobs(jobsRes.data.bookings || []);
      setStats(statsRes.data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleJobAction = async (jobId, status) => {
    try {
      await axios.put(`${API}/bookings/${jobId}/status`, { status });
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  const toggleOnline = async (val) => {
    if (!val) {
      Alert.alert('Go Offline?', 'You won\'t receive new jobs.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Offline', onPress: () => updateOnlineStatus(false) },
      ]);
    } else {
      await updateOnlineStatus(true);
    }
  };

  const todayJobs = jobs.filter(j => {
    const today = new Date().toISOString().split('T')[0];
    return j.scheduledDate?.startsWith(today);
  });

  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const pendingJobs = jobs.filter(j => ['pending', 'confirmed', 'professional_assigned'].includes(j.status));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {professional?.user?.name?.split(' ')[0] || 'Pro'}! 👋</Text>
            <Text style={styles.headerSub}>
              {isOnline ? '🟢 You are Online' : '🔴 You are Offline'}
            </Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: '#555', true: '#27AE60' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { label: "Today's Earn", value: `₹${stats.todayEarnings || 0}`, icon: '💰' },
              { label: 'This Week', value: `₹${stats.weeklyEarnings || 0}`, icon: '📈' },
              { label: "Today's Jobs", value: todayJobs.length, icon: '📋' },
              { label: 'Rating', value: `${stats.rating || 4.8}★`, icon: '⭐' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Jobs list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#E94560" />}>

        {/* Active jobs (in progress) */}
        {activeJobs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔴 Active Job</Text>
            </View>
            {activeJobs.map(job => (
              <JobCard key={job._id} job={job}
                onComplete={() => handleJobAction(job._id, 'completed')}
                onNavigate={() => {}}
              />
            ))}
          </>
        )}

        {/* Pending / upcoming */}
        {pendingJobs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📬 Incoming Jobs</Text>
              <Text style={styles.sectionCount}>{pendingJobs.length}</Text>
            </View>
            {pendingJobs.map(job => (
              <JobCard key={job._id} job={job}
                onAccept={() => handleJobAction(job._id, 'confirmed')}
                onStart={() => handleJobAction(job._id, 'in_progress')}
                onComplete={() => handleJobAction(job._id, 'completed')}
                onNavigate={() => {}}
              />
            ))}
          </>
        )}

        {jobs.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 64, marginBottom: 12 }}>📭</Text>
            <Text style={styles.emptyTitle}>No Jobs Yet</Text>
            <Text style={styles.emptySub}>
              {isOnline
                ? "You're online — jobs will appear here"
                : 'Go online to start receiving jobs'}
            </Text>
            {!isOnline && (
              <TouchableOpacity onPress={() => updateOnlineStatus(true)} style={styles.goOnlineBtn}>
                <Text style={styles.goOnlineText}>Go Online</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#E94560" size="large" />
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        {[
          { icon: '🏠', label: 'Home', screen: 'Dashboard', active: true },
          { icon: '📋', label: 'Jobs', screen: 'Jobs' },
          { icon: '💰', label: 'Earnings', screen: 'Earnings' },
          { icon: '👤', label: 'Profile', screen: 'ProfProfile' },
        ].map(tab => (
          <TouchableOpacity key={tab.screen} onPress={() => navigation.navigate(tab.screen)}
            style={styles.navTab}>
            <Text style={[styles.navIcon, tab.active && { fontSize: 24 }]}>{tab.icon}</Text>
            <Text style={[styles.navLabel, tab.active && { color: '#E94560', fontWeight: '700' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  onlineToggle: { alignItems: 'center', gap: 4 },
  toggleLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, textAlign: 'center', marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  sectionCount: { backgroundColor: '#E94560', color: '#fff', width: 22, height: 22, borderRadius: 11, textAlign: 'center', fontSize: 12, fontWeight: '700', lineHeight: 22 },
  jobCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, shadowColor: 'rgba(0,0,0,0.08)', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
  jobHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  jobService: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  jobSub: { fontSize: 12, color: '#888', marginTop: 1 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  jobDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },
  jobCustomer: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
  customerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  customerPhone: { fontSize: 12, color: '#888' },
  callBtn: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  jobDetails: { padding: 14, gap: 7 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 18 },
  jobActions: { flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  goOnlineBtn: { marginTop: 20, backgroundColor: '#27AE60', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  goOnlineText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F5', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
  navTab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: '#888', marginTop: 3 },
});
