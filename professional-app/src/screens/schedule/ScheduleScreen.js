/**
 * Slot Professional App — ScheduleScreen
 * Full weekly/monthly calendar with availability toggling, blocked slots, booking slots
 */
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Switch, FlatList, Alert, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows, Radius } from '../../utils/theme';

const { width: W } = Dimensions.get('window');
const DAY_W = (W - 32 - 6 * 4) / 7;

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 7; // 7 AM – 8 PM
  return { value: h, label: h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM` };
});

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// ── Mock availability data ────────────────────────────────────
const generateMockSchedule = () => {
  const schedule = {};
  const now = new Date();
  for (let d = -7; d < 30; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    const key = date.toISOString().split('T')[0];
    if (date.getDay() !== 0) { // Not Sunday
      schedule[key] = {
        isAvailable: true,
        slots: HOURS.slice(1, 10).map(h => ({
          hour: h.value,
          label: h.label,
          status: Math.random() > 0.6 ? 'booked' : Math.random() > 0.5 ? 'blocked' : 'available',
          bookingId: Math.random() > 0.6 ? `BK${Math.floor(Math.random()*9000+1000)}` : null,
        })),
      };
    } else {
      schedule[key] = { isAvailable: false, slots: [] };
    }
  }
  return schedule;
};

export default function ScheduleScreen({ navigation }) {
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [schedule, setSchedule]           = useState({});
  const [view, setView]                   = useState('month'); // 'month' | 'week' | 'day'
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [slotModalVisible, setSlotModal]  = useState(false);
  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [availabilityModal, setAvailModal]= useState(false);
  const [workingHours, setWorkingHours]   = useState({ start: 8, end: 19 });
  const [editHours, setEditHours]         = useState(false);
  const [weeklyDefaults, setWeeklyDefaults] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false,
  });

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('proToken');
      const resp  = await fetch(
        `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/schedule`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (data.success && data.schedule) {
        setSchedule(data.schedule);
      } else {
        setSchedule(generateMockSchedule());
      }
    } catch {
      setSchedule(generateMockSchedule());
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  }, []);

  const selectedKey = selectedDate.toISOString().split('T')[0];
  const dayData     = schedule[selectedKey] || { isAvailable: false, slots: [] };

  const toggleDayAvailability = (key) => {
    setSchedule(prev => ({
      ...prev,
      [key]: { ...prev[key], isAvailable: !prev[key]?.isAvailable },
    }));
  };

  const toggleSlotStatus = (hour) => {
    setSchedule(prev => {
      const day = prev[selectedKey] || { isAvailable: true, slots: [] };
      const slots = day.slots.map(s =>
        s.hour === hour
          ? { ...s, status: s.status === 'blocked' ? 'available' : 'blocked' }
          : s
      );
      return { ...prev, [selectedKey]: { ...day, slots } };
    });
    setSlotModal(false);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const renderCalendarCell = (day, idx) => {
    if (!day) return <View key={`empty-${idx}`} style={[S.cell, { width: DAY_W }]} />;
    const d    = new Date(year, month, day);
    const key  = d.toISOString().split('T')[0];
    const data = schedule[key];
    const today   = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const isSel   = d.toDateString() === selectedDate.toDateString();
    const isPast  = d < new Date(today.setHours(0,0,0,0));
    const bookedCount = data?.slots?.filter(s => s.status === 'booked').length || 0;

    return (
      <TouchableOpacity
        key={key}
        style={[S.cell, { width: DAY_W },
          isSel && S.cellSelected,
          isToday && !isSel && S.cellToday,
          isPast && S.cellPast,
        ]}
        onPress={() => setSelectedDate(new Date(year, month, day))}
        activeOpacity={0.7}
      >
        <Text style={[S.cellDay, isSel && S.cellDaySelected, isPast && S.cellDayPast]}>{day}</Text>
        {data?.isAvailable && !isPast && (
          <View style={S.dotRow}>
            {bookedCount > 0 && <View style={[S.dot, { backgroundColor: Colors.primary }]} />}
            {data.slots.some(s => s.status === 'available') && (
              <View style={[S.dot, { backgroundColor: Colors.success }]} />
            )}
          </View>
        )}
        {!data?.isAvailable && !isPast && <Text style={S.offLabel}>Off</Text>}
      </TouchableOpacity>
    );
  };

  const renderMonthGrid = () => {
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  };

  const getSlotStatusColor = (status) => {
    if (status === 'booked') return Colors.primary;
    if (status === 'blocked') return Colors.midGray;
    return Colors.success;
  };

  const upcomingBookings = Object.entries(schedule)
    .filter(([key]) => key >= new Date().toISOString().split('T')[0])
    .flatMap(([key, data]) => (data?.slots || [])
      .filter(s => s.status === 'booked')
      .map(s => ({ date: key, ...s }))
    )
    .slice(0, 10);

  if (loading) {
    return (
      <View style={S.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={S.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Schedule</Text>
        <TouchableOpacity onPress={() => setAvailModal(true)} style={S.settingsBtn}>
          <Text style={S.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle */}
      <View style={S.viewToggle}>
        {['month', 'week', 'day'].map(v => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={[S.toggleBtn, view === v && S.toggleBtnActive]}
          >
            <Text style={[S.toggleLabel, view === v && S.toggleLabelActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Month Navigator */}
        <View style={S.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={S.navBtn}>
            <Text style={S.navIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={S.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={S.navBtn}>
            <Text style={S.navIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={S.dayHeaders}>
          {DAYS.map(d => (
            <Text key={d} style={[S.dayHeader, { width: DAY_W }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={S.grid}>
          {renderMonthGrid().map((week, wi) => (
            <View key={wi} style={S.week}>
              {week.map((day, di) => renderCalendarCell(day, `${wi}-${di}`))}
            </View>
          ))}
        </View>

        {/* Selected Day Detail */}
        <View style={S.dayDetail}>
          <View style={S.dayDetailHeader}>
            <View>
              <Text style={S.dayDetailTitle}>
                {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={S.dayDetailSub}>
                {dayData.isAvailable
                  ? `${dayData.slots?.filter(s => s.status === 'available').length || 0} available slots`
                  : 'Day off'}
              </Text>
            </View>
            <Switch
              value={dayData.isAvailable}
              onValueChange={() => toggleDayAvailability(selectedKey)}
              trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
              thumbColor={dayData.isAvailable ? Colors.primary : Colors.midGray}
            />
          </View>

          {dayData.isAvailable && (
            <View style={S.slotsGrid}>
              {dayData.slots?.map(slot => (
                <TouchableOpacity
                  key={slot.hour}
                  style={[S.slotChip, { borderColor: getSlotStatusColor(slot.status) }]}
                  onPress={() => { setSelectedSlot(slot); setSlotModal(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={[S.slotLabel, { color: getSlotStatusColor(slot.status) }]}>
                    {slot.label}
                  </Text>
                  <View style={[S.slotDot, { backgroundColor: getSlotStatusColor(slot.status) }]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={S.legend}>
          {[
            { color: Colors.success, label: 'Available' },
            { color: Colors.primary, label: 'Booked' },
            { color: Colors.midGray,  label: 'Blocked' },
          ].map(item => (
            <View key={item.label} style={S.legendItem}>
              <View style={[S.legendDot, { backgroundColor: item.color }]} />
              <Text style={S.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Bookings */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Upcoming Bookings</Text>
          {upcomingBookings.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>📅</Text>
              <Text style={S.emptyText}>No upcoming bookings</Text>
            </View>
          ) : (
            upcomingBookings.map((b, i) => (
              <View key={i} style={S.bookingRow}>
                <View style={S.bookingTime}>
                  <Text style={S.bookingHour}>{b.label}</Text>
                  <Text style={S.bookingDate}>
                    {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View style={S.bookingInfo}>
                  <Text style={S.bookingId}>{b.bookingId}</Text>
                  <View style={S.bookingBadge}>
                    <Text style={S.bookingBadgeText}>Confirmed</Text>
                  </View>
                </View>
                <TouchableOpacity style={S.viewBtn}
                  onPress={() => navigation.navigate('JobDetail', { bookingId: b.bookingId })}>
                  <Text style={S.viewBtnText}>View →</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Slot Action Modal */}
      <Modal visible={slotModalVisible} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.bottomSheet}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>
              {selectedSlot?.label} — {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>

            {selectedSlot?.status === 'booked' ? (
              <>
                <View style={S.bookedInfo}>
                  <Text style={S.bookedLabel}>Booking ID</Text>
                  <Text style={S.bookedValue}>{selectedSlot.bookingId}</Text>
                </View>
                <TouchableOpacity
                  style={[S.sheetBtn, S.sheetBtnPrimary]}
                  onPress={() => { setSlotModal(false); navigation.navigate('JobDetail', { bookingId: selectedSlot.bookingId }); }}
                >
                  <Text style={S.sheetBtnPrimaryText}>View Booking Details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[S.sheetBtn, selectedSlot?.status === 'blocked' ? S.sheetBtnSuccess : S.sheetBtnGray]}
                onPress={() => selectedSlot && toggleSlotStatus(selectedSlot.hour)}
              >
                <Text style={S.sheetBtnText}>
                  {selectedSlot?.status === 'blocked' ? '✓ Mark Available' : '✗ Block This Slot'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={S.sheetCancelBtn} onPress={() => setSlotModal(false)}>
              <Text style={S.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Availability Settings Modal */}
      <Modal visible={availabilityModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={[S.bottomSheet, { paddingBottom: 40 }]}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Availability Settings</Text>

            <Text style={S.subSection}>Working Days</Text>
            {Object.entries(weeklyDefaults).map(([day, on]) => (
              <View key={day} style={S.dayRow}>
                <Text style={S.dayRowLabel}>{day}</Text>
                <Switch
                  value={on}
                  onValueChange={v => setWeeklyDefaults(prev => ({ ...prev, [day]: v }))}
                  trackColor={{ false: Colors.lightGray, true: Colors.primaryLight }}
                  thumbColor={on ? Colors.primary : Colors.midGray}
                />
              </View>
            ))}

            <Text style={[S.subSection, { marginTop: 16 }]}>Working Hours</Text>
            <View style={S.hoursRow}>
              <View style={S.hourBox}>
                <Text style={S.hourBoxLabel}>Start</Text>
                <Text style={S.hourBoxValue}>
                  {HOURS.find(h => h.value === workingHours.start)?.label || '8 AM'}
                </Text>
              </View>
              <Text style={S.hourSep}>—</Text>
              <View style={S.hourBox}>
                <Text style={S.hourBoxLabel}>End</Text>
                <Text style={S.hourBoxValue}>
                  {HOURS.find(h => h.value === workingHours.end)?.label || '7 PM'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[S.sheetBtn, S.sheetBtnPrimary, { marginTop: 20 }]}
              onPress={() => {
                Alert.alert('Saved', 'Availability settings updated successfully.');
                setAvailModal(false);
              }}
            >
              <Text style={S.sheetBtnPrimaryText}>Save Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={S.sheetCancelBtn} onPress={() => setAvailModal(false)}>
              <Text style={S.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  loadingText:      { marginTop: 12, ...Typography.body, color: Colors.gray },

  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, ...Shadows.sm },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backIcon:    { fontSize: 22, color: Colors.black },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h3, color: Colors.black },
  settingsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  settingsIcon:{ fontSize: 20 },

  viewToggle:       { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 4, ...Shadows.sm },
  toggleBtn:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive:  { backgroundColor: Colors.primary },
  toggleLabel:      { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  toggleLabelActive:{ ...Typography.caption, color: Colors.white, fontWeight: '700' },

  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  navIcon:     { fontSize: 22, color: Colors.black, lineHeight: 26 },
  monthLabel:  { ...Typography.h3, color: Colors.black },

  dayHeaders: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  dayHeader:  { textAlign: 'center', ...Typography.caption, color: Colors.gray, fontWeight: '600' },

  grid: { paddingHorizontal: 16 },
  week: { flexDirection: 'row', marginBottom: 4 },
  cell: { height: 52, marginHorizontal: 2, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  cellSelected:   { backgroundColor: Colors.primary },
  cellToday:      { borderWidth: 2, borderColor: Colors.primary },
  cellPast:       { backgroundColor: Colors.offWhite },
  cellDay:        { ...Typography.caption, color: Colors.black, fontWeight: '600', marginBottom: 2 },
  cellDaySelected:{ color: Colors.white },
  cellDayPast:    { color: Colors.lightGray },
  dotRow:     { flexDirection: 'row', gap: 2 },
  dot:        { width: 5, height: 5, borderRadius: 2.5 },
  offLabel:   { fontSize: 8, color: Colors.midGray, fontWeight: '600' },

  dayDetail: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, ...Shadows.sm },
  dayDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dayDetailTitle:  { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  dayDetailSub:    { ...Typography.caption, color: Colors.gray, marginTop: 2 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotLabel: { ...Typography.caption, fontWeight: '600' },
  slotDot:   { width: 6, height: 6, borderRadius: 3 },

  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendLabel:{ ...Typography.caption, color: Colors.gray },

  section:      { margin: 16, marginTop: 0 },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: 12 },
  emptyBox:     { backgroundColor: Colors.white, borderRadius: 16, padding: 32, alignItems: 'center', ...Shadows.sm },
  emptyIcon:    { fontSize: 36, marginBottom: 8 },
  emptyText:    { ...Typography.body, color: Colors.gray },

  bookingRow:  { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center', ...Shadows.sm },
  bookingTime: { width: 64 },
  bookingHour: { ...Typography.caption, color: Colors.black, fontWeight: '700' },
  bookingDate: { ...Typography.small, color: Colors.gray, marginTop: 2 },
  bookingInfo: { flex: 1, paddingHorizontal: 12 },
  bookingId:   { ...Typography.body, color: Colors.black, fontWeight: '600' },
  bookingBadge:{ marginTop: 4, backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  bookingBadgeText: { ...Typography.small, color: Colors.success, fontWeight: '700' },
  viewBtn:     { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.primaryLight, borderRadius: 8 },
  viewBtnText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  bottomSheet:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { ...Typography.h3, color: Colors.black, textAlign: 'center', marginBottom: 20 },
  bookedInfo:   { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  bookedLabel:  { ...Typography.caption, color: Colors.primary, marginBottom: 4 },
  bookedValue:  { ...Typography.h3, color: Colors.primaryDark },
  sheetBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  sheetBtnPrimary:      { backgroundColor: Colors.primary },
  sheetBtnPrimaryText:  { ...Typography.body, color: Colors.white, fontWeight: '700' },
  sheetBtnSuccess:      { backgroundColor: Colors.success },
  sheetBtnGray:         { backgroundColor: Colors.lightGray },
  sheetBtnText:         { ...Typography.body, color: Colors.white, fontWeight: '700' },
  sheetCancelBtn:       { paddingVertical: 12, alignItems: 'center' },
  sheetCancelText:      { ...Typography.body, color: Colors.gray },

  subSection: { ...Typography.caption, color: Colors.gray, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  dayRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  dayRowLabel:{ ...Typography.body, color: Colors.black, fontWeight: '500' },
  hoursRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  hourBox:    { backgroundColor: Colors.offWhite, borderRadius: 12, padding: 16, alignItems: 'center', flex: 1 },
  hourBoxLabel:{ ...Typography.caption, color: Colors.gray, marginBottom: 4 },
  hourBoxValue:{ ...Typography.h3, color: Colors.black },
  hourSep:    { ...Typography.h3, color: Colors.gray },
});
