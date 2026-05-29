import React, { useEffect, useMemo, useState } from 'react';
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
import { VoicePrimaryButton } from '@/components/VoicePrimaryButton';
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
import { getDeviceKindLabel, getDeviceStatusLabel, getRoomLabel, ROOM_ORDER } from '@/utils/deviceRooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Control'>;

type ControlTarget = {
  room: Esp32Room;
  device: Esp32Device;
  label: string;
};

type ControlRoomGroup = {
  room: Esp32Room;
  label: string;
  targets: ControlTarget[];
  onCount: number;
  totalCount: number;
};

const GAS_ALERT_THRESHOLD = 1500;

// UI không gọi phần cứng trực tiếp.
// Toàn bộ lệnh điều khiển đi qua service controlDevice(...), rồi service gửi lên server.
const DEFAULT_CONTROL_TARGETS: ControlTarget[] = [
  { room: 'living', device: 'light', label: 'Đèn phòng khách' },
  { room: 'living', device: 'fan', label: 'Quạt phòng khách' },
  { room: 'bedroom', device: 'light', label: 'Đèn phòng ngủ' },
  { room: 'bedroom', device: 'fan', label: 'Quạt phòng ngủ' },
  { room: 'kitchen', device: 'light', label: 'Đèn nhà bếp' },
  { room: 'kitchen', device: 'fan', label: 'Quạt nhà bếp' },
  { room: 'hallway', device: 'light', label: 'Đèn hành lang' }
];

const groupControlTargetsByRoom = (
  targets: ControlTarget[],
  statusByDeviceId: Map<string, string>
): ControlRoomGroup[] =>
  ROOM_ORDER.map((room) => {
    const roomTargets = targets.filter((target) => target.room === room);
    return {
      room,
      label: getRoomLabel(room),
      targets: roomTargets,
      onCount: roomTargets.filter(
        (target) => statusByDeviceId.get(buildDeviceId(target.room, target.device)) === 'ON'
      ).length,
      totalCount: roomTargets.length
    };
  }).filter((group) => group.totalCount > 0);

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

  const controlRoomGroups = useMemo(
    () => groupControlTargetsByRoom(controlTargets, statusByDeviceId),
    [controlTargets, statusByDeviceId]
  );

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

  // Luồng điều khiển: người dùng bấm nút -> mobile gửi lệnh lên server -> server trả snapshot mới.
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

      // Debug nhanh khi API lỗi: kiểm tra BACKEND_BASE_URL và endpoint /api/devices/control.
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.caption}>Điều khiển thiết bị</Text>
            <Text style={styles.title}>Trạng thái hoạt động</Text>
          </View>
          <View style={styles.headerDot} />
        </View>

        <Text style={styles.subTitle}>Đang điều khiển: {currentTarget}</Text>

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

        <VoicePrimaryButton navigation={navigation} />

        <AppNavBar navigation={navigation} currentRoute="Control" />

        {isSending ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang gửi lệnh điều khiển...</Text>
          </View>
        ) : null}

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.roomControlList}>
          {controlRoomGroups.map((group) => (
            <View key={group.room} style={styles.roomControlCard}>
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
                {group.targets.map((target) => {
                  const deviceId = buildDeviceId(target.room, target.device);
                  const currentStatus = statusByDeviceId.get(deviceId) ?? 'UNKNOWN';
                  const isOn = currentStatus === 'ON';

                  return (
                    <View
                      key={`${target.room}-${target.device}`}
                      style={[styles.deviceCard, isOn && styles.deviceCardActive]}
                    >
                      <View style={styles.deviceHeaderRow}>
                        <View style={styles.deviceTextBox}>
                          <Text style={styles.deviceKind}>{getDeviceKindLabel(target.device)}</Text>
                          <Text style={styles.deviceName} numberOfLines={2}>
                            {target.label}
                          </Text>
                          <Text style={styles.deviceMeta}>
                            Trạng thái: {getDeviceStatusLabel(currentStatus)}
                          </Text>
                        </View>
                        <View style={[styles.deviceMarker, isOn && styles.deviceMarkerOn]} />
                      </View>

                      <View style={styles.row}>
                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.onButton,
                            isSending && styles.disabledButton
                          ]}
                          disabled={isSending}
                          onPress={() => {
                            void handleControl(target.room, target.device, 'ON');
                          }}
                        >
                          <Text style={styles.actionText}>Bật</Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.actionButton,
                            styles.offButton,
                            isSending && styles.disabledButton
                          ]}
                          disabled={isSending}
                          onPress={() => {
                            void handleControl(target.room, target.device, 'OFF');
                          }}
                        >
                          <Text style={styles.actionText}>Tắt</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
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
            <Text style={styles.modalValue}>{gasValue ?? '--'} ppm</Text>
            <Text style={styles.modalMessage}>
              Khí gas vượt ngưỡng {GAS_ALERT_THRESHOLD} ppm. Còi cảnh báo trên phần cứng đã kích hoạt.
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  caption: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  title: {
    marginTop: 2,
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8
  },
  headerDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DDF6FC',
    borderWidth: 1,
    borderColor: '#A4DEEF'
  },
  subTitle: {
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600'
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
    fontWeight: '800',
    fontSize: 15
  },
  gasWarningBody: {
    color: '#B31D3C',
    marginTop: 4,
    fontWeight: '600'
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: '#E4F8FE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  navButtonText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  loadingBox: {
    alignItems: 'center',
    marginBottom: 10
  },
  loadingText: {
    marginTop: 6,
    color: theme.colors.textSecondary
  },
  successText: {
    color: theme.colors.success,
    marginBottom: 8
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 8
  },
  roomControlList: {
    gap: 12
  },
  roomControlCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
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
    backgroundColor: '#F8FCFE',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
    flexGrow: 1,
    flexBasis: '47%'
  },
  deviceCardActive: {
    backgroundColor: '#DEF6FB',
    borderColor: '#9BE1F0'
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  deviceTextBox: {
    flex: 1,
    paddingRight: 8
  },
  deviceKind: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3
  },
  deviceName: {
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  deviceMeta: {
    color: theme.colors.textSecondary,
    marginTop: 3
  },
  deviceMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D8F3FA',
    borderWidth: 1,
    borderColor: '#9DD9EA'
  },
  deviceMarkerOn: {
    backgroundColor: '#D8F8F0',
    borderColor: '#73D8BE'
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center'
  },
  onButton: {
    backgroundColor: '#14B89C'
  },
  offButton: {
    backgroundColor: '#7ABEE9'
  },
  disabledButton: {
    opacity: 0.6
  },
  actionText: {
    color: '#FFFFFF',
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
  }
});
