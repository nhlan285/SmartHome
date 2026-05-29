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
    throw new Error('audioUri không hợp lệ. Bạn cần ghi âm trước khi gửi.');
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
      throw new Error('Máy chủ trả về dữ liệu giọng nói không đúng định dạng mong đợi.');
    }

    return response.data;
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? `${error.response?.status ? `HTTP ${error.response.status}` : 'Lỗi mạng'}: ${error.message}`
      : 'Lỗi không xác định';

    console.error('[processVoiceCommand] Lỗi gửi giọng nói', {
      apiPath: API_PATHS.voiceProcess,
      audioUri,
      detail,
      suggestion: 'Kiểm tra endpoint backend, kết nối mạng và tệp ghi âm hợp lệ.'
    });

    throw new Error(`Không thể xử lý lệnh giọng nói. ${detail}`);
  }
};
