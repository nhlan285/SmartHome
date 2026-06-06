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
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppNavBar } from '@/components/AppNavBar';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { controlDevice, DeviceAction, getDeviceState } from '@/services/api/deviceApi';
import { connectWebSocket } from '@/services/realtime/websocketService';
import { DashboardSnapshot } from '@/types/models';
import {
  buildDeviceId,
  buildDeviceName,
  Esp32Device,
  Esp32Room,
  extractRoomDeviceFromDeviceId
} from '@/services/api/esp32Contract';
import { theme } from '@/styles/theme';
import { getDeviceKindLabel, getDeviceStatusLabel, getRoomLabel } from '@/utils/deviceRooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Control'>;

type ControlTarget = {
  room: Esp32Room;
  device: Esp32Device;
  label: string;
};

const GAS_ALERT_THRESHOLD = 1500;

const DEFAULT_CONTROL_TARGETS: ControlTarget[] = [
  { room: 'living', device: 'light', label: 'Đèn phòng khách' },
  { room: 'living', device: 'fan', label: 'Quạt phòng khách' },
  { room: 'living', device: 'door', label: 'Cửa phòng khách' },
  { room: 'bedroom', device: 'light', label: 'Đèn phòng ngủ' },
  { room: 'bedroom', device: 'fan', label: 'Quạt phòng ngủ' },
  { room: 'bedroom', device: 'door', label: 'Cửa phòng ngủ' },
  { room: 'kitchen', device: 'light', label: 'Đèn nhà bếp' },
  { room: 'kitchen', device: 'fan', label: 'Quạt nhà bếp' },
  { room: 'kitchen', device: 'door', label: 'Cửa nhà bếp' },
  { room: 'hallway', device: 'light', label: 'Đèn hành lang' }
];

const getDeviceIcon = (device: Esp32Device): keyof typeof MaterialIcons.glyphMap => {
  if (device === 'light') {
    return 'lightbulb';
  }

  if (device === 'fan') {
    return 'air';
  }

  return 'meeting-room';
};

const getSyntheticIp = (deviceId: string): string => {
  const sum = deviceId.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return `192.168.1.${(sum % 180) + 20}`;
};

const formatLastAction = (iso?: string): string => {
  if (!iso) {
    return 'Đang chờ dữ liệu';
  }

  const timestamp = new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (diffMinutes < 1) {
    return 'Vừa cập nhật';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = Math.round(hours / 24);
  return `${days} ngày trước`;
};

export const ControlScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const [isSending, setIsSending] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [currentTarget, setCurrentTarget] = useState('Chưa có thao tác nào');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isGasAlertModalVisible, setIsGasAlertModalVisible] = useState(false);

  const gasValue = snapshot?.sensors.gasPpm;
  const isGasDanger = typeof gasValue === 'number' && gasValue > GAS_ALERT_THRESHOLD;

  const statusByDeviceId = useMemo(() => {
    const map = new Map<string, string>();
    (snapshot?.devices ?? []).forEach((item) => {
      map.set(item.deviceId, item.status.toUpperCase());
    });
    return map;
  }, [snapshot]);

  const deviceById = useMemo(() => {
    const map = new Map<string, DashboardSnapshot['devices'][number]>();
    (snapshot?.devices ?? []).forEach((item) => {
      map.set(item.deviceId, item);
    });
    return map;
  }, [snapshot]);

  const controlTargets = useMemo<ControlTarget[]>(() => {
    const devices = snapshot?.devices ?? [];

    if (devices.length === 0) {
      return DEFAULT_CONTROL_TARGETS;
    }

    const mappedTargets = devices
      .map((item) => {
        const parsed = extractRoomDeviceFromDeviceId(item.deviceId);
        if (!parsed) {
          return null;
        }

        return {
          room: parsed.room,
          device: parsed.device,
          label: buildDeviceName(parsed.room, parsed.device)
        } as ControlTarget;
      })
      .filter((item): item is ControlTarget => item !== null);

    if (mappedTargets.length === 0) {
      return DEFAULT_CONTROL_TARGETS;
    }

    const uniqueTargets = new Map<string, ControlTarget>();
    mappedTargets.forEach((item) => {
      uniqueTargets.set(`${item.room}-${item.device}`, item);
    });

    return Array.from(uniqueTargets.values());
  }, [snapshot]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async (): Promise<void> => {
      try {
        const data = await getDeviceState();
        if (isMounted) {
          setSnapshot(data);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu ESP32.';
          setErrorMessage(message);
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

  useEffect(() => {
    if (isGasDanger) {
      setIsGasAlertModalVisible(true);
    }
  }, [isGasDanger]);

  const syncLocalStatus = (room: Esp32Room, device: Esp32Device, action: DeviceAction): void => {
    const targetDeviceId = buildDeviceId(room, device);
    const nextStatus = action === 'ON' ? 'on' : 'off';

    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        devices: current.devices.map((item) =>
          item.deviceId === targetDeviceId
            ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
            : item
        )
      };
    });
  };

  const handleControl = async (
    room: Esp32Room,
    device: Esp32Device,
    action: DeviceAction
  ): Promise<void> => {
    const target = `${getRoomLabel(room)} - ${getDeviceKindLabel(device)} (${action === 'ON' ? 'Bật' : 'Tắt'})`;
    setCurrentTarget(target);
    setIsSending(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const result = await controlDevice(room, device, action);
      setSuccessMessage(result.message);
      if (result.snapshot) {
        setSnapshot(result.snapshot);
      } else {
        syncLocalStatus(room, device, action);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gửi lệnh thất bại.';
      setErrorMessage(message);

      console.error('[ControlScreen] Lỗi điều khiển thiết bị', {
        room,
        device,
        action,
        message
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Quay lại menu"
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <MaterialIcons name="arrow-back" size={30} color={theme.colors.primary} />
          </Pressable>
          <Text style={styles.title}>Trạng thái hoạt động</Text>
        </View>

        <View style={styles.statusSummary}>
          <Text style={styles.summaryLabel}>Thao tác gần nhất</Text>
          <Text style={styles.summaryValue}>{currentTarget}</Text>
        </View>

        {isGasDanger ? (
          <Pressable
            style={styles.gasWarningBanner}
            onPress={() => setIsGasAlertModalVisible(true)}
          >
            <Text style={styles.gasWarningTitle}>CẢNH BÁO KHÍ GAS NGUY HIỂM</Text>
            <Text style={styles.gasWarningBody}>
              Khí gas hiện tại: {gasValue} ppm (ngưỡng cảnh báo: {GAS_ALERT_THRESHOLD} ppm)
            </Text>
          </Pressable>
        ) : null}

        {isSending ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang gửi lệnh điều khiển...</Text>
          </View>
        ) : null}

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.deviceList}>
          {controlTargets.map((target) => {
            const deviceId = buildDeviceId(target.room, target.device);
            const currentStatus = statusByDeviceId.get(deviceId) ?? 'UNKNOWN';
            const currentDevice = deviceById.get(deviceId);
            const isOn = currentStatus === 'ON';

            return (
              <View key={`${target.room}-${target.device}`} style={styles.deviceCard}>
                <View style={styles.deviceTopRow}>
                  <View style={styles.deviceTitleBox}>
                    <View style={styles.deviceNameRow}>
                      <MaterialIcons name={getDeviceIcon(target.device)} size={22} color={theme.colors.primary} />
                      <Text style={styles.deviceName}>{target.label}</Text>
                    </View>
                    <Text style={styles.deviceSub}>{getRoomLabel(target.room)}</Text>
                  </View>
                  <View style={[styles.statusPill, isOn ? styles.statusOn : styles.statusOff]}>
                    <MaterialIcons name="power-settings-new" size={16} color="#FFFFFF" />
                    <Text style={styles.statusPillText}>{isOn ? 'BẬT' : 'TẮT'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="access-time" size={15} color="#A7A7A7" />
                    <Text style={styles.infoText}>Lần cuối: {formatLastAction(currentDevice?.updatedAt)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="language" size={15} color="#A7A7A7" />
                    <Text style={styles.infoText}>IP: {getSyntheticIp(deviceId)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="settings" size={15} color="#A7A7A7" />
                    <Text style={styles.infoText}>
                      Hành động: {isOn ? 'Đã bật' : currentStatus === 'OFF' ? 'Đã tắt' : 'Chưa rõ'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.onButton,
                      isOn && styles.actionButtonSelected,
                      isSending && styles.disabledButton
                    ]}
                    disabled={isSending}
                    onPress={() => {
                      void handleControl(target.room, target.device, 'ON');
                    }}
                  >
                    <Text style={styles.actionButtonText}>Bật</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.offButton,
                      !isOn && currentStatus === 'OFF' && styles.actionButtonSelected,
                      isSending && styles.disabledButton
                    ]}
                    disabled={isSending}
                    onPress={() => {
                      void handleControl(target.room, target.device, 'OFF');
                    }}
                  >
                    <Text style={styles.actionButtonText}>Tắt</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <AppNavBar navigation={navigation} currentRoute="Control" />

      <Modal
        visible={isGasAlertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGasAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>CẢNH BÁO KHÍ GAS</Text>
            <Text style={styles.modalValue}>{gasValue ?? '--'} ppm</Text>
            <Text style={styles.modalMessage}>
              Khí gas vượt ngưỡng {GAS_ALERT_THRESHOLD} ppm. Còi cảnh báo trên phần cứng đã kích hoạt.
            </Text>
            <Pressable style={styles.modalButton} onPress={() => setIsGasAlertModalVisible(false)}>
              <Text style={styles.modalButtonText}>Đã hiểu</Text>
            </Pressable>
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
    paddingTop: 22,
    paddingBottom: 156
  },
  headerRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
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
    flex: 1,
    marginLeft: 50,
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right'
  },
  statusSummary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EBE9',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 14
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  summaryValue: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontWeight: '900'
  },
  gasWarningBanner: {
    backgroundColor: '#FFDEE3',
    borderColor: '#F26F7D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  gasWarningTitle: {
    color: '#B31D3C',
    fontWeight: '900',
    fontSize: 15
  },
  gasWarningBody: {
    color: '#B31D3C',
    marginTop: 4,
    fontWeight: '700'
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontWeight: '700'
  },
  successText: {
    color: theme.colors.success,
    marginBottom: 8,
    fontWeight: '800'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 8,
    fontWeight: '800'
  },
  deviceList: {
    gap: 16
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#9CBFBB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.11,
    shadowRadius: 12,
    elevation: 3
  },
  deviceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  deviceTitleBox: {
    flex: 1
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  deviceName: {
    flex: 1,
    color: theme.colors.primary,
    fontSize: 19,
    fontWeight: '900'
  },
  deviceSub: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  statusPill: {
    minWidth: 62,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  statusOn: {
    backgroundColor: theme.colors.success
  },
  statusOff: {
    backgroundColor: theme.colors.danger
  },
  statusPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#E6EFED',
    marginVertical: 12
  },
  infoList: {
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.78
  },
  actionButtonSelected: {
    opacity: 1
  },
  onButton: {
    backgroundColor: theme.colors.success
  },
  offButton: {
    backgroundColor: theme.colors.danger
  },
  disabledButton: {
    opacity: 0.5
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900'
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
  }
});
