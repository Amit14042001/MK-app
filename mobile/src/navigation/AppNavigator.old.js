import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator }     from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors }    from '../utils/theme';
import { useAuth }   from '../context/AuthContext';

import SplashScreen     from '../screens/auth/SplashScreen';
import LoginScreen      from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen          from '../screens/customer/HomeScreen';
import SearchScreen        from '../screens/customer/SearchScreen';
import ServiceDetailScreen from '../screens/customer/ServiceDetailScreen';
import CheckoutScreen      from '../screens/customer/CheckoutScreen';
import TrackingScreen      from '../screens/customer/TrackingScreen';
import { ProfileScreen, MyBookingsScreen, ReviewScreen } from '../screens/customer/ProfileScreen';
import ServicesScreen   from '../screens/services/ServicesScreen';
import AutomotiveScreen from '../screens/services/AutomotiveScreen';
import BookingsScreen   from '../screens/bookings/BookingsScreen';
import WalletScreen     from '../screens/wallet/WalletScreen';
import { NotificationsScreen, AddressesScreen, OffersScreen, ReferScreen, HelpScreen } from '../screens/profile/NotificationsScreen';
import { SubscriptionScreen, CorporateScreen } from '../screens/profile/SubscriptionScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();
const noHeader = { headerShown: false };

const slideRight = ({ current, layouts }) => ({
  cardStyle: { transform: [{ translateX: current.progress.interpolate({ inputRange:[0,1], outputRange:[layouts.screen.width,0] }) }] }
});
const slideUp = ({ current, layouts }) => ({
  cardStyle: { transform: [{ translateY: current.progress.interpolate({ inputRange:[0,1], outputRange:[layouts.screen.height,0] }) }] }
});

function MKTabBar({ state, navigation }) {
  const TABS = [
    { name:'HomeTab',     icon:'🏠', label:'Home' },
    { name:'BookingsTab', icon:'📋', label:'Bookings' },
    { name:'OffersTab',   icon:'🎁', label:'Offers' },
    { name:'ProfileTab',  icon:'👤', label:'Profile' },
  ];
  return (
    <View style={S.tabBar}>
      {state.routes.map((route, i) => {
        const isFocused = state.index === i;
        const tab = TABS[i];
        return (
          <TouchableOpacity key={route.key} onPress={() => navigation.navigate(route.name)} style={S.tabItem} activeOpacity={0.7}>
            <View style={[S.tabIconWrap, isFocused && S.tabIconWrapActive]}>
              <Text style={[S.tabIcon, isFocused && S.tabIconActive]}>{tab?.icon}</Text>
            </View>
            <Text style={[S.tabLabel, isFocused && S.tabLabelActive]}>{tab?.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Home"          component={HomeScreen} />
      <Stack.Screen name="Search"        component={SearchScreen}        options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Services"      component={ServicesScreen}      options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Automotive"    component={AutomotiveScreen}    options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Cart"          component={CheckoutScreen}      options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Checkout"      component={CheckoutScreen}      options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Tracking"      component={TrackingScreen}      options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Subscription"  component={SubscriptionScreen}  options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Corporate"     component={CorporateScreen}     options={{ cardStyleInterpolator: slideRight }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="MyBookings" component={BookingsScreen} />
      <Stack.Screen name="Tracking"   component={TrackingScreen} options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Review"     component={ReviewScreen}   options={{ cardStyleInterpolator: slideUp }} />
    </Stack.Navigator>
  );
}

function OffersStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Offers" component={OffersScreen} />
      <Stack.Screen name="Refer"  component={ReferScreen}  options={{ cardStyleInterpolator: slideRight }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Profile"       component={ProfileScreen} />
      <Stack.Screen name="MyBookings"    component={MyBookingsScreen}    options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Addresses"     component={AddressesScreen}     options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Wallet"        component={WalletScreen}        options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Subscription"  component={SubscriptionScreen}  options={{ cardStyleInterpolator: slideUp }} />
      <Stack.Screen name="Refer"         component={ReferScreen}         options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Help"          component={HelpScreen}          options={{ cardStyleInterpolator: slideRight }} />
      <Stack.Screen name="Corporate"     component={CorporateScreen}     options={{ cardStyleInterpolator: slideRight }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <MKTabBar {...props} />} screenOptions={noHeader}>
      <Tab.Screen name="HomeTab"     component={HomeStack} />
      <Tab.Screen name="BookingsTab" component={BookingsStack} />
      <Tab.Screen name="OffersTab"   component={OffersStack} />
      <Tab.Screen name="ProfileTab"  component={ProfileStack} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['mkapp://', 'https://mkapp.in'],
  config: { screens: {
    HomeTab:     { screens: { ServiceDetail:'service/:serviceId', Automotive:'automotive', Subscription:'prime' } },
    BookingsTab: { screens: { Tracking:'booking/:bookingId/track' } },
    ProfileTab:  { screens: { Refer:'refer/:code' } },
  }},
};

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [splashDone,     setSplashDone]     = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('mk_onboarding_done')
      .then(val => setOnboardingDone(val === 'true'))
      .catch(() => setOnboardingDone(false));
  }, []);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem('mk_onboarding_done', 'true');
    setOnboardingDone(true);
  };

  if (!splashDone) return <SplashScreen onFinish={() => setSplashDone(true)} />;
  if (loading || onboardingDone === null) {
    return <View style={S.loading}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <NavigationContainer linking={linking}>
      {!onboardingDone
        ? <Stack.Navigator screenOptions={noHeader}><Stack.Screen name="Onboarding">{() => <OnboardingScreen onDone={handleOnboardingDone} />}</Stack.Screen></Stack.Navigator>
        : !user
        ? <Stack.Navigator screenOptions={noHeader}><Stack.Screen name="Login" component={LoginScreen} /></Stack.Navigator>
        : <MainTabs />
      }
    </NavigationContainer>
  );
}

const S = StyleSheet.create({
  loading: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:Colors.white },
  tabBar:  { flexDirection:'row', backgroundColor:Colors.white, borderTopWidth:1, borderTopColor:'#F0F0F5', paddingTop:8, paddingBottom:8, shadowColor:'#000', shadowOffset:{width:0,height:-3}, shadowOpacity:0.08, shadowRadius:8, elevation:12 },
  tabItem: { flex:1, alignItems:'center', justifyContent:'center', paddingVertical:4 },
  tabIconWrap:      { width:48, height:28, justifyContent:'center', alignItems:'center', borderRadius:14 },
  tabIconWrapActive:{ backgroundColor:Colors.primaryLight },
  tabIcon:          { fontSize:20 },
  tabIconActive:    { fontSize:22 },
  tabLabel:         { fontSize:10, fontWeight:'500', color:Colors.midGray, marginTop:2 },
  tabLabelActive:   { color:Colors.primary, fontWeight:'700' },
});
