import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { HistoryList } from '@/components/HistoryList';
import { getControlHistory } from '@/services/api/historyApi';
import { theme } from '@/styles/theme';
import { ControlHistoryItem } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [history, setHistory] = useState<ControlHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sprint 5: Lay lich su dieu khien tu service, UI chi hien thi ket qua.
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await getControlHistory();
      setHistory(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Khong the tai lich su dieu khien.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Lich su dieu khien tu backend</Text>

        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.navButtonText}>Dashboard</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Control')}>
            <Text style={styles.navButtonText}>Control</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Voice')}>
            <Text style={styles.navButtonText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.navButtonText}>Schedule</Text>
          </Pressable>
          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              setIsLoading(true);
              void loadHistory();
            }}
          >
            <Text style={styles.navButtonText}>Refresh</Text>
          </Pressable>
        </View>

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
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 9,
    alignItems: 'center'
  },
  refreshButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navButtonText: {
    color: '#FFFFFF',
    fontWeight: '700'
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
