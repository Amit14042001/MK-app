/**
 * Slot App Professional — Job Timer Screen (Full)
 * Live timer from job start, milestones, completion with customer confirmation
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Alert, Animated, Vibration, BackHandler, AppState,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const JOB_STATES = { RUNNING: 'running', PAUSED: 'paused', COMPLETED: 'completed' };

function CircularProgress({ seconds, totalSeconds }) {
  const pct = Math.min(seconds / totalSeconds, 1);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotDeg = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  useEffect(() => {
    Animated.timing(rotation, { toValue: pct, duration: 600, useNativeDriver: true }).start();
  }, [pct]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hrs = Math.floor(mins / 60);
  const displayMins = hrs > 0 ? mins % 60 : mins;

  return (
    <View style={timerStyles.circleContainer}>
      <View style={timerStyles.circleOuter}>
        <Animated.View style={[timerStyles.circleProgress, { transform: [{ rotate: rotDeg }] }]} />
        <View style={timerStyles.circleInner}>
          {hrs > 0 && <Text style={timerStyles.timerHours}>{hrs}h</Text>}
          <Text style={timerStyles.timerTime}>
            {String(displayMins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <Text style={timerStyles.timerLabel}>ELAPSED</Text>
        </View>
      </View>
    </View>
  );
}

export default function TimerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    bookingId = 'BK00123456',
    customerName = 'Ravi Kumar',
    serviceName = 'AC Service & Repair',
    startedAt,
    estimatedDuration = 90,
  } = route?.params || {};

  const [seconds, setSeconds] = useState(0);
  const [jobState, setJobState] = useState(JOB_STATES.RUNNING);
  const [milestones, setMilestones] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimeRef = useRef(null);

  const MILESTONE_TEMPLATES = [
    { icon: '🔍', label: 'Inspection done' },
    { icon: '🔧', label: 'Parts replaced' },
    { icon: '🧹', label: 'Area cleaned' },
    { icon: '✅', label: 'Tested & working' },
    { icon: '📸', label: 'After photo taken' },
  ];

  useEffect(() => {
    // Handle background time
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        backgroundTimeRef.current = Date.now();
      }
      if (nextState === 'active' && backgroundTimeRef.current && jobState === JOB_STATES.RUNNING) {
        const elapsed = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
        setSeconds(s => s + elapsed);
        backgroundTimeRef.current = null;
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [jobState]);

  useEffect(() => {
    if (jobState === JOB_STATES.RUNNING) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [jobState]);

  // Prevent accidental back navigation
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (jobState === JOB_STATES.RUNNING) {
        Alert.alert('Job in Progress', 'The job timer is running. Do you want to pause?', [
          { text: 'Continue Job', style: 'cancel' },
          { text: 'Pause', onPress: handlePause },
        ]);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [jobState]);

  const handlePause = useCallback(() => {
    setJobState(JOB_STATES.PAUSED);
    Vibration.vibrate(100);
    addNote('⏸️ Job paused');
  }, []);

  const handleResume = useCallback(() => {
    setJobState(JOB_STATES.RUNNING);
    Vibration.vibrate(100);
    addNote('▶️ Job resumed');
  }, []);

  const addMilestone = (template) => {
    const milestone = {
      id: Date.now(),
      ...template,
      time: seconds,
      timeStr: formatTime(seconds),
    };
    setMilestones(prev => [...prev, milestone]);
    Vibration.vibrate(50);
  };

  const addNote = (text) => {
    setNotes(prev => [...prev, { id: Date.now(), text, time: seconds, timeStr: formatTime(seconds) }]);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleCompleteJob = () => {
    const mins = Math.floor(seconds / 60);
    Alert.alert(
      'Complete Job?',
      `Job duration: ${formatTime(seconds)}\n\nThis will:\n• Stop the timer\n• Request customer OTP for completion\n• Generate invoice`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Complete Job', onPress: () => {
            setJobState(JOB_STATES.COMPLETED);
            clearInterval(intervalRef.current);
            navigation.navigate('JobCompletion', {
              bookingId, customerName, serviceName,
              durationSeconds: seconds, durationFormatted: formatTime(seconds),
              milestones, notes,
            });
          }
        },
      ]
    );
  };

  const overTime = seconds > estimatedDuration * 60;
  const progress = Math.min(seconds / (estimatedDuration * 60), 1);

  return (
    <LinearGradient
      colors={jobState === JOB_STATES.PAUSED ? ['#1A1A2E', '#B71C1C'] : ['#1A1A2E', '#1B5E20']}
      style={[timerStyles.screen, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={timerStyles.header}>
        <View>
          <Text style={timerStyles.headerBooking}>#{bookingId.slice(-8).toUpperCase()}</Text>
          <Text style={timerStyles.headerService}>{serviceName}</Text>
          <Text style={timerStyles.headerCustomer}>👤 {customerName}</Text>
        </View>
        <View style={timerStyles.statusBadge}>
          <View style={[timerStyles.statusDot, { backgroundColor: jobState === JOB_STATES.RUNNING ? '#27AE60' : '#FF9800' }]} />
          <Text style={timerStyles.statusText}>{jobState === JOB_STATES.RUNNING ? 'LIVE' : 'PAUSED'}</Text>
        </View>
      </View>

      {/* Timer */}
      <CircularProgress seconds={seconds} totalSeconds={estimatedDuration * 60} />

      {/* Progress bar */}
      <View style={timerStyles.progressSection}>
        <View style={timerStyles.progressTrack}>
          <Animated.View style={[timerStyles.progressFill, { width: `${progress * 100}%`, backgroundColor: overTime ? '#E94560' : '#27AE60' }]} />
        </View>
        <View style={timerStyles.progressLabels}>
          <Text style={timerStyles.progressLabel}>0 min</Text>
          <Text style={[timerStyles.progressLabel, overTime && { color: '#E94560' }]}>
            {overTime ? `${Math.floor((seconds - estimatedDuration * 60) / 60)}m overtime` : `${estimatedDuration} min est.`}
          </Text>
        </View>
      </View>

      {/* Milestones */}
      <View style={timerStyles.milestonesSection}>
        <Text style={timerStyles.milestonesTitle}>Quick Milestones</Text>
        <View style={timerStyles.milestonesRow}>
          {MILESTONE_TEMPLATES.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[timerStyles.milestoneBtn, milestones.some(ms => ms.label === m.label) && timerStyles.milestoneBtnDone]}
              onPress={() => addMilestone(m)}
            >
              <Text style={timerStyles.milestoneBtnIcon}>{m.icon}</Text>
              <Text style={timerStyles.milestoneBtnLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {milestones.length > 0 && (
          <View style={timerStyles.milestonesLog}>
            {milestones.slice(-3).map(ms => (
              <Text key={ms.id} style={timerStyles.milestoneLogItem}>{ms.icon} {ms.label} — {ms.timeStr}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={[timerStyles.controls, { paddingBottom: insets.bottom + 16 }]}>
        {jobState === JOB_STATES.RUNNING ? (
          <TouchableOpacity style={timerStyles.pauseBtn} onPress={handlePause}>
            <Text style={timerStyles.pauseBtnText}>⏸  Pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={timerStyles.resumeBtn} onPress={handleResume}>
            <Text style={timerStyles.resumeBtnText}>▶  Resume</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={timerStyles.completeBtn} onPress={handleCompleteJob}>
          <LinearGradient colors={['#27AE60', '#1E8449']} style={timerStyles.completeBtnGrad}>
            <Text style={timerStyles.completeBtnText}>✓  Complete Job</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const timerStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 16 },
  headerBooking: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  headerService: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerCustomer: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  circleContainer: { alignItems: 'center', marginVertical: 8 },
  circleOuter: { width: 200, height: 200, borderRadius: 100, borderWidth: 12, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  circleProgress: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 12, borderColor: '#27AE60', borderTopColor: 'transparent', borderRightColor: 'transparent' },
  circleInner: { alignItems: 'center' },
  timerHours: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  timerTime: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  timerLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginTop: 4 },
  progressSection: { paddingHorizontal: 32, marginBottom: 16 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  milestonesSection: { paddingHorizontal: 20, flex: 1 },
  milestonesTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  milestonesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  milestoneBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  milestoneBtnDone: { backgroundColor: 'rgba(39,174,96,0.25)', borderColor: '#27AE60' },
  milestoneBtnIcon: { fontSize: 14 },
  milestoneBtnLabel: { fontSize: 11, fontWeight: '600', color: '#fff' },
  milestonesLog: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12 },
  milestoneLogItem: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  controls: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  pauseBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  pauseBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resumeBtn: { backgroundColor: '#FF9800', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  resumeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  completeBtn: { borderRadius: 16, overflow: 'hidden' },
  completeBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  completeBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
