/*
  ============================
  QUICK CONFIG - EDIT HERE
  ============================

  File can sua truoc khi chay voi phan cung that:
  - src/config/env.ts (file nay)

  1) BACKEND_BASE_URL
    - API server AI + history
    - Vi du: http://172.20.10.4:8000

  2) ESP32_BASE_URL
    - API server ESP32 cho /state va /control
    - Vi du: http://172.20.10.3

  3) DEVICE_WS_URL
    - WebSocket realtime cua ESP32
    - Vi du: ws://172.20.10.3:81

  4) USE_MOCKS
    - true  : test mock, khong goi backend/ESP32 that
    - false : goi backend/ESP32 that

  5) API_PATHS
    - Doi endpoint neu backend/firmware doi route.

  ------------------------------------
  PowerShell command de kiem tra nhanh
  ------------------------------------

  # Xem IP LAN may tinh
  ipconfig

  # Kiem tra ESP32 co reachable khong
  ping 172.20.10.3

  # Kiem tra ESP32 /state
  Invoke-RestMethod http://172.20.10.3/state

  # Kiem tra ESP32 /control
  Invoke-RestMethod "http://172.20.10.3/control?room=living&device=light&action=ON"

  # Kiem tra backend history
  Invoke-RestMethod http://172.20.10.4:8000/api/history

  # Kiem tra backend voice (can co file sample.m4a)
  curl.exe -X POST "http://172.20.10.4:8000/api/voice/process" -F "audio=@sample.m4a;type=audio/m4a"

  # Kiem tra WebSocket ESP32 (can co wscat)
  # npx wscat -c ws://172.20.10.3:81
*/

const normalizeHttpBaseUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, '');

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed.replace(/^\/+/, '')}`;
};

const normalizeWebSocketUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, '');

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, 'ws');
  }

  return `ws://${trimmed.replace(/^\/+/, '')}`;
};

const RAW_ENV = {
  BACKEND_BASE_URL: 'http://172.20.10.4:8000',
  ESP32_BASE_URL: 'http://esp32.local',
  DEVICE_WS_URL: 'ws://esp32.local:81',
  USE_MOCKS: false
} as const;

export const ENV = {
  ...RAW_ENV,
  BACKEND_BASE_URL: normalizeHttpBaseUrl(RAW_ENV.BACKEND_BASE_URL),
  ESP32_BASE_URL: normalizeHttpBaseUrl(RAW_ENV.ESP32_BASE_URL),
  DEVICE_WS_URL: normalizeWebSocketUrl(RAW_ENV.DEVICE_WS_URL)
} as const;

export const API_PATHS = {
  voiceProcess: '/api/voice/process',
  history: '/api/history',
  control: '/control',
  state: '/state'
} as const;
