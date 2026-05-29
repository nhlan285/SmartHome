import axios from 'axios';
import { ENV } from '@/config/env';

export const backendClient = axios.create({
  baseURL: ENV.BACKEND_BASE_URL,
  timeout: 10000
});

export const esp32Client = axios.create({
  baseURL: ENV.ESP32_BASE_URL,
  timeout: 5000
});

backendClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || 'Yêu cầu máy chủ thất bại';
    return Promise.reject(new Error(message));
  }
);

esp32Client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || 'Yêu cầu thiết bị thất bại';
    return Promise.reject(new Error(message));
  }
);
