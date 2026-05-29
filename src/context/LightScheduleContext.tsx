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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { controlDevice } from '@/services/api/deviceApi';
import {
  createLightSchedule,
  createDefaultLightSchedules,
  getCurrentTimeValue,
  getScheduleCommandSummary,
  getScheduleRunKey,
  LIGHT_SCHEDULE_ROOMS,
  LIGHT_SCHEDULE_TARGETS,
  LightSchedule,
  LightScheduleDraft,
  LightScheduleTarget,
  normalizeScheduleTime,
  sortLightSchedules
} from '@/services/schedule/lightSchedule';

interface LightScheduleContextValue {
  schedules: LightSchedule[];
  isSchedulerEnabled: boolean;
  isStoreReady: boolean;
  lastRunMessage: string;
  storageError: string;
  toggleScheduler: () => void;
  toggleSchedule: (scheduleId: string) => void;
  addSchedule: (draft: LightScheduleDraft) => string;
  updateSchedule: (scheduleId: string, draft: LightScheduleDraft) => void;
  deleteSchedule: (scheduleId: string) => void;
  resetSchedules: () => void;
  runScheduleNow: (scheduleId: string) => Promise<void>;
}

const LightScheduleContext = createContext<LightScheduleContextValue | null>(null);

const CHECK_INTERVAL_MS = 15000;
const STORAGE_KEY = '@smart-home/light-schedules/v1';

type StoredSchedulePayload = {
  schedules: LightSchedule[];
  isSchedulerEnabled: boolean;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isScheduleTarget = (value: unknown): value is LightScheduleTarget =>
  typeof value === 'string' && LIGHT_SCHEDULE_TARGETS.includes(value as LightScheduleTarget);

const isScheduleAction = (value: unknown): value is LightSchedule['action'] =>
  value === 'ON' || value === 'OFF';

const normalizeScheduleTitle = (title: string): string => {
  const titleMap: Record<string, string> = {
    'Bat den phong khach': 'Bật đèn phòng khách',
    'Bat den phong ngu': 'Bật đèn phòng ngủ',
    'Bat toan bo den': 'Bật toàn bộ đèn',
    'Tat toan bo den': 'Tắt toàn bộ đèn'
  };

  return titleMap[title] ?? title;
};

const normalizeStoredSchedule = (value: unknown): LightSchedule | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const time = typeof value.time === 'string' ? value.time.trim() : '';

  if (!id || !title || !isScheduleTarget(value.target) || !isScheduleAction(value.action)) {
    return null;
  }

  try {
    return {
      id,
      title: normalizeScheduleTitle(title),
      time: normalizeScheduleTime(time),
      target: value.target,
      action: value.action,
      enabled: typeof value.enabled === 'boolean' ? value.enabled : true
    };
  } catch {
    return null;
  }
};

const parseStoredPayload = (raw: string): StoredSchedulePayload => {
  const parsed = JSON.parse(raw) as unknown;
  const scheduleSource = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.schedules)
      ? parsed.schedules
      : null;

  if (!scheduleSource) {
    throw new Error('Dữ liệu lịch hẹn giờ không hợp lệ.');
  }

  const schedules = scheduleSource
    .map((item) => normalizeStoredSchedule(item))
    .filter((item): item is LightSchedule => item !== null);

  const isSchedulerEnabled =
    isObject(parsed) && typeof parsed.isSchedulerEnabled === 'boolean'
      ? parsed.isSchedulerEnabled
      : true;

  return {
    schedules: sortLightSchedules(schedules),
    isSchedulerEnabled
  };
};

export const LightScheduleProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [schedules, setSchedules] = useState<LightSchedule[]>(() => createDefaultLightSchedules());
  const [isSchedulerEnabled, setIsSchedulerEnabled] = useState(true);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [lastRunMessage, setLastRunMessage] = useState('Chưa có lịch nào chạy');
  const [storageError, setStorageError] = useState('');

  const schedulesRef = useRef(schedules);
  const isSchedulerEnabledRef = useRef(isSchedulerEnabled);
  const isStoreReadyRef = useRef(isStoreReady);
  const executedRunKeysRef = useRef(new Set<string>());

  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  useEffect(() => {
    isSchedulerEnabledRef.current = isSchedulerEnabled;
  }, [isSchedulerEnabled]);

  useEffect(() => {
    isStoreReadyRef.current = isStoreReady;
  }, [isStoreReady]);

  useEffect(() => {
    let isMounted = true;

    const loadSchedules = async (): Promise<void> => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) {
          return;
        }

        if (raw) {
          const stored = parseStoredPayload(raw);
          setSchedules(stored.schedules);
          setIsSchedulerEnabled(stored.isSchedulerEnabled);
        }

        setStorageError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Không thể đọc lịch hẹn giờ.';
        setStorageError(message);
      } finally {
        if (isMounted) {
          setIsStoreReady(true);
        }
      }
    };

    void loadSchedules();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStoreReady) {
      return;
    }

    const saveSchedules = async (): Promise<void> => {
      try {
        const payload: StoredSchedulePayload = {
          schedules,
          isSchedulerEnabled
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setStorageError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Không thể lưu lịch hẹn giờ.';
        setStorageError(message);
      }
    };

    void saveSchedules();
  }, [isSchedulerEnabled, isStoreReady, schedules]);

  const executeSchedule = useCallback(async (schedule: LightSchedule): Promise<void> => {
    const rooms = schedule.target === 'all' ? LIGHT_SCHEDULE_ROOMS : [schedule.target];
    const summary = getScheduleCommandSummary(schedule);

    setLastRunMessage(`Đang chạy: ${schedule.time} - ${summary}`);

    const results = await Promise.allSettled(
      rooms.map((room) => controlDevice(room, 'light', schedule.action))
    );

    const failedCount = results.filter((result) => result.status === 'rejected').length;

    if (failedCount > 0) {
      const message = `${summary} lỗi ${failedCount}/${rooms.length} lệnh`;
      setLastRunMessage(message);
      throw new Error(message);
    }

    setLastRunMessage(`${schedule.time} - ${summary} thành công`);
  }, []);

  const checkSchedules = useCallback((): void => {
    if (!isStoreReadyRef.current) {
      return;
    }

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
        const message = error instanceof Error ? error.message : 'Lịch hẹn giờ chạy thất bại';
        console.error('[LightScheduleProvider] Lỗi chạy lịch hẹn giờ', {
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

  const addSchedule = useCallback((draft: LightScheduleDraft): string => {
    const created = createLightSchedule(draft);
    setSchedules((current) => sortLightSchedules([...current, created]));
    return created.id;
  }, []);

  const updateSchedule = useCallback((scheduleId: string, draft: LightScheduleDraft): void => {
    const nextSchedule: LightSchedule = {
      ...draft,
      id: scheduleId,
      title: draft.title.trim() || getScheduleCommandSummary({ ...draft, id: scheduleId }),
      time: normalizeScheduleTime(draft.time)
    };

    setSchedules((current) =>
      sortLightSchedules(
        current.map((schedule) => (schedule.id === scheduleId ? nextSchedule : schedule))
      )
    );
    executedRunKeysRef.current.clear();
  }, []);

  const deleteSchedule = useCallback((scheduleId: string): void => {
    setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
    executedRunKeysRef.current.clear();
  }, []);

  const resetSchedules = useCallback((): void => {
    setSchedules(createDefaultLightSchedules());
    setIsSchedulerEnabled(true);
    executedRunKeysRef.current.clear();
  }, []);

  const runScheduleNow = useCallback(
    async (scheduleId: string): Promise<void> => {
      const schedule = schedulesRef.current.find((item) => item.id === scheduleId);
      if (!schedule) {
        throw new Error(`Không tìm thấy lịch hẹn giờ: ${scheduleId}`);
      }

      await executeSchedule(schedule);
    },
    [executeSchedule]
  );

  const value = useMemo<LightScheduleContextValue>(
    () => ({
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
    }),
    [
      addSchedule,
      deleteSchedule,
      isSchedulerEnabled,
      isStoreReady,
      lastRunMessage,
      resetSchedules,
      runScheduleNow,
      schedules,
      storageError,
      toggleSchedule,
      toggleScheduler,
      updateSchedule
    ]
  );

  return <LightScheduleContext.Provider value={value}>{children}</LightScheduleContext.Provider>;
};

export const useLightSchedules = (): LightScheduleContextValue => {
  const context = useContext(LightScheduleContext);
  if (!context) {
    throw new Error('useLightSchedules phải được dùng trong LightScheduleProvider');
  }

  return context;
};
