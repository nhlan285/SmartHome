import axios from 'axios';
import { API_PATHS, ENV } from '@/config/env';
import { VoiceCommandResult } from '@/types/models';
import { backendClient } from '@/services/http/client';
import { mockProcessVoice } from '@/services/mock/mockApi';

// Ham nay lam gi:
// - Upload file am thanh len backend de xu ly voice command.
// Ban can sua gi:
// - API_PATHS.voiceProcess trong src/config/env.ts neu endpoint backend thay doi.
// Cach test:
// - Test bang app: bam ghi am, sau do stop/send va xem ket qua tra ve.
// Loi hay gap:
// - audioUri rong hoac file khong ton tai.
// - Backend timeout hoac endpoint sai.
export const processVoiceCommand = async (audioUri: string): Promise<VoiceCommandResult> => {
  if (ENV.USE_MOCKS) {
    return mockProcessVoice();
  }

  if (!audioUri) {
    throw new Error('audioUri khong hop le. Ban can ghi am truoc khi gui.');
  }

  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'voice-command.m4a',
      type: 'audio/m4a'
    } as unknown as Blob);

    const response = await backendClient.post<VoiceCommandResult>(API_PATHS.voiceProcess, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (!response.data || !response.data.intent || !response.data.transcript) {
      throw new Error('Backend tra ve du lieu voice khong dung dinh dang mong doi.');
    }

    return response.data;
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? `${error.response?.status ? `HTTP ${error.response.status}` : 'Network error'}: ${error.message}`
      : 'Unknown error';

    console.error('[processVoiceCommand] Loi gui voice', {
      apiPath: API_PATHS.voiceProcess,
      audioUri,
      detail,
      suggestion: 'Kiem tra endpoint backend, ket noi mang, va file ghi am hop le.'
    });

    throw new Error(`Khong the xu ly lenh giong noi. ${detail}`);
  }
};
