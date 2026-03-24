/**
 * Slot App — Reschedule Screen (Full)
 * Pick a new date and time for an existing booking
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../utils/theme';
import { bookingsAPI, servicesAPI } from '../../utils/api';

const TIMES = [
  '07:00 AM','08:00 AM','09:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM',
  '05:00 PM','06:00 PM','07:00 PM','08:00 PM',
];

function getDates(count = 14) {
  const dates = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateLabel(date) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const target   = new Date(date); target.setHours(0,0,0,0);
  if (target.getTime() === today.getTime())    return { main: 'Today',    sub: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) };
  if (target.getTime() === tomorrow.getTime()) return { main: 'Tomorrow', sub: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) };
  return {
    main: date.toLocaleDateString('en-IN', { weekday: 'short' }),
    sub:  date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
  };
}

export default function RescheduleScreen({ route, navigation }) {
  const insets  = useSafeAreaInsets();
  const { booking } = route.params;

  const dates             = getDates(14);
  const [selDate, setSelDate]     = useState(dates[0]);
  const [selTime, setSelTime]     = useState('');
  const [reason, setReason]       = useState('');
  const [availableSlots, setAvailableSlots] = useState(TIMES);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    "I'm not available at the current time",
    "Need to postpone due to personal reasons",
    "Work schedule conflict",
    "Home not ready / renovation in progress",
    "Waiting for a part / material",
    "Other",
  ];

  useEffect(() => {
    fetchSlots(selDate);
  }, [selDate]);

  const fetchSlots = async (date) => {
    setLoadingSlots(true);
    setSelTime('');
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data } = await servicesAPI.getTimeSlots(booking.service?._id || booking.service, dateStr);
      const slots = (data.slots || []).map(s => s.time || s).filter(Boolean);
      setAvailableSlots(slots.length > 0 ? slots : TIMES);
    } catch {
      setAvailableSlots(TIMES);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selDate || !selTime) {
      Alert.alert('Select Date & Time', 'Please select both a date and a time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await bookingsAPI.reschedule(booking._id, {
        scheduledDate: selDate.toISOString().split('T')[0],
        scheduledTime: selTime,
        reason,
      });
      Alert.alert(
        '✅ Rescheduled!',
        `Your booking has been rescheduled to ${selDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} at ${selTime}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not reschedule. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>Reschedule Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Booking summary */}
        <View style={S.bookingCard}>
          <Text style={S.serviceIcon}>{booking.service?.icon || '🔧'}</Text>
          <View style={S.bookingInfo}>
            <Text style={S.bookingName}>{booking.service?.name || 'Service'}</Text>
            <Text style={S.bookingCurrent}>
              Current: {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {booking.scheduledTime}
            </Text>
          </View>
        </View>

        {/* Cancellation policy */}
        <View style={S.policyCard}>
          <Text style={S.policyTitle}>📋 Reschedule Policy</Text>
          <Text style={S.policyText}>• Free rescheduling up to 4 hours before the booking</Text>
          <Text style={S.policyText}>• A ₹50 fee applies for last-minute changes (within 4 hours)</Text>
          <Text style={S.policyText}>• Maximum 2 reschedules per booking</Text>
        </View>

        {/* Date Picker */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Select New Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.dateRow}>
            {dates.map((date, i) => {
              const { main, sub } = formatDateLabel(date);
              const isSelected    = selDate?.toDateString() === date.toDateString();
              const isWeekend     = [0, 6].includes(date.getDay());
              return (
                <TouchableOpacity
                  key={i}
                  style={[S.dateChip, isSelected && S.dateChipActive, isWeekend && S.dateChipWeekend]}
                  onPress={() => setSelDate(date)}
                >
                  <Text style={[S.dateDayLabel, isSelected && S.dateDayLabelActive]}>{main}</Text>
                  <Text style={[S.dateSubLabel, isSelected && S.dateSubLabelActive]}>{sub}</Text>
                  {isWeekend && !isSelected && <Text style={S.weekendTag}>Weekend</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Picker */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Select Time Slot</Text>
          {loadingSlots ? (
            <ActivityIndicator color={Colors.primary} style={{ margin: 20 }} />
          ) : (
            <View style={S.timeGrid}>
              {availableSlots.map((time) => {
                const isSelected = selTime === time;
                const isPast     = selDate?.toDateString() === new Date().toDateString() &&
                  new Date(`1970/01/01 ${time}`) < new Date();
                return (
                  <TouchableOpacity
                    key={time}
                    style={[S.timeChip, isSelected && S.timeChipActive, isPast && S.timeChipDisabled]}
                    onPress={() => !isPast && setSelTime(time)}
                    disabled={isPast}
                  >
                    <Text style={[S.timeText, isSelected && S.timeTextActive, isPast && S.timeTextDisabled]}>
                      {time}
                    </Text>
                    {isPast && <Text style={S.pastTag}>Past</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Reason */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Reason for Rescheduling</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[S.reasonChip, reason === r && S.reasonChipActive]}
              onPress={() => setReason(r)}
            >
              <View style={[S.radioOuter, reason === r && S.radioOuterActive]}>
                {reason === r && <View style={S.radioInner} />}
              </View>
              <Text style={[S.reasonText, reason === r && S.reasonTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={S.selectedSummary}>
          {selDate && selTime ? (
            <Text style={S.selectedText}>📅 {formatDateLabel(selDate).main} {formatDateLabel(selDate).sub} • {selTime}</Text>
          ) : (
            <Text style={S.selectedPlaceholder}>Please select date and time</Text>
          )}
        </View>
        <TouchableOpacity
          style={[S.rescheduleBtn, (!selDate || !selTime || submitting) && S.rescheduleBtnDisabled]}
          onPress={handleReschedule}
          disabled={!selDate || !selTime || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.rescheduleBtnText}>Confirm Reschedule</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F7FA' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F5', ...Shadows.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backIcon:     { fontSize: 22, color: '#1A1A2E', fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  bookingCard:  { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, ...Shadows.sm },
  serviceIcon:  { fontSize: 36, marginRight: 14 },
  bookingInfo:  { flex: 1 },
  bookingName:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  bookingCurrent: { fontSize: 13, color: '#999', marginTop: 4 },
  policyCard:   { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFF8F0', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFE8CC' },
  policyTitle:  { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  policyText:   { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 2 },
  section:      { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  dateRow:      { paddingBottom: 8, gap: 10 },
  dateChip:     { width: 72, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', ...Shadows.sm },
  dateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipWeekend:{ borderColor: '#FFE8CC', backgroundColor: '#FFF8F0' },
  dateDayLabel: { fontSize: 12, fontWeight: '700', color: '#555' },
  dateDayLabelActive: { color: '#fff' },
  dateSubLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  dateSubLabelActive: { color: 'rgba(255,255,255,0.8)' },
  weekendTag:   { fontSize: 9, color: Colors.primary, fontWeight: '700', marginTop: 3 },
  timeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0', ...Shadows.sm },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipDisabled: { opacity: 0.4 },
  timeText:     { fontSize: 13, fontWeight: '600', color: '#333' },
  timeTextActive: { color: '#fff' },
  timeTextDisabled: { color: '#aaa' },
  pastTag:      { fontSize: 9, color: '#aaa', marginTop: 2 },
  reasonChip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E0E0E0', ...Shadows.sm },
  reasonChipActive: { borderColor: Colors.primary, backgroundColor: '#FFF8F0' },
  radioOuter:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner:   { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  reasonText:   { fontSize: 14, color: '#555', flex: 1 },
  reasonTextActive: { color: '#1A1A2E', fontWeight: '600' },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F5', ...Shadows.lg },
  selectedSummary: { marginBottom: 10 },
  selectedText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
  selectedPlaceholder: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  rescheduleBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...Shadows.md },
  rescheduleBtnDisabled: { opacity: 0.5 },
  rescheduleBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
