import axios from 'axios';
import { ENV } from '@/config/env';

export const backendClient = axios.create({
  baseURL: ENV.BACKEND_BASE_URL,
  timeout: 10000,
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

backendClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error?.response?.data;
    const serverMessage = responseData?.message ?? responseData?.detail;
    const message =
      typeof serverMessage === 'string'
        ? serverMessage
        : serverMessage
          ? JSON.stringify(serverMessage)
          : 'Yêu cầu máy chủ thất bại';
    return Promise.reject(new Error(message));
  }
);
