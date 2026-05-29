import { DashboardSnapshot } from '@/types/models';

// File nay la FAKE API tam thoi cho giai doan chua co backend/ESP32 that.
// Khong co HTTP, khong goi mang. Chi tra mock data bang Promise de test UI.
// Khi chuyen sang API that: thay import tu fakeDeviceApi -> deviceApi.

export const MOCK_DEVICE_STATE: DashboardSnapshot = {
  devices: [
    {
      deviceId: 'light-living-room',
      name: 'Đèn phòng khách',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-living-room',
      name: 'Quạt phòng khách',
      status: 'off',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'light-bedroom',
      name: 'Đèn phòng ngủ',
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
      deviceId: 'light-kitchen',
      name: 'Đèn nhà bếp',
      status: 'on',
      updatedAt: new Date().toISOString()
    },
    {
      deviceId: 'fan-kitchen',
      name: 'Quạt nhà bếp',
      status: 'off',
      updatedAt: new Date().toISOString()
    }
  ],
  sensors: {
    temperatureC: 26.9,
    humidityPercent: 58.2,
    gasPpm: 195,
    updatedAt: new Date().toISOString()
  }
};

const FAKE_NETWORK_DELAY_MS = 1500;

// Ham getDeviceState gia lap API that:
// - Tra ve Promise
// - Co delay de mo phong mang cham
// - De test loading state va luong du lieu UI
export const getDeviceState = async (): Promise<DashboardSnapshot> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        devices: MOCK_DEVICE_STATE.devices.map((device) => ({ ...device })),
        sensors: { ...MOCK_DEVICE_STATE.sensors }
      });
    }, FAKE_NETWORK_DELAY_MS);
  });
