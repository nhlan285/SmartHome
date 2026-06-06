import React, { useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { getDeviceState } from '@/services/api/deviceApi';
import { connectWebSocket } from '@/services/realtime/websocketService';
import { theme } from '@/styles/theme';
import { DashboardSnapshot } from '@/types/models';
import {
  getDeviceKindLabel,
  getDeviceStatusLabel,
  groupDevicesByRoom,
  RoomDeviceItem
} from '@/utils/deviceRooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type DeviceTile = {
  groupLabel: string;
  item: RoomDeviceItem;
};

const GAS_ALERT_THRESHOLD = 1500;

const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 11) {
    return 'Chào buổi sáng,';
  }

  if (hour < 18) {
    return 'Chào buổi chiều,';
  }

  return 'Chào buổi tối,';
};

const getWeatherNote = (temperature?: number): string => {
  if (typeof temperature !== 'number') {
    return 'Đang cập nhật';
  }

  if (temperature >= 30) {
    return 'Nóng';
  }

  if (temperature >= 26) {
    return 'Ấm áp';
  }

  if (temperature >= 20) {
    return 'Dễ chịu';
  }

  return 'Mát';
};

const getDeviceIcon = (kind: RoomDeviceItem['kind']): keyof typeof MaterialIcons.glyphMap => {
  if (kind === 'light') {
    return 'lightbulb';
  }

  if (kind === 'fan') {
    return 'air';
  }

  if (kind === 'door') {
    return 'meeting-room';
  }

  return 'settings-remote';
};

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
      setSnapshot(realtimeData);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const temperature = snapshot?.sensors.temperatureC;
  const humidity = snapshot?.sensors.humidityPercent;
  const gasNumber = snapshot?.sensors.gasPpm;
  const isGasDanger = typeof gasNumber === 'number' && gasNumber > GAS_ALERT_THRESHOLD;

  useEffect(() => {
    if (isGasDanger) {
      setIsGasAlertModalVisible(true);
    }
  }, [isGasDanger]);

  const cityDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const roomGroups = useMemo(() => groupDevicesByRoom(snapshot?.devices ?? []), [snapshot]);
  const deviceTiles = useMemo<DeviceTile[]>(
    () =>
      roomGroups.reduce<DeviceTile[]>((items, group) => {
        group.devices.forEach((item) => {
          items.push({ groupLabel: group.label, item });
        });
        return items;
      }, []),
    [roomGroups]
  );
  const allDevicesCount = deviceTiles.length;
  const activeDevicesCount = deviceTiles.filter(({ item }) => item.device.status === 'on').length;

  const lastUpdated = snapshot?.sensors.updatedAt
    ? new Date(snapshot.sensors.updatedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '--:--';

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

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>Nhà thông minh</Text>
          </View>
          <Pressable
            accessibilityLabel="Mở cài đặt"
            accessibilityRole="button"
            style={styles.headerIcon}
            onPress={() => setIsSettingsVisible(true)}
          >
            <MaterialIcons name="notifications" size={24} color="#CAD0D5" />
          </Pressable>
        </View>

        <View style={[styles.climateCard, isGasDanger && styles.climateCardDanger]}>
          <View style={styles.climateTopRow}>
            <Text style={styles.cityText}>
              Ở <Text style={styles.cityAccent}>Đà Nẵng</Text>
            </Text>
            <Text style={styles.dateText}>{cityDate}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <View style={styles.temperatureBox}>
              <Text style={styles.metricLabel}>Nhiệt độ</Text>
              <Text style={styles.temperatureValue}>
                {typeof temperature === 'number' ? Math.round(temperature) : '-'}°
              </Text>
              <Text style={styles.warmText}>{getWeatherNote(temperature)}</Text>
            </View>

            <View style={styles.humidityBox}>
              <Text style={styles.metricLabelLight}>Độ ẩm</Text>
              <Text style={styles.humidityValue}>
                {typeof humidity === 'number' ? Math.round(humidity) : '-'}%
              </Text>
              <Text style={styles.humidityText}>Bình thường</Text>
            </View>
          </View>

          <View style={[styles.gasStrip, isGasDanger && styles.gasStripDanger]}>
            <View style={styles.gasLeft}>
              <MaterialIcons
                name="local-fire-department"
                size={18}
                color={isGasDanger ? theme.colors.danger : theme.colors.warning}
              />
              <Text style={[styles.gasText, isGasDanger && styles.gasTextDanger]}>
                Khí gas: {typeof gasNumber === 'number' ? Math.round(gasNumber) : '--'} ppm
              </Text>
            </View>
            <Text style={[styles.gasMeta, isGasDanger && styles.gasTextDanger]}>
              {isGasDanger ? 'Nguy hiểm' : `Cập nhật ${lastUpdated}`}
            </Text>
          </View>

          {isGasDanger ? (
            <Pressable
              style={styles.gasWarningBanner}
              onPress={() => setIsGasAlertModalVisible(true)}
            >
              <Text style={styles.gasWarningTitle}>CẢNH BÁO KHÍ GAS VƯỢT NGƯỠNG</Text>
              <Text style={styles.gasWarningBody}>
                Khí gas hiện tại {gasNumber} ppm, lớn hơn ngưỡng {GAS_ALERT_THRESHOLD} ppm.
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thiết bị thông minh</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void refreshState();
            }}
          >
            <Text style={styles.refreshText}>Làm mới</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.allDevicesCard}>
          <View>
            <Text style={styles.allDevicesTitle}>Tất cả thiết bị</Text>
            <Text style={styles.allDevicesMeta}>
              {activeDevicesCount}/{allDevicesCount} thiết bị đang bật
            </Text>
          </View>
          <View style={[styles.switchTrack, activeDevicesCount > 0 && styles.switchTrackOn]}>
            <View style={[styles.switchThumb, activeDevicesCount > 0 && styles.switchThumbOn]} />
          </View>
        </View>

        {deviceTiles.length === 0 ? (
          <Text style={styles.noteText}>Chưa có dữ liệu trạng thái thiết bị.</Text>
        ) : null}

        <View style={styles.deviceGrid}>
          {deviceTiles.map(({ groupLabel, item }) => {
            const isOn = item.device.status === 'on';

            return (
              <View key={item.device.deviceId} style={[styles.deviceTile, isOn && styles.deviceTileActive]}>
                <View style={styles.deviceTopRow}>
                  <View style={[styles.deviceIconBox, isOn && styles.deviceIconBoxActive]}>
                    <MaterialIcons
                      name={getDeviceIcon(item.kind)}
                      size={28}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={[styles.miniSwitchTrack, isOn && styles.miniSwitchTrackOn]}>
                    <View style={[styles.miniSwitchThumb, isOn && styles.miniSwitchThumbOn]} />
                  </View>
                </View>

                <Text style={[styles.deviceTitle, isOn && styles.deviceTitleActive]} numberOfLines={2}>
                  {item.device.name}
                </Text>
                <Text style={[styles.deviceMeta, isOn && styles.deviceMetaActive]} numberOfLines={1}>
                  {groupLabel} - {getDeviceStatusLabel(item.device.status)}
                </Text>
                <Text style={[styles.deviceKind, isOn && styles.deviceKindActive]}>
                  {getDeviceKindLabel(item.kind)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <AppNavBar navigation={navigation} currentRoute="Dashboard" />

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
            <Pressable style={styles.modalButton} onPress={() => setIsGasAlertModalVisible(false)}>
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
                <MaterialIcons name="close" size={20} color={theme.colors.textPrimary} />
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
                <View style={[styles.modeOption, colorMode === 'light' && styles.modeOptionActive]}>
                  <Text
                    style={[
                      styles.modeOptionText,
                      colorMode === 'light' && styles.modeOptionTextActive
                    ]}
                  >
                    Sáng
                  </Text>
                </View>
                <View style={[styles.modeOption, colorMode === 'dark' && styles.modeOptionActive]}>
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
              <Text style={[styles.settingsLabel, isDarkMode && styles.settingsTextDark]}>Mã Wi-Fi</Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 156
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
    marginBottom: 28
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800'
  },
  title: {
    marginTop: 3,
    color: theme.colors.textPrimary,
    fontSize: 25,
    fontWeight: '900'
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EFED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7FAAA6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3
  },
  climateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EFED',
    padding: 18,
    shadowColor: '#9CBFBB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5
  },
  climateCardDanger: {
    borderColor: '#FFD0D2',
    backgroundColor: '#FFF7F7'
  },
  climateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  cityText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  cityAccent: {
    color: theme.colors.primary
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: '#E6EFED',
    marginVertical: 15
  },
  metricRow: {
    flexDirection: 'row',
    gap: 14
  },
  temperatureBox: {
    flex: 1,
    justifyContent: 'center'
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  temperatureValue: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 36,
    fontWeight: '900'
  },
  warmText: {
    color: theme.colors.warning,
    fontSize: 16,
    fontWeight: '700'
  },
  humidityBox: {
    flex: 1,
    minHeight: 116,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14
  },
  metricLabelLight: {
    color: '#F6FFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  humidityValue: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900'
  },
  humidityText: {
    color: '#F6FFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  gasStrip: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#FFF6E8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  gasStripDanger: {
    backgroundColor: '#FFE5E6'
  },
  gasLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  gasText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  gasMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  gasTextDanger: {
    color: '#B31D3C'
  },
  sectionHeaderRow: {
    marginTop: 30,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  refreshText: {
    color: theme.colors.warning,
    fontWeight: '800'
  },
  allDevicesCard: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EBE9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  allDevicesTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  allDevicesMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  switchTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E0EA',
    padding: 2,
    justifyContent: 'center'
  },
  switchTrackOn: {
    backgroundColor: '#CFEDEA'
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF'
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  deviceTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 136,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EBE9',
    backgroundColor: '#FFFFFF',
    padding: 14,
    justifyContent: 'space-between'
  },
  deviceTileActive: {
    backgroundColor: '#EAF7F6',
    borderColor: '#B7DEDB'
  },
  deviceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#EEF8F7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deviceIconBoxActive: {
    backgroundColor: '#FFFFFF'
  },
  miniSwitchTrack: {
    width: 34,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E0EA',
    padding: 2,
    justifyContent: 'center'
  },
  miniSwitchTrackOn: {
    backgroundColor: '#CFEDEA'
  },
  miniSwitchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF'
  },
  miniSwitchThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary
  },
  deviceTitle: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  deviceTitleActive: {
    color: theme.colors.textPrimary
  },
  deviceMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  deviceMetaActive: {
    color: theme.colors.textSecondary
  },
  deviceKind: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  deviceKindActive: {
    color: theme.colors.primary
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.textSecondary
  },
  noteText: {
    color: theme.colors.textSecondary,
    marginBottom: 12
  },
  gasWarningBanner: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F26F7D',
    backgroundColor: '#FFDEE3',
    padding: 10
  },
  gasWarningTitle: {
    color: '#B31D3C',
    fontSize: 14,
    fontWeight: '900'
  },
  gasWarningBody: {
    marginTop: 4,
    color: '#B31D3C',
    fontWeight: '700'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 12,
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
    borderRadius: 18,
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
    backgroundColor: '#FFFBF6',
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
    backgroundColor: '#FFFBF6',
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
    backgroundColor: '#F8ECD7'
  },
  resetWifiButtonText: {
    color: theme.colors.warning,
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
    backgroundColor: '#FFFBF6',
    fontWeight: '900',
    textAlign: 'center'
  }
});
