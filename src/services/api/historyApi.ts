import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { ControlHistoryItem } from '@/types/models';
import { backendClient } from '@/services/http/client';
import { mockGetHistory } from '@/services/mock/mockApi';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractHistoryList = (payload: unknown): ControlHistoryItem[] => {
  if (Array.isArray(payload)) {
    return payload as ControlHistoryItem[];
  }

  if (!isObject(payload)) {
    throw new Error('Dữ liệu lịch sử không đúng định dạng mảng.');
  }

  const candidates = [payload.history, payload.items, payload.data, payload.records];
  const list = candidates.find(Array.isArray);

  if (!list) {
    throw new Error('Dữ liệu lịch sử không đúng định dạng mảng.');
  }

  return list as ControlHistoryItem[];
};

export const getControlHistory = async (): Promise<ControlHistoryItem[]> => {
  if (ENV.USE_MOCKS) {
    return mockGetHistory();
  }

  try {
    const response = await backendClient.get<unknown>(API_PATHS.history);
    return extractHistoryList(response.data);
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? `${error.response?.status ? `HTTP ${error.response.status}` : 'Lỗi mạng'}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Lỗi không xác định';

    console.error('[getControlHistory] Lỗi lấy lịch sử', {
      apiPath: API_PATHS.history,
      detail,
      suggestion: 'Kiểm tra endpoint lịch sử, trạng thái backend và kết nối mạng.'
    });

    throw new Error(`Không thể lấy lịch sử điều khiển. ${detail}`);
  }
};
