/**
 * MK App — Full App Navigator (v2 — all screens wired)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Shadows } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';

// Auth
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// Customer
import HomeScreen from '../screens/customer/HomeScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import ServiceDetailScreen from '../screens/customer/ServiceDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import VideoCallScreen from '../screens/customer/VideoCallScreen';
import ARBeautyScreen from '../screens/ar/ARBeautyScreen';
import StoreScreen from '../screens/store/StoreScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import AIDiagnosisScreen from '../screens/ai/AIDiagnosisScreen';
import PhotoToQuoteScreen from '../screens/ai/PhotoToQuoteScreen';
import ServiceHealthReportScreen from '../screens/booking/ServiceHealthReportScreen';
import FestivalBookingScreen from '../screens/services/FestivalBookingScreen';
import BundleBuilderScreen from '../screens/subscription/BundleBuilderScreen';
import HomeMaintenanceCalendarScreen from '../screens/home/HomeMaintenanceCalendarScreen';
import NeighbourhoodTrustScreen from '../screens/home/NeighbourhoodTrustScreen';
import VideoConsultationScreen from '../screens/video/VideoConsultationScreen';
import ProBiddingScreen from '../screens/bidding/ProBiddingScreen';
import { LiveChatScreen, GiftCardScreen, ReviewWithPhotosScreen, SocialLoginButtons, PincodeChecker } from '../screens/customer/CustomerSupportScreens';

// Bookings
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import RescheduleScreen from '../screens/bookings/RescheduleScreen';
import RebookScreen from '../screens/bookings/RebookScreen';

// Booking Flow
import BundleBookingScreen from '../screens/booking/BundleBookingScreen';
import MultiAddressBookingScreen from '../screens/booking/MultiAddressBookingScreen';

// Services
import ServicesScreen from '../screens/services/ServicesScreen';
import AutomotiveScreen from '../screens/services/AutomotiveScreen';
import CleaningScreen from '../screens/services/CleaningScreen';
import ElectricalScreen from '../screens/services/ElectricalScreen';
import PlumbingScreen from '../screens/services/PlumbingScreen';
import ApplianceRepairScreen from '../screens/services/ApplianceRepairScreen';
import PestControlScreen from '../screens/services/PestControlScreen';
import PaintingScreen from '../screens/services/PaintingScreen';
import CarpentryScreen from '../screens/services/CarpentryScreen';
import SalonScreen from '../screens/services/SalonScreen';
import MassageScreen from '../screens/services/MassageScreen';
import YogaScreen from '../screens/services/YogaScreen';
import PhysiotherapyScreen from '../screens/services/PhysiotherapyScreen';
import MenGroomingScreen from '../screens/services/MenGroomingScreen';
import BeautyAtHomeScreen from '../screens/services/BeautyAtHomeScreen';
import { CategoryScreen, PackagesScreen, ProDetailScreen } from '../screens/services/ExtraScreens';
import { CategoryPages } from '../screens/services/CategoryScreens';

// Profile & Account
import { NotificationsScreen, AddressesScreen, OffersScreen, ReferScreen, HelpScreen } from '../screens/profile/NotificationsScreen';
import { SubscriptionScreen, CorporateScreen } from '../screens/profile/SubscriptionScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import LoyaltyPointsScreen from '../screens/loyalty/LoyaltyPointsScreen';
import { AddAddressScreen, PaymentMethodsScreen as OldPaymentMethods, EditProfileScreen } from '../screens/profile/AddressPaymentScreens';
import PaymentMethodsScreen from '../screens/payment/PaymentMethodsScreen';
import PaymentRetryScreen from '../screens/payment/PaymentRetryScreen';
import { SettingsScreen, PrivacyScreen, ReportIssueScreen, ReviewScreen as RatingScreen } from '../screens/settings/SettingsScreens';
import WarrantyClaimScreen from '../screens/warranty/WarrantyClaimScreen';
import PackageScreen from '../screens/packages/PackageScreen';
import PriceCalculatorScreen from '../screens/calculator/PriceCalculatorScreen';
import { InvoiceScreen } from '../screens/invoice/InvoiceAndLanguageScreens';
import { SupportTicketScreen } from '../screens/support/SupportScreens';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const slideRight = {
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.width, 0] }) }] },
  })
};
const slideUp = {
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: { transform: [{ translateY: current.progress.interpolate({ inputRange: [0, 1], outputRange: [layouts.screen.height, 0] }) }] },
  })
};

function CustomTabBar({ state, navigation }) {
  const { cartCount } = useCart();
  const { unreadCount } = useNotifications();
  const TABS = [
    { name: 'HomeTab', icon: '🏠', label: 'Home' },
    { name: 'BookingsTab', icon: '📋', label: 'Bookings' },
    { name: 'OffersTab', icon: '🎁', label: 'Offers' },
    { name: 'ProfileTab', icon: '👤', label: 'Profile' },
  ];
  return (
    <View style={T.bar}>
      {TABS.map((tab, i) => {
        const focused = state.index === i;
        // Determine badge count for this tab
        const badgeNum = tab.name === 'HomeTab' ? cartCount
          : tab.name === 'ProfileTab' ? unreadCount
            : 0;
        return (
          <TouchableOpacity key={tab.name} onPress={() => !focused && navigation.navigate(tab.name)}
            style={T.tab} activeOpacity={0.7}>
            <View style={[T.iconWrap, focused && T.iconWrapActive]}>
              <Text style={[T.icon, focused && T.iconActive]}>{tab.icon}</Text>
              {badgeNum > 0 && (
                <View style={T.badge}>
                  <Text style={T.badgeText}>{badgeNum > 99 ? '99+' : badgeNum}</Text>
                </View>
              )}
            </View>
            <Text style={[T.label, focused && T.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const SCREEN_OPTS = { headerShown: false };
const COMMON_SCREENS = (Stack) => (
  <>
    <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Tracking" component={TrackingScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
    <Stack.Screen name="ARBeauty" component={ARBeautyScreen} />
    <Stack.Screen name="Store" component={StoreScreen} />
    <Stack.Screen name="AIChat" component={AIChatScreen} />
    <Stack.Screen name="AIDiagnosis" component={AIDiagnosisScreen} />
    <Stack.Screen name="PhotoToQuote" component={PhotoToQuoteScreen} />
    <Stack.Screen name="HealthReport" component={ServiceHealthReportScreen} />
    <Stack.Screen name="FestivalBooking" component={FestivalBookingScreen} />
    <Stack.Screen name="BundleBuilder" component={BundleBuilderScreen} />
    <Stack.Screen name="MaintenanceCalendar" component={HomeMaintenanceCalendarScreen} />
    <Stack.Screen name="NeighbourhoodTrust" component={NeighbourhoodTrustScreen} />
    <Stack.Screen name="VideoConsult" component={VideoConsultationScreen} />
    <Stack.Screen name="ProBidding" component={ProBiddingScreen} />
    <Stack.Screen name="LiveChat" component={LiveChatScreen} options={slideUp} />
    <Stack.Screen name="BundleBooking" component={BundleBookingScreen} />
    <Stack.Screen name="MultiAddress" component={MultiAddressBookingScreen} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="Reschedule" component={RescheduleScreen} options={slideUp} />
    <Stack.Screen name="Rebook" component={RebookScreen} options={slideRight} />
    <Stack.Screen name="Review" component={RatingScreen} options={slideUp} />
    <Stack.Screen name="ReviewWithPhoto" component={ReviewWithPhotosScreen} options={slideUp} />
    <Stack.Screen name="GiftCards" component={GiftCardScreen} />
    <Stack.Screen name="Warranty" component={WarrantyClaimScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
    <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={slideUp} />
    <Stack.Screen name="Offers" component={OffersScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    <Stack.Screen name="Corporate" component={CorporateScreen} />
    <Stack.Screen name="Loyalty" component={LoyaltyPointsScreen} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    <Stack.Screen name="PaymentRetry" component={PaymentRetryScreen} />
    <Stack.Screen name="PriceCalculator" component={PriceCalculatorScreen} />
    <Stack.Screen name="CategoryScreen" component={CategoryScreen} />
    <Stack.Screen name="ProDetail" component={ProDetailScreen} />
    <Stack.Screen name="Packages" component={PackageScreen} />
    <Stack.Screen name="InvoiceView" component={InvoiceScreen} />
    <Stack.Screen name="SupportTicket" component={SupportTicketScreen} />
    {/* Service Category Screens */}
    <Stack.Screen name="Cleaning" component={CleaningScreen} />
    <Stack.Screen name="Electrical" component={ElectricalScreen} />
    <Stack.Screen name="Plumbing" component={PlumbingScreen} />
    <Stack.Screen name="ApplianceRepair" component={ApplianceRepairScreen} />
    <Stack.Screen name="PestControl" component={PestControlScreen} />
    <Stack.Screen name="Painting" component={PaintingScreen} />
    <Stack.Screen name="Carpentry" component={CarpentryScreen} />
    <Stack.Screen name="Salon" component={SalonScreen} />
    <Stack.Screen name="Massage" component={MassageScreen} />
    <Stack.Screen name="Yoga" component={YogaScreen} />
    <Stack.Screen name="Physiotherapy" component={PhysiotherapyScreen} />
    <Stack.Screen name="MenGrooming" component={MenGroomingScreen} />
    <Stack.Screen name="Beauty" component={BeautyAtHomeScreen} />
    <Stack.Screen name="Automotive" component={AutomotiveScreen} />
  </>
);

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={slideUp} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      {COMMON_SCREENS(Stack)}
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="MyBookings" component={BookingsScreen} />
      {COMMON_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function OffersStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Corporate" component={CorporateScreen} />
      <Stack.Screen name="GiftCards" component={GiftCardScreen} />
      <Stack.Screen name="Refer" component={ReferScreen} />
      <Stack.Screen name="Loyalty" component={LoyaltyPointsScreen} />
      {COMMON_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="MyBookings" component={BookingsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={slideUp} />
      <Stack.Screen name="EditAddress" component={AddAddressScreen} options={slideUp} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Refer" component={ReferScreen} />
      <Stack.Screen name="Loyalty" component={LoyaltyPointsScreen} />
      <Stack.Screen name="GiftCards" component={GiftCardScreen} />
      {COMMON_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={SCREEN_OPTS}>
      <Tab.Screen name="HomeTab" component={HomeStack} />
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

  const linking = {
    prefixes: ['mkapp://', 'https://mkapp.in', 'https://www.mkapp.in'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            HomeTab: {
              screens: {
                Home: '',
                ServiceDetail: 'service/:serviceId',
                Tracking: 'tracking/:bookingId',
                AIDiagnosis: 'diagnose',
                PhotoToQuote: 'photo-quote',
                FestivalBooking: 'festival',
              },
            },
            BookingsTab: {
              screens: {
                Bookings: 'bookings',
                BookingDetail: 'booking/:bookingId',
                HealthReport: 'booking/:bookingId/report',
              },
            },
            ProfileTab: {
              screens: {
                Profile: 'profile',
                Wallet: 'wallet',
                Subscription: 'subscription',
                Help: 'help',
                ReviewScreen: 'review/:bookingId',
              },
            },
            OffersTab: {
              screens: {
                Offers: 'offers',
              },
            },
          },
        },
        Login: 'login',
        Refer: 'refer/:code',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      {user ? <MainTabs /> : (
        <Stack.Navigator screenOptions={SCREEN_OPTS}>
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
  iconWrap: { width: 48, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14, position: 'relative' },
  iconWrapActive: { backgroundColor: Colors.primaryLight },
  icon: { fontSize: 20 },
  iconActive: { fontSize: 22 },
  label: { fontSize: 10, fontWeight: '500', color: Colors.midGray, marginTop: 2 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.primary, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
