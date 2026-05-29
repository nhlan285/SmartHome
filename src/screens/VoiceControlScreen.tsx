import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { VoiceCommandResultCard } from '@/components/VoiceCommandResultCard';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { processVoiceCommand } from '@/services/api/voiceApi';
import { VoiceCommandResult } from '@/types/models';
import { theme } from '@/styles/theme';

export const VoiceControlScreen: React.FC = () => {
  const { isRecording, error: recorderError, startRecording, stopRecording, clearRecording } = useVoiceRecorder();
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const handleRecordPress = async (): Promise<void> => {
    setScreenError(null);

    if (!isRecording) {
      clearRecording();
      setResult(null);
      await startRecording();
      return;
    }

    const recordedUri = await stopRecording();
    if (!recordedUri) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await processVoiceCommand(recordedUri);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xử lý giọng nói thất bại.';
      setScreenError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>Điều khiển giọng nói</Text>
        <Text style={styles.subheading}>
          Chạm một lần để bắt đầu ghi âm, chạm lần nữa để gửi lên máy chủ AI.
        </Text>

        <Pressable
          style={[styles.recordButton, isRecording ? styles.recording : styles.idle]}
          onPress={() => {
            void handleRecordPress();
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Đang xử lý...' : isRecording ? 'Dừng và gửi' : 'Bắt đầu ghi âm'}
          </Text>
        </Pressable>

        {isSubmitting ? <ActivityIndicator style={styles.loading} color={theme.colors.primary} /> : null}
        {recorderError ? <Text style={styles.error}>{recorderError}</Text> : null}
        {screenError ? <Text style={styles.error}>{screenError}</Text> : null}

        {result ? <VoiceCommandResultCard result={result} /> : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    padding: theme.spacing.md
  },
  heading: {
    fontSize: 24,
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  subheading: {
    marginTop: 6,
    color: theme.colors.textSecondary
  },
  recordButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center'
  },
  idle: {
    backgroundColor: theme.colors.primary
  },
  recording: {
    backgroundColor: theme.colors.danger
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  loading: {
    marginTop: theme.spacing.md
  },
  error: {
    marginTop: theme.spacing.sm,
    color: theme.colors.danger
  }
});
