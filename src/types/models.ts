export type DeviceStatus = 'on' | 'off';

export interface DeviceState {
  deviceId: string;
  name: string;
  status: DeviceStatus;
  updatedAt: string;
}

export interface SensorData {
  temperatureC: number;
  humidityPercent: number;
  gasPpm: number;
  updatedAt: string;
}

export interface VoiceCommandResult {
  transcript: string;
  intent: string;
  confidence: number;
  entities: Record<string, string | number | boolean>;
  suggestedAction?: string;
  message?: string;
  snapshot?: DashboardSnapshot;
}

export interface ControlCommandPayload {
  deviceId: string;
  action: DeviceStatus;
}

export interface ControlHistoryItem {
  id: string;
  source: 'voice' | 'manual';
  commandText: string;
  status: 'success' | 'failed';
  timestamp: string;
}

export interface DashboardSnapshot {
  devices: DeviceState[];
  sensors: SensorData;
}

export interface BackendError {
  message: string;
  code?: string;
}
