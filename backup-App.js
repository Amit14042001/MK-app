import React, { useEffect } from 'react';
import { Platform, PermissionsAndroid, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';
import messaging from '@react-native-firebase/messaging';
import { ProfAuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs(['ViewPropTypes','ColorPropType','Non-serializable']);

async function setupPermissions() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      ...(Platform.Version >= 33 ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] : []),
    ]);
  }
}

async function setupFirebase() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (enabled) {
      const token = await messaging().getToken();
      console.log('[Slot Pro App] FCM Token:', token);
      // Save to backend: await axios.post('/professionals/fcm-token', { token })
    }
    messaging().setBackgroundMessageHandler(async msg => {
      console.log('[Slot Pro App] BG notification:', msg.notification?.title);
    });
    return messaging().onMessage(async msg => {
      const { showMessage } = require('react-native-flash-message');
      const { title, body } = msg.notification || {};
      if (title) showMessage({ message: title, description: body, type: 'success', duration: 5000 });
    });
  } catch (e) {
    console.warn('[Slot Pro App] Firebase setup failed:', e);
  }
}

export default function App() {
  useEffect(() => {
    setupPermissions();
    const cleanup = setupFirebase();
    return () => { cleanup?.then(fn => fn?.()); };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProfAuthProvider>
          <AppNavigator />
          <FlashMessage position="top" />
        </ProfAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
