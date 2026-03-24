/**
 * Slot App Professional — Availability Screen (Full)
 */
import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM'];

export default function AvailabilityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [schedule, setSchedule] = useState({
    Mon: { active: true, start: '9:00 AM', end: '7:00 PM' },
    Tue: { active: true, start: '9:00 AM', end: '7:00 PM' },
    Wed: { active: true, start: '9:00 AM', end: '7:00 PM' },
    Thu: { active: true, start: '9:00 AM', end: '7:00 PM' },
    Fri: { active: true, start: '9:00 AM', end: '7:00 PM' },
    Sat: { active: true, start: '10:00 AM', end: '6:00 PM' },
    Sun: { active: false, start: '10:00 AM', end: '4:00 PM' },
  });
  const [vacationMode, setVacationMode] = useState(false);
  const [editDay, setEditDay] = useState(null);
  const [editType, setEditType] = useState(null);
  const [maxJobsPerDay, setMaxJobsPerDay] = useState(5);
  const [autoAccept, setAutoAccept] = useState(false);
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [breakStart, setBreakStart] = useState('1:00 PM');
  const [breakEnd, setBreakEnd] = useState('2:00 PM');

  const toggleDay = (day) => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  const updateTime = (day, type, time) => { setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [type]: time } })); setEditDay(null); };
  const activeDays = DAYS.filter(d => schedule[d].active).length;

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40 }}><Text style={S.backText}>←</Text></TouchableOpacity>
        <Text style={S.headerTitle}>My Availability</Text>
        <TouchableOpacity onPress={async () => {
          try {
            const token = await AsyncStorage.getItem('proToken');
            const availability = DAYS.map(d => ({
              day: d, active: schedule[d].active,
              start: schedule[d].start, end: schedule[d].end,
            }));
            const resp = await fetch(
              `${process.env.API_URL || 'http://10.0.2.2:5000/api/v1'}/professionals/me/availability`,
              { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ availability, vacationMode }) }
            );
            const data = await resp.json();
            if (data.success) Alert.alert('✅ Saved!', 'Your availability has been updated.');
            else throw new Error(data.message);
          } catch (e) {
            Alert.alert('Error', 'Failed to save. Please try again.');
          }
        }} style={S.saveBtn}><Text style={S.saveBtnText}>Save</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.content}>
        <View style={S.card}>
          <View style={S.rowBetween}>
            <View><Text style={S.cardTitle}>🏖️ Vacation Mode</Text><Text style={S.cardSub}>Pause all new job requests</Text></View>
            <Switch value={vacationMode} onValueChange={v => { setVacationMode(v); if (v) Alert.alert('Vacation Mode ON', 'No new bookings will be assigned.'); }} trackColor={{ true: '#FF9800' }} />
          </View>
          {vacationMode && (
            <View style={S.vacationBanner}>
              <Text style={S.vacationText}>⚠️ Vacation mode is ON. No new bookings assigned.</Text>
              <TouchableOpacity style={S.resumeBtn} onPress={() => setVacationMode(false)}><Text style={S.resumeBtnText}>Turn Off & Resume</Text></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>📅 Weekly Schedule</Text>
          <Text style={S.cardSub}>{activeDays} of 7 days active</Text>
          {DAYS.map(day => (
            <View key={day} style={[S.dayRow, !schedule[day].active && { opacity: 0.45 }]}>
              <Switch value={schedule[day].active} onValueChange={() => toggleDay(day)} trackColor={{ true: '#27AE60' }} style={{ marginRight: 12 }} />
              <Text style={S.dayLabel}>{day}</Text>
              {schedule[day].active ? (
                <View style={S.timesRow}>
                  <TouchableOpacity style={S.timeChip} onPress={() => { setEditDay(day); setEditType('start'); }}><Text style={S.timeChipText}>{schedule[day].start}</Text></TouchableOpacity>
                  <Text style={S.toText}>→</Text>
                  <TouchableOpacity style={S.timeChip} onPress={() => { setEditDay(day); setEditType('end'); }}><Text style={S.timeChipText}>{schedule[day].end}</Text></TouchableOpacity>
                </View>
              ) : <Text style={S.offText}>Day Off</Text>}
            </View>
          ))}
        </View>

        <View style={S.card}>
          <View style={S.rowBetween}>
            <Text style={S.cardTitle}>☕ Break Time</Text>
            <Switch value={breakEnabled} onValueChange={setBreakEnabled} trackColor={{ true: '#2196F3' }} />
          </View>
          {breakEnabled && (
            <View style={[S.timesRow, { marginTop: 12 }]}>
              <Text style={{ fontSize: 13, color: '#666', marginRight: 10 }}>Daily:</Text>
              <TouchableOpacity style={S.timeChip} onPress={() => Alert.alert('Select', 'Break start time picker')}><Text style={S.timeChipText}>{breakStart}</Text></TouchableOpacity>
              <Text style={S.toText}>→</Text>
              <TouchableOpacity style={S.timeChip} onPress={() => Alert.alert('Select', 'Break end time picker')}><Text style={S.timeChipText}>{breakEnd}</Text></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>⚡ Job Capacity</Text>
          <View style={[S.rowBetween, { marginTop: 14 }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A2E' }}>Max jobs per day</Text>
            <View style={S.counterRow}>
              <TouchableOpacity style={S.counterBtn} onPress={() => setMaxJobsPerDay(p => Math.max(1, p-1))}><Text style={S.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={S.counterVal}>{maxJobsPerDay}</Text>
              <TouchableOpacity style={S.counterBtn} onPress={() => setMaxJobsPerDay(p => Math.min(12, p+1))}><Text style={S.counterBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={[S.rowBetween, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' }]}>
            <View><Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A2E' }}>Auto-accept jobs</Text><Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Automatically accept matching jobs</Text></View>
            <Switch value={autoAccept} onValueChange={setAutoAccept} trackColor={{ true: '#E94560' }} />
          </View>
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>🚫 Block Specific Dates</Text>
          <TouchableOpacity style={S.blockBtn} onPress={() => Alert.alert('Block Date', 'Calendar date picker would open here')}>
            <Text style={S.blockBtnText}>+ Add Blocked Date</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: '#AAA', textAlign: 'center', marginTop: 12 }}>No blocked dates yet</Text>
        </View>
      </ScrollView>

      <Modal visible={!!editDay} transparent animationType="slide" onRequestClose={() => setEditDay(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <View style={S.rowBetween}>
              <Text style={S.modalTitle}>Set {editType} time — {editDay}</Text>
              <TouchableOpacity onPress={() => setEditDay(null)}><Text style={{ fontSize: 18, color: '#888' }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {TIME_SLOTS.map(slot => {
                const isSelected = schedule[editDay]?.[editType] === slot;
                return (
                  <TouchableOpacity key={slot} style={[S.slotOption, isSelected && S.slotOptionSelected]} onPress={() => updateTime(editDay, editType, slot)}>
                    <Text style={[S.slotText, isSelected && S.slotTextSelected]}>{slot}</Text>
                    {isSelected && <Text style={{ color: '#27AE60', fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  saveBtn: { backgroundColor: '#E94560', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#888', marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vacationBanner: { marginTop: 14, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14 },
  vacationText: { fontSize: 13, color: '#FF9800', fontWeight: '600', marginBottom: 10 },
  resumeBtn: { backgroundColor: '#FF9800', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  resumeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  dayLabel: { width: 36, fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  timesRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  timeChip: { backgroundColor: '#F5F6FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  timeChipText: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },
  toText: { fontSize: 12, color: '#AAA' },
  offText: { flex: 1, textAlign: 'right', fontSize: 13, color: '#CCC', fontWeight: '600' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F6FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  counterBtnText: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  counterVal: { fontSize: 18, fontWeight: '900', color: '#1A1A2E', minWidth: 28, textAlign: 'center' },
  blockBtn: { backgroundColor: '#F5F6FA', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E94560', borderStyle: 'dashed' },
  blockBtnText: { fontSize: 14, fontWeight: '700', color: '#E94560' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  slotOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  slotOptionSelected: { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -12 },
  slotText: { fontSize: 15, color: '#444' },
  slotTextSelected: { color: '#27AE60', fontWeight: '700' },
});
