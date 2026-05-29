import { DashboardSnapshot } from '@/types/models';
import { ENV } from '@/config/env';
import { MOCK_DEVICE_STATE, USE_MOCK } from '@/services/api/deviceApi';
import { mapStatePayloadToDashboardSnapshot } from '@/services/api/esp32Contract';

export type WebSocketCallback = (data: DashboardSnapshot) => void;

const listeners = new Set<WebSocketCallback>();

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let mockInterval: ReturnType<typeof setInterval> | null = null;
let isManualDisconnect = false;

const WS_URL = ENV.BACKEND_WS_URL;

// Mobile chỉ kết nối WebSocket realtime từ server trung gian.
// Nếu backend chưa có WebSocket, các màn hình vẫn tải dữ liệu bằng REST.

const emitData = (data: DashboardSnapshot): void => {
  listeners.forEach((callback) => {
    callback(data);
  });
};

const createMockRealtimeData = (): DashboardSnapshot => {
  const devices = MOCK_DEVICE_STATE.devices.map((device) => ({ ...device }));

  // Tao thay doi nho de UI thay du lieu realtime khi dang o che do mock.
  if (devices.length > 0) {
    const randomIndex = Math.floor(Math.random() * devices.length);
    const selected = devices[randomIndex];
    selected.status = selected.status === 'on' ? 'off' : 'on';
    selected.updatedAt = new Date().toISOString();
  }

  const sensors = {
    ...MOCK_DEVICE_STATE.sensors,
    temperatureC: Number((25 + Math.random() * 4).toFixed(1)),
    humidityPercent: Number((50 + Math.random() * 10).toFixed(1)),
    gasPpm: Math.round(180 + Math.random() * 35),
    updatedAt: new Date().toISOString()
  };

  return { devices, sensors };
};

const clearReconnect = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const clearMockInterval = (): void => {
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
};

const startMockWebSocket = (): void => {
  if (mockInterval) {
    return;
  }

  // Mock websocket mô phỏng server gửi dữ liệu realtime định kỳ.
  mockInterval = setInterval(() => {
    emitData(createMockRealtimeData());
  }, 3000);
};

const connectRealWebSocket = (): void => {
  if (socket) {
    return;
  }

  isManualDisconnect = false;
  socket = new WebSocket(WS_URL);

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as unknown;
      const snapshot = mapStatePayloadToDashboardSnapshot(parsed);
      emitData(snapshot);
    } catch (error) {
      console.error('[connectWebSocket] Lỗi parse JSON realtime', {
        rawData: event.data,
        error
      });
    }
  };

  socket.onclose = () => {
    socket = null;

    // Optional nang cap: reconnect tu dong neu socket mat ket noi.
    if (!isManualDisconnect && listeners.size > 0) {
      clearReconnect();
      reconnectTimer = setTimeout(() => {
        connectRealWebSocket();
      }, 2000);
    }
  };

  socket.onerror = (error) => {
    console.error('[connectWebSocket] Lỗi kết nối WebSocket server', {
      wsUrl: WS_URL,
      error
    });
  };
};

export const disconnectWebSocket = (): void => {
  isManualDisconnect = true;
  clearReconnect();
  clearMockInterval();

  if (socket) {
    socket.close();
    socket = null;
  }
};

export const connectWebSocket = (callback: WebSocketCallback): (() => void) => {
  listeners.add(callback);

  // Khi dùng server thật:
  // 1) Đặt ENV.USE_MOCKS = false trong src/config/env.ts.
  // 2) Cấu hình ENV.BACKEND_WS_URL về WebSocket của server.
  if (USE_MOCK) {
    startMockWebSocket();
  } else {
    connectRealWebSocket();
  }

  // Tra ve ham unsubscribe de man hinh goi khi unmount.
  return () => {
    listeners.delete(callback);

    // Neu khong con ai nghe, dong ket noi de tranh bi goi nhieu socket.
    if (listeners.size === 0) {
      disconnectWebSocket();
    }
  };
};
