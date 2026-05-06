import { Audio } from 'expo-av';
import { useState } from 'react';

interface VoiceRecorderState {
  isRecording: boolean;
  recordingUri: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearRecording: () => void;
}

export const useVoiceRecorder = (): VoiceRecorderState => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startRecording = async (): Promise<void> => {
    try {
      setError(null);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const created = new Audio.Recording();
      await created.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await created.startAsync();
      setRecording(created);
      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording.';
      setError(message);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recording) {
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setIsRecording(false);
      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording.';
      setError(message);
      setRecording(null);
      setIsRecording(false);
      return null;
    }
  };

  const clearRecording = (): void => {
    setRecordingUri(null);
    setError(null);
  };

  return {
    isRecording,
    recordingUri,
    error,
    startRecording,
    stopRecording,
    clearRecording
  };
};
