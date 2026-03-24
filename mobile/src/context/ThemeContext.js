/**
 * Slot App — ThemeContext
 * Dark mode, light mode, system mode, color customization
 * Feature #31: Dark mode support
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'slot_theme_preference';

// ── Light Theme ───────────────────────────────────────────────
const LIGHT = {
  mode: 'light',
  // Backgrounds
  bg:          '#F8F9FA',
  bgCard:      '#FFFFFF',
  bgInput:     '#F8F9FA',
  bgModal:     '#FFFFFF',
  bgHeader:    '#FFFFFF',
  bgBottom:    '#FFFFFF',

  // Text
  textPrimary:  '#1A1A2E',
  textSecondary:'#555770',
  textTertiary: '#888BA0',
  textDisabled: '#C8CAD0',
  textInverse:  '#FFFFFF',

  // Brand
  primary:      '#E94560',
  primaryDark:  '#C0392B',
  primaryLight: '#FFF0F3',
  primaryMid:   '#FFD6DE',

  // Semantic
  success:      '#27AE60',
  successLight: '#E8F8F0',
  warning:      '#F39C12',
  warningLight: '#FEF9E7',
  error:        '#E74C3C',
  errorLight:   '#FDEDEC',
  info:         '#2980B9',
  infoLight:    '#EAF4FB',

  // Neutral
  border:       '#E8E9F0',
  borderLight:  '#F0F1F6',
  divider:      '#F0F1F6',
  shadow:       'rgba(26,26,46,0.10)',

  // Misc
  star:         '#F5A623',
  overlay:      'rgba(0,0,0,0.50)',
  statusBar:    'dark-content',
  tabBar:       '#FFFFFF',
  tabBarBorder: '#F0F1F6',
};

// ── Dark Theme ────────────────────────────────────────────────
const DARK = {
  mode: 'dark',
  // Backgrounds
  bg:          '#0F0F1A',
  bgCard:      '#1A1A2E',
  bgInput:     '#1E1E30',
  bgModal:     '#1A1A2E',
  bgHeader:    '#12121F',
  bgBottom:    '#12121F',

  // Text
  textPrimary:  '#F0F0FF',
  textSecondary:'#A0A3B8',
  textTertiary: '#666880',
  textDisabled: '#404258',
  textInverse:  '#1A1A2E',

  // Brand (slightly brighter in dark)
  primary:      '#FF6B7A',
  primaryDark:  '#E94560',
  primaryLight: '#2A1520',
  primaryMid:   '#3D1825',

  // Semantic
  success:      '#2ECC71',
  successLight: '#0D2E1A',
  warning:      '#F5A623',
  warningLight: '#2E2000',
  error:        '#FF5252',
  errorLight:   '#2E0A0A',
  info:         '#4DA6FF',
  infoLight:    '#0A1E35',

  // Neutral
  border:       '#2A2A40',
  borderLight:  '#222235',
  divider:      '#222235',
  shadow:       'rgba(0,0,0,0.40)',

  // Misc
  star:         '#F5A623',
  overlay:      'rgba(0,0,0,0.70)',
  statusBar:    'light-content',
  tabBar:       '#12121F',
  tabBarBorder: '#2A2A40',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark'
  const [preference, setPreference] = useState('system'); // 'system' | 'light' | 'dark'
  const [loaded, setLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved && ['system', 'light', 'dark'].includes(saved)) {
        setPreference(saved);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Compute actual theme
  const activeMode = preference === 'system' ? (systemScheme || 'light') : preference;
  const theme      = activeMode === 'dark' ? DARK : LIGHT;
  const isDark     = activeMode === 'dark';

  const setTheme = useCallback(async (pref) => {
    setPreference(pref);
    await AsyncStorage.setItem(THEME_KEY, pref).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{
      theme,
      isDark,
      isLight: !isDark,
      preference,
      setTheme,
      toggleTheme,
      LIGHT,
      DARK,
    }}>
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor={theme.bgHeader}
        translucent={false}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export default ThemeContext;
