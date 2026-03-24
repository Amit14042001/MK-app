/**
 * Slot App Professional — Full Navigator (v2 — all screens wired)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Dashboard
import DashboardScreen from '../screens/dashboard/DashboardScreen';

// Jobs
import JobsScreen from '../screens/jobs/JobsScreen';
import { JobDetailScreen, WithdrawScreen, RatingDetailScreen, ComplaintScreen } from '../screens/jobs/ProJobScreens';
import TimerScreen from '../screens/jobs/TimerScreen';
import InvoiceGeneratorScreen from '../screens/jobs/InvoiceGeneratorScreen';

// Map / Navigation
import { MapNavigationScreen, ProDetailViewScreen } from '../screens/map/ProScreens';

// Check-In
import CheckInScreen from '../screens/checkin/CheckInScreen';

// Camera
import CameraScreen from '../screens/camera/CameraScreen';

// Earnings
import EarningsScreen from '../screens/earnings/EarningsScreen';

// Schedule
import ScheduleScreen from '../screens/schedule/ScheduleScreen';
import AvailabilityScreen from '../screens/schedule/AvailabilityScreen';

// Profile
import ProfileScreen from '../screens/profile/ProfileScreen';
import BankDetailsScreen from '../screens/profile/BankDetailsScreen';
import DocumentsScreen from '../screens/profile/DocumentsScreen';

// Verification / KYC
import VerificationScreen from '../screens/verification/VerificationScreen';

// Training
import TrainingScreen from '../screens/training/TrainingScreen';

// Notifications
import ProNotificationsScreen from '../screens/notifications/ProNotificationsScreen';

// Support
import SupportScreen from '../screens/support/SupportScreen';

// Settings
import ProSettingsScreen from '../screens/settings/ProSettingsScreen';

// Reviews
import ProReviewsScreen from '../screens/reviews/ProReviewsScreen';

// Chat
import ChatScreen from '../screens/chat/ChatScreen';

// Payout
import PayoutScreen from '../screens/payout/PayoutScreen';

// SOS
import { ProSafetyScreen, SOSScreen } from '../screens/sos/ProSafetyScreens';

// Onboarding
import ProOnboardingScreen from '../screens/onboarding/ProOnboardingScreen';

// Leaderboard
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SCREEN_OPTS = { headerShown: false };

function CustomProTabBar({ state, navigation }) {
  const TABS = [
    { name: 'DashTab',  icon: '🏠', label: 'Home' },
    { name: 'JobsTab',  icon: '💼', label: 'Jobs' },
    { name: 'EarnTab',  icon: '💰', label: 'Earnings' },
    { name: 'ProfileTab', icon: '👤', label: 'Profile' },
  ];
  return (
    <View style={PT.bar}>
      {TABS.map((tab, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity key={tab.name} onPress={() => !focused && navigation.navigate(tab.name)} style={PT.tab} activeOpacity={0.7}>
            <View style={[PT.iconWrap, focused && PT.iconWrapActive]}>
              <Text style={[PT.icon, focused && PT.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[PT.label, focused && PT.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Shared screens available from all tabs
const SHARED_SCREENS = (Stack) => (
  <>
    <Stack.Screen name="JobDetail"       component={JobDetailScreen} />
    <Stack.Screen name="CheckIn"         component={CheckInScreen} />
    <Stack.Screen name="Timer"           component={TimerScreen} />
    <Stack.Screen name="InvoiceGen"      component={InvoiceGeneratorScreen} />
    <Stack.Screen name="Camera"          component={CameraScreen} />
    <Stack.Screen name="MapNavigation"   component={MapNavigationScreen} />
    <Stack.Screen name="Chat"            component={ChatScreen} />
    <Stack.Screen name="Notifications"   component={ProNotificationsScreen} />
    <Stack.Screen name="Help"            component={SupportScreen} />
    <Stack.Screen name="Safety"          component={ProSafetyScreen} />
    <Stack.Screen name="SOS"             component={SOSScreen} />
    <Stack.Screen name="Leaderboard"     component={LeaderboardScreen} />
    <Stack.Screen name="Availability"    component={AvailabilityScreen} />
    <Stack.Screen name="Payout"          component={PayoutScreen} />
    <Stack.Screen name="Withdraw"        component={WithdrawScreen} />
    <Stack.Screen name="RatingDetail"    component={RatingDetailScreen} />
    <Stack.Screen name="Complaint"       component={ComplaintScreen} />
  </>
);

function DashStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Dashboard"   component={DashboardScreen} />
      <Stack.Screen name="Jobs"        component={JobsScreen} />
      {SHARED_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function JobsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Jobs"        component={JobsScreen} />
      {SHARED_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function EarnStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Earnings"    component={EarningsScreen} />
      <Stack.Screen name="Payout"      component={PayoutScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      {SHARED_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTS}>
      <Stack.Screen name="Profile"       component={ProfileScreen} />
      <Stack.Screen name="BankDetails"   component={BankDetailsScreen} />
      <Stack.Screen name="Documents"     component={DocumentsScreen} />
      <Stack.Screen name="Verification"  component={VerificationScreen} />
      <Stack.Screen name="Training"      component={TrainingScreen} />
      <Stack.Screen name="Schedule"      component={ScheduleScreen} />
      <Stack.Screen name="Availability"  component={AvailabilityScreen} />
      <Stack.Screen name="Reviews"       component={ProReviewsScreen} />
      <Stack.Screen name="Settings"      component={ProSettingsScreen} />
      <Stack.Screen name="Leaderboard"   component={LeaderboardScreen} />
      {SHARED_SCREENS(Stack)}
    </Stack.Navigator>
  );
}

function MainProTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomProTabBar {...props} />} screenOptions={SCREEN_OPTS}>
      <Tab.Screen name="DashTab"    component={DashStack} />
      <Tab.Screen name="JobsTab"    component={JobsStack} />
      <Tab.Screen name="EarnTab"    component={EarnStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function ProNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={SCREEN_OPTS}>
        <Stack.Screen name="Onboarding" component={ProOnboardingScreen} />
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="Main"       component={MainProTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const PT = StyleSheet.create({
  bar: { flexDirection:'row', backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#F0F0F5', paddingVertical:8, paddingBottom:12 },
  tab: { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:4 },
  iconWrap: { width:48, height:28, justifyContent:'center', alignItems:'center', borderRadius:14 },
  iconWrapActive: { backgroundColor:'#FFF0F3' },
  icon: { fontSize:20 },
  iconActive: { fontSize:22 },
  label: { fontSize:10, fontWeight:'500', color:'#888', marginTop:2 },
  labelActive: { color:'#E94560', fontWeight:'700' },
});
