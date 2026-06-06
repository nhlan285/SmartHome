import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ControlScreen } from '@/screens/ControlScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { ScheduleScreen } from '@/screens/ScheduleScreen';
import { MenuScreen } from '@/screens/MenuScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Menu: undefined;
  Control: undefined;
  History: undefined;
  Schedule: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => (
  <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Menu" component={MenuScreen} />
    <Stack.Screen name="Control" component={ControlScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Schedule" component={ScheduleScreen} />
  </Stack.Navigator>
);
