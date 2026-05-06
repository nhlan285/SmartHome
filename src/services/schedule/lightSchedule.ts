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

export const LIGHT_SCHEDULE_ROOMS: Esp32Room[] = ['living', 'bedroom', 'kitchen', 'hallway'];

export const DEFAULT_LIGHT_SCHEDULES: LightSchedule[] = [
  {
    id: 'living-light-0500',
    title: 'Bat den phong khach',
    time: '05:00',
    target: 'living',
    action: 'ON',
    enabled: true
  },
  {
    id: 'bedroom-light-0600',
    title: 'Bat den phong ngu',
    time: '06:00',
    target: 'bedroom',
    action: 'ON',
    enabled: true
  },
  {
    id: 'all-lights-1800',
    title: 'Bat toan bo den',
    time: '18:00',
    target: 'all',
    action: 'ON',
    enabled: true
  },
  {
    id: 'all-lights-2200',
    title: 'Tat toan bo den',
    time: '22:00',
    target: 'all',
    action: 'OFF',
    enabled: true
  }
];

const TARGET_LABELS: Record<LightScheduleTarget, string> = {
  living: 'Phong khach',
  bedroom: 'Phong ngu',
  kitchen: 'Nha bep',
  hallway: 'Hanh lang',
  all: 'Tat ca den'
};

export const createDefaultLightSchedules = (): LightSchedule[] =>
  DEFAULT_LIGHT_SCHEDULES.map((schedule) => ({ ...schedule }));

export const getScheduleTargetLabel = (target: LightScheduleTarget): string => TARGET_LABELS[target];

export const getScheduleActionLabel = (action: DeviceAction): string =>
  action === 'ON' ? 'Bat' : 'Tat';

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
