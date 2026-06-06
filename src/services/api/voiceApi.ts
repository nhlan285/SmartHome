import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { VoiceCommandResult } from '@/types/models';
import { backendClient } from '@/services/http/client';
import { extractDashboardSnapshot } from '@/services/api/deviceApi';
import {
  buildDeviceId,
  buildDeviceName,
  Esp32Device,
  Esp32Room,
  normalizeDeviceInput,
  normalizeRoomInput
} from '@/services/api/esp32Contract';
import { mockProcessVoice } from '@/services/mock/mockApi';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

type ServerVoiceCommand = {
  room: Esp32Room;
  device: Esp32Device;
  action: 'ON' | 'OFF';
};

const normalizeServerAction = (value: unknown): ServerVoiceCommand['action'] => {
  if (typeof value !== 'string') {
    throw new Error('Máy chủ trả về action không hợp lệ.');
  }

  const normalized = value.trim().toUpperCase();
  if (normalized !== 'ON' && normalized !== 'OFF') {
    throw new Error(`Máy chủ trả về action không hỗ trợ: ${value}`);
  }

  return normalized;
};

const extractServerCommand = (payload: Record<string, unknown>): ServerVoiceCommand | null => {
  const result = isObject(payload.result) ? payload.result : null;
  const commandSource = isObject(payload.command)
    ? payload.command
    : result && isObject(result.command)
      ? result.command
      : null;

  if (!commandSource) {
    return null;
  }

  if (
    typeof commandSource.room !== 'string' ||
    typeof commandSource.device !== 'string' ||
    typeof commandSource.action !== 'string'
  ) {
    throw new Error('Máy chủ trả về command thiếu room/device/action.');
  }

  return {
    room: normalizeRoomInput(commandSource.room),
    device: normalizeDeviceInput(commandSource.device),
    action: normalizeServerAction(commandSource.action)
  };
};

const lowerFirst = (value: string): string =>
  value ? value.charAt(0).toLocaleLowerCase('vi-VN') + value.slice(1) : value;

const buildResultFromServerCommand = (
  payload: Record<string, unknown>,
  command: ServerVoiceCommand
): VoiceCommandResult => {
  const snapshot = extractDashboardSnapshot(payload);
  const actionText = command.action === 'ON' ? 'Bật' : 'Tắt';
  const deviceName = buildDeviceName(command.room, command.device);
  const deviceId = buildDeviceId(command.room, command.device);
  const message =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : `Đã gửi lệnh ${lowerFirst(actionText)} ${lowerFirst(deviceName)} tới server.`;

  return {
    transcript: `${actionText} ${lowerFirst(deviceName)}`,
    intent: 'device_control',
    confidence: 1,
    entities: {
      room: command.room,
      device: command.device,
      action: command.action === 'ON' ? 'on' : 'off',
      deviceId
    },
    suggestedAction: `${actionText} ${lowerFirst(deviceName)}`,
    message,
    snapshot: snapshot ?? undefined
  };
};

const normalizeVoiceResponse = (payload: unknown): VoiceCommandResult => {
  if (!isObject(payload)) {
    throw new Error('Máy chủ trả về dữ liệu giọng nói không đúng định dạng mong đợi.');
  }

  const snapshot = extractDashboardSnapshot(payload);
  const resultSource = isObject(payload.result) ? payload.result : payload;
  const transcript = typeof resultSource.transcript === 'string' ? resultSource.transcript : '';
  const intent = typeof resultSource.intent === 'string' ? resultSource.intent : '';
  const confidence =
    typeof resultSource.confidence === 'number' && Number.isFinite(resultSource.confidence)
      ? resultSource.confidence
      : 0;
  const entities = isObject(resultSource.entities)
    ? (resultSource.entities as Record<string, string | number | boolean>)
    : {};

  if (transcript && intent) {
    return {
      transcript,
      intent,
      confidence,
      entities,
      suggestedAction:
        typeof resultSource.suggestedAction === 'string' ? resultSource.suggestedAction : undefined,
      message:
        typeof payload.message === 'string'
          ? payload.message
          : typeof resultSource.message === 'string'
            ? resultSource.message
            : undefined,
      snapshot: snapshot ?? undefined
    };
  }

  const command = extractServerCommand(payload);
  if (command) {
    return buildResultFromServerCommand(payload, command);
  }

  const serverStatus = typeof payload.status === 'string' ? payload.status : undefined;
  const serverMessage =
    typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : 'Máy chủ trả về dữ liệu giọng nói không đúng định dạng mong đợi.';

  if (serverStatus && serverStatus !== 'success') {
    throw new Error(serverMessage);
  }

  throw new Error(serverMessage);
};

export const processVoiceCommand = async (audioUri: string): Promise<VoiceCommandResult> => {
  if (ENV.USE_MOCKS) {
    return mockProcessVoice();
  }

  if (!audioUri) {
    throw new Error('audioUri không hợp lệ. Bạn cần ghi âm trước khi gửi.');
  }

  try {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      name: 'voice-command.m4a',
      type: 'audio/m4a'
    } as unknown as Blob);

    const response = await backendClient.post<unknown>(API_PATHS.voiceProcess, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return normalizeVoiceResponse(response.data);
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? `${error.response?.status ? `HTTP ${error.response.status}` : 'Lỗi mạng'}: ${error.message}`
      : error instanceof Error
        ? error.message
        : 'Lỗi không xác định';

    console.error('[processVoiceCommand] Lỗi gửi giọng nói tới server', {
      apiPath: API_PATHS.voiceProcess,
      audioUri,
      detail,
      suggestion: 'Kiểm tra endpoint voice của backend, kết nối mạng và tệp ghi âm hợp lệ.'
    });

    throw new Error(`Không thể xử lý lệnh giọng nói qua server. ${detail}`);
  }
};
