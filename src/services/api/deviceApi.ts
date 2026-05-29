import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { ControlCommandPayload, DashboardSnapshot, DeviceState } from '@/types/models';
import { backendClient } from '@/services/http/client';
import {
  buildDeviceId,
  buildDeviceName,
  extractRoomDeviceFromDeviceId,
  mapStatePayloadToDashboardSnapshot,
  normalizeDeviceInput,
  normalizeRoomInput,
  Esp32Device,
  Esp32Room
} from '@/services/api/esp32Contract';

// Mobile chỉ nói chuyện với backend trung gian.
// Backend chịu trách nhiệm kết nối ESP32, ghi history và trả snapshot trạng thái mới nhất.
export const BASE_URL = ENV.BACKEND_BASE_URL;
export const USE_MOCK = ENV.USE_MOCKS;

export const MOCK_DEVICE_STATE: DashboardSnapshot = {
  devices: [
    {
      deviceId: 'light-living-room',
      name: 'Đèn phòng khách',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-living-room',
      name: 'Quạt phòng khách',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-bedroom',
      name: 'Đèn phòng ngủ',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-bedroom',
      name: 'Quạt phòng ngủ',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-kitchen',
      name: 'Đèn nhà bếp',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-kitchen',
      name: 'Quạt nhà bếp',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-living-room',
      name: 'Cửa phòng khách',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-bedroom',
      name: 'Cửa phòng ngủ',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-kitchen',
      name: 'Cửa nhà bếp',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-hallway',
      name: 'Đèn hành lang',
      status: 'off',
      updatedAt: new Date().toISOString()
    }
  ],
  sensors: {
    temperatureC: 27.2,
    humidityPercent: 56.4,
    gasPpm: 201,
    updatedAt: new Date().toISOString()
  }
};

export type DeviceAction = 'ON' | 'OFF';

export interface ControlDeviceResponse {
  success: boolean;
  room: string;
  device: string;
  action: DeviceAction;
  message: string;
  timestamp: string;
  snapshot?: DashboardSnapshot;
  updatedDevice?: DeviceState;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cloneMockState = (): DashboardSnapshot => ({
  devices: MOCK_DEVICE_STATE.devices.map((device) => ({ ...device })),
  sensors: { ...MOCK_DEVICE_STATE.sensors }
});

const parseAxiosError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Lỗi không xác định';
  }

  const statusCode = error.response?.status;
  const responseMessage =
    typeof error.response?.data === 'object' && error.response?.data !== null
      ? (error.response.data as { message?: string }).message
      : undefined;
  const detail = responseMessage || error.message;

  if (statusCode) {
    return `HTTP ${statusCode}: ${detail}`;
  }

  return `Lỗi mạng: ${detail}`;
};

export const extractDashboardSnapshot = (payload: unknown): DashboardSnapshot | null => {
  const candidates: unknown[] = [payload];

  if (isObject(payload)) {
    candidates.push(
      payload.data,
      payload.snapshot,
      payload.dashboard,
      payload.dashboardState,
      payload.state,
      payload.devices && payload.sensors ? payload : undefined
    );

    if (isObject(payload.result)) {
      candidates.push(payload.result.snapshot, payload.result.dashboard, payload.result.state);
    }
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return mapStatePayloadToDashboardSnapshot(candidate);
    } catch {
      // Backend có thể trả kèm metadata, thử candidate tiếp theo.
    }
  }

  return null;
};

const toDeviceStatus = (action: DeviceAction): 'on' | 'off' => (action === 'ON' ? 'on' : 'off');

const getActionLabel = (action: DeviceAction): string => (action === 'ON' ? 'bật' : 'tắt');

const toSentenceDeviceName = (name: string): string =>
  name ? name.charAt(0).toLocaleLowerCase('vi-VN') + name.slice(1) : name;

const getServerMessage = (payload: unknown, fallback: string): string => {
  if (!isObject(payload)) {
    return fallback;
  }

  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : fallback;
};

const findDeviceInPayload = (
  payload: unknown,
  targetDeviceId: string,
  snapshot: DashboardSnapshot | null
): DeviceState | undefined => {
  const fromSnapshot = snapshot?.devices.find((device) => device.deviceId === targetDeviceId);
  if (fromSnapshot) {
    return fromSnapshot;
  }

  if (!isObject(payload)) {
    return undefined;
  }

  const candidates = [payload.device, payload.updatedDevice, payload.deviceState];
  return candidates.find(
    (candidate): candidate is DeviceState =>
      isObject(candidate) &&
      candidate.deviceId === targetDeviceId &&
      (candidate.status === 'on' || candidate.status === 'off')
  );
};

const applyMockControl = (
  room: Esp32Room,
  device: Esp32Device,
  action: DeviceAction
): DeviceState => {
  const targetDeviceId = buildDeviceId(room, device);
  const target = MOCK_DEVICE_STATE.devices.find((item) => item.deviceId === targetDeviceId);

  if (target) {
    target.status = toDeviceStatus(action);
    target.updatedAt = new Date().toISOString();
    return { ...target };
  }

  const created: DeviceState = {
    deviceId: targetDeviceId,
    name: buildDeviceName(room, device),
    status: toDeviceStatus(action),
    updatedAt: new Date().toISOString()
  };

  MOCK_DEVICE_STATE.devices.push(created);
  return { ...created };
};

const createMockControlResponse = (
  room: Esp32Room,
  device: Esp32Device,
  action: DeviceAction
): ControlDeviceResponse => {
  const updated = applyMockControl(room, device, action);
  const snapshot = cloneMockState();

  return {
    success: true,
    room,
    device,
    action,
    message: `[Mẫu] Đã ${getActionLabel(action)} ${toSentenceDeviceName(updated.name)}.`,
    timestamp: new Date().toISOString(),
    snapshot,
    updatedDevice: updated
  };
};

const callBackendControl = async (
  payload: Record<string, string>
): Promise<ControlDeviceResponse> => {
  try {
    const response = await backendClient.post<unknown>(API_PATHS.deviceControl, payload);
    const snapshot = extractDashboardSnapshot(response.data);
    const roomValue = normalizeRoomInput(payload.room ?? '');
    const deviceValue = normalizeDeviceInput(payload.device ?? '');
    const action = payload.action as DeviceAction;
    const targetDeviceId = buildDeviceId(roomValue, deviceValue);
    const updatedDevice = findDeviceInPayload(response.data, targetDeviceId, snapshot);

    return {
      success: true,
      room: roomValue,
      device: deviceValue,
      action,
      message: getServerMessage(
        response.data,
        `Đã gửi lệnh ${getActionLabel(action)} cho ${toSentenceDeviceName(buildDeviceName(roomValue, deviceValue))}.`
      ),
      timestamp: new Date().toISOString(),
      snapshot: snapshot ?? undefined,
      updatedDevice
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : parseAxiosError(error);
    console.error('[controlDevice] Lỗi gửi lệnh tới server trung gian', {
      baseURL: BASE_URL,
      apiPath: API_PATHS.deviceControl,
      payload,
      detail,
      suggestion: 'Kiểm tra endpoint control của backend, kết nối backend tới ESP32 và schema response.'
    });
    throw new Error(`Không thể điều khiển thiết bị qua server. ${detail}`);
  }
};

const controlDeviceWithPayload = async (
  payload: ControlCommandPayload
): Promise<ControlDeviceResponse> => {
  const parsed = extractRoomDeviceFromDeviceId(payload.deviceId);
  if (!parsed) {
    throw new Error(`Không ánh xạ được deviceId sang phòng/thiết bị: ${payload.deviceId}`);
  }

  const action = payload.action === 'on' ? 'ON' : 'OFF';

  if (USE_MOCK) {
    await sleep(500);
    return createMockControlResponse(parsed.room, parsed.device, action);
  }

  return callBackendControl({
    deviceId: payload.deviceId,
    room: parsed.room,
    device: parsed.device,
    action
  });
};

const controlDeviceWithRoomDevice = async (
  room: string,
  device: string,
  action: DeviceAction
): Promise<ControlDeviceResponse> => {
  const roomValue = normalizeRoomInput(room);
  const deviceValue = normalizeDeviceInput(device);

  if (USE_MOCK) {
    await sleep(800);
    return createMockControlResponse(roomValue, deviceValue, action);
  }

  return callBackendControl({
    deviceId: buildDeviceId(roomValue, deviceValue),
    room: roomValue,
    device: deviceValue,
    action
  });
};

export const getDeviceState = async (): Promise<DashboardSnapshot> => {
  if (USE_MOCK) {
    return cloneMockState();
  }

  try {
    const response = await backendClient.get<unknown>(API_PATHS.deviceState);
    const snapshot = extractDashboardSnapshot(response.data);

    if (!snapshot) {
      throw new Error('Server không trả về snapshot trạng thái thiết bị hợp lệ.');
    }

    return snapshot;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : parseAxiosError(error);
    console.error('[getDeviceState] Lỗi lấy trạng thái thiết bị từ server', {
      baseURL: BASE_URL,
      apiPath: API_PATHS.deviceState,
      detail,
      suggestion: 'Kiểm tra endpoint state của backend và kết nối backend tới ESP32.'
    });
    throw new Error(`Không thể lấy trạng thái thiết bị từ server. ${detail}`);
  }
};

export const getDashboardState = async (): Promise<DashboardSnapshot> => getDeviceState();

export function controlDevice(
  room: string,
  device: string,
  action: DeviceAction
): Promise<ControlDeviceResponse>;
export function controlDevice(payload: ControlCommandPayload): Promise<ControlDeviceResponse>;
export async function controlDevice(
  roomOrPayload: string | ControlCommandPayload,
  device?: string,
  action?: DeviceAction
): Promise<ControlDeviceResponse> {
  if (typeof roomOrPayload !== 'string') {
    return controlDeviceWithPayload(roomOrPayload);
  }

  if (!device || !action) {
    throw new Error('Cần truyền đủ phòng, thiết bị và hành động (BẬT/TẮT).');
  }

  return controlDeviceWithRoomDevice(roomOrPayload, device, action);
}

// Giữ hàm này để code cũ không vỡ; backend control mới sẽ tự ghi history.
export const triggerBackendCommandLog = async (): Promise<void> => undefined;
