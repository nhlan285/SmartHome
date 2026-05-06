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

// Luu y quan trong:
// - Khong sua truc tiep IP/mode trong file nay neu khong can.
// - Su dung src/config/env.ts lam noi cau hinh chinh.
// - BASE_URL va USE_MOCK duoc map tu ENV de tranh lech cau hinh giua cac service.
export const BASE_URL = ENV.ESP32_BASE_URL;
export const USE_MOCK = ENV.USE_MOCKS;

// Mock data duoc giu lai nhu che do du phong.
// Khi chay data that, app se bo qua block nay va goi truc tiep ESP32.
export const MOCK_DEVICE_STATE: DashboardSnapshot = {
  devices: [
    {
      deviceId: 'light-living-room',
      name: 'Living Room Light',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-living-room',
      name: 'Living Room Fan',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-bedroom',
      name: 'Bedroom Light',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-bedroom',
      name: 'Bedroom Fan',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-kitchen',
      name: 'Kitchen Light',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-kitchen',
      name: 'Kitchen Fan',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-living-room',
      name: 'Living Room Door',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-bedroom',
      name: 'Bedroom Door',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'door-kitchen',
      name: 'Kitchen Door',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-hallway',
      name: 'Hallway Light',
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

const deviceApi = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const cloneMockState = (): DashboardSnapshot => ({
  devices: MOCK_DEVICE_STATE.devices.map((device) => ({ ...device })),
  sensors: { ...MOCK_DEVICE_STATE.sensors }
});

const parseAxiosError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Unknown error';
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

  return `Network error: ${detail}`;
};

export type DeviceAction = 'ON' | 'OFF';

export interface ControlDeviceResponse {
  success: boolean;
  room: string;
  device: string;
  action: DeviceAction;
  message: string;
  timestamp: string;
}

const toDeviceStatus = (action: DeviceAction): 'on' | 'off' => (action === 'ON' ? 'on' : 'off');

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

const sendEsp32ControlCommand = async (
  room: Esp32Room,
  device: Esp32Device,
  action: DeviceAction
): Promise<void> => {
  const params = { room, device, action };

  try {
    // Thu POST truoc vi mot so firmware map /control theo POST.
    await deviceApi.post(API_PATHS.control, undefined, { params });
    return;
  } catch (postError: unknown) {
    // Fallback GET cho firmware ESP32 phien ban chi support query GET.
    try {
      await deviceApi.get(API_PATHS.control, { params });
      return;
    } catch (getError: unknown) {
      const postDetail = parseAxiosError(postError);
      const getDetail = parseAxiosError(getError);
      throw new Error(`POST that bai (${postDetail}); GET that bai (${getDetail})`);
    }
  }
};

const controlDeviceWithPayload = async (
  payload: ControlCommandPayload
): Promise<DeviceState> => {
  if (USE_MOCK) {
    const parsed = extractRoomDeviceFromDeviceId(payload.deviceId);
    if (!parsed) {
      throw new Error(`Khong map duoc deviceId sang room/device: ${payload.deviceId}`);
    }

    return applyMockControl(parsed.room, parsed.device, payload.action === 'on' ? 'ON' : 'OFF');
  }

  const parsed = extractRoomDeviceFromDeviceId(payload.deviceId);
  if (!parsed) {
    throw new Error(`Khong map duoc deviceId sang room/device: ${payload.deviceId}`);
  }

  try {
    await sendEsp32ControlCommand(parsed.room, parsed.device, payload.action.toUpperCase() as DeviceAction);

    return {
      deviceId: buildDeviceId(parsed.room, parsed.device),
      name: buildDeviceName(parsed.room, parsed.device),
      status: payload.action,
      updatedAt: new Date().toISOString()
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : parseAxiosError(error);
    console.error('[controlDevice(payload)] Loi goi /control', {
      baseURL: BASE_URL,
      payload,
      detail,
      suggestion: 'Kiem tra deviceId, action, endpoint /control va phuong thuc HTTP firmware support (POST/GET).'
    });
    throw new Error(`Khong the dieu khien thiet bi. ${detail}`);
  }
};

const controlDeviceWithRoomDevice = async (
  room: string,
  device: string,
  action: DeviceAction
): Promise<ControlDeviceResponse> => {
  const roomValue = normalizeRoomInput(room);
  const deviceValue = normalizeDeviceInput(device);

  if (USE_MOCK) {
    // Mock mode: gia lap goi API bang Promise + setTimeout de test loading UI.
    await sleep(800);
    const updated = applyMockControl(roomValue, deviceValue, action);

    return new Promise((resolve) => {
      resolve({
        success: true,
        room: roomValue,
        device: deviceValue,
        action,
        message: `[MOCK] Da ${action === 'ON' ? 'bat' : 'tat'} ${updated.name}.`,
        timestamp: new Date().toISOString()
      });
    });
  }

  try {
    // ESP32 firmware hien tai doc query param room/device/action o /control.
    // Service se thu POST truoc, neu firmware khong support thi fallback GET.
    await sendEsp32ControlCommand(roomValue, deviceValue, action);

    return {
      success: true,
      room: roomValue,
      device: deviceValue,
      action,
      message: `Da gui lenh ${action} cho ${buildDeviceName(roomValue, deviceValue)}.`,
      timestamp: new Date().toISOString()
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : parseAxiosError(error);
    console.error('[controlDevice(room,device,action)] Loi goi /control', {
      baseURL: BASE_URL,
      payload: { room: roomValue, device: deviceValue, action },
      detail,
      suggestion: 'Kiem tra IP ESP32, endpoint /control, ket noi mang, va phuong thuc firmware support (POST/GET).'
    });
    throw new Error(`Khong the dieu khien thiet bi. ${detail}`);
  }
};

// Ham nay la API chinh cho Dashboard:
// - USE_MOCK = true  -> tra mock data.
// - USE_MOCK = false -> goi API that GET /state.
// Cach test nhanh:
// - Mock: doi ENV.USE_MOCKS = true trong src/config/env.ts va mo man hinh Dashboard.
// - Real: doi ENV.USE_MOCKS = false, mo trinh duyet BASE_URL + '/state' de kiem tra JSON truoc.
export const getDeviceState = async (): Promise<DashboardSnapshot> => {
  if (USE_MOCK) {
    return cloneMockState();
  }

  try {
    const response = await deviceApi.get<unknown>(API_PATHS.state);
    return mapStatePayloadToDashboardSnapshot(response.data);
  } catch (error: unknown) {
    const detail = parseAxiosError(error);
    console.error('[getDeviceState] Loi goi /state', {
      baseURL: BASE_URL,
      detail,
      suggestion: 'Kiem tra IP, cung mang Wi-Fi, endpoint /state va trang thai ESP32.'
    });
    throw new Error(`Khong the lay du lieu /state. ${detail}`);
  }
};

// Giu lai ham nay de tuong thich code cu.
export const getDashboardState = async (): Promise<DashboardSnapshot> => getDeviceState();

// Ham nay dung de dieu khien thiet bi.
// Cach chuyen mock/real API:
// - Doi ENV.USE_MOCKS trong src/config/env.ts.
// - true  -> gia lap API (de test UI, an toan khi chua co backend that).
// - false -> goi API that POST /control.
// Luu y: de khong vo code cu, ham nay ho tro ca 2 kieu goi:
// 1) controlDevice(room, device, action)
// 2) controlDevice({ deviceId, action })
export function controlDevice(
  room: string,
  device: string,
  action: DeviceAction
): Promise<ControlDeviceResponse>;
export function controlDevice(payload: ControlCommandPayload): Promise<DeviceState>;
export async function controlDevice(
  roomOrPayload: string | ControlCommandPayload,
  device?: string,
  action?: DeviceAction
): Promise<ControlDeviceResponse | DeviceState> {
  if (typeof roomOrPayload !== 'string') {
    return controlDeviceWithPayload(roomOrPayload);
  }

  if (!device || !action) {
    throw new Error('Can truyen du room, device, action (ON/OFF).');
  }

  return controlDeviceWithRoomDevice(roomOrPayload, device, action);
}

export const triggerBackendCommandLog = async (
  payload: ControlCommandPayload
): Promise<void> => {
  if (USE_MOCK) {
    return;
  }

  try {
    await backendClient.post('/api/history/log', payload);
  } catch (error: unknown) {
    const detail = parseAxiosError(error);
    console.error('[triggerBackendCommandLog] Loi gui history log', {
      payload,
      detail,
      suggestion: 'Kiem tra backend endpoint /api/history/log va ket noi mang.'
    });
    throw new Error(`Khong the ghi log lich su len backend. ${detail}`);
  }
};
