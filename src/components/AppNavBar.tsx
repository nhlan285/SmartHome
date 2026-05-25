import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { theme } from '@/styles/theme';

type AppRouteName = keyof RootStackParamList;

type AppNavBarProps<RouteName extends AppRouteName> = {
  navigation: NativeStackNavigationProp<RootStackParamList, RouteName>;
  currentRoute: RouteName;
};

type NavItem = {
  route: Exclude<AppRouteName, 'Voice'>;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { route: 'Dashboard', label: 'Dashboard' },
  { route: 'Control', label: 'Control' },
  { route: 'History', label: 'History' },
  { route: 'Schedule', label: 'Schedule' }
];

export function AppNavBar<RouteName extends AppRouteName>({
  navigation,
  currentRoute
}: AppNavBarProps<RouteName>): React.ReactElement {
  const { isDarkMode } = useAppSettings();
  const visibleItems = NAV_ITEMS.filter((item) => item.route !== currentRoute);
  return (
    <View style={[styles.navShell, isDarkMode && styles.navShellDark]}>
      {visibleItems.map((item) => (
        <Pressable
          key={item.route}
          accessibilityRole="button"
          style={[styles.navButton, isDarkMode && styles.navButtonDark]}
          onPress={() => navigation.navigate(item.route)}
        >
          <Text style={styles.navButtonText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navShell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
    marginTop: 12,
    marginBottom: 12
  },
  navShellDark: {
    backgroundColor: '#142733',
    borderColor: '#28414D'
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '31%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#E4F8FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  navButtonDark: {
    backgroundColor: '#19313F'
  },
  navButtonText: {
    color: theme.colors.primary,
    fontWeight: '800'
  }
});
