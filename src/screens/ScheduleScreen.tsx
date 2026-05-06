import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useLightSchedules } from '@/context/LightScheduleContext';
import {
  getScheduleActionLabel,
  getScheduleCommandSummary
} from '@/services/schedule/lightSchedule';
import { theme } from '@/styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

export const ScheduleScreen: React.FC<Props> = ({ navigation }) => {
  const {
    schedules,
    isSchedulerEnabled,
    lastRunMessage,
    toggleScheduler,
    toggleSchedule,
    runScheduleNow
  } = useLightSchedules();
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [screenError, setScreenError] = useState('');

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.caption}>Timer Mode</Text>
            <Text style={styles.title}>Light Schedule</Text>
          </View>
          <Pressable
            style={[styles.masterToggle, isSchedulerEnabled ? styles.masterOn : styles.masterOff]}
            onPress={toggleScheduler}
          >
            <Text style={styles.masterToggleText}>{isSchedulerEnabled ? 'ON' : 'OFF'}</Text>
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Scheduler</Text>
          <Text style={styles.statusValue}>{isSchedulerEnabled ? 'Dang bat' : 'Dang tam dung'}</Text>
          <Text style={styles.statusLabel}>Lan chay gan nhat</Text>
          <Text style={styles.statusMessage}>{lastRunMessage}</Text>
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
                      styles.secondaryButton,
                      schedule.enabled ? styles.pauseButton : styles.enableButton
                    ]}
                    onPress={() => toggleSchedule(schedule.id)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {schedule.enabled ? 'Tam dung' : 'Kich hoat'}
                    </Text>
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
    marginBottom: theme.spacing.md
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
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
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
    width: 74,
    borderRadius: 14,
    backgroundColor: '#E4F8FE',
    paddingVertical: 12,
    alignItems: 'center'
  },
  timeText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '900'
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
    gap: 10,
    marginTop: theme.spacing.md
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center'
  },
  pauseButton: {
    backgroundColor: '#E8EEF4'
  },
  enableButton: {
    backgroundColor: '#D8F8F0'
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  runButton: {
    flex: 1,
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
  }
});
