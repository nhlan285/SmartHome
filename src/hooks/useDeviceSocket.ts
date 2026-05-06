import { useEffect, useMemo, useState } from 'react';
import { DeviceSocket } from '@/services/realtime/deviceSocket';
import { DashboardSnapshot } from '@/types/models';

interface DeviceSocketState {
  isConnected: boolean;
  latestSnapshot: DashboardSnapshot | null;
}

export const useDeviceSocket = (): DeviceSocketState => {
  const socket = useMemo(() => new DeviceSocket(), []);
  const [isConnected, setIsConnected] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    const removeMessage = socket.addMessageListener((snapshot) => {
      setLatestSnapshot(snapshot);
    });

    const removeStatus = socket.addStatusListener((connected) => {
      setIsConnected(connected);
    });

    socket.resume();

    return () => {
      removeMessage();
      removeStatus();
      socket.disconnect();
    };
  }, [socket]);

  return {
    isConnected,
    latestSnapshot
  };
};
