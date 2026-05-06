import { ControlHistoryItem, DashboardSnapshot, DeviceState, SensorData, VoiceCommandResult } from '@/types/models';

export const mockDevices: DeviceState[] = [
  {
    deviceId: 'light-living-room',
    name: 'Living Room Light',
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
    deviceId: 'garage-door',
    name: 'Garage Door',
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
  transcript: 'Turn on living room light',
  intent: 'device_control',
  confidence: 0.95,
  entities: {
    deviceId: 'light-living-room',
    action: 'on'
  },
  suggestedAction: 'Switch Living Room Light on'
};

export const mockHistory: ControlHistoryItem[] = [
  {
    id: 'hist-1',
    source: 'voice',
    commandText: 'Turn on living room light',
    status: 'success',
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString()
  },
  {
    id: 'hist-2',
    source: 'manual',
    commandText: 'Fan set to off',
    status: 'failed',
    timestamp: new Date(Date.now() - 20 * 60_000).toISOString()
  }
];
