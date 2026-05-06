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
import { RootStackParamList } from '@/navigation/AppNavigator';
import { controlDevice, DeviceAction, getDeviceState } from '@/services/api/deviceApi';
import { connectWebSocket } from '@/services/realtime/websocketService';
import { DashboardSnapshot } from '@/types/models';
import {
  buildDeviceId,
  Esp32Device,
  Esp32Room,
  extractRoomDeviceFromDeviceId
} from '@/services/api/esp32Contract';
import { theme } from '@/styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Control'>;

type ControlTarget = {
  room: Esp32Room;
  device: Esp32Device;
  label: string;
};

const GAS_ALERT_THRESHOLD = 1500;

// UI nay khong dung mock data truc tiep.
// Toan bo lenh dieu khien deu di qua service controlDevice(...)
// de de dang chuyen giua mock mode va real API mode tai 1 diem duy nhat.
const DEFAULT_CONTROL_TARGETS: ControlTarget[] = [
  { room: 'living', device: 'light', label: 'Living room light' },
  { room: 'living', device: 'fan', label: 'Living room fan' },
  { room: 'bedroom', device: 'light', label: 'Bedroom light' },
  { room: 'bedroom', device: 'fan', label: 'Bedroom fan' },
  { room: 'kitchen', device: 'light', label: 'Kitchen light' },
  { room: 'kitchen', device: 'fan', label: 'Kitchen fan' },
  { room: 'hallway', device: 'light', label: 'Hallway light' }
];

export const ControlScreen: React.FC<Props> = ({ navigation }) => {
  const [isSending, setIsSending] = useState(false);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [currentTarget, setCurrentTarget] = useState('Chua co thao tac nao');
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
          label: item.name || `${parsed.room} ${parsed.device}`
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
          const message = error instanceof Error ? error.message : 'Khong the tai du lieu ESP32.';
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

  // Luong dieu khien:
  // 1) Nguoi dung bam ON/OFF.
  // 2) UI goi service controlDevice(room, device, action).
  // 3) Hien loading trong luc gui request.
  // 4) Hien message thanh cong hoac loi.
  const handleControl = async (
    room: Esp32Room,
    device: Esp32Device,
    action: DeviceAction
  ): Promise<void> => {
    const target = `${room} - ${device} (${action})`;
    setCurrentTarget(target);
    setIsSending(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const result = await controlDevice(room, device, action);
      setSuccessMessage(result.message);
      syncLocalStatus(room, device, action);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gui lenh that bai.';
      setErrorMessage(message);

      // Debug nhanh khi API loi:
      // - Kiem tra USE_MOCK trong deviceApi.ts.
      // - Neu USE_MOCK=false, kiem tra IP ESP32 va endpoint /control.
      // - Kiem tra dien thoai/emulator co cung mang voi server hay khong.
      console.error('[ControlScreen] Loi dieu khien thiet bi', {
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.caption}>Device Control</Text>
            <Text style={styles.title}>Operational Status</Text>
          </View>
          <View style={styles.headerDot} />
        </View>

        <Text style={styles.subTitle}>Dang dieu khien: {currentTarget}</Text>

        {isGasDanger ? (
          <Pressable
            style={styles.gasWarningBanner}
            onPress={() => setIsGasAlertModalVisible(true)}
          >
            <Text style={styles.gasWarningTitle}>CANH BAO GAS NGUY HIEM</Text>
            <Text style={styles.gasWarningBody}>
              Gas hien tai: {gasValue} ppm (nguong canh bao: {GAS_ALERT_THRESHOLD} ppm)
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.navButtonText}>Dashboard</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Voice')}>
            <Text style={styles.navButtonText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navButtonText}>History</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.navButtonText}>Schedule</Text>
          </Pressable>
        </View>

        {isSending ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Dang gui lenh dieu khien...</Text>
          </View>
        ) : null}

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.deviceGrid}>
          {controlTargets.map((target) => {
            const deviceId = buildDeviceId(target.room, target.device);
            const currentStatus = statusByDeviceId.get(deviceId) ?? 'UNKNOWN';
            const isOn = currentStatus === 'ON';

            return (
              <View
                key={`${target.room}-${target.device}`}
                style={[styles.deviceCard, isOn && styles.deviceCardActive]}
              >
                <View style={styles.deviceHeaderRow}>
                  <View>
                    <Text style={styles.deviceName}>{target.label}</Text>
                    <Text style={styles.deviceMeta}>Trang thai: {currentStatus}</Text>
                  </View>
                  <View style={[styles.deviceMarker, isOn && styles.deviceMarkerOn]} />
                </View>

                <View style={styles.row}>
                  <Pressable
                    style={[styles.actionButton, styles.onButton, isSending && styles.disabledButton]}
                    disabled={isSending}
                    onPress={() => {
                      void handleControl(target.room, target.device, 'ON');
                    }}
                  >
                    <Text style={styles.actionText}>ON</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionButton, styles.offButton, isSending && styles.disabledButton]}
                    disabled={isSending}
                    onPress={() => {
                      void handleControl(target.room, target.device, 'OFF');
                    }}
                  >
                    <Text style={styles.actionText}>OFF</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
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
            <Text style={styles.modalTitle}>CANH BAO KHI GAS</Text>
            <Text style={styles.modalValue}>{gasValue ?? '--'} ppm</Text>
            <Text style={styles.modalMessage}>
              Gas vuot nguong {GAS_ALERT_THRESHOLD} ppm. Buzzer tren phan cung da kich hoat.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setIsGasAlertModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Da hieu</Text>
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
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 2,
    width: '48%'
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
