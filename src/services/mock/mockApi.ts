import { ControlCommandPayload, ControlHistoryItem, DashboardSnapshot, DeviceState, VoiceCommandResult } from '@/types/models';
import { mockDashboard, mockDevices, mockHistory, mockVoiceResult } from './mockData';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let devicesState: DeviceState[] = [...mockDevices];

export const mockProcessVoice = async (): Promise<VoiceCommandResult> => {
  await sleep(800);
  devicesState = devicesState.map((device) =>
    device.deviceId === 'light-living-room'
      ? { ...device, status: 'on', updatedAt: new Date().toISOString() }
      : device
  );

  return {
    ...mockVoiceResult,
    snapshot: {
      ...mockDashboard,
      devices: devicesState,
      sensors: {
        ...mockDashboard.sensors,
        updatedAt: new Date().toISOString()
      }
    }
  };
};

export const mockGetDashboardState = async (): Promise<DashboardSnapshot> => {
  await sleep(400);
  return {
    ...mockDashboard,
    devices: devicesState,
    sensors: {
      ...mockDashboard.sensors,
      temperatureC: Number((26 + Math.random() * 2).toFixed(1)),
      humidityPercent: Number((50 + Math.random() * 6).toFixed(1)),
      gasPpm: Math.round(170 + Math.random() * 40),
      updatedAt: new Date().toISOString()
    }
  };
};

export const mockControlDevice = async (
  payload: ControlCommandPayload
): Promise<DeviceState> => {
  await sleep(350);
  devicesState = devicesState.map((device) =>
    device.deviceId === payload.deviceId
      ? { ...device, status: payload.action, updatedAt: new Date().toISOString() }
      : device
  );

  const updated = devicesState.find((device) => device.deviceId === payload.deviceId);
  if (!updated) {
    throw new Error('Không tìm thấy thiết bị');
  }

  return updated;
};

export const mockGetHistory = async (): Promise<ControlHistoryItem[]> => {
  await sleep(500);
  return mockHistory;
};
