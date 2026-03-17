import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Shadows } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import ServiceDetailScreen from '../screens/customer/ServiceDetailScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import ServicesScreen from '../screens/services/ServicesScreen';
import AutomotiveScreen from '../screens/services/AutomotiveScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import RescheduleScreen from '../screens/bookings/RescheduleScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import { NotificationsScreen, AddressesScreen, HelpScreen } from '../screens/profile/NotificationsScreen';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';
import OffersScreen from '../screens/offers/OffersScreen';
import ReferScreen from '../screens/refer/ReferScreen';
import CorporateScreen from '../screens/corporate/CorporateScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import { AddAddressScreen, PaymentMethodsScreen, EditProfileScreen } from '../screens/profile/AddressPaymentScreens';
import { SettingsScreen, PrivacyScreen, ReportIssueScreen, ReviewScreen as RatingScreen } from '../screens/settings/SettingsScreens';

// Temporary Admin Screen
function AdminScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#000', marginBottom: 8 }}>Admin Dashboard</Text>
      <Text style={{ color: '#888', marginBottom: 32 }}>Mobile Control Center</Text>
      <View style={{ gap: 16 }}>
        {[
          { label: 'Manage Users', icon: '👥' },
          { label: 'All Bookings', icon: '📋' },
          { label: 'Service Analytics', icon: '📊' },
          { label: 'Notifications', icon: '💬' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={{ background: '#fff', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 15, borderWeight: 1, borderColor: '#eee' }}>
            <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomTabBar({ state, navigation }) {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const TABS = [
    { name: 'HomeTab', icon: '🏠', label: 'Home' },
    user?.role === 'admin' && { name: 'AdminTab', icon: '🛡️', label: 'Admin' },
    { name: 'BookingsTab', icon: '📋', label: 'Bookings' },
    { name: 'OffersTab', icon: '🎁', label: 'Offers' },
    { name: 'ProfileTab', icon: '👤', label: 'Profile' },
  ].filter(Boolean);

  return (
    <View style={T.bar}>
      {TABS.map((tab, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity key={tab.name} onPress={() => !focused && navigation.navigate(tab.name)}
            style={T.tab} activeOpacity={0.7}>
            <View style={[T.iconWrap, focused && T.iconWrapActive]}>
              <Text style={[T.icon, focused && T.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[T.label, focused && T.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const slideRight = ({ current, layouts }) => ({
  cardStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.width, 0] }) }] },
});
const slideUp = ({ current, layouts }) => ({
  cardStyle: { transform: [{ translateY: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.height, 0] }) }] },
});

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyleInterpolator: slideRight }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="Automotive" component={AutomotiveScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Reschedule" component={RescheduleScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Review" component={RatingScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Corporate" component={CorporateScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Refer" component={ReferScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="EditAddress" component={AddAddressScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyleInterpolator: slideRight }}>
      <Stack.Screen name="MyBookings" component={BookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Reschedule" component={RescheduleScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Review" component={RatingScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ cardStyleInterpolator: slideUp }} />
    </Stack.Navigator>
  );
}

function OffersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyleInterpolator: slideRight }}>
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Corporate" component={CorporateScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyleInterpolator: slideRight }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyBookings" component={BookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="EditAddress" component={AddAddressScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Corporate" component={CorporateScreen} />
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Refer" component={ReferScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Review" component={RatingScreen} options={{ cardStyleInterpolator: slideUp }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Admin" component={AdminScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStack} />
      {user?.role === 'admin' && <Tab.Screen name="AdminTab" component={AdminStack} />}
      <Tab.Screen name="BookingsTab" component={BookingsStack} />
      <Tab.Screen name="OffersTab" component={OffersStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2400);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 48 }}>🏠</Text></View>;

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!onboarded && <Stack.Screen name="Onboarding">{p => <OnboardingScreen {...p} onDone={() => setOnboarded(true)} />}</Stack.Screen>}
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const T = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: '#F0F0F5', paddingVertical: 8, ...Shadows.lg },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  iconWrap: { width: 48, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  iconWrapActive: { backgroundColor: Colors.primaryLight },
  icon: { fontSize: 20 },
  iconActive: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '500', color: Colors.midGray, marginTop: 2 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});
