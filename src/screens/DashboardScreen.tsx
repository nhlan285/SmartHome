import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppNavBar } from '@/components/AppNavBar';
import { VoicePrimaryButton } from '@/components/VoicePrimaryButton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { getDeviceState } from '@/services/api/deviceApi';
import { connectWebSocket } from '@/services/realtime/websocketService';
import { theme } from '@/styles/theme';
import { DashboardSnapshot } from '@/types/models';
import { getDeviceKindLabel, getDeviceStatusLabel, groupDevicesByRoom } from '@/utils/deviceRooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
const GAS_ALERT_THRESHOLD = 1500;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGasAlertModalVisible, setIsGasAlertModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const {
    colorMode,
    isDarkMode,
    isSettingsReady,
    settingsError,
    wifiId,
    profile,
    toggleColorMode,
    updateWifiId,
    resetWifiId,
    updateProfile
  } = useAppSettings();

  const refreshState = async (): Promise<void> => {
    try {
      setError(null);
      const data = await getDeviceState();
      setSnapshot(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể làm mới bảng điều khiển.';
      setError(message);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async (): Promise<void> => {
      try {
        setError(null);
        const data = await getDeviceState();
        if (isMounted) {
          setSnapshot(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể tải trạng thái ban đầu.';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialState();

    const unsubscribe = connectWebSocket((realtimeData) => {
      // Neu khong setState tai callback, UI se khong tu update theo realtime.
      setSnapshot(realtimeData);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const temperature = snapshot?.sensors.temperatureC ?? '-';
  const humidity = snapshot?.sensors.humidityPercent ?? '-';
  const gas = snapshot?.sensors.gasPpm ?? '-';
  const gasNumber = snapshot?.sensors.gasPpm;
  const isGasDanger = typeof gasNumber === 'number' && gasNumber > GAS_ALERT_THRESHOLD;

  useEffect(() => {
    if (isGasDanger) {
      setIsGasAlertModalVisible(true);
    }
  }, [isGasDanger]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu tổng quan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cityDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const roomGroups = groupDevicesByRoom(snapshot?.devices ?? []);

  const lastUpdated = snapshot?.sensors.updatedAt
    ? new Date(snapshot.sensors.updatedAt).toLocaleTimeString()
    : '--:--';

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.title}>Nhà thông minh</Text>
          </View>
          <Pressable
            accessibilityLabel="Mở cài đặt"
            accessibilityRole="button"
            style={styles.headerIcon}
            onPress={() => setIsSettingsVisible(true)}
          >
            <Text style={styles.headerIconText}>{profile.avatarInitial}</Text>
          </Pressable>
        </View>

        <VoicePrimaryButton navigation={navigation} />

        <View style={[styles.climateCard, isGasDanger && styles.climateCardDanger]}>
          <View style={styles.climateTopRow}>
            <Text style={styles.cityText}>
              Tại <Text style={styles.cityAccent}>Đà Nẵng</Text>
            </Text>
            <Text style={styles.dateText}>{cityDate}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Nhiệt độ</Text>
              <Text style={styles.metricValue}>{temperature}°C</Text>
            </View>
            <View style={[styles.metricBox, styles.metricHighlight]}>
              <Text style={styles.metricLabelLight}>Độ ẩm</Text>
              <Text style={styles.metricValueLight}>{humidity}%</Text>
            </View>
            <View style={[styles.metricBox, isGasDanger && styles.metricGasDanger]}>
              <Text style={styles.metricLabel}>Khí gas</Text>
              <Text style={[styles.metricValue, isGasDanger && styles.metricGasValueDanger]}>{gas}</Text>
            </View>
          </View>

          <Text style={styles.noteText}>Cập nhật thời gian thực: {lastUpdated}</Text>

          {isGasDanger ? (
            <Pressable
              style={styles.gasWarningBanner}
              onPress={() => setIsGasAlertModalVisible(true)}
            >
              <Text style={styles.gasWarningTitle}>CẢNH BÁO: KHÍ GAS VƯỢT NGƯỠNG</Text>
              <Text style={styles.gasWarningBody}>
                Khí gas hiện tại {gasNumber} ppm, lớn hơn ngưỡng {GAS_ALERT_THRESHOLD} ppm.
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thiết bị thông minh</Text>
          <Pressable onPress={() => void refreshState()}>
            <Text style={styles.refreshText}>Làm mới</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {roomGroups.length === 0 ? (
          <Text style={styles.noteText}>Chưa có dữ liệu trạng thái thiết bị.</Text>
        ) : null}

        <View style={styles.roomList}>
          {roomGroups.map((group) => (
            <View key={group.room} style={styles.roomCard}>
              <View style={styles.roomHeaderRow}>
                <View>
                  <Text style={styles.roomTitle}>{group.label}</Text>
                  <Text style={styles.roomMeta}>
                    {group.onCount}/{group.totalCount} thiết bị đang bật
                  </Text>
                </View>
                <View style={styles.roomCountBadge}>
                  <Text style={styles.roomCountText}>{group.totalCount}</Text>
                </View>
              </View>

              <View style={styles.deviceGrid}>
                {group.devices.map((item) => {
                  const isOn = item.device.status === 'on';
                  const status = getDeviceStatusLabel(item.device.status);

                  return (
                    <View
                      key={item.device.deviceId}
                      style={[styles.deviceCard, isOn && styles.deviceCardActive]}
                    >
                      <Text style={styles.deviceType}>{getDeviceKindLabel(item.kind)}</Text>
                      <Text style={styles.deviceTitle} numberOfLines={2}>
                        {item.device.name}
                      </Text>
                      <View style={[styles.statusBadge, isOn ? styles.statusOn : styles.statusOff]}>
                        <Text style={styles.statusText}>{status}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <AppNavBar navigation={navigation} currentRoute="Dashboard" />
      </ScrollView>

      <Modal
        visible={isGasAlertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGasAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>CẢNH BÁO KHÍ GAS</Text>
            <Text style={styles.modalValue}>{gasNumber ?? '--'} ppm</Text>
            <Text style={styles.modalMessage}>
              Hệ thống đã nhận mức khí gas vượt ngưỡng an toàn ({GAS_ALERT_THRESHOLD} ppm).
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setIsGasAlertModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Đã hiểu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isSettingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <View style={styles.settingsOverlay}>
          <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
            <View style={styles.settingsHeaderRow}>
              <View>
                <Text style={[styles.settingsTitle, isDarkMode && styles.settingsTextDark]}>
                  Cài đặt
                </Text>
                <Text style={styles.settingsSubtitle}>
                  {isSettingsReady ? 'Đã đồng bộ cục bộ' : 'Đang đọc cài đặt...'}
                </Text>
              </View>
              <Pressable style={styles.settingsCloseButton} onPress={() => setIsSettingsVisible(false)}>
                <Text style={styles.settingsCloseText}>X</Text>
              </Pressable>
            </View>

            {settingsError ? <Text style={styles.settingsErrorText}>{settingsError}</Text> : null}

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, isDarkMode && styles.settingsTextDark]}>
                Giao diện
              </Text>
              <Pressable
                style={[styles.modeToggle, isDarkMode && styles.modeToggleDark]}
                onPress={toggleColorMode}
              >
                <View
                  style={[
                    styles.modeOption,
                    colorMode === 'light' && styles.modeOptionActive
                  ]}
                >
                  <Text
                    style={[
                      styles.modeOptionText,
                      colorMode === 'light' && styles.modeOptionTextActive
                    ]}
                  >
                    Sáng
                  </Text>
                </View>
                <View
                  style={[styles.modeOption, colorMode === 'dark' && styles.modeOptionActive]}
                >
                  <Text
                    style={[
                      styles.modeOptionText,
                      colorMode === 'dark' && styles.modeOptionTextActive
                    ]}
                  >
                    Tối
                  </Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, isDarkMode && styles.settingsTextDark]}>
                Mã Wi-Fi
              </Text>
              <View style={styles.settingsInputRow}>
                <TextInput
                  style={[styles.settingsInput, isDarkMode && styles.settingsInputDark]}
                  value={wifiId}
                  onChangeText={updateWifiId}
                  placeholder="SMART_HOME_WIFI"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Pressable style={styles.resetWifiButton} onPress={resetWifiId}>
                  <Text style={styles.resetWifiButtonText}>Đặt lại</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, isDarkMode && styles.settingsTextDark]}>
                Tài khoản
              </Text>
              <TextInput
                style={[styles.settingsInput, isDarkMode && styles.settingsInputDark]}
                value={profile.displayName}
                onChangeText={(displayName) => updateProfile({ ...profile, displayName })}
                placeholder="Tên tài khoản"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <View style={styles.avatarRow}>
                <View style={styles.avatarPreview}>
                  <Text style={styles.avatarPreviewText}>{profile.avatarInitial}</Text>
                </View>
                <TextInput
                  style={[styles.avatarInput, isDarkMode && styles.settingsInputDark]}
                  value={profile.avatarInitial}
                  onChangeText={(avatarInitial) => updateProfile({ ...profile, avatarInitial })}
                  placeholder="B"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E2736',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  headerIconText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  climateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    shadowColor: '#0A2A40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  climateCardDanger: {
    borderColor: '#F26F7D',
    backgroundColor: '#FFF2F4'
  },
  climateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cityText: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textPrimary
  },
  cityAccent: {
    color: theme.colors.warning
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8
  },
  metricBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F5FBFE',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm
  },
  metricGasDanger: {
    borderColor: '#F26F7D',
    backgroundColor: '#FFE3E7'
  },
  metricHighlight: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  metricValue: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800'
  },
  metricGasValueDanger: {
    color: '#B31D3C'
  },
  metricLabelLight: {
    color: '#E8FBFF',
    fontWeight: '600'
  },
  metricValueLight: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800'
  },
  sectionHeaderRow: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  refreshText: {
    color: theme.colors.warning,
    fontWeight: '700'
  },
  roomList: {
    gap: 12
  },
  roomCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  roomTitle: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: '900'
  },
  roomMeta: {
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '600'
  },
  roomCountBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4F8FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  roomCountText: {
    color: theme.colors.primary,
    fontWeight: '900'
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  deviceCard: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 14,
    backgroundColor: '#F8FCFE',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    minHeight: 116,
    justifyContent: 'space-between'
  },
  deviceCardActive: {
    backgroundColor: '#DEF6FB',
    borderColor: '#9BE1F0'
  },
  deviceType: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  deviceTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
    marginTop: 4
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8
  },
  statusOn: {
    backgroundColor: '#D8F8F0'
  },
  statusOff: {
    backgroundColor: '#E8EEF4'
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.textSecondary
  },
  noteText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 2
  },
  gasWarningBanner: {
    marginTop: theme.spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F26F7D',
    backgroundColor: '#FFDEE3',
    padding: 10
  },
  gasWarningTitle: {
    color: '#B31D3C',
    fontSize: 14,
    fontWeight: '800'
  },
  gasWarningBody: {
    marginTop: 4,
    color: '#B31D3C',
    fontWeight: '600'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    marginTop: 2
  },
  navRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: '#E3F7FD',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  navButtonText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(60, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: '#B31D3C',
    borderWidth: 2,
    borderColor: '#FFD3DA',
    padding: 18,
    alignItems: 'center'
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900'
  },
  modalValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900'
  },
  modalMessage: {
    marginTop: 8,
    color: '#FFE8EC',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600'
  },
  modalButton: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  modalButtonText: {
    color: '#B31D3C',
    fontWeight: '800'
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 35, 48, 0.46)',
    justifyContent: 'center',
    padding: theme.spacing.md
  },
  settingsCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md
  },
  settingsCardDark: {
    backgroundColor: '#142733',
    borderColor: '#28414D'
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12
  },
  settingsTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  settingsSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '600'
  },
  settingsTextDark: {
    color: '#EAF7FB'
  },
  settingsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF4'
  },
  settingsCloseText: {
    color: theme.colors.textPrimary,
    fontWeight: '900'
  },
  settingsSection: {
    marginTop: 12
  },
  settingsLabel: {
    color: theme.colors.textPrimary,
    fontWeight: '900',
    marginBottom: 8
  },
  settingsErrorText: {
    color: theme.colors.danger,
    fontWeight: '800',
    marginBottom: 4
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#F8FCFE',
    padding: 6
  },
  modeToggleDark: {
    backgroundColor: '#101D25',
    borderColor: '#28414D'
  },
  modeOption: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center'
  },
  modeOptionActive: {
    backgroundColor: theme.colors.primary
  },
  modeOptionText: {
    color: theme.colors.textSecondary,
    fontWeight: '800'
  },
  modeOptionTextActive: {
    color: '#FFFFFF'
  },
  settingsInputRow: {
    flexDirection: 'row',
    gap: 8
  },
  settingsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    backgroundColor: '#F8FCFE',
    fontWeight: '700'
  },
  settingsInputDark: {
    backgroundColor: '#101D25',
    borderColor: '#28414D',
    color: '#EAF7FB'
  },
  resetWifiButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4F8FE'
  },
  resetWifiButtonText: {
    color: theme.colors.primary,
    fontWeight: '900'
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10
  },
  avatarPreview: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  },
  avatarPreviewText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900'
  },
  avatarInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    backgroundColor: '#F8FCFE',
    fontWeight: '900',
    textAlign: 'center'
  }
});
