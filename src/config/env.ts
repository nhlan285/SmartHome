/*
  ============================
  CẤU HÌNH KẾT NỐI
  ============================

  Mobile app chỉ gọi server trung gian:
  - Server lấy trạng thái/id thiết bị từ ESP32.
  - Server nhận lệnh nút hoặc file ghi âm, xử lý AI nếu cần, gửi xuống ESP32.
  - Server lưu lịch sử điều khiển vào database.

  1) BACKEND_BASE_URL
    - API server AI + thiết bị + lịch sử.
    - Ví dụ: https://dean-habitat-eatable.ngrok-free.dev

  2) BACKEND_WS_URL
    - WebSocket realtime từ server nếu backend hỗ trợ.
    - Ví dụ: wss://dean-habitat-eatable.ngrok-free.dev/ws

  3) USE_MOCKS
    - true  : test mock, không gọi server thật.
    - false : gọi server trung gian thật.

  4) API_PATHS
    - Đổi endpoint nếu backend triển khai route khác.

  Endpoint backend mobile đang kỳ vọng:
  - GET  /api/devices/state
    Trả DashboardSnapshot hoặc object có snapshot/state/dashboard.
  - POST /api/devices/control
    Body: { deviceId, room, device, action }
    Trả snapshot trạng thái mới nhất sau khi ESP32 đổi trạng thái.
  - POST /api/voice-audio
    multipart/form-data field file
    Trả transcript/intent và snapshot trạng thái mới nhất sau lệnh voice.
  - GET  /api/history
    Trả lịch sử lệnh voice/dashboard từ database.
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
  BACKEND_BASE_URL: 'https://dean-habitat-eatable.ngrok-free.dev/',
  BACKEND_WS_URL: 'wss://dean-habitat-eatable.ngrok-free.dev/ws',
  USE_MOCKS: false
} as const;

export const ENV = {
  ...RAW_ENV,
  BACKEND_BASE_URL: normalizeHttpBaseUrl(RAW_ENV.BACKEND_BASE_URL),
  BACKEND_WS_URL: normalizeWebSocketUrl(RAW_ENV.BACKEND_WS_URL)
} as const;

export const API_PATHS = {
  deviceState: '/api/devices/state',
  deviceControl: '/api/devices/control',
  voiceProcess: '/api/voice-audio',
  history: '/api/history'
} as const;
