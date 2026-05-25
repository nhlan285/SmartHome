import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AppSettingsProvider, useAppSettings } from '@/context/AppSettingsContext';
import { LightScheduleProvider } from '@/context/LightScheduleContext';
import { theme } from '@/styles/theme';

const AppShell: React.FC = () => {
  const { isDarkMode } = useAppSettings();
  const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: isDarkMode ? '#101D25' : theme.colors.background,
      primary: theme.colors.primary,
      card: isDarkMode ? '#142733' : '#FFFFFF',
      border: isDarkMode ? '#28414D' : theme.colors.border,
      text: isDarkMode ? '#EAF7FB' : theme.colors.textPrimary
    }
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <LightScheduleProvider>
        <AppNavigator />
      </LightScheduleProvider>
    </NavigationContainer>
  );
};

const App: React.FC = () => (
  <AppSettingsProvider>
    <AppShell />
  </AppSettingsProvider>
);

export default App;
