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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

const SAMPLE_TRANSCRIPTS = ['bat den phong khach', 'tat quat phong ngu'];

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseIntent = (text: string): ParsedIntent => {
  const normalized = text.toLowerCase().trim();

  const isOn = /\b(bat|bật)\b/.test(normalized);
  const isOff = /\b(tat|tắt)\b/.test(normalized);

  if (isOn === isOff) {
    throw new Error('Khong xac dinh duoc hanh dong bat/tat tu cau lenh.');
  }

  const isLight = /\b(den|đèn)\b/.test(normalized);
  const isFan = /\b(quat|quạt)\b/.test(normalized);

  if (isLight === isFan) {
    throw new Error('Khong xac dinh duoc thiet bi (den/quat).');
  }

  const isLivingRoom = /(phong\s*khach|phòng\s*khách)/.test(normalized);
  const isBedroom = /(phong\s*ngu|phòng\s*ngủ)/.test(normalized);

  if (isLivingRoom === isBedroom) {
    throw new Error('Khong xac dinh duoc vi tri (phong khach/phong ngu).');
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
  const actionText = intent.action === 'on' ? 'bat' : 'tat';
  const deviceText = intent.device === 'light' ? 'den' : 'quat';
  const locationText = intent.location === 'living_room' ? 'phong khach' : 'phong ngu';
  return `Da ${actionText} ${deviceText} ${locationText}`;
};

const formatIntent = (intent: ParsedIntent): string =>
  `device=${intent.device}, location=${intent.location}, action=${intent.action}`;

export const VoiceScreen: React.FC<Props> = ({ navigation }) => {
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [status, setStatus] = useState('Nhan giu nut mic de ghi am');
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
      setStatus('Listening...');
      setTranscript('');
      setIntent(null);

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Ban chua cap quyen micro.');
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
      const message = error instanceof Error ? error.message : 'Khong the bat dau ghi am.';
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
        throw new Error('Khong lay duoc file ghi am.');
      }

      setAudioUri(uri);
      setProcessing(true);
      setStatusType('info');
      setStatus('Dang xu ly lenh giong noi...');

      const text = await mockSpeechToText(uri);
      setTranscript(text);

      const parsedIntent = parseIntent(text);
      setIntent(parsedIntent);

      const commandStatus = await mockSendCommand(parsedIntent);
      setStatusType('success');
      setStatus(commandStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xu ly giong noi that bai.';
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.caption}>Voice Assistant</Text>
        <Text style={styles.title}>Voice Control</Text>
        <Text style={styles.subtitle}>Nhan giu nut mic de ghi am, tha tay de xu ly lenh.</Text>

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
            <Text style={styles.micButtonText}>{recording ? 'Listening...' : 'Hold to Talk'}</Text>
          </TouchableOpacity>
          <Text style={styles.micHint}>Hold button to record, release to process</Text>
        </View>

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.processingText}>Dang xu ly...</Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.label}>Listening</Text>
          <Text style={styles.value}>{recording ? 'Listening...' : 'Idle'}</Text>

          <Text style={styles.label}>Audio URI</Text>
          <Text style={styles.value}>{audioUri ?? 'Chua co file ghi am'}</Text>

          <Text style={styles.label}>Transcribed text</Text>
          <Text style={styles.value}>{transcript || 'Chua co transcript'}</Text>

          <Text style={styles.label}>Parsed command</Text>
          <Text style={styles.value}>{intent ? formatIntent(intent) : 'Chua parse intent'}</Text>

          <Text style={styles.label}>Status</Text>
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

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.navButtonText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Control')}>
            <Text style={styles.navButtonText}>Control</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navButtonText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.navButtonText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
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
    borderRadius: 999,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center'
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
  micButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
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
  },
  navRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: '#E4F8FE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  navButtonText: {
    color: theme.colors.primary,
    fontWeight: '700'
  }
});
