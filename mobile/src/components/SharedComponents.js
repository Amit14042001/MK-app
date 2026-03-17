/**
 * MK App — Shared UI Components
 * Button, Input, Badge, Avatar, Rating, Skeleton, Toast, Modal, Chip
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Animated, Modal, Dimensions,
} from 'react-native';
import { Colors, Typography, Shadows } from '../utils/theme';

const { width: W } = Dimensions.get('window');

// ── Button ────────────────────────────────────────────────────
export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style, textStyle,
}) {
  const variantStyles = {
    primary:   { bg: Colors.primary,    text: Colors.white,   border: Colors.primary },
    secondary: { bg: Colors.white,      text: Colors.primary, border: Colors.primary },
    danger:    { bg: Colors.error,      text: Colors.white,   border: Colors.error },
    success:   { bg: Colors.success,    text: Colors.white,   border: Colors.success },
    ghost:     { bg: 'transparent',     text: Colors.primary, border: 'transparent' },
    dark:      { bg: Colors.black,      text: Colors.white,   border: Colors.black },
  };
  const sizeStyles = {
    sm: { paddingVertical: 8,  paddingHorizontal: 16, fontSize: 13, borderRadius: 10 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16, borderRadius: 14 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 18, borderRadius: 16 },
  };
  const vs = variantStyles[variant] || variantStyles.primary;
  const ss = sizeStyles[size] || sizeStyles.md;

  return (
    <TouchableOpacity
      style={[
        BTN.base,
        { backgroundColor: vs.bg, borderColor: vs.border, paddingVertical: ss.paddingVertical, paddingHorizontal: ss.paddingHorizontal, borderRadius: ss.borderRadius },
        (disabled || loading) && BTN.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <View style={BTN.content}>
          {icon && <Text style={[BTN.icon, { fontSize: ss.fontSize }]}>{icon}</Text>}
          <Text style={[BTN.text, { color: vs.text, fontSize: ss.fontSize }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({
  label, placeholder, value, onChangeText, error, hint,
  secureTextEntry, keyboardType, maxLength, multiline,
  prefix, suffix, style, inputStyle, autoCapitalize,
  editable = true,
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={[INP.wrapper, style]}>
      {label && <Text style={INP.label}>{label}</Text>}
      <View style={[INP.container, focused && INP.focused, error && INP.error, !editable && INP.disabled]}>
        {prefix && <Text style={INP.prefix}>{prefix}</Text>}
        <TextInput
          style={[INP.input, multiline && INP.multiline, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={Colors.lightGray}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !showPass}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          autoCapitalize={autoCapitalize || 'sentences'}
          editable={editable}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={INP.suffix}>
            <Text style={INP.suffixText}>{showPass ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        ) : suffix ? (
          <View style={INP.suffix}><Text style={INP.suffixText}>{suffix}</Text></View>
        ) : null}
      </View>
      {error  && <Text style={INP.errorText}>{error}</Text>}
      {hint && !error && <Text style={INP.hint}>{hint}</Text>}
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ label, variant = 'default', size = 'sm', dot }) {
  const variants = {
    default:  { bg: Colors.offWhite,       text: Colors.gray },
    primary:  { bg: Colors.primaryLight,   text: Colors.primary },
    success:  { bg: Colors.successLight,   text: Colors.success },
    warning:  { bg: Colors.warningLight,   text: Colors.warning },
    error:    { bg: Colors.errorLight,     text: Colors.error },
    dark:     { bg: Colors.black,          text: Colors.white },
  };
  const v = variants[variant] || variants.default;
  return (
    <View style={[BAD.badge, { backgroundColor: v.bg }]}>
      {dot && <View style={[BAD.dot, { backgroundColor: v.text }]} />}
      <Text style={[BAD.text, { color: v.text, fontSize: size === 'xs' ? 10 : 12 }]}>{label}</Text>
    </View>
  );
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ name = '', size = 44, color, style }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const bg       = color || Colors.primary;
  return (
    <View style={[AVT.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}>
      <Text style={[AVT.text, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
    </View>
  );
}

// ── Rating Stars ──────────────────────────────────────────────
export function RatingStars({ rating = 0, size = 14, editable, onRate, showNumber = true }) {
  const [hovered, setHovered] = useState(0);
  return (
    <View style={RAT.row}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => editable && onRate?.(star)}
          disabled={!editable}
          activeOpacity={editable ? 0.7 : 1}
        >
          <Text style={{ fontSize: size, color: star <= (editable ? hovered || rating : rating) ? Colors.star : Colors.lightGray }}>★</Text>
        </TouchableOpacity>
      ))}
      {showNumber && <Text style={[RAT.number, { fontSize: size - 2 }]}>{rating.toFixed(1)}</Text>}
    </View>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────
export function Skeleton({ width, height, borderRadius = 8, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: Colors.lightGray, opacity }, style]}
    />
  );
}

export function ServiceCardSkeleton() {
  return (
    <View style={{ backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', width: (W - 48) / 2, ...Shadows.sm }}>
      <Skeleton width="100%" height={130} borderRadius={0} />
      <View style={{ padding: 10, gap: 8 }}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={12} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}

// ── Chip ──────────────────────────────────────────────────────
export function Chip({ label, selected, onPress, icon, style }) {
  return (
    <TouchableOpacity
      style={[CHP.chip, selected && CHP.selected, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && <Text style={CHP.icon}>{icon}</Text>}
      <Text style={[CHP.text, selected && CHP.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={EMP.container}>
      <Text style={EMP.icon}>{icon || '📭'}</Text>
      <Text style={EMP.title}>{title || 'Nothing here yet'}</Text>
      {subtitle && <Text style={EMP.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={EMP.action} onPress={onAction}>
          <Text style={EMP.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────
export function Divider({ label, style }) {
  if (!label) return <View style={[DIV.line, style]} />;
  return (
    <View style={[DIV.row, style]}>
      <View style={DIV.half} />
      <Text style={DIV.label}>{label}</Text>
      <View style={DIV.half} />
    </View>
  );
}

// ── Toast ─────────────────────────────────────────────────────
let toastRef = null;
export function Toast({ message, type = 'info', duration = 3000 }) {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg]         = useState('');
  const [toastType, setType]  = useState('info');
  const anim = useRef(new Animated.Value(0)).current;

  toastRef = { show: (m, t) => { setMsg(m); setType(t || 'info'); setVisible(true); } };

  useEffect(() => {
    if (!visible) return;
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
    }, duration);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  const colors = { info: Colors.info, success: Colors.success, error: Colors.error, warning: Colors.warning };
  return (
    <Animated.View style={[TST.toast, { backgroundColor: colors[toastType] || Colors.black, opacity: anim }]}>
      <Text style={TST.text}>{msg}</Text>
    </Animated.View>
  );
}
export const showToast = (message, type) => toastRef?.show(message, type);

// ── Styles ────────────────────────────────────────────────────
const BTN = StyleSheet.create({
  base:     { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  content:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon:     {},
  text:     { fontWeight: '700' },
});

const INP = StyleSheet.create({
  wrapper:   { marginBottom: 4 },
  label:     { ...Typography.caption, color: Colors.gray, fontWeight: '600', marginBottom: 6 },
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.offWhite, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.lightGray, paddingHorizontal: 14 },
  focused:   { borderColor: Colors.primary, backgroundColor: Colors.white },
  error:     { borderColor: Colors.error },
  disabled:  { opacity: 0.6 },
  input:     { flex: 1, paddingVertical: 12, ...Typography.body, color: Colors.black },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  prefix:    { ...Typography.body, color: Colors.gray, marginRight: 4 },
  suffix:    { paddingLeft: 8 },
  suffixText:{ fontSize: 16 },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: 4 },
  hint:      { ...Typography.caption, color: Colors.gray, marginTop: 4 },
});

const BAD = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4, alignSelf: 'flex-start' },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontWeight: '700' },
});

const AVT = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center' },
  text:   { color: Colors.white, fontWeight: '800' },
});

const RAT = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  number: { color: Colors.black, fontWeight: '700', marginLeft: 4 },
});

const CHP = StyleSheet.create({
  chip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.lightGray, backgroundColor: Colors.white, gap: 5 },
  selected:     { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  icon:         { fontSize: 14 },
  text:         { ...Typography.caption, color: Colors.gray, fontWeight: '600' },
  textSelected: { color: Colors.primary, fontWeight: '700' },
});

const EMP = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  icon:      { fontSize: 64, marginBottom: 14 },
  title:     { ...Typography.h3, color: Colors.black, marginBottom: 8, textAlign: 'center' },
  subtitle:  { ...Typography.body, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  action:    { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  actionText:{ ...Typography.body, color: Colors.white, fontWeight: '700' },
});

const DIV = StyleSheet.create({
  line: { height: 1, backgroundColor: Colors.offWhite, marginVertical: 16 },
  row:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  half: { flex: 1, height: 1, backgroundColor: Colors.offWhite },
  label:{ ...Typography.caption, color: Colors.midGray, paddingHorizontal: 12 },
});

const TST = StyleSheet.create({
  toast: { position: 'absolute', bottom: 80, left: 16, right: 16, borderRadius: 14, padding: 14, zIndex: 9999 },
  text:  { ...Typography.body, color: Colors.white, textAlign: 'center', fontWeight: '600' },
});
