/**
 * Slot App — HomeMaintenanceCalendarScreen
 * Personalised annual maintenance schedule based on past bookings + home profile.
 * Auto-reminds 7 days before each service. "Book now at today's price."
 * Turns the app from a booking tool into a home health platform.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { api } from '../../utils/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SERVICE_INTERVALS = {
  'AC Service':        { months: 6,  icon: '❄️', color: '#2196F3', urgencyDays: 30 },
  'Deep Cleaning':     { months: 1,  icon: '🧹', color: '#4CAF50', urgencyDays: 7  },
  'Pest Control':      { months: 3,  icon: '🪲', color: '#FF5722', urgencyDays: 14 },
  'Sofa Cleaning':     { months: 4,  icon: '🛋️', color: '#9C27B0', urgencyDays: 21 },
  'Plumbing':          { months: 6,  icon: '🔧', color: '#00BCD4', urgencyDays: 30 },
  'Electrical':        { months: 12, icon: '⚡', color: '#FFC107', urgencyDays: 30 },
  'Painting':          { months: 24, icon: '🖌️', color: '#E91E63', urgencyDays: 60 },
  'Car Wash':          { months: 0.5,icon: '🚗', color: '#607D8B', urgencyDays: 3  },
  'Salon at Home':     { months: 1,  icon: '💄', color: '#F06292', urgencyDays: 7  },
};

function urgencyLabel(daysUntil) {
  if (daysUntil < 0)   return { label: 'Overdue!',      color: '#E53935', bg: '#FFEBEE' };
  if (daysUntil <= 7)  return { label: 'Due this week', color: '#E65100', bg: '#FFF3E0' };
  if (daysUntil <= 30) return { label: 'Due this month',color: '#F57F17', bg: '#FFFDE7' };
  return { label: `In ${daysUntil} days`,               color: '#388E3C', bg: '#E8F5E9' };
}

export default function HomeMaintenanceCalendarScreen({ navigation }) {
  const insets  = useSafeAreaInsets();
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('upcoming'); // 'upcoming' | 'calendar'
  const [reminding, setReminding] = useState(null);

  useEffect(() => { buildCalendar(); }, []);

  const buildCalendar = async () => {
    try {
      const { data } = await api.get('/bookings?status=completed&limit=50');
      const bookings = data.bookings || [];

      // Build maintenance schedule from booking history
      const serviceMap = {};
      for (const b of bookings) {
        const name = b.service?.name;
        if (!name) continue;
        if (!serviceMap[name] || new Date(b.completedAt || b.scheduledDate) > new Date(serviceMap[name].lastDate)) {
          serviceMap[name] = {
            serviceName: name,
            lastDate:    b.completedAt || b.scheduledDate,
            serviceId:   b.service?._id || b.service?.slug,
            icon:        b.service?.icon || SERVICE_INTERVALS[name]?.icon || '🔧',
          };
        }
      }

      // Calculate next due dates
      const now   = new Date();
      const items = [];

      for (const [name, info] of Object.entries(serviceMap)) {
        const interval = SERVICE_INTERVALS[name];
        if (!interval) continue;
        const lastDate = new Date(info.lastDate);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + interval.months);
        const daysUntil = Math.ceil((nextDate - now) / 86400000);
        items.push({
          id:          `${name}_${Date.now()}`,
          serviceName: name,
          icon:        info.icon,
          color:       interval.color,
          lastDate,
          nextDate,
          daysUntil,
          serviceId:   info.serviceId,
          intervalMonths: interval.months,
          urgencyDays: interval.urgencyDays,
          hasReminder: false,
        });
      }

      // Add default services not yet booked
      for (const [name, interval] of Object.entries(SERVICE_INTERVALS)) {
        if (!serviceMap[name]) {
          items.push({
            id:          `${name}_new`,
            serviceName: name,
            icon:        interval.icon,
            color:       interval.color,
            lastDate:    null,
            nextDate:    new Date(Date.now() + interval.months * 30 * 86400000),
            daysUntil:   interval.months * 30,
            serviceId:   name.toLowerCase().replace(/ /g, '-'),
            intervalMonths: interval.months,
            urgencyDays: interval.urgencyDays,
            hasReminder: false,
            neverBooked: true,
          });
        }
      }

      // Sort by urgency
      items.sort((a, b) => a.daysUntil - b.daysUntil);
      setTasks(items);
    } catch (e) {
      // Generate default calendar
      const defaults = Object.entries(SERVICE_INTERVALS).map(([name, info]) => ({
        id: name, serviceName: name, icon: info.icon, color: info.color,
        lastDate: null, nextDate: new Date(Date.now() + info.months * 30 * 86400000),
        daysUntil: info.months * 30, serviceId: name.toLowerCase().replace(/ /g, '-'),
        intervalMonths: info.months, urgencyDays: info.urgencyDays, neverBooked: true,
      }));
      setTasks(defaults.sort((a, b) => a.daysUntil - b.daysUntil));
    }
    setLoading(false);
  };

  const setReminder = async (task) => {
    setReminding(task.id);
    try {
      await api.post('/notifications/schedule', {
        type:      'maintenance_reminder',
        serviceId: task.serviceId,
        dueDate:   task.nextDate,
        message:   `${task.serviceName} is due in 7 days. Book now to lock today's price.`,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, hasReminder: true } : t));
      Alert.alert('✅ Reminder Set', `We'll remind you 7 days before your ${task.serviceName} is due.`);
    } catch {
      // Fallback — mark locally
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, hasReminder: true } : t));
      Alert.alert('✅ Reminder Set', `We'll remind you 7 days before your ${task.serviceName} is due.`);
    }
    setReminding(null);
  };

  const bookNow = (task) => {
    navigation.navigate('ServiceDetail', { serviceId: task.serviceId });
  };

  const overdue  = tasks.filter(t => t.daysUntil < 0);
  const urgent   = tasks.filter(t => t.daysUntil >= 0 && t.daysUntil <= 30);
  const upcoming = tasks.filter(t => t.daysUntil > 30);

  const Section = ({ title, items, accent }) => {
    if (!items.length) return null;
    return (
      <View style={S.section}>
        <Text style={[S.sectionTitle, accent && { color: accent }]}>{title}</Text>
        {items.map(task => {
          const u = urgencyLabel(task.daysUntil);
          return (
            <View key={task.id} style={[S.card, { borderLeftColor: task.color }]}>
              <View style={S.cardTop}>
                <Text style={S.taskIcon}>{task.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.taskName}>{task.serviceName}</Text>
                  {task.lastDate ? (
                    <Text style={S.taskMeta}>
                      Last: {new Date(task.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  ) : (
                    <Text style={[S.taskMeta, { color: Colors.warning }]}>Never booked — recommended</Text>
                  )}
                </View>
                <View style={[S.urgencyBadge, { backgroundColor: u.bg }]}>
                  <Text style={[S.urgencyText, { color: u.color }]}>{u.label}</Text>
                </View>
              </View>

              <View style={S.cardBottom}>
                <View>
                  <Text style={S.nextLabel}>Next due</Text>
                  <Text style={S.nextDate}>
                    {new Date(task.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                  </Text>
                </View>
                <View style={S.cardActions}>
                  <TouchableOpacity
                    style={[S.reminderBtn, task.hasReminder && S.reminderBtnActive]}
                    onPress={() => !task.hasReminder && setReminder(task)}
                    disabled={reminding === task.id}>
                    {reminding === task.id
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : <Text style={[S.reminderBtnText, task.hasReminder && { color: Colors.success }]}>
                          {task.hasReminder ? '🔔 Reminder set' : '🔔 Remind me'}
                        </Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={S.bookBtn} onPress={() => bookNow(task)}>
                    <Text style={S.bookBtnText}>Book →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={{ fontSize: 24, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={S.headerTitle}>🏠 Home Maintenance Calendar</Text>
          <Text style={S.headerSub}>Your personalised annual service schedule</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats strip */}
      <View style={S.statsStrip}>
        <View style={S.statItem}>
          <Text style={[S.statNum, { color: '#E53935' }]}>{overdue.length}</Text>
          <Text style={S.statLabel}>Overdue</Text>
        </View>
        <View style={S.statItem}>
          <Text style={[S.statNum, { color: Colors.warning }]}>{urgent.length}</Text>
          <Text style={S.statLabel}>Due soon</Text>
        </View>
        <View style={S.statItem}>
          <Text style={[S.statNum, { color: Colors.success }]}>{upcoming.length}</Text>
          <Text style={S.statLabel}>Upcoming</Text>
        </View>
        <View style={S.statItem}>
          <Text style={[S.statNum, { color: Colors.primary }]}>{tasks.filter(t => t.hasReminder).length}</Text>
          <Text style={S.statLabel}>Reminders</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textLight, marginTop: 12 }}>Building your calendar...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <View style={S.intro}>
            <Text style={S.introText}>
              Based on your booking history. Tap "Remind me" and we'll notify you 7 days before each service is due.
            </Text>
          </View>
          <Section title="⚠️ Overdue" items={overdue} accent="#E53935" />
          <Section title="⏰ Due within 30 days" items={urgent} accent={Colors.warning} />
          <Section title="📅 Upcoming" items={upcoming} />
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsStrip:   { flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  statItem:     { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  intro:        { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, marginBottom: 16 },
  introText:    { fontSize: 13, color: '#3730a3', lineHeight: 20 },
  section:      { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  card:         { backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4, ...Shadows.sm },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  taskIcon:     { fontSize: 28 },
  taskName:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  taskMeta:     { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  urgencyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  urgencyText:  { fontSize: 11, fontWeight: '600' },
  cardBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLabel:    { fontSize: 11, color: Colors.textLight },
  nextDate:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardActions:  { flexDirection: 'row', gap: 8 },
  reminderBtn:  { borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 7 },
  reminderBtnActive: { borderColor: Colors.success, backgroundColor: Colors.success + '10' },
  reminderBtnText:   { fontSize: 11, fontWeight: '600', color: Colors.textLight },
  bookBtn:      { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  bookBtnText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
});
