import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLightSchedules } from '@/context/LightScheduleContext';
import { getDeviceState } from '@/services/api/deviceApi';
import { extractRoomDeviceFromDeviceId, Esp32Room } from '@/services/api/esp32Contract';
import { connectWebSocket } from '@/services/realtime/websocketService';
import {
  getScheduleActionLabel,
  getScheduleTargetLabel,
  LIGHT_SCHEDULE_TARGETS,
  LightSchedule,
  LightScheduleDraft,
  LightScheduleTarget
} from '@/services/schedule/lightSchedule';
import { theme } from '@/styles/theme';
import { DashboardSnapshot, DeviceState } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

type HardwareLightTarget = {
  target: Esp32Room;
  label: string;
  device: DeviceState;
};

type TargetOption = {
  target: LightScheduleTarget;
  label: string;
  statusText: string;
  isAvailable: boolean;
};

const createBlankForm = (): LightScheduleDraft => ({
  title: '',
  time: '07:00',
  target: 'living',
  action: 'ON',
  enabled: true
});

const createFormFromSchedule = (schedule: LightSchedule): LightScheduleDraft => ({
  title: schedule.title,
  time: schedule.time,
  target: schedule.target,
  action: schedule.action,
  enabled: schedule.enabled
});

const formatHardwareStatus = (status?: DeviceState['status']): string => {
  if (status === 'on') {
    return 'Bật';
  }

  if (status === 'off') {
    return 'Tắt';
  }

  return 'Không rõ';
};

const getAllLightsStatusText = (targets: HardwareLightTarget[]): string => {
  if (targets.length === 0) {
    return 'Đang chờ ESP32';
  }

  const onCount = targets.filter((item) => item.device.status === 'on').length;
  const offCount = targets.length - onCount;
  return `${onCount} bật / ${offCount} tắt`;
};

export const ScheduleScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const {
    schedules,
    isSchedulerEnabled,
    isStoreReady,
    lastRunMessage,
    storageError,
    toggleScheduler,
    toggleSchedule,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    resetSchedules,
    runScheduleNow
  } = useLightSchedules();

  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [screenError, setScreenError] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [form, setForm] = useState<LightScheduleDraft>(() => createBlankForm());
  const [formError, setFormError] = useState('');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isDeviceStateLoading, setIsDeviceStateLoading] = useState(true);
  const [deviceStateError, setDeviceStateError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadInitialDeviceState = async (): Promise<void> => {
      try {
        setDeviceStateError('');
        const data = await getDeviceState();
        if (isMounted) {
          setSnapshot(data);
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu ESP32.';
          setDeviceStateError(message);
        }
      } finally {
        if (isMounted) {
          setIsDeviceStateLoading(false);
        }
      }
    };

    void loadInitialDeviceState();

    const unsubscribe = connectWebSocket((realtimeData) => {
      setSnapshot(realtimeData);
      setDeviceStateError('');
      setIsDeviceStateLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const hardwareLightTargets = useMemo<HardwareLightTarget[]>(() => {
    const uniqueTargets = new Map<Esp32Room, HardwareLightTarget>();

    (snapshot?.devices ?? []).forEach((device) => {
      const parsed = extractRoomDeviceFromDeviceId(device.deviceId);

      if (!parsed || parsed.device !== 'light') {
        return;
      }

      uniqueTargets.set(parsed.room, {
        target: parsed.room,
        label: getScheduleTargetLabel(parsed.room),
        device
      });
    });

    return Array.from(uniqueTargets.values());
  }, [snapshot]);

  const targetOptions = useMemo<TargetOption[]>(() => {
    const roomOptions =
      hardwareLightTargets.length > 0
        ? hardwareLightTargets.map((item) => ({
            target: item.target,
            label: item.label,
            statusText: formatHardwareStatus(item.device.status),
            isAvailable: true
          }))
        : LIGHT_SCHEDULE_TARGETS.filter((target) => target !== 'all').map((target) => ({
            target,
            label: getScheduleTargetLabel(target),
            statusText: 'Đang chờ ESP32',
            isAvailable: false
          }));

    return [
      ...roomOptions,
      {
        target: 'all',
        label: 'Tất cả đèn',
        statusText: getAllLightsStatusText(hardwareLightTargets),
        isAvailable: hardwareLightTargets.length > 0
      }
    ];
  }, [hardwareLightTargets]);

  const targetStatusByTarget = useMemo(() => {
    const statusMap = new Map<LightScheduleTarget, string>();

    hardwareLightTargets.forEach((item) => {
      statusMap.set(item.target, formatHardwareStatus(item.device.status));
    });

    statusMap.set('all', getAllLightsStatusText(hardwareLightTargets));
    return statusMap;
  }, [hardwareLightTargets]);

  const targetLabelByTarget = useMemo(() => {
    const labelMap = new Map<LightScheduleTarget, string>();

    hardwareLightTargets.forEach((item) => {
      labelMap.set(item.target, item.label);
    });

    labelMap.set('all', 'Tất cả đèn');
    return labelMap;
  }, [hardwareLightTargets]);

  const getLiveTargetLabel = (target: LightScheduleTarget): string =>
    targetLabelByTarget.get(target) ?? getScheduleTargetLabel(target);

  const getLiveTargetStatus = (target: LightScheduleTarget): string =>
    targetStatusByTarget.get(target) ??
    (isDeviceStateLoading ? 'Đang đồng bộ ESP32' : 'Không thấy trong ESP32');

  const getLiveScheduleSummary = (schedule: LightSchedule): string =>
    `${getScheduleActionLabel(schedule.action)} - ${getLiveTargetLabel(schedule.target)}`;

  const hardwareUpdatedAt = snapshot?.sensors.updatedAt
    ? new Date(snapshot.sensors.updatedAt).toLocaleTimeString()
    : '--:--';

  const openCreateForm = (): void => {
    const firstHardwareTarget = targetOptions.find((item) => item.target !== 'all')?.target ?? 'living';
    setEditingScheduleId(null);
    setForm({ ...createBlankForm(), target: firstHardwareTarget });
    setFormError('');
    setIsFormVisible(true);
  };

  const openEditForm = (schedule: LightSchedule): void => {
    setEditingScheduleId(schedule.id);
    setForm(createFormFromSchedule(schedule));
    setFormError('');
    setIsFormVisible(true);
  };

  const closeForm = (): void => {
    setIsFormVisible(false);
    setFormError('');
  };

  const handleSaveForm = (): void => {
    try {
      const draft: LightScheduleDraft = {
        ...form,
        title: form.title.trim(),
        time: form.time.trim()
      };

      if (editingScheduleId) {
        updateSchedule(editingScheduleId, draft);
      } else {
        addSchedule(draft);
      }

      closeForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể lưu lịch hẹn giờ.';
      setFormError(message);
    }
  };

  const handleRunNow = async (scheduleId: string): Promise<void> => {
    try {
      setScreenError('');
      setRunningScheduleId(scheduleId);
      await runScheduleNow(scheduleId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Chạy lịch thất bại.';
      setScreenError(message);
    } finally {
      setRunningScheduleId(null);
    }
  };

  const confirmDeleteSchedule = (schedule: LightSchedule): void => {
    Alert.alert('Xóa lịch hẹn giờ', `Bạn muốn xóa lịch "${schedule.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteSchedule(schedule.id)
      }
    ]);
  };

  const confirmResetSchedules = (): void => {
    Alert.alert('Khôi phục lịch mẫu', 'Thay toàn bộ lịch hiện tại bằng 4 lịch mẫu ban đầu?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Khôi phục',
        onPress: resetSchedules
      }
    ]);
  };

  const updateFormTarget = (target: LightScheduleTarget): void => {
    setForm((current) => ({ ...current, target }));
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.caption}>Chế độ hẹn giờ</Text>
            <Text style={styles.title}>Lịch bật đèn</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openCreateForm}>
            <Text style={styles.addButtonText}>+ Thêm</Text>
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.statusLabel}>Bộ hẹn giờ</Text>
              <Text style={styles.statusValue}>
                {isSchedulerEnabled ? 'Đang bật' : 'Đang tạm dừng'}
              </Text>
            </View>
            <Pressable
              style={[styles.masterToggle, isSchedulerEnabled ? styles.masterOn : styles.masterOff]}
              onPress={toggleScheduler}
            >
              <Text style={styles.masterToggleText}>{isSchedulerEnabled ? 'Bật' : 'Tắt'}</Text>
            </Pressable>
          </View>

          <Text style={styles.statusLabel}>Dữ liệu</Text>
          <Text style={styles.statusMessage}>
            {isStoreReady ? 'Đã lưu cục bộ trên máy' : 'Đang đọc lịch hẹn giờ...'}
          </Text>

          <Text style={styles.statusLabel}>ESP32</Text>
          <Text style={[styles.statusMessage, deviceStateError ? styles.statusMessageError : null]}>
            {deviceStateError ||
              (isDeviceStateLoading ? 'Đang đồng bộ phần cứng...' : `Thời gian thực lúc ${hardwareUpdatedAt}`)}
          </Text>

          <Text style={styles.statusLabel}>Lần chạy gần nhất</Text>
          <Text style={styles.statusMessage}>{lastRunMessage}</Text>

          <Pressable style={styles.resetButton} onPress={confirmResetSchedules}>
            <Text style={styles.resetButtonText}>Khôi phục 4 lịch mẫu</Text>
          </Pressable>
        </View>

        <VoicePrimaryButton navigation={navigation} />

        <AppNavBar navigation={navigation} currentRoute="Schedule" />

        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
        {storageError ? <Text style={styles.errorText}>{storageError}</Text> : null}

        {schedules.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Chưa có lịch hẹn giờ</Text>
            <Text style={styles.emptyText}>Bấm + Thêm để tạo lịch bật/tắt đèn mới.</Text>
          </View>
        ) : null}

        <View style={styles.scheduleList}>
          {schedules.map((schedule) => {
            const isRunning = runningScheduleId === schedule.id;

            return (
              <View
                key={schedule.id}
                style={[styles.scheduleCard, schedule.enabled && styles.scheduleCardEnabled]}
              >
                <View style={styles.scheduleTopRow}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeText}>{schedule.time}</Text>
                    <Text style={styles.timeStatus}>{schedule.enabled ? 'Kích hoạt' : 'Tạm dừng'}</Text>
                  </View>

                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                    <Text style={styles.scheduleMeta}>{getLiveScheduleSummary(schedule)}</Text>
                    <Text style={styles.scheduleLiveStatus}>
                      Phần cứng: {getLiveTargetStatus(schedule.target)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.actionBadge,
                      schedule.action === 'ON' ? styles.actionOn : styles.actionOff
                    ]}
                  >
                    <Text style={styles.actionBadgeText}>
                      {getScheduleActionLabel(schedule.action)}
                    </Text>
                  </View>
                </View>

                <View style={styles.scheduleBottomRow}>
                  <Pressable
                    style={[
                      styles.smallButton,
                      schedule.enabled ? styles.pauseButton : styles.enableButton
                    ]}
                    onPress={() => toggleSchedule(schedule.id)}
                  >
                    <Text style={styles.smallButtonText}>
                      {schedule.enabled ? 'Tạm dừng' : 'Kích hoạt'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.smallButton} onPress={() => openEditForm(schedule)}>
                    <Text style={styles.smallButtonText}>Sửa</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.smallButton, styles.deleteButton]}
                    onPress={() => confirmDeleteSchedule(schedule)}
                  >
                    <Text style={styles.deleteButtonText}>Xóa</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.runButton, isRunning && styles.disabledButton]}
                    disabled={isRunning}
                    onPress={() => {
                      void handleRunNow(schedule.id);
                    }}
                  >
                    {isRunning ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.runButtonText}>Chạy ngay</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={isFormVisible} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingScheduleId ? 'Sửa lịch hẹn giờ' : 'Thêm lịch hẹn giờ'}
              </Text>
              <Pressable style={styles.closeButton} onPress={closeForm}>
                <Text style={styles.closeButtonText}>X</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Tên lịch</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              placeholder="Ví dụ: Bật đèn phòng khách"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Giờ hẹn</Text>
            <TextInput
              style={styles.input}
              value={form.time}
              onChangeText={(time) => setForm((current) => ({ ...current, time }))}
              placeholder="HH:mm"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.inputLabel}>Phạm vi đèn</Text>
            <View style={styles.optionGrid}>
              {targetOptions.map((option) => {
                const isSelected = form.target === option.target;
                return (
                  <Pressable
                    key={option.target}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => updateFormTarget(option.target)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        isSelected && styles.optionButtonTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionStatusText,
                        isSelected && styles.optionStatusTextSelected,
                        !option.isAvailable && styles.optionStatusTextMuted
                      ]}
                    >
                      {option.statusText}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Hành động</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentButton, form.action === 'ON' && styles.segmentSelected]}
                onPress={() => setForm((current) => ({ ...current, action: 'ON' }))}
              >
                <Text
                  style={[styles.segmentText, form.action === 'ON' && styles.segmentTextSelected]}
                >
                  Bật đèn
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, form.action === 'OFF' && styles.segmentSelected]}
                onPress={() => setForm((current) => ({ ...current, action: 'OFF' }))}
              >
                <Text
                  style={[styles.segmentText, form.action === 'OFF' && styles.segmentTextSelected]}
                >
                  Tắt đèn
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.enabledRow}
              onPress={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
            >
              <View style={[styles.checkBox, form.enabled && styles.checkBoxOn]}>
                <Text style={styles.checkBoxText}>{form.enabled ? '✓' : ''}</Text>
              </View>
              <Text style={styles.enabledText}>Kích hoạt lịch sau khi lưu</Text>
            </Pressable>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.formActionRow}>
              <Pressable style={styles.cancelButton} onPress={closeForm}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSaveForm}>
                <Text style={styles.saveButtonText}>Lưu lịch</Text>
              </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 12
  },
  headerTextBox: {
    flex: 1
  },
  caption: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2
  },
  addButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  statusLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4
  },
  statusValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2
  },
  statusMessage: {
    color: theme.colors.textPrimary,
    marginTop: 2
  },
  statusMessageError: {
    color: theme.colors.danger,
    fontWeight: '700'
  },
  masterToggle: {
    minWidth: 62,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center'
  },
  masterOn: {
    backgroundColor: theme.colors.success
  },
  masterOff: {
    backgroundColor: theme.colors.textSecondary
  },
  masterToggleText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  resetButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#E8EEF4'
  },
  resetButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 10,
    fontWeight: '700'
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.md,
    marginBottom: 10
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  scheduleList: {
    gap: 10
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md
  },
  scheduleCardEnabled: {
    borderColor: '#9BE1F0',
    backgroundColor: '#F6FCFE'
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  timeBox: {
    width: 76,
    borderRadius: 14,
    backgroundColor: '#E4F8FE',
    paddingVertical: 10,
    alignItems: 'center'
  },
  timeText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '900'
  },
  timeStatus: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  scheduleInfo: {
    flex: 1
  },
  scheduleTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 15
  },
  scheduleMeta: {
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '600'
  },
  scheduleLiveStatus: {
    color: theme.colors.primary,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800'
  },
  actionBadge: {
    minWidth: 52,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center'
  },
  actionOn: {
    backgroundColor: '#D8F8F0'
  },
  actionOff: {
    backgroundColor: '#E8EEF4'
  },
  actionBadgeText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  scheduleBottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: theme.spacing.md
  },
  smallButton: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#E8EEF4'
  },
  pauseButton: {
    backgroundColor: '#E8EEF4'
  },
  enableButton: {
    backgroundColor: '#D8F8F0'
  },
  smallButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  deleteButton: {
    backgroundColor: '#FFE3E7'
  },
  deleteButtonText: {
    color: '#B31D3C',
    fontWeight: '800'
  },
  runButton: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: theme.colors.primary
  },
  disabledButton: {
    opacity: 0.65
  },
  runButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 35, 48, 0.46)',
    padding: theme.spacing.md
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  modalTitle: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF4'
  },
  closeButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '900'
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    backgroundColor: '#F8FCFE',
    fontWeight: '700'
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionButton: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FCFE'
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E4F8FE'
  },
  optionButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center'
  },
  optionButtonTextSelected: {
    color: theme.colors.primary,
    fontWeight: '900'
  },
  optionStatusText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center'
  },
  optionStatusTextSelected: {
    color: theme.colors.primary
  },
  optionStatusTextMuted: {
    color: theme.colors.textSecondary
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#F8FCFE'
  },
  segmentSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E4F8FE'
  },
  segmentText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  segmentTextSelected: {
    color: theme.colors.primary
  },
  enabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  checkBoxOn: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success
  },
  checkBoxText: {
    color: '#FFFFFF',
    fontWeight: '900'
  },
  enabledText: {
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  formActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.md
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#E8EEF4'
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  }
});
