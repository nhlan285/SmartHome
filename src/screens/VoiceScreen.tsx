import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Audio } from 'expo-av';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppNavBar } from '@/components/AppNavBar';
import { VoiceCommandResultCard } from '@/components/VoiceCommandResultCard';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { processVoiceCommand } from '@/services/api/voiceApi';
import { theme } from '@/styles/theme';
import { DashboardSnapshot, VoiceCommandResult } from '@/types/models';
import { getDeviceStatusLabel } from '@/utils/deviceRooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Voice'>;

type StatusType = 'info' | 'success' | 'error';

export const VoiceScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [updatedSnapshot, setUpdatedSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState('Nhấn giữ nút mic để ghi âm');
  const [statusType, setStatusType] = useState<StatusType>('info');

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = async (): Promise<void> => {
    if (processing || recording) {
      return;
    }

    try {
      setStatusType('info');
      setStatus('Đang nghe...');
      setTranscript('');
      setResult(null);
      setUpdatedSnapshot(null);

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Bạn chưa cấp quyền micro.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const recorder = new Audio.Recording();
      await recorder.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recorder.startAsync();

      recordingRef.current = recorder;
      setRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể bắt đầu ghi âm.';
      setStatusType('error');
      setStatus(message);
    }
  };

  const stopRecording = async (): Promise<void> => {
    const recorder = recordingRef.current;
    if (!recorder || processing) {
      return;
    }

    try {
      setRecording(false);
      await recorder.stopAndUnloadAsync();
      const uri = recorder.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Không lấy được tệp ghi âm.');
      }

      setAudioUri(uri);
      setProcessing(true);
      setStatusType('info');
      setStatus('Đang gửi tệp ghi âm lên máy chủ...');

      const voiceResult = await processVoiceCommand(uri);
      setResult(voiceResult);
      setTranscript(voiceResult.transcript);
      setUpdatedSnapshot(voiceResult.snapshot ?? null);
      setStatusType('success');
      setStatus(voiceResult.message ?? 'Máy chủ đã xử lý lệnh giọng nói.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xử lý giọng nói thất bại.';
      setStatusType('error');
      setStatus(message);
    } finally {
      setProcessing(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.caption}>Trợ lý giọng nói</Text>
        <Text style={styles.title}>Điều khiển bằng giọng nói</Text>
        <Text style={styles.subtitle}>Lệnh giọng nói qua máy chủ AI</Text>

        <View style={styles.micFrame}>
          <TouchableOpacity
            style={[styles.micButton, recording ? styles.recording : styles.idle, processing && styles.disabled]}
            onPressIn={() => {
              void startRecording();
            }}
            onPressOut={() => {
              void stopRecording();
            }}
            disabled={processing}
            activeOpacity={0.8}
          >
            <MaterialIcons name={recording ? 'stop' : 'mic'} size={42} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.micHint}>Ghi âm lệnh thiết bị</Text>
        </View>

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.processingText}>Đang xử lý...</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.label}>Ghi âm</Text>
          <Text style={styles.value}>{recording ? 'Đang nghe...' : 'Sẵn sàng'}</Text>

          <Text style={styles.label}>Đường dẫn âm thanh</Text>
          <Text style={styles.value}>{audioUri ?? 'Chưa có tệp ghi âm'}</Text>

          <Text style={styles.label}>Văn bản nhận diện</Text>
          <Text style={styles.value}>{transcript || 'Chưa có văn bản nhận diện'}</Text>

          <Text style={styles.label}>Trạng thái</Text>
          <Text
            style={[
              styles.value,
              statusType === 'success' && styles.success,
              statusType === 'error' && styles.error
            ]}
          >
            {status}
          </Text>
        </View>

        {result ? <VoiceCommandResultCard result={result} /> : null}

        {updatedSnapshot ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Trạng thái sau lệnh</Text>
            {updatedSnapshot.devices.map((device) => (
              <View key={device.deviceId} style={styles.deviceRow}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceStatus}>{getDeviceStatusLabel(device.status)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <AppNavBar navigation={navigation} currentRoute="Voice" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  safeAreaDark: {
    backgroundColor: '#101D25'
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  caption: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  title: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'left'
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 14,
    textAlign: 'left',
    color: theme.colors.textSecondary
  },
  micFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  micButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E2736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6
  },
  idle: {
    backgroundColor: theme.colors.primary
  },
  recording: {
    backgroundColor: '#0FA0BF'
  },
  disabled: {
    opacity: 0.6
  },
  micHint: {
    marginTop: 10,
    color: theme.colors.textSecondary
  },
  processingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  processingText: {
    color: theme.colors.textSecondary
  },
  panel: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    backgroundColor: '#FFFFFF'
  },
  panelTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  label: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  value: {
    marginTop: 2,
    color: theme.colors.textPrimary
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 9,
    gap: 10
  },
  deviceName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  deviceStatus: {
    color: theme.colors.primary,
    fontWeight: '900'
  },
  success: {
    color: theme.colors.success
  },
  error: {
    color: theme.colors.danger
  }
});
