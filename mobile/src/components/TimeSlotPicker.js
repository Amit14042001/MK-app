/**
 * MK App — TimeSlotPicker Component
 * Urban Company style horizontal date scroller + time slot grid
 * Feature #2: Beautiful scrollable date+time slot picker
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, Animated,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');
const DAY_W = 64;

const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS= ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Generate next 30 days
function generateDays(count = 30) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date:      d,
      day:       d.getDate(),
      weekday:   WEEKDAYS[d.getDay()],
      month:     MONTHS[d.getMonth()],
      isToday:   i === 0,
      isTomorrow:i === 1,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      key:       d.toISOString().split('T')[0],
    });
  }
  return days;
}

// Generate time slots
function generateSlots(date, bookedSlots = []) {
  const slots = [];
  const hours  = [7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  const labels = ['7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM'];
  const now    = new Date();
  const isToday= date?.isToday;

  hours.forEach((h, i) => {
    const isPast   = isToday && h <= now.getHours() + 1;
    const isBooked = bookedSlots.includes(labels[i]);
    const isSurge  = [9, 10, 11, 18, 19].includes(h);
    slots.push({
      hour:      h,
      label:     labels[i],
      endLabel:  labels[i + 1] || '9 PM',
      isPast,
      isBooked,
      isSurge,
      isAvailable: !isPast && !isBooked,
    });
  });
  return slots;
}

export function TimeSlotPicker({
  visible,
  onClose,
  onConfirm,
  selectedDate: initDate,
  selectedSlot: initSlot,
  bookedSlots = [],
  serviceDuration = 60,
}) {
  const days = generateDays(30);
  const [selDay,  setSelDay]  = useState(initDate || days[1]);
  const [selSlot, setSelSlot] = useState(initSlot || null);
  const scrollRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const slots = generateSlots(selDay, bookedSlots);

  const selectDay = useCallback((day) => {
    setSelDay(day);
    setSelSlot(null);
  }, []);

  const selectSlot = useCallback((slot) => {
    if (!slot.isAvailable) return;
    setSelSlot(slot);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleConfirm = () => {
    if (!selSlot) return;
    onConfirm?.({
      date:     selDay.key,
      dateObj:  selDay.date,
      timeSlot: selSlot.label,
      timeSlotFull: `${selSlot.label} – ${selSlot.endLabel}`,
      displayDate: selDay.isToday ? 'Today' : selDay.isTomorrow ? 'Tomorrow' : `${selDay.weekday}, ${selDay.day} ${selDay.month}`,
    });
    onClose?.();
  };

  const displayDate = selDay
    ? selDay.isToday     ? 'Today'
    : selDay.isTomorrow  ? 'Tomorrow'
    : `${selDay.weekday}, ${selDay.day} ${selDay.month}`
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <Animated.View style={[S.sheet, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={S.sheetHeader}>
            <View style={S.handle} />
            <Text style={S.sheetTitle}>Choose Date & Time</Text>
            <TouchableOpacity onPress={onClose} style={S.closeBtn}>
              <Text style={S.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Month Label */}
          <Text style={S.monthLabel}>
            {selDay ? `${selDay.month} ${selDay.date?.getFullYear()}` : ''}
          </Text>

          {/* Date Scroll */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.daysContainer}
            style={S.daysScroll}
          >
            {days.map((day, idx) => {
              const selected = selDay?.key === day.key;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[S.dayChip, selected && S.dayChipSelected, day.isWeekend && !selected && S.dayChipWeekend]}
                  onPress={() => selectDay(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[S.dayWeekday, selected && S.dayTextSelected]}>
                    {day.isToday ? 'Today' : day.isTomorrow ? 'Tmrw' : day.weekday}
                  </Text>
                  <Text style={[S.dayNum, selected && S.dayTextSelected]}>{day.day}</Text>
                  <Text style={[S.dayMonth, selected && S.dayTextSelected]}>{day.month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slots */}
          <View style={S.slotsSection}>
            <View style={S.slotsSectionHeader}>
              <Text style={S.slotsTitle}>Available Slots</Text>
              <Text style={S.slotsSubtitle}>{displayDate}</Text>
            </View>

            {/* Legend */}
            <View style={S.legend}>
              {[
                { color: Colors.white,   border: Colors.lightGray, label: 'Available' },
                { color: Colors.primary, border: Colors.primary,   label: 'Selected'  },
                { color: Colors.offWhite,border: Colors.offWhite,  label: 'Booked'    },
                { color: '#FEF9E7',      border: Colors.warning,   label: '🔥 Busy hour'},
              ].map(l => (
                <View key={l.label} style={S.legendItem}>
                  <View style={[S.legendDot, { backgroundColor: l.color, borderColor: l.border }]} />
                  <Text style={S.legendLabel}>{l.label}</Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
              <View style={S.slotsGrid}>
                {slots.map(slot => {
                  const selected = selSlot?.label === slot.label;
                  return (
                    <TouchableOpacity
                      key={slot.label}
                      style={[
                        S.slotChip,
                        selected        && S.slotSelected,
                        slot.isBooked   && S.slotBooked,
                        slot.isPast     && S.slotPast,
                        slot.isSurge && !slot.isBooked && !slot.isPast && S.slotSurge,
                      ]}
                      onPress={() => selectSlot(slot)}
                      disabled={!slot.isAvailable}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        S.slotLabel,
                        selected      && S.slotLabelSelected,
                        !slot.isAvailable && S.slotLabelUnavail,
                      ]}>
                        {slot.label}
                      </Text>
                      {slot.isSurge && slot.isAvailable && !selected && (
                        <Text style={S.surgeIcon}>🔥</Text>
                      )}
                      {slot.isBooked && <Text style={S.bookedX}>✕</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Duration note */}
          <Text style={S.durationNote}>
            ⏱ Service duration: ~{serviceDuration >= 60 ? `${Math.floor(serviceDuration/60)}h${serviceDuration%60?` ${serviceDuration%60}m`:''}` : `${serviceDuration} min`}
          </Text>

          {/* CTA */}
          <View style={S.footer}>
            {selSlot ? (
              <View style={S.selectedSummary}>
                <Text style={S.selectedDate}>{displayDate}</Text>
                <Text style={S.selectedTime}>{selSlot.label} – {selSlot.endLabel}</Text>
              </View>
            ) : (
              <Text style={S.selectPrompt}>Please select a time slot</Text>
            )}
            <TouchableOpacity
              style={[S.confirmBtn, !selSlot && S.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selSlot}
              activeOpacity={0.85}
            >
              <Text style={S.confirmText}>Confirm Slot →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Inline compact version (for cards) ───────────────────────
export function CompactDatePicker({ onSelect, selectedDate }) {
  const days = generateDays(14);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {days.map(day => {
        const selected = selectedDate === day.key;
        return (
          <TouchableOpacity
            key={day.key}
            style={[S.compactDay, selected && S.compactDaySelected]}
            onPress={() => onSelect(day)}
          >
            <Text style={[S.compactWeekday, selected && S.compactTextSelected]}>
              {day.isToday ? 'Today' : day.weekday}
            </Text>
            <Text style={[S.compactNum, selected && S.compactTextSelected]}>{day.day}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  sheetHeader:{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.offWhite },
  handle:     { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { ...Typography.h3, color: Colors.black },
  closeBtn:   { position: 'absolute', right: 16, top: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  closeIcon:  { fontSize: 16, color: Colors.gray },

  monthLabel:     { ...Typography.caption, color: Colors.gray, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, letterSpacing: 0.8 },
  daysScroll:     { marginBottom: 8 },
  daysContainer:  { paddingHorizontal: 16, gap: 8 },
  dayChip:        { width: DAY_W, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.offWhite, borderWidth: 1.5, borderColor: 'transparent' },
  dayChipSelected:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipWeekend: { borderColor: Colors.primaryLight },
  dayWeekday:     { ...Typography.small, color: Colors.gray, fontWeight: '600', marginBottom: 4 },
  dayNum:         { ...Typography.h3,   color: Colors.black, lineHeight: 28 },
  dayMonth:       { ...Typography.small, color: Colors.gray },
  dayTextSelected:{ color: Colors.white },

  slotsSection:      { paddingHorizontal: 20, marginTop: 8 },
  slotsSectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  slotsTitle:        { ...Typography.bodyLarge, color: Colors.black, fontWeight: '700' },
  slotsSubtitle:     { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legendLabel:{ ...Typography.small, color: Colors.gray },

  slotsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.lightGray, backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotSelected:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotBooked:     { backgroundColor: Colors.offWhite, borderColor: Colors.offWhite },
  slotPast:       { backgroundColor: Colors.offWhite, borderColor: Colors.offWhite },
  slotSurge:      { borderColor: Colors.warning, backgroundColor: '#FEF9E7' },
  slotLabel:      { ...Typography.body, color: Colors.black, fontWeight: '600' },
  slotLabelSelected: { color: Colors.white },
  slotLabelUnavail:  { color: Colors.lightGray },
  surgeIcon:      { fontSize: 12 },
  bookedX:        { fontSize: 10, color: Colors.lightGray, fontWeight: '800' },

  durationNote: { ...Typography.caption, color: Colors.gray, textAlign: 'center', paddingTop: 8, paddingHorizontal: 20 },

  footer:         { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedSummary:{ flex: 1 },
  selectedDate:   { ...Typography.caption, color: Colors.gray },
  selectedTime:   { ...Typography.body, color: Colors.black, fontWeight: '700' },
  selectPrompt:   { flex: 1, ...Typography.caption, color: Colors.midGray },
  confirmBtn:     { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  confirmBtnDisabled: { backgroundColor: Colors.lightGray },
  confirmText:    { ...Typography.body, color: Colors.white, fontWeight: '700' },

  // Compact
  compactDay:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, backgroundColor: Colors.offWhite, alignItems: 'center' },
  compactDaySelected: { backgroundColor: Colors.primary },
  compactWeekday:     { ...Typography.small, color: Colors.gray, fontWeight: '600', marginBottom: 2 },
  compactNum:         { ...Typography.body, color: Colors.black, fontWeight: '700' },
  compactTextSelected:{ color: Colors.white },
});
