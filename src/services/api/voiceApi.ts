import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { VoiceCommandResult } from '@/types/models';
import { backendClient } from '@/services/http/client';
import { extractDashboardSnapshot } from '@/services/api/deviceApi';
import { mockProcessVoice } from '@/services/mock/mockApi';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

  if (!transcript || !intent) {
    throw new Error('Máy chủ trả về dữ liệu giọng nói không đúng định dạng mong đợi.');
  }

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
    formData.append('audio', {
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
