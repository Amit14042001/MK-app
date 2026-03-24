/**
 * Slot App — Customer App Root
 */
import React, { useEffect, useRef } from 'react';
import {
  Platform, PermissionsAndroid, LogBox, AppState, StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/context/AuthContext';
import { CartProvider }  from './src/context/CartContext';
import AppNavigator      from './src/navigation/AppNavigator';
import { usersAPI }      from './src/utils/api';

LogBox.ignoreLogs([
  'ViewPropTypes', 'ColorPropType', 'Non-serializable',
  'Sending `onAnimatedValueUpdate`', 'VirtualizedLists should never',
  'AsyncStorage has been extracted',
]);

// ── Permissions ───────────────────────────────────────────────
async function requestPermissions() {
  if (Platform.OS !== 'android') return;
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ...(Platform.Version >= 33
      ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]
      : []),
  ]);
}

// ── Firebase push setup ───────────────────────────────────────
async function setupFirebaseMessaging() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const token = await messaging().getToken();

    // Register token with backend
    try {
      await usersAPI.updateFCMToken(token);
      await AsyncStorage.setItem('slot_fcm_token', token);
    } catch {}

    // Token refresh
    const unsubRefresh = messaging().onTokenRefresh(async (newToken) => {
      try {
        await usersAPI.updateFCMToken(newToken);
        await AsyncStorage.setItem('slot_fcm_token', newToken);
      } catch {}
    });

    // Background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Slot] Background notification:', remoteMessage.notification?.title);
    });

    return unsubRefresh;
  } catch (err) {
    console.warn('[MK] Firebase setup failed:', err.message);
    return null;
  }
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const appState    = useRef(AppState.currentState);
  const unsubRef    = useRef(null);

  useEffect(() => {
    requestPermissions();
    setupFirebaseMessaging().then((unsub) => { unsubRef.current = unsub; });

    // Foreground notifications
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      const { title, body } = remoteMessage.notification || {};
      if (title) {
        showMessage({
          message:     title,
          description: body,
          type:        'success',
          duration:    5000,
          icon:        'auto',
        });
      }
    });

    // App state tracking
    const unsubAppState = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        console.log('[Slot] App foregrounded');
      }
      appState.current = nextState;
    });

    return () => {
      unsubForeground();
      unsubAppState.remove();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </AuthProvider>
        <FlashMessage position="top" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
