import React, { useState } from 'react';
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
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useLightSchedules } from '@/context/LightScheduleContext';
import {
  getScheduleActionLabel,
  getScheduleCommandSummary,
  getScheduleTargetLabel,
  LIGHT_SCHEDULE_TARGETS,
  LightSchedule,
  LightScheduleDraft,
  LightScheduleTarget
} from '@/services/schedule/lightSchedule';
import { theme } from '@/styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

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

export const ScheduleScreen: React.FC<Props> = ({ navigation }) => {
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

  const openCreateForm = (): void => {
    setEditingScheduleId(null);
    setForm(createBlankForm());
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
      const message = error instanceof Error ? error.message : 'Khong the luu lich hen gio.';
      setFormError(message);
    }
  };

  const handleRunNow = async (scheduleId: string): Promise<void> => {
    try {
      setScreenError('');
      setRunningScheduleId(scheduleId);
      await runScheduleNow(scheduleId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Chay lich that bai.';
      setScreenError(message);
    } finally {
      setRunningScheduleId(null);
    }
  };

  const confirmDeleteSchedule = (schedule: LightSchedule): void => {
    Alert.alert('Xoa lich hen gio', `Ban muon xoa lich "${schedule.title}"?`, [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Xoa',
        style: 'destructive',
        onPress: () => deleteSchedule(schedule.id)
      }
    ]);
  };

  const confirmResetSchedules = (): void => {
    Alert.alert('Khoi phuc lich mau', 'Thay toan bo lich hien tai bang 4 lich mau ban dau?', [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Khoi phuc',
        onPress: resetSchedules
      }
    ]);
  };

  const updateFormTarget = (target: LightScheduleTarget): void => {
    setForm((current) => ({ ...current, target }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.caption}>Timer Mode</Text>
            <Text style={styles.title}>Light Schedule</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openCreateForm}>
            <Text style={styles.addButtonText}>+ Them</Text>
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.statusLabel}>Scheduler</Text>
              <Text style={styles.statusValue}>
                {isSchedulerEnabled ? 'Dang bat' : 'Dang tam dung'}
              </Text>
            </View>
            <Pressable
              style={[styles.masterToggle, isSchedulerEnabled ? styles.masterOn : styles.masterOff]}
              onPress={toggleScheduler}
            >
              <Text style={styles.masterToggleText}>{isSchedulerEnabled ? 'ON' : 'OFF'}</Text>
            </Pressable>
          </View>

          <Text style={styles.statusLabel}>Du lieu</Text>
          <Text style={styles.statusMessage}>
            {isStoreReady ? 'Da luu local tren may' : 'Dang doc lich hen gio...'}
          </Text>

          <Text style={styles.statusLabel}>Lan chay gan nhat</Text>
          <Text style={styles.statusMessage}>{lastRunMessage}</Text>

          <Pressable style={styles.resetButton} onPress={confirmResetSchedules}>
            <Text style={styles.resetButtonText}>Khoi phuc 4 lich mau</Text>
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.navButtonText}>Dashboard</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Control')}>
            <Text style={styles.navButtonText}>Control</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Voice')}>
            <Text style={styles.navButtonText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navButtonText}>History</Text>
          </Pressable>
        </View>

        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}
        {storageError ? <Text style={styles.errorText}>{storageError}</Text> : null}

        {schedules.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Chua co lich hen gio</Text>
            <Text style={styles.emptyText}>Bam + Them de tao lich bat/tat den moi.</Text>
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
                    <Text style={styles.timeStatus}>{schedule.enabled ? 'Active' : 'Paused'}</Text>
                  </View>

                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                    <Text style={styles.scheduleMeta}>{getScheduleCommandSummary(schedule)}</Text>
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
                      {schedule.enabled ? 'Tam dung' : 'Kich hoat'}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.smallButton} onPress={() => openEditForm(schedule)}>
                    <Text style={styles.smallButtonText}>Sua</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.smallButton, styles.deleteButton]}
                    onPress={() => confirmDeleteSchedule(schedule)}
                  >
                    <Text style={styles.deleteButtonText}>Xoa</Text>
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
                      <Text style={styles.runButtonText}>Chay ngay</Text>
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
                {editingScheduleId ? 'Sua lich hen gio' : 'Them lich hen gio'}
              </Text>
              <Pressable style={styles.closeButton} onPress={closeForm}>
                <Text style={styles.closeButtonText}>X</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Ten lich</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              placeholder="Vi du: Bat den phong khach"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Gio hen</Text>
            <TextInput
              style={styles.input}
              value={form.time}
              onChangeText={(time) => setForm((current) => ({ ...current, time }))}
              placeholder="HH:mm"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.inputLabel}>Pham vi den</Text>
            <View style={styles.optionGrid}>
              {LIGHT_SCHEDULE_TARGETS.map((target) => {
                const isSelected = form.target === target;
                return (
                  <Pressable
                    key={target}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => updateFormTarget(target)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        isSelected && styles.optionButtonTextSelected
                      ]}
                    >
                      {getScheduleTargetLabel(target)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Hanh dong</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentButton, form.action === 'ON' && styles.segmentSelected]}
                onPress={() => setForm((current) => ({ ...current, action: 'ON' }))}
              >
                <Text
                  style={[styles.segmentText, form.action === 'ON' && styles.segmentTextSelected]}
                >
                  Bat den
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, form.action === 'OFF' && styles.segmentSelected]}
                onPress={() => setForm((current) => ({ ...current, action: 'OFF' }))}
              >
                <Text
                  style={[styles.segmentText, form.action === 'OFF' && styles.segmentTextSelected]}
                >
                  Tat den
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.enabledRow}
              onPress={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
            >
              <View style={[styles.checkBox, form.enabled && styles.checkBoxOn]}>
                <Text style={styles.checkBoxText}>{form.enabled ? 'ON' : ''}</Text>
              </View>
              <Text style={styles.enabledText}>Kich hoat lich sau khi luu</Text>
            </Pressable>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.formActionRow}>
              <Pressable style={styles.cancelButton} onPress={closeForm}>
                <Text style={styles.cancelButtonText}>Huy</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSaveForm}>
                <Text style={styles.saveButtonText}>Luu lich</Text>
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
    flexBasis: '22%',
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
    flexBasis: '22%',
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
