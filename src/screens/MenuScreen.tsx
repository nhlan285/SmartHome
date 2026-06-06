import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AppNavBar } from '@/components/AppNavBar';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { theme } from '@/styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

type MenuItem = {
  route: 'Control' | 'History' | 'Schedule';
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    route: 'Control',
    icon: 'tune',
    title: 'Trạng thái hoạt động',
    description: 'Theo dõi và điều khiển trạng thái hiện tại của các thiết bị.'
  },
  {
    route: 'History',
    icon: 'show-chart',
    title: 'Thống kê lịch sử',
    description: 'Xem thống kê, nhật ký và tần suất sử dụng thiết bị.'
  },
  {
    route: 'Schedule',
    icon: 'event-available',
    title: 'Hẹn giờ đèn',
    description: 'Tạo, sửa và chạy lịch bật tắt đèn tự động.'
  }
];

export const MenuScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Quay lại trang chủ"
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <MaterialIcons name="arrow-back" size={30} color={theme.colors.primary} />
          </Pressable>
          <Text style={styles.title}>Menu</Text>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              style={styles.menuCard}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.iconBox}>
                <MaterialIcons name={item.icon} size={28} color={theme.colors.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#A8B6BA" />
            </Pressable>
          ))}
        </View>
      </View>

      <AppNavBar navigation={navigation} currentRoute="Menu" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  safeAreaDark: {
    backgroundColor: '#101D25'
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 156
  },
  headerRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: theme.colors.primary,
    fontSize: 23,
    fontWeight: '900'
  },
  menuList: {
    gap: 14
  },
  menuCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#9CBFBB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EAF7F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuTextBox: {
    flex: 1
  },
  menuTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  menuDescription: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  }
});
