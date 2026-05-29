import { DeviceAction } from '@/services/api/deviceApi';
import { Esp32Room } from '@/services/api/esp32Contract';

export type LightScheduleTarget = Esp32Room | 'all';

export interface LightSchedule {
  id: string;
  title: string;
  time: string;
  target: LightScheduleTarget;
  action: DeviceAction;
  enabled: boolean;
}

export type LightScheduleDraft = Omit<LightSchedule, 'id'>;

export const LIGHT_SCHEDULE_ROOMS: Esp32Room[] = ['living', 'bedroom', 'kitchen', 'hallway'];

export const LIGHT_SCHEDULE_TARGETS: LightScheduleTarget[] = [
  'living',
  'bedroom',
  'kitchen',
  'hallway',
  'all'
];

export const DEFAULT_LIGHT_SCHEDULES: LightSchedule[] = [
  {
    id: 'living-light-0500',
    title: 'Bật đèn phòng khách',
    time: '05:00',
    target: 'living',
    action: 'ON',
    enabled: true
  },
  {
    id: 'bedroom-light-0600',
    title: 'Bật đèn phòng ngủ',
    time: '06:00',
    target: 'bedroom',
    action: 'ON',
    enabled: true
  },
  {
    id: 'all-lights-1800',
    title: 'Bật toàn bộ đèn',
    time: '18:00',
    target: 'all',
    action: 'ON',
    enabled: true
  },
  {
    id: 'all-lights-2200',
    title: 'Tắt toàn bộ đèn',
    time: '22:00',
    target: 'all',
    action: 'OFF',
    enabled: true
  }
];

const TARGET_LABELS: Record<LightScheduleTarget, string> = {
  living: 'Phòng khách',
  bedroom: 'Phòng ngủ',
  kitchen: 'Nhà bếp',
  hallway: 'Hành lang',
  all: 'Tất cả đèn'
};

export const createDefaultLightSchedules = (): LightSchedule[] =>
  DEFAULT_LIGHT_SCHEDULES.map((schedule) => ({ ...schedule }));

export const createLightScheduleId = (): string =>
  `light-schedule-${Date.now()}-${Math.round(Math.random() * 100000)}`;

export const getScheduleTargetLabel = (target: LightScheduleTarget): string => TARGET_LABELS[target];

export const getScheduleActionLabel = (action: DeviceAction): string =>
  action === 'ON' ? 'Bật' : 'Tắt';

export const getScheduleCommandSummary = (schedule: LightSchedule): string =>
  `${getScheduleActionLabel(schedule.action)} - ${getScheduleTargetLabel(schedule.target)}`;

export const getCurrentTimeValue = (date = new Date()): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getScheduleRunKey = (scheduleId: string, date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}-${getCurrentTimeValue(date)}-${scheduleId}`;
};

export const isValidScheduleTime = (value: string): boolean => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return Boolean(match);
};

export const normalizeScheduleTime = (value: string): string => {
  const trimmed = value.trim();
  if (!isValidScheduleTime(trimmed)) {
    throw new Error('Giờ hẹn phải đúng định dạng HH:mm, ví dụ 05:00.');
  }

  return trimmed;
};

export const sortLightSchedules = (schedules: LightSchedule[]): LightSchedule[] =>
  [...schedules].sort((left, right) => left.time.localeCompare(right.time));

export const createScheduleTitle = (draft: LightScheduleDraft): string => {
  const title = draft.title.trim();
  if (title) {
    return title;
  }

  return getScheduleCommandSummary({ ...draft, id: 'preview' });
};

export const createLightSchedule = (draft: LightScheduleDraft): LightSchedule => ({
  ...draft,
  id: createLightScheduleId(),
  title: createScheduleTitle(draft),
  time: normalizeScheduleTime(draft.time)
});
