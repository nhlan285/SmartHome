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
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Trang chủ' }} />
    <Stack.Screen name="Control" component={ControlScreen} options={{ title: 'Điều khiển' }} />
    <Stack.Screen name="Voice" component={VoiceScreen} options={{ title: 'Giọng nói' }} />
    <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử' }} />
    <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Hẹn giờ' }} />
  </Stack.Navigator>
);
