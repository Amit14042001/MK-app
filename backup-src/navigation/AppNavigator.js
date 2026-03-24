// ── Professional App Navigation ───────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfAuthProvider, useProfAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import { JobsScreen } from '../screens/jobs/JobsScreen';
import { EarningsScreen } from '../screens/earnings/EarningsScreen';
import ProfProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}
      initialRouteName="Dashboard">
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="ProfProfile" component={ProfProfileScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { professional, loading } = useProfAuth();

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' }}>
        <Text style={{ fontSize:40, marginBottom:12 }}>🔧</Text>
        <Text style={{ fontSize:22, fontWeight:'900', color:'#1A1A2E' }}>MK Pro</Text>
        <ActivityIndicator color="#E94560" size="small" style={{ marginTop:20 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {professional ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default RootNavigator;
