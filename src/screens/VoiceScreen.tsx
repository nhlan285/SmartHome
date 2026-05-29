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
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { theme } from '@/styles/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Voice'>;

type IntentAction = 'on' | 'off';
type IntentDevice = 'light' | 'fan';
type IntentLocation = 'living_room' | 'bedroom';

type ParsedIntent = {
  device: IntentDevice;
  location: IntentLocation;
  action: IntentAction;
};

type StatusType = 'info' | 'success' | 'error';

const SAMPLE_TRANSCRIPTS = ['bật đèn phòng khách', 'tắt quạt phòng ngủ'];

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseIntent = (text: string): ParsedIntent => {
  const normalized = text.toLowerCase().trim();
  const plainText = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  const isOn = /\bbat\b/.test(plainText);
  const isOff = /\btat\b/.test(plainText);

  if (isOn === isOff) {
    throw new Error('Không xác định được hành động bật/tắt từ câu lệnh.');
  }

  const isLight = /\bden\b/.test(plainText);
  const isFan = /\bquat\b/.test(plainText);

  if (isLight === isFan) {
    throw new Error('Không xác định được thiết bị (đèn/quạt).');
  }

  const isLivingRoom = /phong\s*khach/.test(plainText);
  const isBedroom = /phong\s*ngu/.test(plainText);

  if (isLivingRoom === isBedroom) {
    throw new Error('Không xác định được vị trí (phòng khách/phòng ngủ).');
  }

  return {
    device: isLight ? 'light' : 'fan',
    location: isLivingRoom ? 'living_room' : 'bedroom',
    action: isOn ? 'on' : 'off'
  };
};

const mockSpeechToText = async (_audioUri: string): Promise<string> => {
  await wait(1200);
  const randomIndex = Math.floor(Math.random() * SAMPLE_TRANSCRIPTS.length);
  return SAMPLE_TRANSCRIPTS[randomIndex];
};

const mockSendCommand = async (intent: ParsedIntent): Promise<string> => {
  await wait(900);
  const actionText = intent.action === 'on' ? 'bật' : 'tắt';
  const deviceText = intent.device === 'light' ? 'đèn' : 'quạt';
  const locationText = intent.location === 'living_room' ? 'phòng khách' : 'phòng ngủ';
  return `Đã ${actionText} ${deviceText} ${locationText}`;
};

const formatIntent = (intent: ParsedIntent): string => {
  const actionText = intent.action === 'on' ? 'Bật' : 'Tắt';
  const deviceText = intent.device === 'light' ? 'đèn' : 'quạt';
  const locationText = intent.location === 'living_room' ? 'phòng khách' : 'phòng ngủ';
  return `${actionText} ${deviceText} ${locationText}`;
};

export const VoiceScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
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
      setIntent(null);

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
      setStatus('Đang xử lý lệnh giọng nói...');

      const text = await mockSpeechToText(uri);
      setTranscript(text);

      const parsedIntent = parseIntent(text);
      setIntent(parsedIntent);

      const commandStatus = await mockSendCommand(parsedIntent);
      setStatusType('success');
      setStatus(commandStatus);
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
        <Text style={styles.subtitle}>Nhấn giữ nút mic để ghi âm, thả tay để xử lý lệnh.</Text>

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
          <Text style={styles.micHint}>Giữ nút để ghi âm, thả tay để xử lý</Text>
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

          <Text style={styles.label}>Lệnh đã phân tích</Text>
          <Text style={styles.value}>{intent ? formatIntent(intent) : 'Chưa phân tích lệnh'}</Text>

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
  label: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  value: {
    marginTop: 2,
    color: theme.colors.textPrimary
  },
  success: {
    color: theme.colors.success
  },
  error: {
    color: theme.colors.danger
  }
});
