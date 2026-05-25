import { DashboardSnapshot, DeviceState, DeviceStatus } from '@/types/models';

export type Esp32Room = 'living' | 'bedroom' | 'kitchen' | 'hallway';
export type Esp32Device = 'light' | 'fan' | 'door';

type Esp32RoomState = {
  light?: boolean | number | string;
  fan?: boolean | number | string;
  door?: boolean | number | string;
};

type Esp32Sensors = {
  temperature?: number;
  humidity?: number;
  gas?: number;
};

export type Esp32StatePayload = {
  living?: Esp32RoomState;
  bedroom?: Esp32RoomState;
  kitchen?: Esp32RoomState;
  hallway?: { light?: boolean | number | string };
  sensors?: Esp32Sensors;
};

const ROOM_LABELS: Record<Esp32Room, string> = {
  living: 'Living Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  hallway: 'Hallway'
};

const ROOM_SUFFIX: Record<Esp32Room, string> = {
  living: 'living-room',
  bedroom: 'bedroom',
  kitchen: 'kitchen',
  hallway: 'hallway'
};

const DEVICE_LABELS: Record<Esp32Device, string> = {
  light: 'Light',
  fan: 'Fan',
  door: 'Door'
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'on' || normalized === 'true' || normalized === '1';
  }

  return false;
};

const toDeviceStatus = (value: unknown): DeviceStatus => (toBoolean(value) ? 'on' : 'off');

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDeviceStatus = (value: unknown): DeviceStatus => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['on', 'true', '1'].includes(normalized)) {
      return 'on';
    }

    if (['off', 'false', '0'].includes(normalized)) {
      return 'off';
    }
  }

  return toDeviceStatus(value);
};

const createDevice = (
  room: Esp32Room,
  device: Esp32Device,
  state: unknown,
  updatedAt: string
): DeviceState => ({
  deviceId: buildDeviceId(room, device),
  name: buildDeviceName(room, device),
  status: toDeviceStatus(state),
  updatedAt
});

const hasOwnKey = (value: unknown, key: string): boolean =>
  isObject(value) && Object.prototype.hasOwnProperty.call(value, key);

const pushDeviceIfPresent = (
  devices: DeviceState[],
  room: Esp32Room,
  roomState: Esp32RoomState | undefined,
  device: Esp32Device,
  updatedAt: string
): void => {
  if (!hasOwnKey(roomState, device)) {
    return;
  }

  devices.push(createDevice(room, device, roomState?.[device], updatedAt));
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isDashboardSnapshot = (value: unknown): value is DashboardSnapshot => {
  if (!isObject(value)) {
    return false;
  }

  const devices = value.devices;
  const sensors = value.sensors;

  if (!Array.isArray(devices) || !isObject(sensors)) {
    return false;
  }

  return true;
};

const normalizeDashboardSnapshot = (snapshot: DashboardSnapshot): DashboardSnapshot => {
  const updatedAt = snapshot.sensors?.updatedAt || new Date().toISOString();

  return {
    devices: snapshot.devices.map((item) => ({
      ...item,
      status: normalizeDeviceStatus(item.status),
      updatedAt: item.updatedAt || updatedAt
    })),
    sensors: {
      temperatureC: toNumber(snapshot.sensors.temperatureC),
      humidityPercent: toNumber(snapshot.sensors.humidityPercent),
      gasPpm: toNumber(snapshot.sensors.gasPpm),
      updatedAt
    }
  };
};

export const mapStatePayloadToDashboardSnapshot = (payload: unknown): DashboardSnapshot => {
  if (isDashboardSnapshot(payload)) {
    return normalizeDashboardSnapshot(payload);
  }

  if (!isObject(payload)) {
    throw new Error('State payload khong phai object hop le.');
  }

  const data = payload as Esp32StatePayload;
  const updatedAt = new Date().toISOString();

  const devices: DeviceState[] = [];

  pushDeviceIfPresent(devices, 'living', data.living, 'light', updatedAt);
  pushDeviceIfPresent(devices, 'living', data.living, 'fan', updatedAt);
  pushDeviceIfPresent(devices, 'living', data.living, 'door', updatedAt);
  pushDeviceIfPresent(devices, 'bedroom', data.bedroom, 'light', updatedAt);
  pushDeviceIfPresent(devices, 'bedroom', data.bedroom, 'fan', updatedAt);
  pushDeviceIfPresent(devices, 'bedroom', data.bedroom, 'door', updatedAt);
  pushDeviceIfPresent(devices, 'kitchen', data.kitchen, 'light', updatedAt);
  pushDeviceIfPresent(devices, 'kitchen', data.kitchen, 'fan', updatedAt);
  pushDeviceIfPresent(devices, 'kitchen', data.kitchen, 'door', updatedAt);
  pushDeviceIfPresent(devices, 'hallway', data.hallway, 'light', updatedAt);

  return {
    devices,
    sensors: {
      temperatureC: toNumber(data.sensors?.temperature),
      humidityPercent: toNumber(data.sensors?.humidity),
      gasPpm: toNumber(data.sensors?.gas),
      updatedAt
    }
  };
};

export const normalizeRoomInput = (room: string): Esp32Room => {
  const normalized = room.trim().toLowerCase().replace(/[_-]/g, ' ');

  if (['living', 'living room', 'phong khach', 'phongkhach'].includes(normalized)) {
    return 'living';
  }

  if (['bedroom', 'bed room', 'phong ngu', 'phongngu'].includes(normalized)) {
    return 'bedroom';
  }

  if (['kitchen', 'phong bep', 'phongbep', 'bep'].includes(normalized)) {
    return 'kitchen';
  }

  if (['hallway', 'hall', 'hanh lang', 'hanhlang'].includes(normalized)) {
    return 'hallway';
  }

  throw new Error(`Room khong hop le: ${room}`);
};

export const normalizeDeviceInput = (device: string): Esp32Device => {
  const normalized = device.trim().toLowerCase().replace(/[_-]/g, ' ');

  if (['light', 'den'].includes(normalized)) {
    return 'light';
  }

  if (['fan', 'quat'].includes(normalized)) {
    return 'fan';
  }

  if (['door', 'cua'].includes(normalized)) {
    return 'door';
  }

  throw new Error(`Device khong hop le: ${device}`);
};

export const buildDeviceId = (room: Esp32Room, device: Esp32Device): string =>
  `${device}-${ROOM_SUFFIX[room]}`;

export const buildDeviceName = (room: Esp32Room, device: Esp32Device): string =>
  `${ROOM_LABELS[room]} ${DEVICE_LABELS[device]}`;

export const extractRoomDeviceFromDeviceId = (
  deviceId: string
): { room: Esp32Room; device: Esp32Device } | null => {
  const normalized = deviceId.trim().toLowerCase();

  let device: Esp32Device | null = null;
  if (normalized.startsWith('light')) {
    device = 'light';
  } else if (normalized.startsWith('fan')) {
    device = 'fan';
  } else if (normalized.startsWith('door')) {
    device = 'door';
  }

  if (!device) {
    return null;
  }

  let room: Esp32Room | null = null;
  if (normalized.includes('living')) {
    room = 'living';
  } else if (normalized.includes('bedroom')) {
    room = 'bedroom';
  } else if (normalized.includes('kitchen')) {
    room = 'kitchen';
  } else if (normalized.includes('hallway')) {
    room = 'hallway';
  }

  if (!room) {
    return null;
  }

  return { room, device };
};
