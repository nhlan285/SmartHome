import { ControlHistoryItem, DashboardSnapshot, DeviceState, SensorData, VoiceCommandResult } from '@/types/models';

export const mockDevices: DeviceState[] = [
  {
    deviceId: 'light-living-room',
    name: 'Đèn phòng khách',
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
    deviceId: 'garage-door',
    name: 'Cửa nhà xe',
    status: 'off',
    updatedAt: new Date().toISOString()
  }
];

export const mockSensors: SensorData = {
  temperatureC: 27.4,
  humidityPercent: 55.1,
  gasPpm: 198,
  updatedAt: new Date().toISOString()
};

export const mockDashboard: DashboardSnapshot = {
  devices: mockDevices,
  sensors: mockSensors
};

export const mockVoiceResult: VoiceCommandResult = {
  transcript: 'Bật đèn phòng khách',
  intent: 'device_control',
  confidence: 0.95,
  entities: {
    deviceId: 'light-living-room',
    action: 'on'
  },
  suggestedAction: 'Bật đèn phòng khách'
};

export const mockHistory: ControlHistoryItem[] = [
  {
    id: 'hist-1',
    source: 'voice',
    commandText: 'Bật đèn phòng khách',
    status: 'success',
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString()
  },
  {
    id: 'hist-2',
    source: 'manual',
    commandText: 'Tắt quạt phòng ngủ',
    status: 'failed',
    timestamp: new Date(Date.now() - 20 * 60_000).toISOString()
  }
];
