import React, { useEffect, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Audio } from 'expo-av';
import { processVoiceCommand } from '@/services/api/voiceApi';
import { theme } from '@/styles/theme';
import { DashboardSnapshot, VoiceCommandResult } from '@/types/models';
import { getDeviceStatusLabel } from '@/utils/deviceRooms';

type VoiceRecorderModalProps = {
  visible: boolean;
  onClose: () => void;
};

type StatusType = 'info' | 'success' | 'error';

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ visible, onClose }) => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [updatedSnapshot, setUpdatedSnapshot] = useState<DashboardSnapshot | null>(null);
  const [status, setStatus] = useState('Sẵn sàng ghi âm');
  const [statusType, setStatusType] = useState<StatusType>('info');

  const resetSession = (): void => {
    setTranscript('');
    setResult(null);
    setUpdatedSnapshot(null);
    setStatus('Đang chuẩn bị micro...');
    setStatusType('info');
  };

  const startRecording = async (): Promise<void> => {
    if (recordingRef.current || processing) {
      return;
    }

    try {
      resetSession();

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
      setStatus('Đang nghe lệnh giọng nói...');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể bắt đầu ghi âm.';
      setStatusType('error');
      setStatus(message);
      setRecording(false);
      recordingRef.current = null;
    }
  };

  const stopRecordingAndSubmit = async (): Promise<void> => {
    const recorder = recordingRef.current;
    if (!recorder || processing) {
      return;
    }

    try {
      setRecording(false);
      setProcessing(true);
      setStatusType('info');
      setStatus('Đang gửi lệnh lên máy chủ AI...');

      await recorder.stopAndUnloadAsync();
      const uri = recorder.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Không lấy được tệp ghi âm.');
      }

      const voiceResult = await processVoiceCommand(uri);
      setResult(voiceResult);
      setTranscript(voiceResult.transcript);
      setUpdatedSnapshot(voiceResult.snapshot ?? null);
      setStatusType('success');
      setStatus(voiceResult.message ?? 'Đã xử lý lệnh giọng nói.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xử lý giọng nói thất bại.';
      setStatusType('error');
      setStatus(message);
    } finally {
      setProcessing(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false
      }).catch(() => undefined);
    }
  };

  const stopWithoutSubmit = async (): Promise<void> => {
    const recorder = recordingRef.current;
    recordingRef.current = null;
    setRecording(false);

    if (recorder) {
      await recorder.stopAndUnloadAsync().catch(() => undefined);
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false
    }).catch(() => undefined);
  };

  const closeModal = (): void => {
    void stopWithoutSubmit();
    setProcessing(false);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      void startRecording();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      void stopWithoutSubmit();
    };
  }, []);

  const statusColor =
    statusType === 'success'
      ? theme.colors.success
      : statusType === 'error'
        ? theme.colors.danger
        : theme.colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={closeModal} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.caption}>Trợ lý giọng nói</Text>
              <Text style={styles.title}>Nói lệnh điều khiển</Text>
            </View>
            <Pressable accessibilityLabel="Đóng ghi âm" style={styles.closeButton} onPress={closeModal}>
              <MaterialIcons name="close" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.micStage}>
            <View style={[styles.ringOuter, recording && styles.ringRecording]}>
              <Pressable
                accessibilityLabel={recording ? 'Dừng và gửi ghi âm' : 'Ghi âm lại'}
                accessibilityRole="button"
                style={[
                  styles.micButton,
                  recording && styles.micButtonRecording,
                  processing && styles.micButtonDisabled
                ]}
                disabled={processing}
                onPress={() => {
                  if (recording) {
                    void stopRecordingAndSubmit();
                  } else {
                    void startRecording();
                  }
                }}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <MaterialIcons name={recording ? 'stop' : 'mic'} size={38} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            <Text style={styles.hintText}>
              {recording ? 'Chạm nút mic để dừng và gửi lệnh.' : 'Chạm nút mic để ghi âm lại.'}
            </Text>
          </View>

          <ScrollView style={styles.resultArea} showsVerticalScrollIndicator={false}>
            {transcript ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Văn bản nhận diện</Text>
                <Text style={styles.resultValue}>{transcript}</Text>
              </View>
            ) : null}

            {result ? (
              <View style={styles.resultGrid}>
                <View style={styles.resultMiniCard}>
                  <Text style={styles.resultMiniValue}>{(result.confidence * 100).toFixed(0)}%</Text>
                  <Text style={styles.resultMiniLabel}>Độ tin cậy</Text>
                </View>
                <View style={styles.resultMiniCard}>
                  <Text style={styles.resultMiniValue} numberOfLines={1}>
                    {result.suggestedAction ?? 'Đã xử lý'}
                  </Text>
                  <Text style={styles.resultMiniLabel}>Hành động</Text>
                </View>
              </View>
            ) : null}

            {updatedSnapshot ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Trạng thái sau lệnh</Text>
                {updatedSnapshot.devices.slice(0, 5).map((device) => (
                  <View key={device.deviceId} style={styles.deviceRow}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                      {device.name}
                    </Text>
                    <Text style={styles.deviceStatus}>{getDeviceStatusLabel(device.status)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 29, 37, 0.36)'
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#102C30',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 18
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8E5E3',
    marginBottom: 16
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14
  },
  caption: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  title: {
    marginTop: 3,
    color: theme.colors.textPrimary,
    fontSize: 23,
    fontWeight: '900'
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  micStage: {
    alignItems: 'center',
    paddingVertical: 24
  },
  ringOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6F5',
    borderWidth: 1,
    borderColor: '#C9E6E4'
  },
  ringRecording: {
    backgroundColor: '#FFF0D8',
    borderColor: '#F2CF8B'
  },
  micButton: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8
  },
  micButtonRecording: {
    backgroundColor: theme.colors.warning,
    shadowColor: theme.colors.warning
  },
  micButtonDisabled: {
    opacity: 0.72
  },
  statusText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900'
  },
  hintText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700'
  },
  resultArea: {
    maxHeight: 270
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2EBE9',
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 12
  },
  resultLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  resultValue: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  resultGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  resultMiniCard: {
    flex: 1,
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10
  },
  resultMiniValue: {
    color: theme.colors.primary,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center'
  },
  resultMiniLabel: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center'
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EAF1F0',
    paddingVertical: 9,
    gap: 10
  },
  deviceName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  deviceStatus: {
    color: theme.colors.primary,
    fontWeight: '900'
  }
});
