import { ENV } from '@/config/env';
import { DashboardSnapshot } from '@/types/models';
import { mapStatePayloadToDashboardSnapshot } from '@/services/api/esp32Contract';

type MessageListener = (snapshot: DashboardSnapshot) => void;
type StatusListener = (isConnected: boolean) => void;

export class DeviceSocket {
  private socket: WebSocket | null = null;
  private messageListeners: MessageListener[] = [];
  private statusListeners: StatusListener[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelayMs = 2000;
  private shouldReconnect = true;

  connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = new WebSocket(ENV.DEVICE_WS_URL);

    this.socket.onopen = () => {
      this.notifyStatus(true);
      this.reconnectDelayMs = 2000;
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as unknown;
        const snapshot = mapStatePayloadToDashboardSnapshot(parsed);
        this.messageListeners.forEach((listener) => listener(snapshot));
      } catch {
        // Ignore malformed websocket messages.
      }
    };

    this.socket.onclose = () => {
      this.notifyStatus(false);
      this.socket = null;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.notifyStatus(false);
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  resume(): void {
    this.shouldReconnect = true;
    this.connect();
  }

  addMessageListener(listener: MessageListener): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener);
    };
  }

  addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((item) => item !== listener);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 1.5, 15000);
    }, this.reconnectDelayMs);
  }

  private notifyStatus(isConnected: boolean): void {
    this.statusListeners.forEach((listener) => listener(isConnected));
  }
}
