import { StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ── Urban Company exact color system ────────────────────────
export const Colors = {
  // Primary
  primary: '#E94560',        // UC exact accent red
  primaryDark: '#C0392B',
  primaryLight: '#FFF0F3',
  primaryMid: '#FFD6DE',

  // Neutrals
  black: '#1A1A2E',          // UC deep navy-black
  darkGray: '#2D2D3A',
  gray: '#555770',
  midGray: '#888BA0',
  lightGray: '#C8CAD0',
  offWhite: '#F8F9FA',
  white: '#FFFFFF',

  // Backgrounds
  bg: '#F8F9FA',
  bgCard: '#FFFFFF',
  bgDark: '#1A1A2E',

  // Semantic
  success: '#27AE60',
  successLight: '#E8F8F0',
  warning: '#F39C12',
  warningLight: '#FEF9E7',
  error: '#E74C3C',
  errorLight: '#FDEDEC',
  info: '#2980B9',
  infoLight: '#EAF4FB',

  // Rating
  star: '#F5A623',

  // Shadow
  shadow: 'rgba(26,26,46,0.10)',
  shadowStrong: 'rgba(26,26,46,0.18)',

  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.15)',

  // Gradient stops
  gradientStart: '#1A1A2E',
  gradientEnd: '#0F3460',
};

// ── Typography ───────────────────────────────────────────────
export const Typography = {
  // UC uses a modified version of Circular / Lato
  h1: { fontSize: 28, fontWeight: '800', color: Colors.black, letterSpacing: -0.5, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', color: Colors.black, letterSpacing: -0.3, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700', color: Colors.black, lineHeight: 24 },
  h4: { fontSize: 16, fontWeight: '600', color: Colors.black, lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400', color: Colors.gray, lineHeight: 20 },
  bodyMed: { fontSize: 14, fontWeight: '600', color: Colors.black, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', color: Colors.midGray, lineHeight: 16 },
  smallBold: { fontSize: 12, fontWeight: '700', color: Colors.midGray, lineHeight: 16 },
  caption: { fontSize: 10, fontWeight: '500', color: Colors.midGray, lineHeight: 14, letterSpacing: 0.5 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.midGray, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 16 },
  price: { fontSize: 18, fontWeight: '800', color: Colors.black, lineHeight: 24 },
  priceLarge: { fontSize: 26, fontWeight: '900', color: Colors.black, lineHeight: 32 },
  badge: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, lineHeight: 14 },
};

// ── Spacing ──────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ── Border Radius ────────────────────────────────────────────
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 100,
  circle: 9999,
};

// ── Shadows ──────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
};

// ── Screen Dimensions ────────────────────────────────────────
export const Screen = { W, H };

// ── Common Styles ────────────────────────────────────────────
export const Common = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadows.card,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  screenPadding: {
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  badge: (color = Colors.primary, bg = Colors.primaryLight) => ({
    backgroundColor: bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  }),
  badgeText: (color = Colors.primary) => ({
    ...Typography.badge,
    color,
  }),
  divider: {
    height: 1,
    backgroundColor: Colors.offWhite,
    marginVertical: Spacing.base,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
