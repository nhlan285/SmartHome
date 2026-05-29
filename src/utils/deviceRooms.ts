import { extractRoomDeviceFromDeviceId, Esp32Device, Esp32Room } from '@/services/api/esp32Contract';
import { DeviceState } from '@/types/models';

export type DeviceRoomKey = Esp32Room | 'unknown';
export type DeviceKindKey = Esp32Device | 'unknown';

export type RoomDeviceItem = {
  device: DeviceState;
  room: DeviceRoomKey;
  kind: DeviceKindKey;
};

export type RoomDeviceGroup = {
  room: DeviceRoomKey;
  label: string;
  devices: RoomDeviceItem[];
  onCount: number;
  totalCount: number;
};

export const ROOM_ORDER: Esp32Room[] = ['living', 'bedroom', 'kitchen', 'hallway'];

const ROOM_LABELS: Record<DeviceRoomKey, string> = {
  living: 'Phòng khách',
  bedroom: 'Phòng ngủ',
  kitchen: 'Nhà bếp',
  hallway: 'Hành lang',
  unknown: 'Khác'
};

const DEVICE_KIND_LABELS: Record<DeviceKindKey, string> = {
  light: 'Đèn',
  fan: 'Quạt',
  door: 'Cửa',
  unknown: 'Thiết bị'
};

export const getRoomLabel = (room: DeviceRoomKey): string => ROOM_LABELS[room];

export const getDeviceKindLabel = (kind: DeviceKindKey): string => DEVICE_KIND_LABELS[kind];

export const getDeviceStatusLabel = (status: string | undefined): string => {
  const normalized = status?.trim().toLowerCase();

  if (normalized === 'on') {
    return 'Bật';
  }

  if (normalized === 'off') {
    return 'Tắt';
  }

  return 'Không rõ';
};

export const getDeviceRoomInfo = (
  deviceId: string
): { room: DeviceRoomKey; kind: DeviceKindKey } => {
  const parsed = extractRoomDeviceFromDeviceId(deviceId);

  if (!parsed) {
    return { room: 'unknown', kind: 'unknown' };
  }

  return {
    room: parsed.room,
    kind: parsed.device
  };
};

export const sortRooms = <T extends { room: DeviceRoomKey }>(items: T[]): T[] =>
  [...items].sort((left, right) => {
    const leftIndex = left.room === 'unknown' ? ROOM_ORDER.length : ROOM_ORDER.indexOf(left.room);
    const rightIndex =
      right.room === 'unknown' ? ROOM_ORDER.length : ROOM_ORDER.indexOf(right.room);
    return leftIndex - rightIndex;
  });

export const groupDevicesByRoom = (devices: DeviceState[]): RoomDeviceGroup[] => {
  const groups = new Map<DeviceRoomKey, RoomDeviceItem[]>();

  devices.forEach((device) => {
    const info = getDeviceRoomInfo(device.deviceId);
    const current = groups.get(info.room) ?? [];
    current.push({
      device,
      room: info.room,
      kind: info.kind
    });
    groups.set(info.room, current);
  });

  return sortRooms(
    Array.from(groups.entries()).map(([room, roomDevices]) => ({
      room,
      label: getRoomLabel(room),
      devices: roomDevices,
      onCount: roomDevices.filter((item) => item.device.status === 'on').length,
      totalCount: roomDevices.length
    }))
  );
};
