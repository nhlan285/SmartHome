import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { ControlHistoryItem } from '@/types/models';
import { backendClient } from '@/services/http/client';
import { mockGetHistory } from '@/services/mock/mockApi';

// Ham nay lam gi:
// - Lay lich su dieu khien tu backend (GET /api/history).
// Ban can sua gi:
// - API_PATHS.history trong src/config/env.ts neu backend doi endpoint.
// Cach test:
// - Mo man hinh History trong app hoac goi ham trong code de xem danh sach.
// Loi hay gap:
// - Backend tra ve khong phai mang.
// - Mat mang / sai BASE_URL backend.
export const getControlHistory = async (): Promise<ControlHistoryItem[]> => {
  if (ENV.USE_MOCKS) {
    return mockGetHistory();
  }

  try {
    const response = await backendClient.get<ControlHistoryItem[]>(API_PATHS.history);

    if (!Array.isArray(response.data)) {
      throw new Error('Du lieu history khong dung dinh dang mang.');
    }

    return response.data;
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? `${error.response?.status ? `HTTP ${error.response.status}` : 'Network error'}: ${error.message}`
      : 'Unknown error';

    console.error('[getControlHistory] Loi lay lich su', {
      apiPath: API_PATHS.history,
      detail,
      suggestion: 'Kiem tra endpoint history, trang thai backend, va ket noi mang.'
    });

    throw new Error(`Khong the lay lich su dieu khien. ${detail}`);
  }
};
