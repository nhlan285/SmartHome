import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ControlScreen } from '@/screens/ControlScreen';
import { VoiceScreen } from '@/screens/VoiceScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { ScheduleScreen } from '@/screens/ScheduleScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Control: undefined;
  Voice: undefined;
  History: undefined;
  Schedule: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => (
  <Stack.Navigator initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Control" component={ControlScreen} />
    <Stack.Screen name="Voice" component={VoiceScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Schedule" component={ScheduleScreen} />
  </Stack.Navigator>
);
