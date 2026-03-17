/**
 * MK App — VoiceSearch Component
 * Microphone voice input for search — Urban Company style
 * Feature #8: Voice search
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Animated, Dimensions, Alert,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

// Try to import @react-native-voice/voice — graceful fallback if not installed
let Voice = null;
try { Voice = require('@react-native-voice/voice').default; } catch { /* package not installed */ }

const { width: W } = Dimensions.get('window');

const SUGGESTIONS = [
  'AC service near me',
  'Home cleaning',
  'Electrician',
  'Plumber',
  'Salon at home',
  'Pest control',
];

export default function VoiceSearch({ visible, onClose, onResult }) {
  const [state, setState]       = useState('idle');   // idle | listening | processing | done
  const [transcript, setTranscript] = useState('');
  const [error, setError]       = useState(null);
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pulseLoop   = useRef(null);
  const volumeAnims = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!visible) { stopListening(); return; }
    // Auto-start when modal opens
    setTimeout(() => startListening(), 500);
    return () => stopListening();
  }, [visible]);

  useEffect(() => {
    if (state === 'listening') {
      startPulse();
      startVolumeAnimation();
    } else {
      stopPulse();
    }
  }, [state]);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const startVolumeAnimation = () => {
    volumeAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.5 + Math.random() * 0.5, duration: 200 + i * 80, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2 + Math.random() * 0.3, duration: 200 + i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  };

  const startListening = async () => {
    try {
      setState('listening');
      setTranscript('');
      setError(null);

      if (Voice) {
        // Real @react-native-voice/voice
        Voice.onSpeechResults = (e) => {
          const text = e.value?.[0] || '';
          if (text) {
            setTranscript(text);
            setState('processing');
            setTimeout(() => {
              setState('done');
              handleResult(text);
            }, 400);
          }
        };
        Voice.onSpeechError = (e) => {
          setState('idle');
          setError(e.error?.message || 'Speech recognition failed. Try again.');
        };
        Voice.onSpeechEnd = () => {
          if (state === 'listening') setState('processing');
        };
        await Voice.start('en-IN');
      } else {
        // Fallback: random suggestion (simulator / Voice not installed)
        await new Promise(r => setTimeout(r, 2500));
        if (state === 'listening') {
          const mockResult = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
          setTranscript(mockResult);
          setState('processing');
          await new Promise(r => setTimeout(r, 800));
          setState('done');
          handleResult(mockResult);
        }
      }
    } catch (e) {
      setState('idle');
      setError('Microphone access denied. Please enable in settings.');
    }
  };

  const stopListening = async () => {
    try {
      if (Voice) await Voice.stop();
      setState('idle');
    } catch { setState('idle'); }
  };

  const handleResult = (text) => {
    if (text?.trim()) {
      setTimeout(() => {
        onResult?.(text.trim());
        onClose?.();
      }, 600);
    }
  };

  const selectSuggestion = (s) => {
    setTranscript(s);
    setState('done');
    handleResult(s);
  };

  const stateConfig = {
    idle:       { icon: '🎤', label: 'Tap to speak',      color: Colors.primary },
    listening:  { icon: '🎙️', label: 'Listening...',      color: Colors.error },
    processing: { icon: '⚡', label: 'Processing...',      color: Colors.warning },
    done:       { icon: '✓',  label: 'Got it!',            color: Colors.success },
  };
  const cfg = stateConfig[state];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />

          {/* Close */}
          <TouchableOpacity style={S.closeBtn} onPress={onClose}>
            <Text style={S.closeIcon}>✕</Text>
          </TouchableOpacity>

          {/* Mic button */}
          <View style={S.micContainer}>
            <Animated.View style={[S.pulseRing1, { transform: [{ scale: pulseAnim }], opacity: state === 'listening' ? 0.3 : 0 }]} />
            <Animated.View style={[S.pulseRing2, { transform: [{ scale: pulseAnim }], opacity: state === 'listening' ? 0.15 : 0 }]} />
            <TouchableOpacity
              style={[S.micBtn, { backgroundColor: cfg.color }]}
              onPress={state === 'listening' ? stopListening : startListening}
              activeOpacity={0.85}
            >
              <Text style={S.micIcon}>{cfg.icon}</Text>
            </TouchableOpacity>
          </View>

          {/* Volume bars */}
          {state === 'listening' && (
            <View style={S.volumeBars}>
              {volumeAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[S.volumeBar, {
                    transform: [{ scaleY: anim }],
                    backgroundColor: Colors.primary,
                    height: 20 + i * 8,
                  }]}
                />
              ))}
            </View>
          )}

          {/* Status label */}
          <Text style={[S.stateLabel, { color: cfg.color }]}>{cfg.label}</Text>

          {/* Transcript */}
          {transcript ? (
            <View style={S.transcriptBox}>
              <Text style={S.transcriptText}>"{transcript}"</Text>
            </View>
          ) : state === 'listening' ? (
            <Text style={S.speakPrompt}>Say something like "AC service" or "Cleaning"</Text>
          ) : null}

          {/* Error */}
          {error && (
            <View style={S.errorBox}>
              <Text style={S.errorText}>⚠️ {error}</Text>
              <TouchableOpacity onPress={startListening} style={S.retryBtn}>
                <Text style={S.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Suggestions */}
          {state === 'idle' && (
            <View style={S.suggestions}>
              <Text style={S.suggestionsLabel}>Try saying:</Text>
              <View style={S.suggestionsWrap}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity key={s} style={S.suggestionChip} onPress={() => selectSuggestion(s)}>
                    <Text style={S.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={S.typeInstead} onPress={onClose}>
            <Text style={S.typeInsteadText}>⌨️ Type instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet:     { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 48, paddingHorizontal: 24, paddingTop: 16, alignItems: 'center', minHeight: H * 0.55 },
  handle:    { width: 40, height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, marginBottom: 16 },
  closeBtn:  { position: 'absolute', top: 16, right: 16 },
  closeIcon: { fontSize: 18, color: Colors.gray },

  micContainer: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  pulseRing1:   { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.primary },
  pulseRing2:   { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: Colors.primary },
  micBtn:       { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  micIcon:      { fontSize: 40 },

  volumeBars:  { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 60, marginBottom: 8 },
  volumeBar:   { width: 6, borderRadius: 3 },

  stateLabel:    { ...Typography.h3, fontWeight: '700', marginBottom: 10 },
  transcriptBox: { backgroundColor: Colors.primaryLight, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 10 },
  transcriptText:{ ...Typography.bodyLarge, color: Colors.primary, fontWeight: '700', textAlign: 'center' },
  speakPrompt:   { ...Typography.body, color: Colors.gray, textAlign: 'center', marginBottom: 16 },

  errorBox:  { backgroundColor: Colors.errorLight, borderRadius: 12, padding: 14, alignItems: 'center', gap: 8, marginBottom: 12 },
  errorText: { ...Typography.caption, color: Colors.error, textAlign: 'center' },
  retryBtn:  { backgroundColor: Colors.error, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },

  suggestions:      { alignSelf: 'stretch', marginTop: 8 },
  suggestionsLabel: { ...Typography.caption, color: Colors.gray, fontWeight: '700', marginBottom: 10, letterSpacing: 0.8 },
  suggestionsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip:   { backgroundColor: Colors.offWhite, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: Colors.lightGray },
  suggestionText:   { ...Typography.body, color: Colors.darkGray, fontWeight: '500' },

  typeInstead:     { marginTop: 24 },
  typeInsteadText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});

// H is missing from import
const H = Dimensions.get('window').height;
