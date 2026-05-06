import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { controlDevice } from '@/services/api/deviceApi';
import {
  createDefaultLightSchedules,
  getCurrentTimeValue,
  getScheduleCommandSummary,
  getScheduleRunKey,
  LIGHT_SCHEDULE_ROOMS,
  LightSchedule
} from '@/services/schedule/lightSchedule';

interface LightScheduleContextValue {
  schedules: LightSchedule[];
  isSchedulerEnabled: boolean;
  lastRunMessage: string;
  toggleScheduler: () => void;
  toggleSchedule: (scheduleId: string) => void;
  runScheduleNow: (scheduleId: string) => Promise<void>;
}

const LightScheduleContext = createContext<LightScheduleContextValue | null>(null);

const CHECK_INTERVAL_MS = 15000;

export const LightScheduleProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [schedules, setSchedules] = useState<LightSchedule[]>(() => createDefaultLightSchedules());
  const [isSchedulerEnabled, setIsSchedulerEnabled] = useState(true);
  const [lastRunMessage, setLastRunMessage] = useState('Chua co lich nao chay');

  const schedulesRef = useRef(schedules);
  const isSchedulerEnabledRef = useRef(isSchedulerEnabled);
  const executedRunKeysRef = useRef(new Set<string>());

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    isSchedulerEnabledRef.current = isSchedulerEnabled;
  }, [isSchedulerEnabled]);

  const executeSchedule = useCallback(async (schedule: LightSchedule): Promise<void> => {
    const rooms = schedule.target === 'all' ? LIGHT_SCHEDULE_ROOMS : [schedule.target];
    const summary = getScheduleCommandSummary(schedule);

    setLastRunMessage(`Dang chay: ${schedule.time} - ${summary}`);

    const results = await Promise.allSettled(
      rooms.map((room) => controlDevice(room, 'light', schedule.action))
    );

    const failedCount = results.filter((result) => result.status === 'rejected').length;

    if (failedCount > 0) {
      const message = `${summary} loi ${failedCount}/${rooms.length} lenh`;
      setLastRunMessage(message);
      throw new Error(message);
    }

    setLastRunMessage(`${schedule.time} - ${summary} thanh cong`);
  }, []);

  const checkSchedules = useCallback((): void => {
    if (!isSchedulerEnabledRef.current) {
      return;
    }

    const now = new Date();
    const currentTime = getCurrentTimeValue(now);
    const dueSchedules = schedulesRef.current.filter(
      (schedule) => schedule.enabled && schedule.time === currentTime
    );

    dueSchedules.forEach((schedule) => {
      const runKey = getScheduleRunKey(schedule.id, now);
      if (executedRunKeysRef.current.has(runKey)) {
        return;
      }

      executedRunKeysRef.current.add(runKey);
      void executeSchedule(schedule).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Lich hen gio chay that bai';
        console.error('[LightScheduleProvider] Loi chay lich hen gio', {
          schedule,
          message
        });
      });
    });

    if (executedRunKeysRef.current.size > 300) {
      executedRunKeysRef.current.clear();
    }
  }, [executeSchedule]);

  useEffect(() => {
    checkSchedules();
    const interval = setInterval(checkSchedules, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [checkSchedules]);

  const toggleScheduler = useCallback((): void => {
    setIsSchedulerEnabled((current) => !current);
  }, []);

  const toggleSchedule = useCallback((scheduleId: string): void => {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.id === scheduleId ? { ...schedule, enabled: !schedule.enabled } : schedule
      )
    );
  }, []);

  const runScheduleNow = useCallback(
    async (scheduleId: string): Promise<void> => {
      const schedule = schedulesRef.current.find((item) => item.id === scheduleId);
      if (!schedule) {
        throw new Error(`Khong tim thay lich hen gio: ${scheduleId}`);
      }

      await executeSchedule(schedule);
    },
    [executeSchedule]
  );

  const value = useMemo<LightScheduleContextValue>(
    () => ({
      schedules,
      isSchedulerEnabled,
      lastRunMessage,
      toggleScheduler,
      toggleSchedule,
      runScheduleNow
    }),
    [isSchedulerEnabled, lastRunMessage, runScheduleNow, schedules, toggleSchedule, toggleScheduler]
  );

  return <LightScheduleContext.Provider value={value}>{children}</LightScheduleContext.Provider>;
};

export const useLightSchedules = (): LightScheduleContextValue => {
  const context = useContext(LightScheduleContext);
  if (!context) {
    throw new Error('useLightSchedules phai duoc dung trong LightScheduleProvider');
  }

  return context;
};
