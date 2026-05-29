import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppNavBar } from '@/components/AppNavBar';
import { VoicePrimaryButton } from '@/components/VoicePrimaryButton';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { HistoryList } from '@/components/HistoryList';
import { getControlHistory } from '@/services/api/historyApi';
import { theme } from '@/styles/theme';
import { ControlHistoryItem } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const [history, setHistory] = useState<ControlHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sprint 5: Lấy lịch sử điều khiển từ service, UI chỉ hiển thị kết quả.
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await getControlHistory();
      setHistory(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải lịch sử điều khiển.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <View style={styles.container}>
        <Text style={styles.title}>Lịch sử</Text>
        <Text style={styles.subtitle}>Lịch sử điều khiển từ máy chủ</Text>

        <VoicePrimaryButton navigation={navigation} />

        <AppNavBar navigation={navigation} currentRoute="History" />

        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            setIsLoading(true);
            void loadHistory();
          }}
        >
          <Text style={styles.refreshButtonText}>Làm mới</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.listWrapper}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <HistoryList history={history} />
          )}
        </View>
      </View>
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
    flex: 1,
    padding: theme.spacing.md
  },
  title: {
    fontSize: 26,
    color: theme.colors.textPrimary,
    fontWeight: '800',
    marginBottom: 4
  },
  subtitle: {
    marginBottom: 12,
    color: theme.colors.textSecondary
  },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  listWrapper: {
    flex: 1
  },
  loader: {
    marginTop: theme.spacing.lg
  },
  errorText: {
    marginBottom: 8,
    color: theme.colors.danger
  }
});
