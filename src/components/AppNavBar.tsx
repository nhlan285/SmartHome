import React, { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { VoiceRecorderModal } from '@/components/VoiceRecorderModal';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { theme } from '@/styles/theme';

type AppRouteName = keyof RootStackParamList;

type AppNavBarProps<RouteName extends AppRouteName> = {
  navigation: NativeStackNavigationProp<RootStackParamList, RouteName>;
  currentRoute: RouteName;
};

type NavGroup = 'home' | 'voice' | 'menu';

type NavItem = {
  key: NavGroup;
  route?: 'Dashboard' | 'Menu';
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  group: NavGroup;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', route: 'Dashboard', icon: 'home', label: 'Trang chủ', group: 'home' },
  { key: 'voice', icon: 'mic', label: 'Ghi âm giọng nói', group: 'voice' },
  { key: 'menu', route: 'Menu', icon: 'menu', label: 'Menu', group: 'menu' }
];

const getRouteGroup = (route: AppRouteName): NavGroup => {
  if (route === 'Dashboard') {
    return 'home';
  }

  return 'menu';
};

export function AppNavBar<RouteName extends AppRouteName>({
  navigation,
  currentRoute
}: AppNavBarProps<RouteName>): React.ReactElement {
  const { isDarkMode } = useAppSettings();
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const activeGroup = getRouteGroup(currentRoute);

  return (
    <>
      <View style={[styles.navShell, isDarkMode && styles.navShellDark]}>
        {NAV_ITEMS.map((item) => {
          const isVoice = item.group === 'voice';
          const isActive = isVoice ? isVoiceRecorderVisible : item.group === activeGroup;

          return (
            <Pressable
              key={item.key}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              style={[
                styles.navButton,
                isVoice && styles.voiceButton,
                isActive && styles.navButtonActive,
                isDarkMode && styles.navButtonDark
              ]}
              onPress={() => {
                if (isVoice) {
                  setIsVoiceRecorderVisible(true);
                  return;
                }

                if (item.route) {
                  navigation.navigate(item.route);
                }
              }}
            >
              <MaterialIcons
                name={item.icon}
                size={isVoice ? 34 : 31}
                color={isActive || isVoice ? '#FFFFFF' : '#8EA0A6'}
              />
            </Pressable>
          );
        })}
      </View>

      <VoiceRecorderModal
        visible={isVoiceRecorderVisible}
        onClose={() => setIsVoiceRecorderVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  navShell: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E4EFED',
    paddingHorizontal: 24,
    paddingVertical: 15,
    shadowColor: '#6E9997',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14
  },
  navShellDark: {
    backgroundColor: '#142733',
    borderColor: '#28414D'
  },
  navButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4
  },
  voiceButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginTop: -42,
    backgroundColor: theme.colors.warning,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 16
  },
  navButtonDark: {
    borderColor: '#142733'
  }
});
