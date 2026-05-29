import axios from 'axios';
import { ENV } from '@/config/env';

export const backendClient = axios.create({
  baseURL: ENV.BACKEND_BASE_URL,
  timeout: 10000
});

backendClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || 'Yêu cầu máy chủ thất bại';
    return Promise.reject(new Error(message));
  }
);
