import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from '@/navigation/AppNavigator';
import { LightScheduleProvider } from '@/context/LightScheduleContext';
import { theme } from '@/styles/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    primary: theme.colors.primary,
    card: '#FFFFFF',
    border: theme.colors.border,
    text: theme.colors.textPrimary
  }
};

const App: React.FC = () => (
  <NavigationContainer theme={navigationTheme}>
    <StatusBar style="dark" />
    <LightScheduleProvider>
      <AppNavigator />
    </LightScheduleProvider>
  </NavigationContainer>
);

export default App;
